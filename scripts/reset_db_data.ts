
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function clear() {
    console.log('Clearing all synced data...');

    // Dynamic import to ensure env vars are loaded
    const { db } = await import('../src/lib/db');
    const { revenueMetrics, engagementMetrics, members } = await import('../src/lib/db/schema');

    await db.delete(revenueMetrics).execute();
    await db.delete(engagementMetrics).execute();
    await db.delete(members).execute(); // Optional: Clear members to force fresh sync
    console.log('✅ Cleared all data');
}

clear();
