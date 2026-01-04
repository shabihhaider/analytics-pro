
"use client";


import { useState, useEffect } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface RevenueChartProps {
    data: any[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="col-span-1 lg:col-span-2 bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl h-[350px] flex items-center justify-center">
                <p className="text-muted-foreground">No revenue history available yet. Sync data to start tracking.</p>
            </Card>
        );
    }

    const chartData = data.map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        mrr: Number(item.mrr),
        active: item.activeMembers
    }));

    // Prevent hydration mismatch / zero-width errors
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return <div className="h-[300px] w-full bg-transparent" />; // Placeholder

    return (
        <Card className="col-span-1 lg:col-span-2 bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
            <CardHeader>
                <CardTitle className="text-white">Revenue Trend (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="mrr"
                                stroke="#8b5cf6"
                                fillOpacity={1}
                                fill="url(#colorMrr)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
