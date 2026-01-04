
import { db } from '@/lib/db';
import { revenueMetrics } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await getUser();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const history = await db.query.revenueMetrics.findMany({
            where: eq(revenueMetrics.userId, user.id),
            orderBy: [asc(revenueMetrics.date)],
            limit: 30, // Last 30 snapshots
        });

        return Response.json({ history });
    } catch (error) {
        console.error('Failed to fetch revenue history:', error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
