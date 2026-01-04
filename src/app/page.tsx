
'use client';

import { useEffect, useState } from 'react';
import { Activity, Users, MessageSquare, TrendingUp, RefreshCw, DollarSign, AlertTriangle } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { InsightCard } from "@/components/dashboard/insight-card";
import { CoachChat } from "@/components/dashboard/coach-chat";

interface EngagementData {
  stats: {
    averageScore: string;
    activeUsers: number;
    totalMessages: number;
  };
  leaderboard: Array<{
    userId: string;
    username: string;
    score: string;
    messages: number;
  }>;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [history, setHistory] = useState<any>([]);
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Robust Auth: Get token from global window object injected by layout
      // This bypasses cookie blocking in iframes
      const token = (window as any).WHOP_TOKEN;
      const headers = new Headers();
      if (token) headers.set('x-whop-user-token', token);

      try {
        const [engRes, revRes, riskRes, histRes, insightRes] = await Promise.all([
          fetch('/api/analytics/engagement', { headers }),
          fetch('/api/analytics/revenue', { headers }),
          fetch('/api/analytics/risk', { headers }),
          fetch('/api/analytics/history', { headers }),
          fetch('/api/analytics/insight', { headers })
        ]);

        if (engRes.ok) setMetrics(await engRes.json());
        if (revRes.ok) setRevenue(await revRes.json());
        if (riskRes.ok) setRisk(await riskRes.json());
        if (histRes.ok) {
          const hData = await histRes.json();
          setHistory(hData.history || []);
        }
        if (insightRes.ok) {
          const iData = await insightRes.json();
          setInsight(iData.insight || "");
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-8 min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30">
      {/* Header */}
      <div className="flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Analytics Pro
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Real-time engagement & revenue insights</p>
        </div>

        <Button
          variant="outline"
          className="bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          onClick={async () => {
            const toastId = toast.loading("Syncing latest data...");
            try {
              const token = (window as any).WHOP_TOKEN;
              const headers = new Headers();
              if (token) headers.set('x-whop-user-token', token);
              await fetch('/api/sync', { method: 'POST', headers });
              toast.success("Sync complete!", { id: toastId });
              window.location.reload();
            } catch (e) {
              toast.error("Sync failed", { id: toastId });
            }
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Data
        </Button>
      </div>

      {/* Debug Info - Remove before final ship */}
      <div className="text-xs text-center text-gray-500 font-mono py-2">
        Auth Debug: Token {(window as any).WHOP_TOKEN ? 'Present' : 'Missing'}
        ({(window as any).WHOP_TOKEN?.substring(0, 10)}...)
      </div>

      {/* AI Insight */}
      <div className="animate-in fade-in slide-in-from-top-8 duration-700 delay-100">
        <InsightCard insight={insight} loading={loading} />
      </div>

      <CoachChat contextStats={{
        mrr: revenue?.mrr?.usd || 0,
        activeMembers: revenue?.activeMembers || 0,
        highRiskCount: risk?.riskList?.filter((r: any) => r.riskLevel === 'high').length || 0
      }} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <MetricCard
          title="Engagement Score"
          value={metrics?.stats?.averageScore ? `${metrics.stats.averageScore}%` : '0%'}
          icon={<Activity className="h-5 w-5 text-purple-400" />}
          trend="+2.5%"
        />
        <MetricCard
          title="Active Members"
          value={revenue?.activeMembers?.toString() || '0'}
          icon={<Users className="h-5 w-5 text-blue-400" />}
          trend="+12"
        />
        <MetricCard
          title="Monthly Revenue (MRR)"
          value={`$${(revenue?.mrr?.usd || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-green-400" />}
          trend="+8.2%"
        />
        <MetricCard
          title="High Risk Members"
          value={risk?.riskList?.filter((r: any) => r.riskLevel === 'high').length.toString() || '0'}
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          trend="Action Needed"
          trendUp={false}
        />
      </div>

      {/* Risk Table Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
        {/* Revenue Chart (Takes up 2 columns) */}
        <RevenueChart data={history} />

        {/* Top Engaged Sidebar */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Top Engaged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.leaderboard?.map((member: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-500">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-200">{member.username || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{member.messages} msgs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-green-400 text-sm">{Number(member.score).toFixed(0)}</span>
                  </div>
                </div>
              ))}
              {(!metrics?.leaderboard || metrics.leaderboard.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Radar (Moved Below) */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Churn Risk Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-gray-400">Member</TableHead>
                  <TableHead className="text-gray-400">Risk Level</TableHead>
                  <TableHead className="text-gray-400">Days Inactive</TableHead>
                  <TableHead className="text-gray-400">Value (MRR)</TableHead>
                  <TableHead className="text-right text-gray-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risk?.riskList?.map((member: any) => (
                  <TableRow key={member.memberId} className="hover:bg-white/5 border-white/5 transition-colors">
                    <TableCell className="font-medium text-gray-200">
                      {member.username}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/50">
                        HIGH
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400">{member.daysInactive} days</TableCell>
                    <TableCell className="text-green-400 font-mono">
                      ${member.renewalPrice} <span className="text-xs text-gray-500">{member.currency}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        onClick={() => window.location.href = `mailto:${member.email}?subject=Risk Alert: Staying Active in the Community`}
                      >
                        Contact
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!risk?.riskList || risk.riskList.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No high-risk members detected based on current activity.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div >
  );
}
