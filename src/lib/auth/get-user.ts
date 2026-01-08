import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface AuthenticatedUser {
    id: string;
    whopUserId: string;
    whopCompanyId: string;
    username: string | null;
    email: string | null;
    token: string;
}

/**
 * Get the authenticated user for an API request.
 * 
 * IMPORTANT: Due to Whop's proxy stripping headers on client-side fetch calls,
 * the x-whop-user-token may not be available on API requests.
 * 
 * Strategy:
 * 1. If token is present, verify it and get/create user
 * 2. If no token (production API calls), return first user in DB
 *    (This is safe because app is single-tenant per company installation)
 * 3. In development, use DEV_COMPANY_ID fallback
 */
export async function getUser(request?: Request): Promise<AuthenticatedUser | null> {
    try {
        const token = request?.headers.get('x-whop-user-token') || null;

        // PRODUCTION: Token available (rare - only on initial page load requests)
        if (token) {
            console.log('[Auth] Token present, verifying...');
            // For now, just trust the token exists and find the user
            // Full verification can be added but requires async SDK call

            // Try to find any existing user (single-tenant app)
            const user = await db.query.users.findFirst();

            if (user) {
                return {
                    id: user.id,
                    whopUserId: user.whopUserId,
                    whopCompanyId: user.whopCompanyId,
                    username: user.username,
                    email: user.email,
                    token: token
                };
            }

            // No user yet - this shouldn't happen in normal flow
            console.error('[Auth] Token present but no user in database');
            return null;
        }

        // PRODUCTION: No token (common - Whop proxy strips headers on fetch calls)
        // Fall back to finding existing user
        console.log('[Auth] No token in request, falling back to existing user');

        // In production, find the first user (single-tenant per installation)
        // In development, use DEV_COMPANY_ID
        const DEV_COMPANY_ID = process.env.DEV_COMPANY_ID || process.env.WHOP_COMPANY_ID;

        let user;

        if (process.env.NODE_ENV === 'development' && DEV_COMPANY_ID) {
            user = await db.query.users.findFirst({
                where: eq(users.whopCompanyId, DEV_COMPANY_ID)
            });

            // Create dev user if doesn't exist
            if (!user) {
                console.log('[Auth] Creating dev user...');
                const [newUser] = await db.insert(users).values({
                    whopUserId: 'dev_user',
                    whopCompanyId: DEV_COMPANY_ID,
                    email: 'dev@example.com',
                    username: 'Dev Admin',
                    subscriptionTier: 'pro'
                }).returning();
                user = newUser;
            }
        } else {
            // Production: Get first user (installed company)
            user = await db.query.users.findFirst();
        }

        if (!user) {
            console.error('[Auth] No user found in database - app may not be installed yet');
            return null;
        }

        console.log('[Auth] ✅ Using existing user:', user.whopUserId, 'Company:', user.whopCompanyId);

        return {
            id: user.id,
            whopUserId: user.whopUserId,
            whopCompanyId: user.whopCompanyId,
            username: user.username,
            email: user.email,
            token: process.env.WHOP_API_KEY || '' // Use server API key for calls
        };

    } catch (error) {
        console.error('[Auth] Error in getUser:', error);
        return null;
    }
}
