import { db } from '@/lib/db';
import { members, users, engagementMetrics } from '@/lib/db/schema';
import { createWhopClient } from '@/lib/whop/client';
import { eq } from 'drizzle-orm';
import { snapshotRevenueMetrics } from '@/lib/whop/revenue';

export class WhopSync {
    private companyId: string;
    private userId: string;
    private token?: string;

    /**
     * @param companyId - The company to sync data for (from authenticated user)
     * @param userId - The database user ID
     * @param token - Optional user token for authenticated API calls
     */
    constructor(companyId: string, userId: string, token?: string) {
        this.companyId = companyId;
        this.userId = userId;
        this.token = token;
    }

    /**
     * Sync all members from Whop to database
     */
    async syncCompanyMembers(): Promise<void> {
        console.log(`[Sync] Starting member sync for company: ${this.companyId}`);

        try {
            // Create Whop client (uses token if provided, otherwise app key)
            const whop = createWhopClient(this.token);

            // Fetch ALL memberships for THIS company
            let allMemberships: any[] = [];
            let cursor: string | undefined;
            let hasMore = true;

            while (hasMore) {
                console.log(`[Sync] Fetching page with cursor: ${cursor || 'initial'} for company ${this.companyId}...`);

                const response: any = await whop.memberships.list({
                    company_id: this.companyId,
                    limit: 100,
                    cursor: cursor
                } as any);

                if (!response.data || response.data.length === 0) {
                    hasMore = false;
                    break;
                }

                allMemberships.push(...response.data);
                console.log(`[Sync] Fetched ${response.data.length} memberships`);

                if (response.pagination?.next_page) {
                    cursor = response.pagination.next_page;
                    // Protect against infinite loop if cursor doesn't change
                    if (!cursor) hasMore = false;
                } else if (response.meta?.next_cursor) {
                    cursor = response.meta.next_cursor;
                } else {
                    hasMore = false;
                }

                if (hasMore) {
                    await this.sleep(100);
                }
            }

            console.log(`[Sync] Total memberships fetched: ${allMemberships.length}`);

            // Sync each membership to database
            let successCount = 0;
            for (const membership of allMemberships) {
                try {
                    // Validate critical fields
                    if (!membership.user || !membership.user.id) {
                        console.warn(`[Sync] Skipping membership ${membership.id}: Missing user data. Raw:`, JSON.stringify(membership, null, 2));
                        continue;
                    }

                    if (!membership.created_at) {
                        console.warn(`[Sync] Skipping membership ${membership.id}: Missing created_at. Raw:`, JSON.stringify(membership, null, 2));
                        continue;
                    }


                    // --- DATE PARSING FIX ---
                    // API returns ISO strings (e.g. "2025-12-28T19:06:37.878Z"), not unix timestamps
                    const joinedAt = new Date(membership.created_at);

                    if (isNaN(joinedAt.getTime())) {
                        console.warn(`[Sync] Skipping membership ${membership.id}: Invalid joinedAt date (Value: ${membership.created_at})`);
                        continue;
                    }

                    const cancelledAt = membership.cancelled_at ? new Date(membership.cancelled_at) : null;


                    // --- USER DATA FIX ---
                    if (!membership.user || !membership.user.id) {
                        // Some test memberships might have null user? 
                        // If so, we can't link it to a user in our DB.
                        // However, checking the raw log, it seems 'member' object exists: { id: "mber_..." }
                        // But 'user' is null. This implies a "guest" or "unclaimed" membership?
                        console.warn(`[Sync] Skipping membership ${membership.id}: Missing 'user' object. Raw payload indicates 'user': null.`);
                        continue;
                    }

                    // Get or create whop_user
                    let whopUser = await db.query.users.findFirst({
                        where: eq(users.whopUserId, membership.user.id)
                    });

                    if (!whopUser) {
                        const [newWhopUser] = await db.insert(users).values({
                            whopUserId: membership.user.id,
                            whopCompanyId: this.companyId,
                            username: membership.user.username || 'Unknown',
                            email: membership.user.email || null
                        }).returning();
                        whopUser = newWhopUser;
                    }

                    // Upsert member
                    await db.insert(members).values({
                        userId: this.userId,
                        whopMemberId: membership.user.id,
                        whopMembershipId: membership.id,
                        email: membership.user.email || null,
                        status: membership.status,
                        joinedAt: joinedAt,
                        cancelledAt: cancelledAt,
                        productId: membership.product,
                        planId: membership.plan,
                        renewalPrice: membership.plan_renewal_price?.toString() || '0',
                        currency: membership.plan_currency || 'usd',
                        metadata: membership
                    }).onConflictDoUpdate({
                        target: [members.whopMembershipId],
                        set: {
                            status: membership.status,
                            email: membership.user.email || null,
                            renewalPrice: membership.plan_renewal_price?.toString() || '0',
                            currency: membership.plan_currency || 'usd',
                            updatedAt: new Date()
                        }
                    });

                    successCount++;

                } catch (error) {
                    console.error(`[Sync] Error syncing member ${membership.id}:`, error);
                }
            }

            console.log(`[Sync] ✅ Synced ${successCount}/${allMemberships.length} members successfully for company ${this.companyId}`);

            // After syncing members, snapshot revenue metrics for THIS user
            await snapshotRevenueMetrics(this.userId);

        } catch (error) {
            console.error('[Sync] Error syncing members:', error);
            throw error;
        }
    }

