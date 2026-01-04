import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Whop } from '@whop/sdk';
import { WhopSync } from '@/lib/whop/sync';

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
        // unwrap() throws if signature is invalid
        const payload = whop.webhooks.unwrap(body, {
            headers: Object.fromEntries(headersList.entries()),
            key: webhookKey
        }) as any;

        // The payload handles parsing.
        // Spec mentions 'action', types mention 'type'. We check both.
        const eventType = payload.type || payload.action;

        console.log(`Received webhook: ${eventType}`, payload.data || payload);

        switch (eventType) {
            case 'membership.went_valid':
            case 'membership.activated':
            case 'membership.went_invalid':
            case 'membership.deactivated':
                // For critical membership changes, run a full sync to be safe
                // Logic: Find the company owner/admin to attach the sync to
                const companyId = payload.company_id || (payload.data && payload.data.company_id);
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
                        console.log('Webhook: Triggered full member sync for company', companyId);
                    } else {
                        console.warn('Webhook: Could not find admin user for company', companyId);
                    }
                }
                break;

            case 'payment.succeeded':
                // handle revenue update
                const pCompanyId = payload.company_id || (payload.data && payload.data.company_id);
                if (pCompanyId) {
                    const { db } = await import('@/lib/db');
                    const { users } = await import('@/lib/db/schema');
                    const { eq } = await import('drizzle-orm');

                    const adminUser = await db.query.users.findFirst({
                        where: eq(users.whopCompanyId, pCompanyId)
                    });

                    if (adminUser) {
                        const revSync = new WhopSync(pCompanyId, adminUser.id);
                        await revSync.syncCompanyMembers(); // Revenue is calculated from members
                    }
                }
                break;

            case 'message.sent':
                // For high frequency events, we might want to debounce or queue
                // For MVP, we'll just log or run a light sync if needed
                console.log('Webhook: Message received (skipping full sync to avoid rate limits)');
                break;

            case 'course.progress':
            case 'order.created':
                console.log(`Webhook: Received ${eventType} (logic pending)`);
                break;
            default:
                console.log(`Unhandled webhook event: ${eventType}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
