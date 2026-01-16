/**
 * Subscription & Billing Module
 * 
 * Defines tier limits and helpers for feature gating.
 */

export type SubscriptionTier = 'free' | 'pro';

export interface TierLimits {
    // Feature access
    hasForecast: boolean;
    hasCourseAnalytics: boolean;

    // Numeric limits
    riskTableMembers: number;
    aiMessagesPerDay: number;
    historyDays: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    free: {
        hasForecast: false,
        hasCourseAnalytics: false,
        riskTableMembers: 5,
        aiMessagesPerDay: 3,
        historyDays: 7,
    },
    pro: {
        hasForecast: true,
        hasCourseAnalytics: true,
        riskTableMembers: Infinity,
        aiMessagesPerDay: Infinity,
        historyDays: 90,
    }
};

/**
 * Get tier limits for a user
 */
export function getTierLimits(tier: string | null | undefined): TierLimits {
    const validTier = tier as SubscriptionTier;
    return TIER_LIMITS[validTier] || TIER_LIMITS.free;
}

/**
 * Check if user can access a Pro-only feature
 */
export function canAccessFeature(tier: string | null | undefined, feature: keyof TierLimits): boolean {
    const limits = getTierLimits(tier);
    const value = limits[feature];

    // For boolean features
    if (typeof value === 'boolean') {
        return value;
    }

    // For numeric limits, true if > 0
    return value > 0;
}

/**
 * Get upgrade message for a blocked feature
 */
export function getUpgradeMessage(feature: string): string {
    const messages: Record<string, string> = {
        forecast: 'Revenue Forecast is a Pro feature. Upgrade to see 30/60/90 day projections.',
        courses: 'Course Analytics is a Pro feature. Upgrade to track course completion rates.',
        riskTable: 'Free tier shows 5 at-risk members. Upgrade to Pro for unlimited.',
        aiChat: 'You\'ve used your 3 free AI messages today. Upgrade to Pro for unlimited.',
        history: 'Free tier shows 7 days of history. Upgrade to Pro for 90 days.'
    };
    return messages[feature] || 'Upgrade to Pro to unlock this feature.';
}

/**
 * Whop Product IDs (set in environment variables)
 */
export const WHOP_PRODUCTS = {
    pro: process.env.WHOP_PRODUCT_PRO_ID || '',
};
