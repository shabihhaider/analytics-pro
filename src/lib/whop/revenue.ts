
import { db } from '@/lib/db';
import { members, revenueMetrics } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';

/**
 * Calculates Monthly Recurring Revenue (MRR) from active memberships.
 * Returns a map of Currency -> MRR Amount
 */
export async function calculateMRR() {
    // Aggregation: Sum renewal_price WHERE status = 'active' GROUP BY currency
    const result = await db
        .select({
            currency: members.currency,
            mrr: sql<number>`sum(${members.renewalPrice})`.mapWith(Number)
        })
        .from(members)
        // Count ACTIVE and TRIALING subscriptions
        .where(sql`${members.status} = 'active' OR ${members.status} = 'trialing'`)
        .groupBy(members.currency);

    // Transform to friendly object: { usd: 5000, eth: 1.2 }
    const mrrByCurrency: Record<string, number> = {};
    result.forEach(row => {
        const cur = row.currency?.toLowerCase() || 'usd';
        mrrByCurrency[cur] = row.mrr || 0;
    });

    return mrrByCurrency;
}

/**
 * Snapshots the current MRR into the revenue_metrics table for historical tracking.
 * Typically run once a day by a cron job or sync trigger.
 */
export async function snapshotRevenueMetrics(userId: string) {
    const mrrData = await calculateMRR();

    // For MVP, we primarily track USD. 
    // If multi-currency support expands, we'd need multiple rows or a json column.
    // Here we default to storing the 'usd' value in the main column.
    const usdMrr = mrrData['usd'] || 0;

    const today = new Date().toISOString().split('T')[0];

    await db.insert(revenueMetrics).values({
        userId,
        date: today,
        mrr: usdMrr.toString(),
        totalRevenue: usdMrr.toString(), // Simplified for MVP
    }).onConflictDoUpdate({
        target: [revenueMetrics.id], // Note: Schema needs composite key for proper upsert if strictly by date
        set: {
            mrr: usdMrr.toString(),
            // updatedAt not in schema, removing
        }
    });
}
