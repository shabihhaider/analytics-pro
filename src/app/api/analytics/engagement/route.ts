import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { engagementMetrics, members, users } from '@/lib/db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // ✅ AUTHENTICATE USER FIRST
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch Today's Stats
        const today = new Date().toISOString().split('T')[0];

        // 1. Average Engagement Score
        const avgScoreResult = await db
            .select({
                avgScore: sql<number>`avg(${engagementMetrics.engagementScore})`,
                activeUsers: sql<number>`count(${engagementMetrics.userId})`
            })
            .from(engagementMetrics)
            .where(
                and(
                    eq(engagementMetrics.date, today),
                    eq(engagementMetrics.userId, user.id) // ← SCOPED!
                )
            );

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
            .where(
                and(
                    eq(engagementMetrics.date, today),
                    eq(engagementMetrics.userId, user.id) // ← SCOPED!
                )
            )
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
