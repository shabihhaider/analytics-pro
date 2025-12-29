import { Whop } from '@whop/sdk';
import { db } from '@/lib/db';
import { members, engagementMetrics, users } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';

const MAX_CHANNELS_TO_SCAN = 5;
const MESSAGES_PER_CHANNEL = 100;

export class WhopSync {
    private whop: Whop;

    constructor(token?: string) {
        this.whop = new Whop({
            apiKey: process.env.WHOP_API_KEY,
        });
    }

    /**
     * Syncs all members from the company to the local database.
     * Uses ON CONFLICT to avoid duplicates.
     */
    async syncCompanyMembers() {
        try {
            console.log('Starting member sync...');
            const companyId = process.env.WHOP_COMPANY_ID;
            if (!companyId) throw new Error("WHOP_COMPANY_ID is missing");

            // Fetch members from Whop
            // SDK uses 'first' for pagination limit, not 'per_page'
            console.log('Using Company ID:', companyId);

            // Fetch Plans to build Price Map
            // Fetch Plans to build Price Map
            // Wrap in try-catch so permission errors don't block the entire sync
            const planMap = new Map<string, { price: number, currency: string }>();
            try {
                const plansResponse = await this.whop.plans.list({
                    company_id: companyId,
                    first: 100
                });
                const plans = plansResponse.data || [];

                for (const p of plans as any[]) {
                    const price = Number(p.renewal_price || 0);
                    const currency = p.currency || 'usd';

                    if (price > 0) {
                        planMap.set(p.id, { price, currency });
                    }
                }
            } catch (error: any) {
                console.warn('Revenue Sync Warning: Could not fetch plans. Missing "plan:read" scope?', error.message);
                // Continue without revenue data (defaults to 0)
            }

            const response = await this.whop.memberships.list({
                first: 100,
                company_id: process.env.WHOP_COMPANY_ID
            });
            const whopMembers = response.data;

            if (!whopMembers || whopMembers.length === 0) {
                console.log('No members found to sync.');
                return;
            }

            console.log(`Fetched ${whopMembers.length} members. Upserting to DB...`);

            for (const member of whopMembers) {
                // 1. Upsert User
                if (member.user) {
                    await db.insert(users).values({
                        whopUserId: member.user.id,
                        whopCompanyId: process.env.NEXT_PUBLIC_WHOP_APP_ID || 'unknown',
                        username: member.user.username,
                        email: '', // Email not available in Membership User object
                    }).onConflictDoUpdate({
                        target: users.whopUserId,
                        set: {
                            username: member.user.username,
                            updatedAt: new Date()
                        }
                    });
                }

                // 2. Get internal User ID
                const dbUser = await db.query.users.findFirst({
                    where: eq(users.whopUserId, member.user?.id || '')
                });

                if (!dbUser) continue;

                // 3. Upsert Member
                // Whop timestamp is in seconds
                const joinedMs = member.created_at ? parseInt(member.created_at) * 1000 : Date.now();

                // MRR Logic: Look up Plan details from our pre-fetched map
                let finalRenewalPrice = '0';
                let currency = 'usd';

                if (member.plan && member.plan.id) {
                    const planData = planMap.get(member.plan.id);
                    if (planData) {
                        finalRenewalPrice = planData.price.toString();
                        currency = planData.currency.toLowerCase();
                    }
                }

                await db.insert(members).values({
                    userId: dbUser.id,
                    whopMemberId: member.member?.id || member.id,
                    whopMembershipId: member.id,
                    email: '',
                    status: member.status,
                    joinedAt: new Date(joinedMs),
                    productId: member.product?.id || '',
                    planId: member.plan?.id || '',
                    renewalPrice: finalRenewalPrice,
                    currency: currency,
                }).onConflictDoUpdate({
                    target: members.whopMembershipId,
                    set: {
                        status: member.status,
                        renewalPrice: finalRenewalPrice,
                        currency: currency,
                        updatedAt: new Date()
                    }
                });
            }

            console.log('Member sync complete.');
        } catch (error) {
            console.error('Failed to sync members:', error);
            throw error;
        }
    }

