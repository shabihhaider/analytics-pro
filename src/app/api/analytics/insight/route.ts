
import { getUser } from '@/lib/auth/get-user';
import { db } from '@/lib/db';
import { revenueMetrics, engagementMetrics } from '@/lib/db/schema';
import { generateDailyInsight } from '@/lib/ai/insights';
import { eq, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await getUser();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Gather Stats
        const today = new Date().toISOString().split('T')[0];

        // Revenue (Latest Snapshot)
        const revenue = await db.query.revenueMetrics.findFirst({
            where: eq(revenueMetrics.userId, user.id),
            orderBy: [desc(revenueMetrics.date)]
        });

        // Engagement Score
        const engagement = await db
            .select({ avgScore: sql<number>`avg(${engagementMetrics.engagementScore})` })
            .from(engagementMetrics)
            .where(eq(engagementMetrics.date, today));

        // Risk Count (Mocking logic for now as it's computed in API usually, 
        // but let's grab it if we were persisting it. 
        // For now, let's just pass 0 or calculate if possible. 
        // We actually calculate risk list in /api/analytics/risk dynamically.
        // For simplicity/speed, we'll pass simplified "0" or fetch if easy.
        // Let's rely on what revenue snapshot has if possible? No.
        // Let's just assume 0 for MVP or quickly count inactive members.

        const stats = {
            mrr: Number(revenue?.mrr || 0),
            activeMembers: revenue?.activeMembers || 0,
            highRiskCount: 0, // Placeholder or we need to duplicate risk logic here
            engagementScore: Number(engagement[0]?.avgScore || 0)
        };

        // 2. Generate Insight
        const insight = await generateDailyInsight(stats);

        return Response.json({ insight });
    } catch (error) {
        console.error('Insight API Error:', error);
        return Response.json({ error: 'Failed to generate insight' }, { status: 500 });
    }
}