    /**
     * Sync recent messages and calculate engagement scores
     */
    async syncRecentMessages(): Promise<void> {
        console.log(`[Sync] Starting message sync for company: ${this.companyId}`);

        try {
            const whop = createWhopClient(this.token);

            // Fetch channels
            console.log('[Sync] Fetching channels...');
            let channels: any[] = [];

            try {
                const channelsResponse: any = await whop.chatChannels.list({
                    company_id: this.companyId,
                    limit: 10
                } as any);

                channels = channelsResponse.data || [];
                console.log(`[Sync] Found ${channels.length} channels`);
            } catch (error) {
                console.warn('[Sync] Could not fetch channels (chat may not be enabled):', error);
                channels = [];
            }

            // If no channels, we can't calculate engagement from messages
            if (channels.length === 0) {
                console.log('[Sync] No channels found, calculating engagement from membership activity only');
                await this.calculateEngagementWithoutMessages(this.userId);
                return;
            }

            // Fetch messages from each channel
            const messagesByUser = new Map<string, number>();

            for (const channel of channels.slice(0, 5)) { // Top 5 channels
                try {
                    const messagesResponse: any = await whop.messages.list({
                        channel_id: channel.id,
                        limit: 100
                    } as any);

                    const messages = messagesResponse.data || [];

                    // Count messages per user
                    for (const message of messages) {
                        const userId = message.user_id;
                        messagesByUser.set(userId, (messagesByUser.get(userId) || 0) + 1);
                    }

                } catch (error) {
                    console.warn(`[Sync] Error fetching messages for channel ${channel.id}:`, error);
                }

                // Rate limit protection
                await this.sleep(100);
            }

            console.log(`[Sync] Counted messages for ${messagesByUser.size} users`);

            // Calculate engagement for each member
            const allMembers = await db.query.members.findMany({
                where: eq(members.userId, this.userId)
            });

            const today = new Date().toISOString().split('T')[0];

            for (const member of allMembers) {
                const messageCount = messagesByUser.get(member.whopMemberId) || 0;
                const engagementScore = this.calculateEngagementScore(member, messageCount);

                // Upsert engagement metric
                await db.insert(engagementMetrics).values({
                    userId: this.userId,
                    memberId: member.id,
                    date: today,
                    messageCount: messageCount,
                    activityScore: messageCount > 0 ? 100 : 0,
                    lastActiveAt: messageCount > 0 ? new Date() : (member.joinedAt || new Date()),
                    engagementScore: engagementScore.toString()
                }).onConflictDoUpdate({
                    target: [engagementMetrics.memberId, engagementMetrics.date],
                    set: {
                        messageCount: messageCount,
                        activityScore: messageCount > 0 ? 100 : 0,
                        lastActiveAt: messageCount > 0 ? new Date() : (member.joinedAt || new Date()),
                        engagementScore: engagementScore.toString()
                    }
                });
            }

            console.log(`[Sync] ✅ Calculated engagement for ${allMembers.length} members`);

        } catch (error) {
            console.error('[Sync] Error syncing messages:', error);
            throw error;
        }
    }

    private async calculateEngagementWithoutMessages(userId: string): Promise<void> {
        const allMembers = await db.query.members.findMany({
            where: eq(members.userId, userId)
        });

        const today = new Date().toISOString().split('T')[0];

        for (const member of allMembers) {
            const daysSinceJoin = Math.floor(
                (Date.now() - (member.joinedAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
            );

            let loyaltyScore = 0;
            if (daysSinceJoin > 30) loyaltyScore = 50;
            else if (daysSinceJoin > 7) loyaltyScore = 30;
            else loyaltyScore = 10;

            const engagementScore = Math.min(100, loyaltyScore);

            await db.insert(engagementMetrics).values({
                userId: userId,
                memberId: member.id,
                date: today,
                messageCount: 0,
                activityScore: 0,
                lastActiveAt: member.joinedAt || new Date(),
                engagementScore: engagementScore.toString()
            }).onConflictDoUpdate({
                target: [engagementMetrics.memberId, engagementMetrics.date],
                set: {
                    engagementScore: engagementScore.toString()
                }
            });
        }
    }

    private calculateEngagementScore(member: any, messageCount: number): number {
        const activityScore = Math.min(50, messageCount * 5);
        const daysSinceJoin = Math.floor(
            (Date.now() - (member.joinedAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
        );

        let loyaltyScore = 0;
        if (daysSinceJoin > 30) loyaltyScore = 50;
        else if (daysSinceJoin > 7) loyaltyScore = 30;
        else loyaltyScore = 10;

        return Math.min(100, activityScore + loyaltyScore);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
