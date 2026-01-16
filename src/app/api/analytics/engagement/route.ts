import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { engagementMetrics, members } from '@/lib/db/schema';
import { desc, eq, sql, and, isNotNull } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Authenticate user first
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date().toISOString().split('T')[0];

        // 1. Average Engagement Score for all members of this user's company
        const avgScoreResult = await db
            .select({
                avgScore: sql<number>`coalesce(avg(${engagementMetrics.engagementScore}), 0)`,
                activeCount: sql<number>`count(distinct ${engagementMetrics.memberId})`
            })
            .from(engagementMetrics)
            .where(
                and(
                    eq(engagementMetrics.date, today),
                    eq(engagementMetrics.userId, user.id)
                )
            );

        const stats = avgScoreResult[0] || { avgScore: 0, activeCount: 0 };

        // 2. Top Engaged MEMBERS (not users/creators)
        // Join with members table to get subscriber info
        const topMembers = await db
            .select({
                memberId: members.whopMemberId,
                username: members.email, // Use email as identifier (or could add username to members)
                score: engagementMetrics.engagementScore,
                messages: engagementMetrics.messageCount,
                lastActive: engagementMetrics.lastActiveAt,
            })
            .from(engagementMetrics)
            .innerJoin(members, eq(engagementMetrics.memberId, members.id))
            .where(
                and(
                    eq(engagementMetrics.date, today),
                    eq(engagementMetrics.userId, user.id),
                    isNotNull(engagementMetrics.engagementScore)
                )
            )
            .orderBy(desc(engagementMetrics.engagementScore))
            .limit(10);

        // Format leaderboard with better username display
        const leaderboard = topMembers.map((m, i) => ({
            userId: m.memberId,
            username: m.username?.split('@')[0] || `Member ${i + 1}`, // Use email prefix as username
            score: m.score || '0',
            messages: m.messages || 0,
            lastActive: m.lastActive
        }));

        return NextResponse.json({
            date: today,
            stats: {
                averageScore: Number(stats.avgScore || 0).toFixed(1),
                activeUsers: Number(stats.activeCount || 0)
            },
            leaderboard
        });

    } catch (error) {
        console.error('Error fetching engagement analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
