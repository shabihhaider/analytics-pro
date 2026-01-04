
import { db } from '@/lib/db';
import { members, revenueMetrics } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Calculate MRR by currency from active memberships (scoped to optional userId for multi-tenancy)
 */
export async function calculateMRR(userId?: string): Promise<Record<string, number>> {
    try {
        // Get all active members, filtered by userId if provided
        const activeMembers = await db.query.members.findMany({
            where: userId
                ? and(eq(members.status, 'active'), eq(members.userId, userId))
                : eq(members.status, 'active')
        });

        // Group by currency and sum renewal prices
        const mrrByCurrency: Record<string, number> = {};

        for (const member of activeMembers) {
            const currency = member.currency || 'usd';
            const price = parseFloat(member.renewalPrice || '0');

            if (!mrrByCurrency[currency]) {
                mrrByCurrency[currency] = 0;
            }

            mrrByCurrency[currency] += price;
        }

        return mrrByCurrency;

    } catch (error) {
        console.error('[Revenue] Error calculating MRR:', error);
        return { usd: 0 };
    }
}

/**
 * Create a snapshot of revenue metrics for today
 */
export async function snapshotRevenueMetrics(userId: string): Promise<void> {
    try {
        console.log(`[Revenue] Creating revenue snapshot for user ${userId}...`);

        // Calculate MRR (SCOPED to user)
        const mrrByCurrency = await calculateMRR(userId);
        const mrrUsd = mrrByCurrency.usd || 0;

        // Count active members (SCOPED to user)
        const activeMembersResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(members)
            .where(and(
                eq(members.status, 'active'),
                eq(members.userId, userId)
            ));

        const activeCount = Number(activeMembersResult[0]?.count || 0);

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Check if snapshot already exists for today
        const existing = await db.query.revenueMetrics.findFirst({
            where: and(
                eq(revenueMetrics.userId, userId),
                eq(revenueMetrics.date, today)
            )
        });

        if (existing) {
            // Update existing snapshot
            await db
                .update(revenueMetrics)
                .set({
                    mrr: mrrUsd.toString(),
                    activeMembers: activeCount,
                    totalRevenue: mrrUsd.toString()
                })
                .where(eq(revenueMetrics.id, existing.id));

            console.log('[Revenue] ✅ Updated revenue snapshot');
        } else {
            // Create new snapshot
            await db.insert(revenueMetrics).values({
                userId: userId,
                date: today,
                mrr: mrrUsd.toString(),
                activeMembers: activeCount,
                totalRevenue: mrrUsd.toString()
            });

            console.log('[Revenue] ✅ Created revenue snapshot');
        }

    } catch (error) {
        console.error('[Revenue] Error creating snapshot:', error);
        throw error;
    }
}
