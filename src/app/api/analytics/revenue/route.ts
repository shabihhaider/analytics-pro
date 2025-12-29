
import { NextResponse } from 'next/server';
import { calculateMRR } from '@/lib/whop/revenue';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // middleware handles auth, so if we are here we are good (or in dev mode)

        // 1. Calculate MRR
        const mrrByCurrency = await calculateMRR();

        // 2. Get Active Subscription Count
        const activeSubs = await db
            .select({ count: sql<number>`count(*)` })
            .from(members)
            .where(sql`${members.status} = 'active' OR ${members.status} = 'trialing'`);

        return NextResponse.json({
            mrr: mrrByCurrency, // { usd: 1234.56 }
            activeMembers: activeSubs[0].count,
            // Future: churnRate, historical charts
        });

    } catch (error) {
        console.error('Error in revenue stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
