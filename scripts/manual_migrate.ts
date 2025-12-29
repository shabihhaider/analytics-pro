import dotenv from 'dotenv';
import path from 'path';

// Try loading multiple env files
const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath }); // Override with local

console.log('Loading env from:', envPath);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('FATAL: DATABASE_URL is missing from environment.');
        process.exit(1);
    }

    console.log('Running manual migration...');

    try {
        await db.execute(sql`ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "renewal_price" numeric(10, 2) DEFAULT '0'`);
        console.log('Added column: renewal_price');

        await db.execute(sql`ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'usd'`);
        console.log('Added column: currency');

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

main();
