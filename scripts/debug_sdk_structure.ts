
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspect() {
    // Dynamic import to ensure env vars are loaded first
    const { whopClient } = await import('../src/lib/whop/client');

    console.log('--- Client Keys ---');
    console.log(Object.keys(whopClient));

    console.log('\n--- Memberships Keys ---');
    if (whopClient.memberships) {
        console.log(Object.keys(whopClient.memberships));
    } else {
        console.log('whopClient.memberships is undefined');
    }

    console.log('\n--- Messages Keys ---');
    if ((whopClient as any).messages) {
        console.log('whopClient.messages exists');
    }
    if ((whopClient as any).chatMessages) { // The one throwing error
        console.log('whopClient.chatMessages exists');
    }

    console.log('\n--- Testing Membership List Params ---');
    try {
        // Try with limit/cursor guess
        console.log('Calling list({ limit: 1 })...');
        const response: any = await whopClient.memberships.list({ limit: 1 } as any);
        console.log('Response Keys:', Object.keys(response));
        if (response.pagination) console.log('Response.pagination:', response.pagination);
        if (response.meta) console.log('Response.meta:', response.meta);
        if (response.cursor) console.log('Response.cursor:', response.cursor);
    } catch (e: any) {
        console.log('Error calling list:', e.message);
    }
}

inspect();
