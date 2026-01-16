import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/get-user';
import { getCourseAnalytics, syncCourses } from '@/lib/analytics/courses';
import { getTierLimits, getUpgradeMessage } from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has Pro tier
        const limits = getTierLimits(user.subscriptionTier);
        if (!limits.hasCourseAnalytics) {
            return NextResponse.json({
                error: 'Upgrade required',
                upgradeRequired: true,
                feature: 'courses',
                message: getUpgradeMessage('courses'),
                currentTier: user.subscriptionTier || 'free'
            }, { status: 403 });
        }

        // Get course analytics
        const analytics = await getCourseAnalytics(user.id);

        return NextResponse.json({
            courses: analytics,
            summary: {
                totalCourses: analytics.length,
                averageCompletionRate: analytics.length > 0
                    ? analytics.reduce((sum, c) => sum + c.completionRate, 0) / analytics.length
                    : 0,
                lowPerformers: analytics.filter(c => c.completionRate < 30).length
            }
        });

    } catch (error) {
        console.error('Error fetching course analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch course analytics' }, { status: 500 });
    }
}

// POST to trigger course sync (also Pro only)
export async function POST(req: Request) {
    try {
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limits = getTierLimits(user.subscriptionTier);
        if (!limits.hasCourseAnalytics) {
            return NextResponse.json({
                error: 'Upgrade required',
                upgradeRequired: true,
                feature: 'courses',
                message: getUpgradeMessage('courses'),
                currentTier: user.subscriptionTier || 'free'
            }, { status: 403 });
        }

        // Sync courses from Whop
        await syncCourses(user.whopCompanyId, user.id);

        return NextResponse.json({ success: true, message: 'Courses synced' });

    } catch (error) {
        console.error('Error syncing courses:', error);
        return NextResponse.json({ error: 'Failed to sync courses' }, { status: 500 });
    }
}
