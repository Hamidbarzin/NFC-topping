import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import {
  CreditCard,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetAdminStats,
  useGetRecentTaps,
  useGetExpiringSoon,
  getGetRecentTapsQueryKey,
} from "@workspace/api-client-react";

const planColors: Record<string, string> = {
  basic: "border-slate-400/40 bg-slate-500/20 text-slate-100",
  pro: "border-cyan-400/40 bg-cyan-500/20 text-cyan-100",
  business: "border-violet-400/40 bg-violet-500/20 text-violet-100",
};

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: recentTaps, isLoading: tapsLoading } = useGetRecentTaps(
    undefined,
    { query: { queryKey: getGetRecentTapsQueryKey() } },
  );
  const { data: expiringSoon } = useGetExpiringSoon();
  const recentTapsList = Array.isArray(recentTaps) ? recentTaps : [];
  const expiringSoonList = Array.isArray(expiringSoon) ? expiringSoon : [];
  const [recentLeads, setRecentLeads] = useState<Array<{ id: number; name: string; businessName: string; createdAt: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      try {
        const res = await fetch("/api/admin/leads?limit=5");
        const body = await res.json().catch(() => ({ items: [] }));
        if (!cancelled && res.ok && Array.isArray(body.items)) {
          setRecentLeads(body.items);
        }
      } catch {}
    }
    void loadLeads();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 text-slate-100" data-testid="admin-dashboard">
      <div>
        <h1 className="bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-3xl font-bold text-transparent">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Platform overview and recent activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="stat-total-cards">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Total Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-cyan-300" />
              <span className="text-2xl font-bold">
                {statsLoading ? "—" : stats?.totalCards ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="stat-active-cards">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-300" />
              <span className="text-2xl font-bold text-emerald-300">
                {statsLoading ? "—" : stats?.activeCards ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="stat-total-taps">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Total Taps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-violet-300" />
              <span className="text-2xl font-bold">
                {statsLoading ? "—" : stats?.totalTaps ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="stat-leads-total">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-amber-300" />
              <span className="text-2xl font-bold">
                {statsLoading ? "—" : (stats as { totalLeads?: number } | undefined)?.totalLeads ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="stat-taps-30days">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-300">
              Taps (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-fuchsia-300" />
              <span className="text-2xl font-bold">
                {statsLoading ? "—" : stats?.tapsLast30Days ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown */}
      {stats && (
        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="stat-plan-breakdown">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-100">Cards by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.byPlan.basic}</p>
                <span className="text-xs text-slate-300">Basic</span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-300">{stats.byPlan.pro}</p>
                <span className="text-xs text-slate-300">Pro</span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-300">{stats.byPlan.business}</p>
                <span className="text-xs text-slate-300">Business</span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-300">{stats.expiringThisWeek}</p>
                <span className="text-xs text-slate-300">Expiring Soon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Taps */}
        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="recent-taps-list">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-100">Recent Taps</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tapsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-white/10" />
                ))}
              </div>
            ) : !recentTapsList.length ? (
              <div className="p-6 text-center text-sm text-slate-300">No taps yet</div>
            ) : (
              <div className="divide-y divide-white/10">
                {recentTapsList.slice(0, 10).map((tap) => (
                  <div
                    key={tap.id}
                    className="flex items-center justify-between px-4 py-3"
                    data-testid={`tap-row-${tap.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{tap.businessName}</p>
                      <p className="text-xs text-slate-300">/{tap.profileSlug}</p>
                    </div>
                    <p className="text-xs text-slate-300">
                      {formatDistanceToNow(new Date(tap.tappedAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="recent-leads-list">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-100">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!recentLeads.length ? (
              <div className="p-6 text-center text-sm text-slate-300">No leads yet</div>
            ) : (
              <div className="divide-y divide-white/10">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-slate-300">{lead.businessName}</p>
                    </div>
                    <p className="text-xs text-slate-300">
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="expiring-soon-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!expiringSoonList.length ? (
              <div className="p-6 text-center text-sm text-slate-300">
                No cards expiring this week
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {expiringSoonList.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3"
                    data-testid={`expiring-row-${p.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{p.businessName}</p>
                      <p className="text-xs text-slate-300">/{p.slug}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={planColors[p.plan] ?? ""} variant="outline">
                        {p.plan}
                      </Badge>
                      {p.expiresAt && (
                        <p className="mt-1 text-xs text-amber-300">
                          {formatDistanceToNow(new Date(p.expiresAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
