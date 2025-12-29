import { NextResponse } from 'next/server';
import { WhopSync } from '@/lib/whop/sync';

export const maxDuration = 60; // Allow longer timeout for sync

export async function POST(req: Request) {
    try {
        // In production, protect this route with Admin check

        // Instantiate Sync
        // We pass undefined for token if using API Key from env, 
        // or pass `req.headers.get('x-whop-user-token')` if SDK needs user context
        const token = req.headers.get('x-whop-user-token') || undefined;
        const syncer = new WhopSync(token!);

        // Run Syncs
        await syncer.syncCompanyMembers();
        await syncer.syncRecentMessages();

        return NextResponse.json({ success: true, message: 'Sync complete' });

    } catch (error) {
        console.error('Sync failed:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}