    /**
     * Syncs recent messages to calculate engagement metrics.
     * Scans Top 5 active channels -> Last 100 messages.
     * Updates 'engagement_metrics' table.
     */
    async syncRecentMessages() {
        try {
            console.log('Starting message sync...');

            // 1. Fetch Channels
            // Requires company_id
            const companyId = process.env.WHOP_COMPANY_ID;
            if (!companyId) throw new Error("WHOP_COMPANY_ID is missing");

            const channelsResponse = await this.whop.chatChannels.list({
                company_id: companyId,
                first: 20
            });
            const channels = channelsResponse.data;

            if (!channels || channels.length === 0) {
                console.log('No chat channels found.');
                return;
            }

            // Log selected channels for debugging (Constraint #1)
            const selectedChannels = channels.slice(0, MAX_CHANNELS_TO_SCAN);
            // Channel name is deep in experience.name
            console.log('Selected Channels for Sync:', selectedChannels.map(c => `${c.experience?.name || 'Chat'} (${c.id})`));

            const dailyActivity: Record<string, number> = {}; // whopUserId -> messageCount
            const today = new Date().toISOString().split('T')[0];

            // 2. Fetch Messages from each channel
            for (const channel of selectedChannels) {
                try {
                    const messagesResponse = await this.whop.messages.list({
                        channel_id: channel.id,
                        first: MESSAGES_PER_CHANNEL
                    });

                    const messages = messagesResponse.data;
                    console.log(`Fetched ${messages.length} messages from ${channel.experience?.name}`);

                    for (const msg of messages) {
                        const msgDate = new Date(msg.created_at).toISOString().split('T')[0];
                        if (msgDate === today && msg.user) {
                            const uid = msg.user.id;
                            dailyActivity[uid] = (dailyActivity[uid] || 0) + 1;
                        }
                    }

                } catch (err: any) {
                    // Rate Limit Handling (Constraint #2)
                    if (err?.status === 429) {
                        console.warn(`Rate limit hit for channel ${channel.id}. Skipping...`);
                        continue;
                    }
                    console.error(`Error fetching messages for ${channel.id}:`, err);
                }
            }

            console.log('Daily activity aggregated:', dailyActivity);

            // 3. Update Engagement Metrics in DB
            for (const [whopUserId, count] of Object.entries(dailyActivity)) {
                // Find internal member/user ID
                const dbUser = await db.query.users.findFirst({
                    where: eq(users.whopUserId, whopUserId),
                    with: {
                        members: true
                    }
                });

                if (!dbUser || !dbUser.members[0]) continue;
                const member = dbUser.members[0];

                // Calculate Score
                const score = this.calculateEngagementScore(count, member.joinedAt || new Date());

                await db.insert(engagementMetrics).values({
                    memberId: member.id,
                    userId: dbUser.id,
                    date: today,
                    messageCount: count,
                    activityScore: count,
                    engagementScore: score.toString(),
                    lastActiveAt: new Date()
                }).onConflictDoUpdate({
                    target: [engagementMetrics.memberId, engagementMetrics.date], // Composite PK
                    set: {
                        messageCount: count,
                        activityScore: count,
                        engagementScore: score.toString(),
                        lastActiveAt: new Date()
                    }
                });
            }

            console.log('Message sync and metrics update complete.');

        } catch (error) {
            console.error('Global sync error:', error);
            throw error;
        }
    }

    calculateEngagementScore(messagesSent: number, joinedAt: Date): number {
        let msgScore = messagesSent * 5;
        if (msgScore > 50) msgScore = 50;

        let loyaltyScore = 0;
        const daysSinceJoined = (new Date().getTime() - joinedAt.getTime()) / (1000 * 3600 * 24);

        if (daysSinceJoined < 7) {
            loyaltyScore = 50;
        } else if (daysSinceJoined < 30) {
            loyaltyScore = 30;
        } else {
            loyaltyScore = 50;
        }

        if (messagesSent === 0) {
            return 0;
        }

        return Math.min(100, msgScore + loyaltyScore);
    }
}
