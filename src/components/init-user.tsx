import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

/**
 * Server Component that initializes the user session during page load.
 * 
 * This component:
 * 1. Extracts the x-whop-user-token from headers (available on initial page load)
 * 2. Creates or updates the user in the database
 * 3. This allows subsequent API calls (which don't have the token) to find the user
 */
export async function InitUser() {
    try {
        const headersList = headers();
        const token = headersList.get('x-whop-user-token');

        if (!token) {
            console.log('[InitUser] No token on initial load');
            return null;
        }

        console.log('[InitUser] Token present, initializing user...');

        // Decode JWT to extract user info (without verification - Whop already verified)
        // JWT format: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('[InitUser] Invalid JWT format');
            return null;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        console.log('[InitUser] JWT payload:', JSON.stringify(payload, null, 2));

        // Extract user info from JWT
        // Whop JWT typically has: sub (user_id), company_id, etc.
        const whopUserId = payload.sub || payload.user_id || payload.userId || 'unknown';
        const companyId = payload.company_id || payload.companyId || payload.aud || process.env.WHOP_COMPANY_ID;

        if (!companyId) {
            console.error('[InitUser] No company_id in JWT');
            return null;
        }

        // Check if user exists
        let user = await db.query.users.findFirst({
            where: eq(users.whopCompanyId, companyId)
        });

        if (!user) {
            // Create new user
            console.log('[InitUser] Creating new user for company:', companyId);
            const [newUser] = await db.insert(users).values({
                whopUserId: whopUserId,
                whopCompanyId: companyId,
                email: payload.email || null,
                username: payload.username || 'User',
                subscriptionTier: 'free'
            }).returning();
            user = newUser;
            console.log('[InitUser] ✅ Created user:', user.id);
        } else {
            console.log('[InitUser] ✅ Found existing user:', user.id);
        }

        return null; // This is a server component, renders nothing
    } catch (error) {
        console.error('[InitUser] Error:', error);
        return null;
    }
}
