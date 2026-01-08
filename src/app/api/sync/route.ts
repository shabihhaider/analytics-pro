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

        // Get companyId from query params (this is the CORRECT biz_ ID from URL)
        // Fall back to user's stored companyId only if query param is empty
        const url = new URL(req.url);
        const queryCompanyId = url.searchParams.get('companyId');
        const companyIdToUse = (queryCompanyId && queryCompanyId.startsWith('biz_'))
            ? queryCompanyId
            : user.whopCompanyId;

        console.log(`[API] Sync - Query companyId: ${queryCompanyId}, User stored: ${user.whopCompanyId}, Using: ${companyIdToUse}`);

        // Create sync instance with the CORRECT company ID from URL
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
            message: `Sync complete for company ${companyIdToUse}`
        });

    } catch (error) {
        console.error('[API] Sync failed:', error);
        return NextResponse.json({
            error: 'Sync failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
