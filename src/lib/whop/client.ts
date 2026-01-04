
import { Whop } from '@whop/sdk';

if (!process.env.WHOP_API_KEY) {
    throw new Error('WHOP_API_KEY is not defined in environment variables');
}

/**
 * Create a Whop client dynamically.
 * @param token - Optional user token for authenticated requests.
 */
// Official Whop SDK pattern
export const whopClient = new Whop({
    apiKey: process.env.WHOP_API_KEY!,
    appID: process.env.NEXT_PUBLIC_WHOP_APP_ID
});

/**
 * Verify user token from request headers (official method)
 */
export async function verifyWhopUserToken(headers: Headers): Promise<{ userId: string }> {
    const token = headers.get('x-whop-user-token');

    if (!token) {
        throw new Error('No token found in headers');
    }

    try {
        // Use the official SDK method
        return await whopClient.verifyUserToken(token);
    } catch (error) {
        console.error('[Whop] Token verification failed:', error);
        throw error;
    }
}

/**
 * Extract company ID from a user token.
 */
export async function getCompanyIdFromToken(token: string): Promise<string> {
    try {
        const user = await whopClient.users.retrieve('me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const userData = user as any;

        if (!userData.company_id && !userData.companyId) {
            throw new Error('No company_id found on user object');
        }
        return userData.company_id || userData.companyId;
    } catch (error) {
        console.error('[Whop] Error extracting company ID:', error);
        throw error;
    }
}

/**
 * Verify Whop connection for a specific company
 */
export async function verifyWhopConnection(companyId: string): Promise<boolean> {
    try {
        const response = await whopClient.companies.retrieve(companyId);
        // Cast to any to avoid 'name' property issue if type definition is partial
        console.log('✅ Whop connection verified for:', (response as any).name || companyId);
        return true;
    } catch (error) {
        console.error('❌ Whop connection failed:', error);
        return false;
    }
}
