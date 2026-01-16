import { db } from '@/lib/db';
import { revenueMetrics, members } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';
import { model } from '@/lib/ai/client';
import { getTierLimits, getUpgradeMessage } from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter (resets on server restart)
// For production, use Redis or database
const dailyUsage: Record<string, { count: number; date: string }> = {};

function checkAndIncrementUsage(userId: string, limit: number): { allowed: boolean; remaining: number } {
    const today = new Date().toISOString().split('T')[0];

    if (!dailyUsage[userId] || dailyUsage[userId].date !== today) {
        dailyUsage[userId] = { count: 0, date: today };
    }

    if (limit === Infinity) {
        dailyUsage[userId].count++;
        return { allowed: true, remaining: Infinity };
    }

    if (dailyUsage[userId].count >= limit) {
        return { allowed: false, remaining: 0 };
    }

    dailyUsage[userId].count++;
    return { allowed: true, remaining: limit - dailyUsage[userId].count };
}

interface ChatRequestBody {
    message: string;
    contextStats?: any;
}

export async function POST(request: Request) {
    try {
        const user = await getUser(request);
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check rate limit based on tier
        const limits = getTierLimits(user.subscriptionTier);
        const usage = checkAndIncrementUsage(user.id, limits.aiMessagesPerDay);

        if (!usage.allowed) {
            return Response.json({
                error: 'Upgrade required',
                upgradeRequired: true,
                feature: 'aiChat',
                message: getUpgradeMessage('aiChat'),
                currentTier: user.subscriptionTier || 'free'
            }, { status: 403 });
        }

        const body: ChatRequestBody = await request.json();
        const { message, contextStats } = body;

        const [revenueHistory, riskAnalysis] = await Promise.all([
            db.query.revenueMetrics.findMany({
                where: eq(revenueMetrics.userId, user.id),
                orderBy: [desc(revenueMetrics.date)],
                limit: 7
            }),
            db.query.members.findMany({
                where: eq(members.status, 'active'),
                with: { user: true },
                limit: 50
            })
        ]);

        const highRiskMembers = riskAnalysis.filter((m: any) => {
            if (!m.lastActiveAt) return true;
            const daysInactive = (new Date().getTime() - new Date(m.lastActiveAt).getTime()) / (1000 * 3600 * 24);
            return daysInactive > 14;
        }).map((m: any) => m.user?.username || 'Unknown').slice(0, 5);

        const currentMrr = revenueHistory[0]?.mrr || "0";
        const prevMrr = revenueHistory[6]?.mrr || "0";
        const growth = Number(prevMrr) > 0
            ? ((Number(currentMrr) - Number(prevMrr)) / Number(prevMrr) * 100).toFixed(1)
            : "0";

        let systemContext = `You are an expert SaaS Data Analyst and Growth Strategist.
        
        CURRENT BUSINESS SNAPSHOT:
        - MRR: $${currentMrr} (7-Day Growth: ${growth}%)
        - Active Members: ${contextStats?.activeMembers || 'Unknown'}
        - High Risk Members (Inactive >14 days): ${highRiskMembers.length > 0 ? highRiskMembers.join(', ') : "None detected"}
        
        INSTRUCTIONS:
        1. Analyze the user's specific situation based on the data above.
        2. Identify ONE specific bottleneck or opportunity.
        3. Suggest ONE concrete, actionable step they can take in the next 24 hours.
        4. Tone: Professional, direct, data-driven. No fluff.
        5. Length: Maximum 3 sentences.`;

        systemContext += `\nUser asks: "${message}"`;

        const result = await model.generateContent(systemContext);
        const response = await result.response;
        const text = response.text();

        return Response.json({
            reply: text,
            remainingMessages: usage.remaining,
            tier: user.subscriptionTier || 'free'
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return Response.json({
            error: 'Failed to process chat',
            details: error.message || String(error)
        }, { status: 500 });
    }
}
