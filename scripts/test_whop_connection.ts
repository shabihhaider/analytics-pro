
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing Whop Connection...');

    // Dynamic import to ensure env vars are loaded first
    const { verifyWhopConnection } = await import('../src/lib/whop/client');

    const companyId = process.env.DEV_COMPANY_ID;
    console.log('Using Company ID for test:', companyId);

    if (!process.env.WHOP_API_KEY) {
        console.error('❌ WHOP_API_KEY missing');
        process.exit(1);
    }

    if (!companyId) {
        console.warn('⚠️ No DEV_COMPANY_ID found. Cannot verify connection to specific company.');
        console.log('Skipping company verification check.');
        return;
    }

    const connected = await verifyWhopConnection(companyId);
    if (!connected) {
        console.error('❌ Whop connection failed!');
        process.exit(1);
    }
    console.log('✅ Whop connection successful');
}

test();
