import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createWhopClient, getCompanyIdFromToken } from '@/lib/whop/client';

interface AuthenticatedUser {
    id: string;
    whopUserId: string;
    whopCompanyId: string;
    username: string | null;
    email: string | null;
    token: string; // We need to store this to make API calls on behalf of the user
}

export async function getUser(request?: Request): Promise<AuthenticatedUser | null> {
    try {
        // Extract token from request headers
        let token: string | null = null;

        if (request) {
            // Priority 1: x-whop-user-token header (set by middleware)
            token = request.headers.get('x-whop-user-token');

            // Priority 2: Authorization Bearer header (set by client fetch)
            if (!token) {
                const authHeader = request.headers.get('authorization');
                if (authHeader?.startsWith('Bearer ')) {
                    token = authHeader.substring(7);
                }
            }
        }

        // Development mode fallback
        if (!token && process.env.NODE_ENV === 'development') {
            console.log('[Auth] ⚠️ Development mode: No token provided');
            console.log('[Auth] In production, token MUST be present');

            // For local dev, you can still use a hardcoded company for testing
            // But make it clear this is dev mode only
            const DEV_COMPANY_ID = process.env.DEV_COMPANY_ID;

            if (!DEV_COMPANY_ID) {
                // If DEV_COMPANY_ID is missing, we can try to fallback to WHOP_COMPANY_ID for backward compat during migration
                // But ideally we want to enforce the new env var
                const legacy = process.env.WHOP_COMPANY_ID;
                if (!legacy) throw new Error('DEV_COMPANY_ID required for development mode');
                console.warn('[Auth] Using legacy WHOP_COMPANY_ID as DEV_COMPANY_ID');
            }

            const targetCompanyId = process.env.DEV_COMPANY_ID || process.env.WHOP_COMPANY_ID!;

            // Get or create dev user
            let user = await db.query.users.findFirst({
                where: eq(users.whopCompanyId, targetCompanyId)
            });

            if (!user) {
                const [newUser] = await db.insert(users).values({
                    whopUserId: 'dev_user',
                    whopCompanyId: targetCompanyId,
                    email: 'dev@example.com',
                    username: 'Dev Admin',
                    subscriptionTier: 'pro'
                }).returning();
                user = newUser;
            }

            return {
                id: user.id,
                whopUserId: user.whopUserId,
                whopCompanyId: user.whopCompanyId,
                username: user.username,
                email: user.email,
                token: '' // Empty string so client uses WHOP_API_KEY from env
            };
        }

        if (!token) {
            return null;
        }

        // === CRITICAL: Extract the company ID from the token ===
        // This makes your app multi-tenant!
        const companyId = await getCompanyIdFromToken(token);
        console.log('[Auth] Authenticated for company:', companyId);

        // Get or create user in database for this company
        let user = await db.query.users.findFirst({
            where: eq(users.whopCompanyId, companyId)
        });

        if (!user) {
            // Get user details from Whop
            const client = createWhopClient(token);
            // Fix: 'me' does not exist, use retrieve('me')
            const whopUser = await client.users.retrieve('me') as any;

            // Create new user in database
            const [newUser] = await db.insert(users).values({
                whopUserId: whopUser.id,
                whopCompanyId: companyId,
                email: whopUser.email || null,
                username: whopUser.username || 'User',
                subscriptionTier: 'free'
            }).returning();

            user = newUser;
            console.log('[Auth] Created new user for company:', companyId);
        }

        return {
            id: user.id,
            whopUserId: user.whopUserId,
            whopCompanyId: user.whopCompanyId,
            username: user.username,
            email: user.email,
            token: token // Store token for API calls
        };

    } catch (error) {
        console.error('[Auth] Error in getUser:', error);
        return null;
    }
}
