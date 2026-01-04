
import { Whop } from '@whop/sdk';

if (!process.env.WHOP_API_KEY) {
    throw new Error('WHOP_API_KEY is not defined in environment variables');
}

/**
 * Create a Whop client dynamically.
 * @param token - Optional user token for authenticated requests.
 */
export function createWhopClient(token?: string) {
    return new Whop({
        apiKey: token || process.env.WHOP_API_KEY!
    });
}

// Default client using the server-side key
export const whopClient = createWhopClient();

/**
 * Extract company ID from a user token.
 */
export async function getCompanyIdFromToken(token: string): Promise<string> {
    try {
        const client = createWhopClient(token);
        const user = await client.users.retrieve('me');

        // Type definition might be missing company_id or using camelCase
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
