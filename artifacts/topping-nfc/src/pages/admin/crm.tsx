import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Lead = {
  id: number;
  profileId: number;
  profileSlug: string;
  businessName: string;
  sourceCardCode?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  serviceInterest?: string | null;
  status: "new" | "contacted" | "won" | "lost";
  notes?: string | null;
  createdAt: string;
};

const statuses: Lead["status"][] = ["new", "contacted", "won", "lost"];

export default function AdminCrmPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      const body = await res.json().catch(() => ({ items: [] }));
      if (res.ok && Array.isArray(body.items)) {
        setItems(body.items as Lead[]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: number, status: Lead["status"]) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-3xl font-bold text-transparent">
          CRM Leads
        </h1>
        <p className="mt-1 text-sm text-slate-300">Real lead submissions from public profile forms.</p>
      </div>

      <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-100">Lead List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-300">Loading leads...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-300">No leads yet.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {items.map((lead) => (
                <div key={lead.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{lead.name}</p>
                      <p className="text-xs text-slate-300">
                        {lead.businessName} · /{lead.profileSlug}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-white/20 text-slate-100">
                      {lead.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300">
                    {lead.phone || "-"} {lead.email ? `· ${lead.email}` : ""}
                  </p>
                  {lead.serviceInterest ? (
                    <p className="text-xs text-cyan-200">Interest: {lead.serviceInterest}</p>
                  ) : null}
                  {lead.message ? <p className="text-sm text-slate-200">{lead.message}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {statuses.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={lead.status === s ? "default" : "outline"}
                        className="h-7 text-xs"
                        disabled={pendingId === lead.id}
                        onClick={() => void updateStatus(lead.id, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
