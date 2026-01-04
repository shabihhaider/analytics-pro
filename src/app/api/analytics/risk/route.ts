
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, engagementMetrics } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // ✅ AUTHENTICATE USER FIRST
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ✅ FETCH ONLY THIS USER'S MEMBERS
        const allMembers = await db.query.members.findMany({
            where: eq(members.userId, user.id), // ← SCOPED!
            with: {
                user: true,
            }
        });

        const riskList = [];

        for (const member of allMembers) {
            // Only analyze active members
            if (member.status !== 'active') continue;

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

            if (latestMetric && latestMetric.messageCount === 0 && daysSinceActive > 7) {
                riskLevel = 'high';
            }

            if (riskLevel !== 'low') {
                riskList.push({
                    memberId: member.whopMemberId,
                    username: member.user?.username || 'Unknown',
                    email: member.email || '',
                    avatarUrl: '',
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
