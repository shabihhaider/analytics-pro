
import { model } from './client';

interface BusinessStats {
    mrr: number;
    activeMembers: number;
    highRiskCount: number;
    engagementScore: number;
}

export async function generateDailyInsight(stats: BusinessStats): Promise<string> {
    try {
        if (!model) {
            return "AI insights are currently unavailable. Please check your API configuration.";
        }

        const prompt = `You are a SaaS business analyst. Given these metrics for a community/membership business:

- Monthly Recurring Revenue: $${stats.mrr}
- Active Members: ${stats.activeMembers}
- High Risk Members: ${stats.highRiskCount}
- Average Engagement Score: ${stats.engagementScore}/100

Provide ONE specific, actionable insight in 1-2 sentences. Focus on the most critical metric that needs attention. Be direct and professional.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const insight = response.text();

        return insight || "Your metrics are being analyzed. Sync your data for deeper insights.";

    } catch (error) {
        console.error('[AI] Error generating insight:', error);
        return "Unable to generate insights at this time. Your metrics look stable overall.";
    }
}
