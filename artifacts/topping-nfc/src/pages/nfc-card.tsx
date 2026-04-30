import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Wifi } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const API = "/api";

function normalizeCardCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export type CardResolveResponse = {
  state: "new" | "active" | "suspended";
  slug: string | null;
  requiresSetup?: boolean;
};

async function fetchResolve(cardCode: string): Promise<CardResolveResponse> {
  const res = await fetch(`${API}/cards/${encodeURIComponent(cardCode)}/resolve`);
  if (res.status === 404) {
    const err = new Error("not_found");
    err.name = "NotFoundError";
    throw err;
  }
  if (!res.ok) {
    throw new Error("resolve_failed");
  }
  return res.json() as Promise<CardResolveResponse>;
}

/**
 * NFC entry: /c/[code]
 * Resolves the card and redirects to /setup/[code] (incomplete) or /u/[slug] (active).
 */
export default function NfcCardEntry() {
  const { cardCode: rawCardCode } = useParams<{ cardCode: string }>();
  const cardCode = rawCardCode ? normalizeCardCode(rawCardCode) : "";
  const [, setLocation] = useLocation();

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ["nfc-card-resolve", cardCode],
    queryFn: () => fetchResolve(cardCode),
    enabled: !!cardCode.trim(),
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    if (data.state === "active" && data.slug) {
      setLocation(`/u/${data.slug}`);
      return;
    }
    const needSetup = data.requiresSetup ?? data.state === "new";
    if (needSetup && data.state !== "suspended") {
      setLocation(`/setup/${encodeURIComponent(cardCode)}`);
    }
  }, [data, setLocation, cardCode]);

  if (!cardCode.trim()) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-center text-neutral-700">
        <p className="text-sm">Invalid card link.</p>
      </div>
    );
  }

  if (isLoading || (data?.state === "active" && data.slug)) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16">
        <div className="mx-auto max-w-[430px] overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] ring-1 ring-black/5">
          <div className="h-28 animate-pulse bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100" />
          <div className="animate-pulse space-y-4 p-8">
            <div className="mx-auto h-16 w-16 rounded-[20px] bg-gray-200" />
            <div className="mx-auto h-3 w-[75%] rounded-full bg-gray-200" />
            <div className="h-2.5 w-full rounded-full bg-gray-100" />
          </div>
        </div>
        <p className="mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
          Opening your card…
        </p>
      </div>
    );
  }

  if (!isLoading && (isError || data === undefined)) {
    const notFound =
      qError instanceof Error &&
      (qError.message === "not_found" || qError.name === "NotFoundError");
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-neutral-900">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
          <Card className="w-full max-w-[430px] rounded-[32px] border-0 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] ring-1 ring-black/5">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-500 text-neutral-900">
                <Wifi className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                {notFound ? "Card not found" : "Could not load card"}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {notFound
                  ? "This NFC link is invalid or the card is not registered yet."
                  : "Please try again in a moment."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (data?.state === "suspended") {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-neutral-900">
        <div className="mx-auto max-w-md">
          <Card className="max-w-[430px] rounded-[32px] border border-rose-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
            <CardContent className="p-10 text-center">
              <h1 className="text-xl font-bold">Card unavailable</h1>
              <p className="mt-3 text-sm text-neutral-600">
                This card is suspended or inactive. Please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-center text-sm text-gray-500">
      Redirecting…
    </div>
  );
}
