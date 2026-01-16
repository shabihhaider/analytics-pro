import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { whopClient } from '@/lib/whop/client';

/**
 * Server Component that initializes the user session during page load.
 * 
 * This component:
 * 1. Extracts the x-whop-user-token from headers (available on initial page load)
 * 2. VERIFIES the token with Whop SDK
 * 3. Creates or updates the user in the database
 */
export async function InitUser() {
    try {
        const headersList = headers();
        const token = headersList.get('x-whop-user-token');

        if (!token) {
            return null; // No token on initial load (e.g., direct access)
        }

        // SECURITY: Verify the token with Whop SDK
        let verifiedUserId: string | null = null;
        try {
            const verified = await whopClient.verifyUserToken(token);
            verifiedUserId = verified.userId;
        } catch (verifyError) {
            console.error('[InitUser] Token verification failed');
            return null;
        }

        // Decode JWT to extract additional user info (after verification)
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

        // Extract user info from verified JWT
        const whopUserId = verifiedUserId || payload.sub || payload.user_id || 'unknown';
        const companyId = payload.company_id || payload.companyId || payload.aud;

        if (!companyId) {
            console.error('[InitUser] No company_id in verified JWT');
            return null;
        }

        // Check if user exists by companyId
        let user = await db.query.users.findFirst({
            where: eq(users.whopCompanyId, companyId)
        });

        if (!user) {
            // Try to find by whopUserId
            user = await db.query.users.findFirst({
                where: eq(users.whopUserId, whopUserId)
            });
        }

        if (!user) {
            // Create new user
            const [newUser] = await db.insert(users).values({
                whopUserId: whopUserId,
                whopCompanyId: companyId,
                email: payload.email || null,
                username: payload.username || 'User',
                subscriptionTier: 'free'
            }).returning();
            user = newUser;
            console.log('[InitUser] Created user:', user.id);
        } else {
            // Update companyId if we have a better one (biz_ vs app_)
            if (companyId.startsWith('biz_') && !user.whopCompanyId.startsWith('biz_')) {
                await db.update(users)
                    .set({ whopCompanyId: companyId, updatedAt: new Date() })
                    .where(eq(users.id, user.id));
                console.log('[InitUser] Updated companyId to:', companyId);
            }
        }

        return null; // This is a server component, renders nothing
    } catch (error) {
        console.error('[InitUser] Error:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}
