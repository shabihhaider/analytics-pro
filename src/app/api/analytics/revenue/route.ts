
import { NextResponse } from 'next/server';
import { calculateMRR } from '@/lib/whop/revenue';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // ✅ AUTHENTICATE USER FIRST
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Calculate MRR for THIS USER ONLY
        const mrrByCurrency = await calculateMRR(user.id);

        // 2. Get Active Subscription Count for THIS USER ONLY
        // Note: Drizzle syntax for sql with logical AND inside where
        const activeSubs = await db
            .select({ count: sql<number>`count(*)` })
            .from(members)
            .where(
                and(
                    sql`${members.status} = 'active' OR ${members.status} = 'trialing'`,
                    eq(members.userId, user.id) // ← SCOPED!
                )
            );

        return NextResponse.json({
            mrr: mrrByCurrency,
            activeMembers: Number(activeSubs[0]?.count || 0),
        });

    } catch (error) {
        console.error('Error in revenue stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
