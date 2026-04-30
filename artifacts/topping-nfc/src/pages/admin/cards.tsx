import { useState } from "react";
import { Link } from "wouter";
import {
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  Check,
  RefreshCcw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProfiles,
  useToggleProfileActive,
  useDeleteProfile,
  getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

async function copyToClipboardSafe(text: string): Promise<void> {
  if (!text) throw new Error("No text to copy");

  if (navigator.clipboard && window.isSecureContext) {
    await copyToClipboardSafe(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!ok) {
    window.prompt("Copy this link:", text);
  }
}


const planColors: Record<string, string> = {
  basic: "secondary",
  pro: "default",
  business: "default",
} as const;

export default function AdminCards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  /** Must match a <SelectItem value> — "" breaks Radix Select and can confuse filters. */
  const [plan, setPlan] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<number, string>>({});
  const [creditReasons, setCreditReasons] = useState<Record<number, string>>({});
  const [creditPendingId, setCreditPendingId] = useState<number | null>(null);
  const [settingsPendingId, setSettingsPendingId] = useState<number | null>(null);
  const [copiedSettingsId, setCopiedSettingsId] = useState<number | null>(null);
  const [settingsLinks, setSettingsLinks] = useState<Record<number, string>>({});

  function setOperationLock(pending: boolean) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(pending ? "admin-operation-pending" : "admin-operation-idle"));
  }

  const params = {
    ...(search ? { search } : {}),
    ...(plan && plan !== "all" ? { plan } : {}),
  };

  const {
    data: profiles,
    isLoading,
    isError,
    error,
    refetch,
  } = useListProfiles(params, {
    query: { queryKey: getListProfilesQueryKey(params) },
  });

  const toggleActive = useToggleProfileActive({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
      },
    },
  });

  const deleteProfile = useDeleteProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        setDeleteId(null);
      },
    },
  });

  async function handleCreditAdjust(profileId: number) {
    const amountRaw = (creditAmounts[profileId] ?? "").trim();
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount === 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid non-zero credit amount.",
        variant: "destructive",
      });
      return;
    }

    setCreditPendingId(profileId);
    setOperationLock(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/credit-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          reason: creditReasons[profileId]?.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Could not adjust credit");
      }

      setCreditAmounts((prev) => ({ ...prev, [profileId]: "" }));
      setCreditReasons((prev) => ({ ...prev, [profileId]: "" }));
      queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
      toast({
        title: "Credit updated",
        description: amount > 0 ? "Credit was added successfully." : "Credit was deducted successfully.",
      });
    } catch (error) {
      toast({
        title: "Credit update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreditPendingId(null);
      setOperationLock(false);
    }
  }

  async function generateSettingsLink(profileId: number): Promise<string> {
    const res = await fetch(`/api/admin/profiles/${profileId}/generate-settings-link`, {
      method: "POST",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body.settingsUrl !== "string") {
      throw new Error(
        typeof body.error === "string" ? body.error : "Could not generate settings link",
      );
    }
    const settingsUrl = body.settingsUrl as string;
    setSettingsLinks((prev) => ({ ...prev, [profileId]: settingsUrl }));
    queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    return settingsUrl;
  }

  async function handleCopySettingsLink(
    profileId: number,
    existingToken?: string | null,
    existingExpiresAt?: string | null,
  ) {
    setSettingsPendingId(profileId);
    setOperationLock(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const isExpired =
        !!existingExpiresAt &&
        new Date(existingExpiresAt).getTime() < Date.now();
      const existingUrl =
        existingToken && origin && !isExpired
          ? `${origin}/client-access/${existingToken}`
          : null;
      const url =
        settingsLinks[profileId] ??
        existingUrl ??
        (await generateSettingsLink(profileId));
      await copyToClipboardSafe(url);
      setCopiedSettingsId(profileId);
      setTimeout(() => setCopiedSettingsId((id) => (id === profileId ? null : id)), 1200);
      toast({
        title: "Settings link copied",
        description: "Private customer settings link is in clipboard.",
      });
    } catch (error) {
      toast({
        title: "Could not copy settings link",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSettingsPendingId(null);
      setOperationLock(false);
    }
  }

  async function handleRegenerateSettingsLink(profileId: number) {
    setSettingsPendingId(profileId);
    setOperationLock(true);
    try {
      const url = await generateSettingsLink(profileId);
      await copyToClipboardSafe(url);
      setCopiedSettingsId(profileId);
      setTimeout(() => setCopiedSettingsId((id) => (id === profileId ? null : id)), 1200);
      toast({
        title: "Settings link regenerated",
        description: "A new private link was created and copied.",
      });
    } catch (error) {
      toast({
        title: "Could not regenerate settings link",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSettingsPendingId(null);
      setOperationLock(false);
    }
  }

  return (
    <div className="space-y-6 text-slate-100" data-testid="admin-cards">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-amber-100 via-yellow-300 to-white bg-clip-text text-3xl font-bold text-transparent">
            CRM
          </h1>
          <p className="mt-1 text-sm text-slate-300">Manage customer CRM and NFC business cards</p>
        </div>
        <Link href="/admin/cards/new">
          <Button
            className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-300 text-black shadow-[0_12px_32px_rgba(251,191,36,0.35)] transition-transform hover:scale-[1.02]"
            data-testid="button-new-card"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Card
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search business, owner, slug, phone, job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/15 bg-white/5 pl-9 text-slate-100 placeholder:text-slate-400"
            data-testid="input-search"
          />
        </div>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger
            className="w-40 border-white/15 bg-white/5 text-slate-100"
            data-testid="select-plan-filter"
          >
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Card List */}
      {isError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-6 text-center text-rose-100">
          <p className="font-semibold">Could not load CRM (profiles)</p>
          <p className="mt-2 text-sm text-rose-100/90">
            {error instanceof Error ? error.message : "Request failed. Check API logs and DATABASE_URL."}
          </p>
          <p className="mt-3 text-xs text-rose-100/70">
            Note: NFC Cards are stored separately; CRM only lists rows in the <code className="rounded bg-black/30 px-1">profiles</code> table
            (created via activation or &quot;New Card&quot;). If you just deployed, run DB migrations on Render (e.g.{" "}
            <code className="rounded bg-black/30 px-1">activation_gift_amount</code>).
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-rose-300/40 bg-rose-950/40 text-rose-50 hover:bg-rose-950/60"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      ) : !profiles?.length ? (
        <div className="py-16 text-center text-slate-300">
          <p className="font-medium">No profiles in CRM yet</p>
          <p className="text-sm mt-1">
            Create a profile with <strong>New Card</strong>, or activate a physical card so a profile is created.
            NFC Cards listed under NFC operations are not the same as CRM rows until activation links them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => {
            const hasSettingsLink = !!p.settingsAccessExpiresAt;
            const isSettingsExpired =
              !!p.settingsAccessExpiresAt &&
              new Date(p.settingsAccessExpiresAt).getTime() < Date.now();
            return (
            <Card
              key={p.id}
              className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl"
              data-testid={`card-profile-${p.id}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/5">
                  {p.profilePhotoUrl || p.logoUrl ? (
                    <img
                      src={p.profilePhotoUrl ?? p.logoUrl ?? ""}
                      alt={p.businessName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-300">
                      {(p.businessName || "P")
                        .split(" ")
                        .map((s) => s[0] ?? "")
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Color indicator */}
                <div
                  className="w-2 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.bannerColor }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate font-semibold text-slate-100" data-testid={`text-name-${p.id}`}>
                      {p.businessName}
                    </p>
                    {p.jobTitle ? (
                      <Badge
                        variant="outline"
                        className="border-violet-300/35 bg-violet-500/10 text-xs text-violet-200"
                      >
                        {p.jobTitle}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className="border-white/20 bg-white/10 text-xs capitalize text-slate-100"
                      data-testid={`badge-plan-${p.id}`}
                    >
                      {p.plan}
                    </Badge>
                    {!p.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                    {p.expiresAt && new Date(p.expiresAt).getTime() < Date.now() ? (
                      <Badge variant="outline" className="border-rose-300/35 bg-rose-500/10 text-rose-200">
                        Expired
                      </Badge>
                    ) : p.isActive ? (
                      <Badge variant="outline" className="border-amber-300/35 bg-amber-500/10 text-amber-100">
                        Active
                      </Badge>
                    ) : null}
                    {p.isClaimed ? (
                      <Badge className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">
                        Claimed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300/35 bg-amber-500/10 text-amber-200">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">
                    /{p.slug}
                    {p.ownerName ? ` • ${p.ownerName}` : ""}
                  </p>
                  <p className="text-xs text-slate-300">
                    {p.phone || "No phone"}
                    {p.externalContactUrl ? ` • Link ${p.externalContactUrl}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {p.tapCount} tap{p.tapCount !== 1 ? "s" : ""}
                    {p.expiresAt && (
                      <span>
                        {" · "}
                        Expires {new Date(p.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-300">
                    Credit: $
                    {Number(
                      typeof p.creditBalance === "string"
                        ? p.creditBalance
                        : p.creditBalance ?? 0,
                    ).toFixed(2)}
                    {p.creditExpiresAt ? ` • Credit expiry ${new Date(p.creditExpiresAt).toLocaleDateString()}` : ""}
                  </p>
                  <p className="text-xs text-slate-300/90">
                    Created {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        !hasSettingsLink
                          ? "border-slate-400/30 bg-slate-500/10 text-slate-300"
                          : isSettingsExpired
                            ? "border-rose-300/35 bg-rose-500/10 text-rose-200"
                            : "border-emerald-300/35 bg-emerald-500/10 text-emerald-200"
                      }
                    >
                      {!hasSettingsLink
                        ? "Not generated"
                        : isSettingsExpired
                          ? "Expired"
                          : "Active"}
                    </Badge>
                    <span className="text-xs text-slate-300">
                      {p.settingsAccessExpiresAt
                        ? `Expires ${new Date(p.settingsAccessExpiresAt).toLocaleDateString()}`
                        : "No settings link yet"}
                    </span>
                  </div>
                  {p.shortBio ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-300/90">{p.shortBio}</p>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-amber-300/20 bg-black/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-amber-200/80">
                      Wallet Control (Admin)
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                      <div>
                        <Label htmlFor={`credit-amount-${p.id}`} className="text-[11px] text-slate-300">
                          Amount
                        </Label>
                        <Input
                          id={`credit-amount-${p.id}`}
                          inputMode="decimal"
                          placeholder="+10 or -5"
                          value={creditAmounts[p.id] ?? ""}
                          onChange={(e) =>
                            setCreditAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="mt-1 h-8 border-amber-300/20 bg-white/5 text-xs text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`credit-reason-${p.id}`} className="text-[11px] text-slate-300">
                          Reason
                        </Label>
                        <Input
                          id={`credit-reason-${p.id}`}
                          placeholder="Bonus campaign, correction..."
                          value={creditReasons[p.id] ?? ""}
                          onChange={(e) =>
                            setCreditReasons((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="mt-1 h-8 border-amber-300/20 bg-white/5 text-xs text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleCreditAdjust(p.id)}
                          disabled={creditPendingId === p.id}
                          className="h-8 bg-gradient-to-r from-yellow-500 to-amber-400 px-3 text-xs text-black hover:from-yellow-400 hover:to-amber-300"
                        >
                          {creditPendingId === p.id ? "Saving..." : "Apply"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={`/u/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`link-customer-page-${p.id}`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-amber-300/30 bg-amber-500/10 px-2 text-xs text-amber-100 hover:bg-amber-500/20"
                      >
                        View Public Page
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 border-amber-300/30 bg-amber-500/10 px-2 text-xs text-amber-100 hover:bg-amber-500/20"
                      onClick={async () => {
                        const link =
                          typeof window !== "undefined"
                            ? `${window.location.origin}/c/${p.slug}`
                            : `/c/${p.slug}`;
                        await copyToClipboardSafe(link);
                        setCopiedSlug(p.slug);
                        setTimeout(() => setCopiedSlug((s) => (s === p.slug ? null : s)), 1200);
                      }}
                    >
                      {copiedSlug === p.slug ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          Copy NFC Link
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={false}
                      className="h-7 border-white/20 bg-white/5 px-2 text-xs text-slate-100 hover:bg-white/10"
                      onClick={() =>
                        void handleCopySettingsLink(
                          p.id,
                          p.settingsAccessToken,
                          p.settingsAccessExpiresAt,
                        )
                      }
                    >
                      {copiedSettingsId === p.id ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Copied settings link
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          Copy settings link
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={false}
                      className="h-7 border-white/20 bg-white/5 px-2 text-xs text-slate-100 hover:bg-white/10"
                      onClick={() => void handleRegenerateSettingsLink(p.id)}
                    >
                      <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                      Regenerate link
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={`/u/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`link-preview-${p.id}`}
                    title="Open customer landing page"
                  >
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                  <Link href={`/admin/cards/${p.id}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-300 hover:bg-white/10 hover:text-white"
                      data-testid={`button-edit-${p.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive.mutate({ id: p.id })}
                    disabled={toggleActive.isPending}
                    className="text-slate-300 hover:bg-white/10 hover:text-white"
                    data-testid={`button-toggle-${p.id}`}
                  >
                    {p.isActive ? (
                      <ToggleRight className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-500" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(p.id)}
                    className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                    data-testid={`button-delete-${p.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the card and all its analytics data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteProfile.mutate({ id: deleteId })}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
