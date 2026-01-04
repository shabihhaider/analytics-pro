
// import { getDescription } from '@/lib/ai/utils'; // Removed to fix build error
import { db } from '@/lib/db';
import { revenueMetrics, members } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUser } from '@/lib/auth/get-user';
import { model } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

interface ChatRequestBody {
    message: string;
    contextStats?: any;
}

export async function POST(request: Request) {
    try {
        const user = await getUser();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: ChatRequestBody = await request.json();
        const { message, contextStats } = body;

        // Construct a context-aware prompt
        const [revenueHistory, riskAnalysis] = await Promise.all([
            // 1. Fetch Revenue History
            db.query.revenueMetrics.findMany({
                where: eq(revenueMetrics.userId, user.id),
                orderBy: [desc(revenueMetrics.date)],
                limit: 7
            }),
            // 2. Fetch High Risk Members (Simplified logic for context)
            db.query.members.findMany({
                where: eq(members.status, 'active'),
                with: { user: true },
                limit: 50 // Scan last 50 active to find risk
            })
        ]);

        // Process Risk
        const highRiskMembers = riskAnalysis.filter((m: any) => {
            if (!m.lastActiveAt) return true; // Never active = risk
            const daysInactive = (new Date().getTime() - new Date(m.lastActiveAt).getTime()) / (1000 * 3600 * 24);
            return daysInactive > 14;
        }).map((m: any) => m.user?.username || 'Unknown').slice(0, 5);

        // Process Trend
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
        2. Identify ONE specific bottleneck or opportunity (e.g., "High churn risk with [Name]" or "Growth is flat").
        3. Suggest ONE concrete, actionable step they can take in the next 24 hours.
        4. Tone: Professional, direct, data-driven. No fluff. No "You're doing great!" unless supported by a >10% growth spike.
        5. Length: Maximum 3 sentences.`;

        systemContext += `\nUser asks: "${message}"`;

        const result = await model.generateContent(systemContext);
        const response = await result.response;
        const text = response.text();

        return Response.json({ reply: text });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return Response.json({
            error: 'Failed to process chat',
            details: error.message || String(error)
        }, { status: 500 });
    }
}
