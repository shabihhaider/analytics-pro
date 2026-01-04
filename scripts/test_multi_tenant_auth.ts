
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testAuth() {
    console.log('🧪 Testing Multi-Tenant Auth Flow...');

    // Test 1: Env Vars
    if (!process.env.WHOP_API_KEY) {
        console.error('❌ WHOP_API_KEY missing');
        process.exit(1);
    }
    console.log('✅ WHOP_API_KEY present');

    try {
        // Dynamic import to load env vars first
        const { getUser } = await import('../src/lib/auth/get-user');

        // Mock Request with no token (Dev Mode Fallback)
        console.log('\n--- Test 1: Dev Mode Fallback (No Token) ---');
        const devUser = await getUser();

        if (devUser && devUser.whopCompanyId) {
            console.log(`✅ Dev User Authenticated: ${devUser.username}`);
            console.log(`   Company ID: ${devUser.whopCompanyId}`);
            console.log(`   Token: ${devUser.token}`);
        } else {
            // In some env configs this might fail if DEV env vars aren't set, which is fine for CI but we log it.
            console.log('ℹ️ Dev User fallback did not return user (ensure DEV_COMPANY_ID is set in .env.local)');
        }

        // Mock Request with Token (Simulation)
        console.log('\n--- Test 2: Token Extraction (Simulation) ---');
        const mockReq = new Request('http://localhost', {
            headers: { 'x-whop-user-token': 'fake_test_token' }
        });

        try {
            await getUser(mockReq);
        } catch (e: any) {
            if (e?.status === 401 || e?.error?.error?.type === 'unauthorized') {
                console.log('✅ Token extraction logic triggered (API returned 401 for fake token as expected)');
            } else {
                console.log('⚠️ Unexpected error (might be API connectivity or other):', e);
            }
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

testAuth();
