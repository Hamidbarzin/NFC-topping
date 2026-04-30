import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Wifi } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function readToken(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
}

/**
 * Secure customer settings: `/settings/:cardCode?token=...`
 * Backed by GET/PATCH `/api/settings/card/:cardCode`.
 */
export default function CardSettingsPage() {
  const { cardCode: rawCode } = useParams<{ cardCode: string }>();
  const cardCode = rawCode?.trim() ?? "";
  const token = useMemo(() => readToken(), []);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) return;
    setLocation(`/client-access/${encodeURIComponent(token)}`, { replace: true });
  }, [token, setLocation]);

  if (!cardCode) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-center text-sm text-neutral-600">
        Invalid link.
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-neutral-900">
        <Card className="mx-auto max-w-md rounded-[28px] border border-white/60 bg-white p-8 text-center shadow-lg">
          <CardContent className="p-0">
            <h1 className="text-lg font-bold">Missing access token</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Open the full settings link you received (it includes <code className="text-xs">?token=…</code>
              ).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-neutral-900">
      <Card className="mx-auto max-w-md rounded-[28px] border border-white/60 bg-white p-8 text-center shadow-lg">
        <CardContent className="p-0">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg">
            <Wifi className="h-7 w-7 text-neutral-900" />
          </div>
          <h1 className="text-xl font-extrabold">Opening your settings</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Redirecting to the unified secure settings experience.
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            If redirection fails, continue manually:
          </p>
          <Link
            href={`/client-access/${encodeURIComponent(token)}`}
            className="mt-2 inline-flex text-sm font-semibold text-neutral-900 underline underline-offset-2"
          >
            Open customer settings
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
