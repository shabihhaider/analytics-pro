/**
 * Revenue Forecast Module
 * 
 * Calculates future MRR predictions based on historical trend data.
 * Uses simple linear regression for trend analysis.
 */

import { db } from '@/lib/db';
import { revenueMetrics } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface ForecastResult {
    currentMrr: number;
    forecast: {
        days30: number;
        days60: number;
        days90: number;
    };
    growthRate: number; // Weekly growth rate percentage
    trend: 'growing' | 'declining' | 'stable';
    confidence: 'high' | 'medium' | 'low';
    dataPoints: number;
}

/**
 * Calculate linear regression slope and intercept
 * Used to predict future values based on historical trend
 */
function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
    const n = data.length;
    if (n === 0) return { slope: 0, intercept: 0 };
    if (n === 1) return { slope: 0, intercept: data[0].y };

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (const point of data) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumXX += point.x * point.x;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

/**
 * Generate revenue forecast for a user
 */
export async function generateForecast(userId: string): Promise<ForecastResult> {
    // Fetch last 30 days of revenue history
    const history = await db.query.revenueMetrics.findMany({
        where: eq(revenueMetrics.userId, userId),
        orderBy: [desc(revenueMetrics.date)],
        limit: 30
    });

    // If no data, return empty forecast
    if (history.length === 0) {
        return {
            currentMrr: 0,
            forecast: { days30: 0, days60: 0, days90: 0 },
            growthRate: 0,
            trend: 'stable',
            confidence: 'low',
            dataPoints: 0
        };
    }

    // Prepare data for regression (oldest to newest)
    const dataPoints = history.reverse().map((record, index) => ({
        x: index,
        y: parseFloat(record.mrr?.toString() || '0')
    }));

    // Current MRR is the most recent value
    const currentMrr = dataPoints[dataPoints.length - 1]?.y || 0;

    // Calculate trend using linear regression
    const { slope, intercept } = linearRegression(dataPoints);

    // Project future values
    const lastIndex = dataPoints.length - 1;
    const days30Projection = slope * (lastIndex + 30) + intercept;
    const days60Projection = slope * (lastIndex + 60) + intercept;
    const days90Projection = slope * (lastIndex + 90) + intercept;

    // Ensure projections don't go negative
    const days30 = Math.max(0, Math.round(days30Projection * 100) / 100);
    const days60 = Math.max(0, Math.round(days60Projection * 100) / 100);
    const days90 = Math.max(0, Math.round(days90Projection * 100) / 100);

    // Calculate weekly growth rate
    let growthRate = 0;
    if (currentMrr > 0 && dataPoints.length >= 7) {
        const weekAgoMrr = dataPoints[Math.max(0, dataPoints.length - 7)]?.y || currentMrr;
        growthRate = ((currentMrr - weekAgoMrr) / weekAgoMrr) * 100;
    }

    // Determine trend
    let trend: 'growing' | 'declining' | 'stable';
    if (slope > 10) {
        trend = 'growing';
    } else if (slope < -10) {
        trend = 'declining';
    } else {
        trend = 'stable';
    }

    // Determine confidence based on data points
    let confidence: 'high' | 'medium' | 'low';
    if (dataPoints.length >= 14) {
        confidence = 'high';
    } else if (dataPoints.length >= 7) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    return {
        currentMrr: Math.round(currentMrr * 100) / 100,
        forecast: {
            days30,
            days60,
            days90
        },
        growthRate: Math.round(growthRate * 10) / 10,
        trend,
        confidence,
        dataPoints: dataPoints.length
    };
}
