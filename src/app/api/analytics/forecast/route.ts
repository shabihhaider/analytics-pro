import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/get-user';
import { generateForecast } from '@/lib/analytics/forecast';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const forecast = await generateForecast(user.id);

        return NextResponse.json(forecast);

    } catch (error) {
        console.error('Error generating forecast:', error);
        return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 });
    }
}
