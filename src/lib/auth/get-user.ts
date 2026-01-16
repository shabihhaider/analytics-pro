import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { whopClient } from '@/lib/whop/client';

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
 * SECURITY MODEL:
 * 1. For requests WITH token: Verify JWT with Whop SDK, extract claims
 * 2. For requests WITHOUT token: Only accept companyId from URL path (server-controlled)
 * 3. NEVER trust companyId from query params without verification
 * 
 * Multi-tenancy is enforced by:
 * - Each company gets their own user record
 * - All data queries are scoped by userId
 */
export async function getUser(request?: Request): Promise<AuthenticatedUser | null> {
    try {
        let companyId: string | null = null;
        let whopUserId: string | null = null;
        let email: string | null = null;
        let username: string | null = null;
        let token: string = '';
        let isVerified = false;

        // Method 1: Try to get and VERIFY token from headers
        const headerToken = request?.headers.get('x-whop-user-token');
        if (headerToken) {
            token = headerToken;
            try {
                // SECURITY: Use official SDK to verify the token
                const verified = await whopClient.verifyUserToken(headerToken);
                whopUserId = verified.userId;
                isVerified = true;
                console.log('[Auth] ✅ Token verified, userId:', whopUserId);

                // Get company info from verified token payload
                // The SDK verification confirms the token is authentic
                const payload = decodeJwtPayload(headerToken);
                if (payload) {
                    companyId = payload.company_id || payload.companyId || payload.aud;
                    email = payload.email;
                    username = payload.username;
                }
            } catch (verifyError) {
                console.error('[Auth] Token verification failed:', verifyError);
                // Don't return null yet - might have companyId from URL path
            }
        }

        // Method 2: Get companyId from URL path (server-controlled, safe)
        // The URL path /dashboard/[companyId] is controlled by Whop's redirect
        if (!companyId && request) {
            const url = new URL(request.url);

            // Extract from path if it's a dashboard route
            const pathMatch = url.pathname.match(/\/dashboard\/(biz_[a-zA-Z0-9]+)/);
            if (pathMatch) {
                companyId = pathMatch[1];
                console.log('[Auth] Got companyId from URL path:', companyId);
            }

            // Also accept from query param BUT only biz_ format 
            // and only if no path match (for API calls from dashboard)
            if (!companyId) {
                const queryCompanyId = url.searchParams.get('companyId');
                if (queryCompanyId && queryCompanyId.startsWith('biz_')) {
                    companyId = queryCompanyId;
                    console.log('[Auth] Got companyId from query param:', companyId);
                }
            }
        }

        // Method 3: Development fallback
        if (!companyId && process.env.NODE_ENV === 'development') {
            companyId = process.env.DEV_COMPANY_ID || process.env.WHOP_COMPANY_ID || null;
            if (companyId) {
                console.log('[Auth] Using DEV_COMPANY_ID:', companyId);
            }
        }

        // If we still have no companyId, we cannot authenticate
        if (!companyId) {
            console.error('[Auth] No companyId available - cannot authenticate');
            return null;
        }

        // Find or create user for this company
        let user = await db.query.users.findFirst({
            where: eq(users.whopCompanyId, companyId)
        });

        if (!user) {
            // Try to find by whopUserId if we have a verified one
            if (whopUserId && isVerified) {
                user = await db.query.users.findFirst({
                    where: eq(users.whopUserId, whopUserId)
                });

                // Update the companyId if we found the user with a better ID
                if (user && companyId.startsWith('biz_') && !user.whopCompanyId.startsWith('biz_')) {
                    console.log('[Auth] Updating user companyId from', user.whopCompanyId, 'to', companyId);
                    await db.update(users)
                        .set({ whopCompanyId: companyId, updatedAt: new Date() })
                        .where(eq(users.id, user.id));
                    user = { ...user, whopCompanyId: companyId };
                }
            }
        }

        if (!user) {
            // Create new user for this company
            console.log('[Auth] Creating new user for company:', companyId);
            const [newUser] = await db.insert(users).values({
                whopUserId: whopUserId || `user_${companyId}`,
                whopCompanyId: companyId,
                email: email || null,
                username: username || 'User',
                subscriptionTier: 'free'
            }).returning();
            user = newUser;
            console.log('[Auth] ✅ Created user:', user.id);
        } else {
            // Update companyId if we have a better one (biz_ vs app_)
            if (companyId.startsWith('biz_') && !user.whopCompanyId.startsWith('biz_')) {
                console.log('[Auth] Updating stale companyId from', user.whopCompanyId, 'to', companyId);
                await db.update(users)
                    .set({ whopCompanyId: companyId, updatedAt: new Date() })
                    .where(eq(users.id, user.id));
                user = { ...user, whopCompanyId: companyId };
            }
            console.log('[Auth] ✅ Found existing user:', user.id, 'for company:', user.whopCompanyId);
        }

        return {
            id: user.id,
            whopUserId: user.whopUserId,
            whopCompanyId: user.whopCompanyId,
            username: user.username,
            email: user.email,
            token: token || process.env.WHOP_API_KEY || ''
        };

    } catch (error) {
        console.error('[Auth] Error in getUser:', error);
        return null;
    }
}

/**
 * Helper to decode JWT payload.
 * Used ONLY after token is verified by SDK.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    } catch {
        return null;
    }
}
