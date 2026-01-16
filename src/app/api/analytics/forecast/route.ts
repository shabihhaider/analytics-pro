import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/get-user';
import { generateForecast } from '@/lib/analytics/forecast';
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
        if (!limits.hasForecast) {
            return NextResponse.json({
                error: 'Upgrade required',
                upgradeRequired: true,
                feature: 'forecast',
                message: getUpgradeMessage('forecast'),
                currentTier: user.subscriptionTier || 'free'
            }, { status: 403 });
        }

        const forecast = await generateForecast(user.id);

        return NextResponse.json(forecast);

    } catch (error) {
        console.error('Error generating forecast:', error);
        return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 });
    }
}
