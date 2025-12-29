
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, engagementMetrics, users } from '@/lib/db/schema';
import { sql, eq, and, desc, lt } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Heuristic:
        // 1. Get latest engagement snapshot for each member
        // 2. Risk Evaluation:
        //    - High: Inactive > 14 days OR message_count = 0 (Total lifetime? Or recent?)
        //    - Medium: Inactive > 3 days

        // Complex query: Join Members -> Users -> Engagement Metrics
        // For MVP: We will scan the `members` table and check `lastActiveAt` from a join or subquery.
        // Actually, schema `engagement_metrics` has `lastActiveAt`.
        // Let's rely on finding members who are ACTIVE status but have old activity.

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        // Fetch active members with their latest engagement stats
        // We really need a "current user state" table, but we can infer from `members` link.
        // Simplified: Fetch all active members, then join with their 'latest' engagement metric.
        // Or better: `engagement_metrics` stores daily snapshots. Queries are tricky.

        // Faster Approach for MVP:
        // We added `lastActiveAt` to the engagement_metrics daily row, but not the member row.
        // Wait, schema check: `engagementMetrics` has `lastActiveAt`.
        // We should probably add `lastActiveAt` to `members` for easier indexing, but for now:
        // Query `engagement_metrics` ordered by date DESC distinct on memberId?
        // OR: Just query the `engagement_metrics` for TODAY/YESTERDAY to see active.

        // Let's change strategy:
        // The Sync Engine updates `engagement_metrics` with `lastActiveAt`.
        // We will fetch the *latest* `engagement_metric` for each user.

        const allMembers = await db.query.members.findMany({
            where: eq(members.status, 'active'),
            with: {
                user: true,
                // We'd want the LATEST metric, but relation is "many".
                // We'll fetch metrics separately or do logic in code if dataset is small (<1000).
                // Join is better.
            }
        });

        // Get latest engagement for these members
        const riskList = [];

        for (const member of allMembers) {
            // Find latest metric
            const latestMetric = await db.query.engagementMetrics.findFirst({
                where: eq(engagementMetrics.memberId, member.id),
                orderBy: [desc(engagementMetrics.date)]
            });

            const lastActive = latestMetric?.lastActiveAt || member.joinedAt || new Date(0);
            const daysSinceActive = (new Date().getTime() - lastActive.getTime()) / (1000 * 3600 * 24);

            let riskLevel = 'low';
            if (daysSinceActive > 14) riskLevel = 'high';
            else if (daysSinceActive > 3) riskLevel = 'medium';

            // Also check for 0 messages if we have data
            if (latestMetric && latestMetric.messageCount === 0 && daysSinceActive > 7) {
                riskLevel = 'high';
            }

            if (riskLevel !== 'low') {
                riskList.push({
                    memberId: member.whopMemberId,
                    username: member.user?.username || 'Unknown',
                    avatarUrl: '', // SDK doesn't give avatar on member list easily without extra call
                    riskLevel,
                    daysInactive: Math.floor(daysSinceActive),
                    renewalPrice: member.renewalPrice,
                    currency: member.currency
                });
            }
        }

        // Sort: High Risk + High Value first
        riskList.sort((a, b) => {
            if (a.riskLevel === 'high' && b.riskLevel !== 'high') return -1;
            if (b.riskLevel === 'high' && a.riskLevel !== 'high') return 1;
            return parseFloat(b.renewalPrice || '0') - parseFloat(a.renewalPrice || '0');
        });

        return NextResponse.json({ riskList });

    } catch (error) {
        console.error('Error in churn risk:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
