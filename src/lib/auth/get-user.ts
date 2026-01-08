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
 * Helper to decode JWT payload without verification.
 * Safe because we only use it to extract the company_id for data scoping.
 * The JWT was already verified by Whop's proxy.
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

/**
 * Get the authenticated user for an API request.
 * 
 * MULTI-TENANCY APPROACH:
 * 1. Try to get token from headers (works on initial page load)
 * 2. Try to get companyId from query params (passed by client from JWT)
 * 3. In development, use DEV_COMPANY_ID env var
 * 
 * Each company gets their own isolated data via user_id scoping.
 */
export async function getUser(request?: Request): Promise<AuthenticatedUser | null> {
    try {
        let companyId: string | null = null;
        let whopUserId: string | null = null;
        let email: string | null = null;
        let username: string | null = null;
        let token: string = '';

        // Method 1: Try to get token from headers (initial page load)
        const headerToken = request?.headers.get('x-whop-user-token');
        if (headerToken) {
            token = headerToken;
            const payload = decodeJwtPayload(headerToken);
            if (payload) {
                companyId = payload.company_id || payload.companyId || payload.aud;
                whopUserId = payload.sub || payload.user_id || payload.userId;
                email = payload.email;
                username = payload.username;
                console.log('[Auth] Got companyId from token:', companyId);
            }
        }

        // Method 2: Try to get companyId from query params (client-side API calls)
        if (!companyId && request) {
            const url = new URL(request.url);
            companyId = url.searchParams.get('companyId');
            if (companyId) {
                console.log('[Auth] Got companyId from query param:', companyId);
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
            console.log('[Auth] ✅ Found existing user:', user.id, 'for company:', companyId);
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
