
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightCardProps {
    insight: string;
    loading?: boolean;
}

export function InsightCard({ insight, loading }: InsightCardProps) {
    return (
        <Card className="bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/20 border-purple-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent group-hover:translate-x-full duration-1000 transition-transform" />

            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
                    AI Coach Insight
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="h-6 w-3/4 bg-white/5 animate-pulse rounded" />
                ) : (
                    <p className="text-purple-100 text-sm leading-relaxed font-medium">
                        {insight || "Gathering business intelligence..."}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
