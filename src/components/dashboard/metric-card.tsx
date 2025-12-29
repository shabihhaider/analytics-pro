import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: string;
    trendUp?: boolean;
    className?: string;
}

export function MetricCard({ title, value, icon, trend, trendUp, className }: MetricCardProps) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:bg-white/10",
            className
        )}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-white max-w-[200px] truncate" title={String(value)}>{value}</h3>
                        {trend && (
                            <span className={cn(
                                "text-xs font-medium",
                                trendUp ? "text-green-400" : "text-red-400"
                            )}>
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
                <div className="rounded-full bg-white/10 p-3">
                    {icon}
                </div>
            </div>

            {/* Decorative gradient blob */}
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />
        </div>
    );
}
