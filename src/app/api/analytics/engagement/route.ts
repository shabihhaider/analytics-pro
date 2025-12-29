import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { engagementMetrics, members, users } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // In a real app, verify user session/auth here using headers() or middleware context
        // const token = req.headers.get('x-whop-user-token');

        // Fetch Today's Stats
        const today = new Date().toISOString().split('T')[0];

        // 1. Average Engagement Score
        const avgScoreResult = await db
            .select({
                avgScore: sql<number>`avg(${engagementMetrics.engagementScore})`,
                activeUsers: sql<number>`count(${engagementMetrics.userId})`
            })
            .from(engagementMetrics)
            .where(eq(engagementMetrics.date, today));

        const stats = avgScoreResult[0] || { avgScore: 0, activeUsers: 0 };

        // 2. Top Engaged Members
        const topMembers = await db
            .select({
                username: users.username,
                whopUserId: users.whopUserId,
                score: engagementMetrics.engagementScore,
                messages: engagementMetrics.messageCount,
                lastActive: engagementMetrics.lastActiveAt,
            })
            .from(engagementMetrics)
            .innerJoin(users, eq(engagementMetrics.userId, users.id))
            .where(eq(engagementMetrics.date, today))
            .orderBy(desc(engagementMetrics.engagementScore))
            .limit(10);

        return NextResponse.json({
            date: today,
            stats: {
                averageScore: Number(stats.avgScore).toFixed(1),
                activeUsers: stats.activeUsers
            },
            leaderboard: topMembers
        });

    } catch (error) {
        console.error('Error fetching engagement analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
