import { useParams } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Activity } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetProfileAnalytics, getGetProfileAnalyticsQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function CardAnalytics() {
  const params = useParams<{ id: string }>();
  const profileId = parseInt(params.id, 10);

  const { data: analytics, isLoading } = useGetProfileAnalytics(
    profileId,
    { days: 30 },
    { query: { enabled: !!profileId, queryKey: getGetProfileAnalyticsQueryKey(profileId, { days: 30 }) } }
  );

  return (
    <div className="max-w-3xl space-y-6 text-slate-100" data-testid="card-analytics-page">
      <div className="flex items-center gap-3">
        <Link href="/admin/cards">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-3xl font-bold text-transparent">
            Card Analytics
          </h1>
          <p className="text-sm text-slate-300">Last 30 days tap data</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-white/10" />
          <div className="h-64 animate-pulse rounded-xl bg-white/10" />
        </div>
      ) : !analytics ? (
        <div className="py-16 text-center text-slate-300">Analytics not found</div>
      ) : (
        <>
          <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="stat-total-taps">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15">
                <Activity className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.totalTaps}</p>
                <p className="text-sm text-slate-300">Total taps (all time)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="chart-taps-by-day">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-100">Daily Taps (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.tapsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={analytics.tapsByDay} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(label) => `Date: ${label}`}
                      formatter={(value) => [value, "Taps"]}
                    />
                    <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Taps" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-slate-300">
                  No taps recorded in the last 30 days
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="recent-taps-table">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-100">
                Recent Taps ({analytics.recentTaps.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {analytics.recentTaps.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-300">No taps yet</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {analytics.recentTaps.map((tap) => (
                    <div
                      key={tap.id}
                      className="flex items-center justify-between px-4 py-3"
                      data-testid={`tap-row-${tap.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          {formatDistanceToNow(new Date(tap.tappedAt), { addSuffix: true })}
                        </p>
                        {tap.userAgent && (
                          <p className="max-w-xs truncate text-xs text-slate-300">
                            {tap.userAgent}
                          </p>
                        )}
                      </div>
                      {tap.country && (
                        <span className="ml-4 text-xs text-slate-300">{tap.country}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
