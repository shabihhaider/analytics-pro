import { NextResponse } from 'next/server';
import { WhopSync } from '@/lib/whop/sync';
import { getUser } from '@/lib/auth/get-user';

export const maxDuration = 60; // Allow longer timeout for sync

export async function POST(req: Request) {
    try {
        // Get authenticated user - this verifies the token and gets the correct companyId
        const user = await getUser(req);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized - please reload the app' },
                { status: 401 }
            );
        }

        // SECURITY: Use the user's verified companyId, not from query params
        // The getUser function now properly validates the companyId
        const companyIdToUse = user.whopCompanyId;

        // Validate company ID format
        if (!companyIdToUse || !companyIdToUse.startsWith('biz_')) {
            console.error('[Sync] Invalid company ID format:', companyIdToUse);
            return NextResponse.json({
                error: 'Invalid company configuration',
                details: 'Please reinstall the app from Whop dashboard'
            }, { status: 400 });
        }

        console.log('[Sync] Starting for company:', companyIdToUse);

        // Create sync instance with the VERIFIED company ID
        const syncer = new WhopSync(
            companyIdToUse,
            user.id,
            user.token
        );

        // Run syncs
        await syncer.syncCompanyMembers();
        await syncer.syncRecentMessages();

        return NextResponse.json({
            success: true,
            message: 'Sync complete'
        });

    } catch (error) {
        console.error('[Sync] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({
            error: 'Sync failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
