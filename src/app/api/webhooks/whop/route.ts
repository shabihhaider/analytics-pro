import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Whop } from '@whop/sdk';

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
                // Handle new member
                break;
            case 'membership.went_invalid':
            case 'membership.deactivated':
                // Handle cancelled/expired member
                break;
            case 'payment.succeeded':
                // Handle revenue
                break;
            case 'message.sent':
            case 'course.progress':
            case 'order.created':
                // Update activity_score
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
