import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Whop } from '@whop/sdk';
import { WhopSync } from '@/lib/whop/sync';
import { trackMessageEvent, trackActivityEvent } from '@/lib/analytics/engagement';

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const headersList = headers();

        // Whop SDK requires non-null key
        const webhookKey = process.env.WHOP_WEBHOOK_SECRET;
        if (!webhookKey) {
            throw new Error('WHOP_WEBHOOK_SECRET is not defined');
        }

        const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });

        // Verify Signature and Parse
        const payload = whop.webhooks.unwrap(body, {
            headers: Object.fromEntries(headersList.entries()),
            key: webhookKey
        }) as any;

        const eventType = payload.type || payload.action;
        const companyId = payload.company_id || payload.data?.company_id;

        console.log(`[Webhook] Received: ${eventType}`);

        switch (eventType) {
            // ==================
            // MEMBERSHIP EVENTS
            // ==================
            case 'membership.went_valid':
            case 'membership.activated':
            case 'membership.went_invalid':
            case 'membership.deactivated':
                if (companyId) {
                    const { db } = await import('@/lib/db');
                    const { users } = await import('@/lib/db/schema');
                    const { eq } = await import('drizzle-orm');

                    const adminUser = await db.query.users.findFirst({
                        where: eq(users.whopCompanyId, companyId)
                    });

                    if (adminUser) {
                        const sync = new WhopSync(companyId, adminUser.id);
                        await sync.syncCompanyMembers();
                        console.log('[Webhook] Synced members for company:', companyId);
                    }
                }
                break;

            // ==================
            // PAYMENT EVENTS
            // ==================
            case 'payment.succeeded':
                if (companyId) {
                    const { db } = await import('@/lib/db');
                    const { users } = await import('@/lib/db/schema');
                    const { eq } = await import('drizzle-orm');

                    const adminUser = await db.query.users.findFirst({
                        where: eq(users.whopCompanyId, companyId)
                    });

                    if (adminUser) {
                        const revSync = new WhopSync(companyId, adminUser.id);
                        await revSync.syncCompanyMembers();
                        console.log('[Webhook] Payment processed, synced for:', companyId);
                    }
                }
                break;

            // ==================
            // ENGAGEMENT EVENTS (NEW!)
            // ==================
            case 'message.sent':
            case 'message.created':
                // Track message for engagement score
                const messageData = payload.data || payload;
                const messageMemberId = messageData.user_id || messageData.member_id;

                if (companyId && messageMemberId) {
                    const { db } = await import('@/lib/db');
                    const { users } = await import('@/lib/db/schema');
                    const { eq } = await import('drizzle-orm');

                    const adminUser = await db.query.users.findFirst({
                        where: eq(users.whopCompanyId, companyId)
                    });

                    if (adminUser) {
                        await trackMessageEvent(companyId, messageMemberId, adminUser.id);
                        console.log('[Webhook] Tracked message event for:', messageMemberId);
                    }
                }
                break;

            case 'course.progress':
            case 'course.completed':
            case 'course_lesson.completed':
                // Track course activity
                const courseData = payload.data || payload;
                const courseMemberId = courseData.user_id || courseData.member_id;

                if (companyId && courseMemberId) {
                    const { db } = await import('@/lib/db');
                    const { users } = await import('@/lib/db/schema');
                    const { eq } = await import('drizzle-orm');

                    const adminUser = await db.query.users.findFirst({
                        where: eq(users.whopCompanyId, companyId)
                    });

                    if (adminUser) {
                        await trackActivityEvent(companyId, courseMemberId, adminUser.id);
                        console.log('[Webhook] Tracked course activity for:', courseMemberId);
                    }
                }
                break;

            default:
                console.log(`[Webhook] Unhandled event: ${eventType}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
