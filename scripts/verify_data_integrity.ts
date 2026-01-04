import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
    console.log('Verifying Database Integrity...');

    // Dynamic import to ensure env vars are loaded first
    const { db } = await import('../src/lib/db');
    const { members, engagementMetrics, revenueMetrics } = await import('../src/lib/db/schema');

    const memberCount = await db.select().from(members);
    const engagementCount = await db.select().from(engagementMetrics);
    const revenueCount = await db.select().from(revenueMetrics);

    console.log('Members in DB:', memberCount.length);
    console.log('Engagement records:', engagementCount.length);
    console.log('Revenue snapshots:', revenueCount.length);

    if (memberCount.length === 0) {
        console.warn('⚠️ NO MEMBERS IN DATABASE! Run sync first.');
    } else {
        console.log('✅ Database contains member data');
    }
}

verify();
