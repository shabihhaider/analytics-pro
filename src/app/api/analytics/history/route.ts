import { db } from '@/lib/db';
import { revenueMetrics } from '@/lib/db/schema';
import { eq, asc, and, gte } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';
import { getTierLimits } from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await getUser(request);
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get tier limits for history days
        const limits = getTierLimits(user.subscriptionTier);
        const daysLimit = limits.historyDays === Infinity ? 365 : limits.historyDays;

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysLimit);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const history = await db.query.revenueMetrics.findMany({
            where: and(
                eq(revenueMetrics.userId, user.id),
                gte(revenueMetrics.date, cutoffDateStr)
            ),
            orderBy: [asc(revenueMetrics.date)],
            limit: daysLimit,
        });

        return Response.json({
            history,
            daysShown: history.length,
            maxDays: limits.historyDays === Infinity ? null : limits.historyDays,
            tier: user.subscriptionTier || 'free'
        });
    } catch (error) {
        console.error('Failed to fetch revenue history:', error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
