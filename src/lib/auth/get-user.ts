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

export async function getUser(request?: Request): Promise<AuthenticatedUser | null> {
    try {
        // Development mode fallback
        if (process.env.NODE_ENV === 'development' && !request) {
            const DEV_COMPANY_ID = process.env.DEV_COMPANY_ID || process.env.WHOP_COMPANY_ID;

            if (!DEV_COMPANY_ID) {
                console.error('[Auth] DEV_COMPANY_ID required in development');
                return null;
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
            console.error('[Auth] No request provided');
            return null;
        }

        // Extract token from headers
        const token = request.headers.get('x-whop-user-token');

        if (!token) {
            console.error('[Auth] No x-whop-user-token header found');
            return null;
        }

        // Verify token with Whop
        const verificationResult = await whopClient.verifyUserToken(token);
        const whopUserId = verificationResult.userId;

        // Get user info to extract company ID
        const userInfo = await whopClient.users.retrieve('me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const companyId = (userInfo as any).company_id || (userInfo as any).companyId;

        if (!companyId) {
            console.error('[Auth] No company_id found on user');
            return null;
        }

        console.log('[Auth] ✅ Authenticated:', whopUserId, 'Company:', companyId);

        // Get or create user in database
        let user = await db.query.users.findFirst({
            where: eq(users.whopCompanyId, companyId)
        });

        if (!user) {
            const [newUser] = await db.insert(users).values({
                whopUserId: whopUserId,
                whopCompanyId: companyId,
                email: (userInfo as any).email || null,
                username: (userInfo as any).username || 'User',
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
