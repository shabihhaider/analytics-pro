import { NextResponse } from 'next/server';
import { WhopSync } from '@/lib/whop/sync';
import { getUser } from '@/lib/auth/get-user';

export const maxDuration = 60; // Allow longer timeout for sync

export async function POST(req: Request) {
    try {
        // Get authenticated user
        // This extracts THEIR company ID from the token
        const user = await getUser(req);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log(`[API] Starting sync for company: ${user.whopCompanyId}`);

        // Create sync instance for THIS user's company
        // NOT a hardcoded company!
        const syncer = new WhopSync(
            user.whopCompanyId, // ← Dynamic! Changes based on who's logged in
            user.id,
            user.token
        );

        // Run syncs
        await syncer.syncCompanyMembers();
        await syncer.syncRecentMessages();

        return NextResponse.json({
            success: true,
            message: `Sync complete for company ${user.whopCompanyId}`
        });

    } catch (error) {
        console.error('[API] Sync failed:', error);
        return NextResponse.json({
            error: 'Sync failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
