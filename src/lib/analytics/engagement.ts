/**
 * Engagement Tracking Module
 * 
 * Handles real-time engagement tracking from webhook events
 * and calculates engagement scores for members.
 */

import { db } from '@/lib/db';
import { engagementMetrics, members } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Engagement score formula:
 * - Messages sent: 10 points each (max 50 points from messages)
 * - Activity events: 5 points each (max 30 points from activity)
 * - Recency bonus: 20 points if active in last 24 hours
 * 
 * Total max score: 100
 */
export function calculateEngagementScore(
    messageCount: number,
    activityScore: number,
    lastActiveAt: Date | null
): number {
    // Message contribution (capped at 50 points)
    const messagePoints = Math.min(messageCount * 10, 50);

    // Activity contribution (capped at 30 points)
    const activityPoints = Math.min(activityScore * 5, 30);

    // Recency bonus (20 points if active in last 24 hours)
    let recencyBonus = 0;
    if (lastActiveAt) {
        const hoursSinceActive = (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceActive <= 24) {
            recencyBonus = 20;
        } else if (hoursSinceActive <= 72) {
            recencyBonus = 10;
        }
    }

    return Math.min(messagePoints + activityPoints + recencyBonus, 100);
}

/**
 * Track a message event for a member
 */
export async function trackMessageEvent(
    companyId: string,
    memberId: string,
    userId: string
): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    try {
        // Find the member in our database
        const member = await db.query.members.findFirst({
            where: and(
                eq(members.whopMemberId, memberId),
                eq(members.userId, userId)
            )
        });

        if (!member) {
            console.log('[Engagement] Member not found:', memberId);
            return;
        }

        // Check if we have an engagement record for today
        const existingMetric = await db.query.engagementMetrics.findFirst({
            where: and(
                eq(engagementMetrics.memberId, member.id),
                eq(engagementMetrics.date, today)
            )
        });

        if (existingMetric) {
            // Update existing record
            const newMessageCount = (existingMetric.messageCount || 0) + 1;
            const newScore = calculateEngagementScore(
                newMessageCount,
                existingMetric.activityScore || 0,
                now
            );

            await db.update(engagementMetrics)
                .set({
                    messageCount: newMessageCount,
                    lastActiveAt: now,
                    engagementScore: newScore.toString()
                })
                .where(and(
                    eq(engagementMetrics.memberId, member.id),
                    eq(engagementMetrics.date, today)
                ));

            console.log('[Engagement] Updated message count for member:', memberId, 'score:', newScore);
        } else {
            // Create new record for today
            const newScore = calculateEngagementScore(1, 0, now);

            await db.insert(engagementMetrics).values({
                userId: userId,
                memberId: member.id,
                date: today,
                messageCount: 1,
                activityScore: 0,
                lastActiveAt: now,
                engagementScore: newScore.toString()
            });

            console.log('[Engagement] Created new metric for member:', memberId, 'score:', newScore);
        }
    } catch (error) {
        console.error('[Engagement] Error tracking message event:', error);
    }
}

/**
 * Track an activity event (login, course view, etc.)
 */
export async function trackActivityEvent(
    companyId: string,
    memberId: string,
    userId: string
): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    try {
        const member = await db.query.members.findFirst({
            where: and(
                eq(members.whopMemberId, memberId),
                eq(members.userId, userId)
            )
        });

        if (!member) return;

        const existingMetric = await db.query.engagementMetrics.findFirst({
            where: and(
                eq(engagementMetrics.memberId, member.id),
                eq(engagementMetrics.date, today)
            )
        });

        if (existingMetric) {
            const newActivityScore = (existingMetric.activityScore || 0) + 1;
            const newScore = calculateEngagementScore(
                existingMetric.messageCount || 0,
                newActivityScore,
                now
            );

            await db.update(engagementMetrics)
                .set({
                    activityScore: newActivityScore,
                    lastActiveAt: now,
                    engagementScore: newScore.toString()
                })
                .where(and(
                    eq(engagementMetrics.memberId, member.id),
                    eq(engagementMetrics.date, today)
                ));
        } else {
            const newScore = calculateEngagementScore(0, 1, now);

            await db.insert(engagementMetrics).values({
                userId: userId,
                memberId: member.id,
                date: today,
                messageCount: 0,
                activityScore: 1,
                lastActiveAt: now,
                engagementScore: newScore.toString()
            });
        }
    } catch (error) {
        console.error('[Engagement] Error tracking activity event:', error);
    }
}

/**
 * Get engagement summary for a user's company
 */
export async function getEngagementSummary(userId: string): Promise<{
    averageScore: number;
    activeMembers: number;
    totalMessages: number;
}> {
    const today = new Date().toISOString().split('T')[0];

    const summary = await db
        .select({
            avgScore: sql<number>`coalesce(avg(${engagementMetrics.engagementScore}), 0)`,
            activeCount: sql<number>`count(distinct ${engagementMetrics.memberId})`,
            totalMessages: sql<number>`coalesce(sum(${engagementMetrics.messageCount}), 0)`
        })
        .from(engagementMetrics)
        .where(
            and(
                eq(engagementMetrics.date, today),
                eq(engagementMetrics.userId, userId)
            )
        );

    return {
        averageScore: Number(summary[0]?.avgScore || 0),
        activeMembers: Number(summary[0]?.activeCount || 0),
        totalMessages: Number(summary[0]?.totalMessages || 0)
    };
}
