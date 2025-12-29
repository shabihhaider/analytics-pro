
import { db } from '../src/lib/db';
import { members } from '../src/lib/db/schema';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

// Load env vars
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Checking Members Table...');

    // Check database connection string
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }

    const allMembers = await db.select().from(members);

    console.log(`Found ${allMembers.length} members in DB:`);
    allMembers.forEach(m => {
        console.log(`- MemberID: ${m.whopMemberId}`);
        console.log(`  PlanID: ${m.planId}`);
        console.log(`  Status: ${m.status}`);
        console.log(`  RenewalPrice: ${m.renewalPrice} (Currency: ${m.currency})`);
        console.log('---');
    });

    process.exit(0);
}

main().catch(console.error);
