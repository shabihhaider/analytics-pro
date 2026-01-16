'use client';

import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ForecastData {
    currentMrr: number;
    forecast: {
        days30: number;
        days60: number;
        days90: number;
    };
    growthRate: number;
    trend: 'growing' | 'declining' | 'stable';
    confidence: 'high' | 'medium' | 'low';
    dataPoints: number;
}

interface ForecastCardProps {
    data: ForecastData | null;
    loading?: boolean;
}

export function ForecastCard({ data, loading }: ForecastCardProps) {
    if (loading) {
        return (
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Revenue Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-white/10 rounded w-1/2" />
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-4 bg-white/10 rounded w-2/3" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.dataPoints === 0) {
        return (
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Revenue Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6">
                        <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                            Not enough data for forecast. Sync more data to enable predictions.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const TrendIcon = data.trend === 'growing' ? TrendingUp :
        data.trend === 'declining' ? TrendingDown : Minus;

    const trendColor = data.trend === 'growing' ? 'text-green-400' :
        data.trend === 'declining' ? 'text-red-400' : 'text-gray-400';

    const confidenceBadge = {
        high: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'High Confidence' },
        medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Medium Confidence' },
        low: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Low Confidence' }
    }[data.confidence];

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                        Revenue Forecast
                    </CardTitle>
                    <span className={`text-xs px-2 py-1 rounded ${confidenceBadge.bg} ${confidenceBadge.text}`}>
                        {confidenceBadge.label}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current MRR */}
                <div>
                    <p className="text-gray-400 text-sm">Current MRR</p>
                    <p className="text-2xl font-bold text-white">
                        ${data.currentMrr.toLocaleString()}
                    </p>
                    <p className={`text-sm ${trendColor} flex items-center gap-1`}>
                        <TrendIcon className="h-4 w-4" />
                        {data.growthRate > 0 ? '+' : ''}{data.growthRate}% weekly
                    </p>
                </div>

                {/* Forecast Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                    <div className="text-center">
                        <p className="text-gray-500 text-xs">30 Days</p>
                        <p className="text-lg font-semibold text-white">
                            ${data.forecast.days30.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 text-xs">60 Days</p>
                        <p className="text-lg font-semibold text-white">
                            ${data.forecast.days60.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 text-xs">90 Days</p>
                        <p className="text-lg font-semibold text-blue-400">
                            ${data.forecast.days90.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Data Points Info */}
                <p className="text-xs text-gray-500 text-center pt-2">
                    Based on {data.dataPoints} days of historical data
                </p>
            </CardContent>
        </Card>
    );
}
