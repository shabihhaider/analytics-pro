import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWhopUserToken, getCompanyIdFromToken } from '@/lib/whop/client';

interface AuthenticatedUser {
    id: string;
    whopUserId: string;
    whopCompanyId: string;
    username: string | null;
    email: string | null;
    token: string;
}

export async function getUser(request?: Request): Promise<AuthenticatedUser | null> {
    try {
        // Development mode fallback
        if (process.env.NODE_ENV === 'development' && !request) {
            const DEV_COMPANY_ID = process.env.DEV_COMPANY_ID || process.env.WHOP_COMPANY_ID;

            if (!DEV_COMPANY_ID) {
                throw new Error('DEV_COMPANY_ID or WHOP_COMPANY_ID required for development mode');
            }

            let user = await db.query.users.findFirst({
                where: eq(users.whopCompanyId, DEV_COMPANY_ID)
            });

            if (!user) {
                const [newUser] = await db.insert(users).values({
                    whopUserId: 'dev_user',
                    whopCompanyId: DEV_COMPANY_ID,
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
                token: process.env.WHOP_API_KEY || ''
            };
        }

        if (!request) {
            return null;
        }

        // Extract token from headers (Whop sends it in x-whop-user-token)
        const token = request.headers.get('x-whop-user-token');

        if (!token) {
            console.error('[Auth] No x-whop-user-token header found');
            return null;
        }

        // Verify token using official SDK method
        const { userId: whopUserId } = await verifyWhopUserToken(request.headers);

        // Get company ID from token
        const companyId = await getCompanyIdFromToken(token);

        console.log('[Auth] Authenticated user:', whopUserId, 'Company:', companyId);

        // Get or create user in database
        let user = await db.query.users.findFirst({
            where: eq(users.whopCompanyId, companyId)
        });

        if (!user) {
            // Create new user
            const [newUser] = await db.insert(users).values({
                whopUserId: whopUserId,
                whopCompanyId: companyId,
                email: null,
                username: 'User',
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
            token: token
        };

    } catch (error) {
        console.error('[Auth] Error in getUser:', error);
        return null;
    }
}
