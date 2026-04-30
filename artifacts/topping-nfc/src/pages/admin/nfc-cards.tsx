import { useEffect, useMemo, useState } from "react";
import { Check, Copy, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

async function copyToClipboardSafe(text: string): Promise<void> {
  if (!text) {
    throw new Error("No text to copy");
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
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


type AdminNfcCard = {
  id: number;
  code: string;
  slug: string | null;
  profileId: number | null;
  businessName: string | null;
  isCompleted: boolean;
  isWritten: boolean;
  status: "active" | "inactive" | "suspended";
  adminNote: string | null;
  createdAt: string;
  activatedAt: string | null;
  nfcUrl: string;
  setupUrl: string;
  publicUrl: string | null;
  settingsUrl: string | null;
  settingsToken: string | null;
};

function statusBadgeClass(status: AdminNfcCard["status"]): string {
  if (status === "active") return "border-emerald-300/35 bg-emerald-500/10 text-emerald-200";
  if (status === "suspended") return "border-rose-300/35 bg-rose-500/10 text-rose-200";
  return "border-amber-300/35 bg-amber-500/10 text-amber-200";
}

export default function AdminNfcCardsPage() {
  const { toast } = useToast();
  const [cards, setCards] = useState<AdminNfcCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savePendingId, setSavePendingId] = useState<number | null>(null);
  const [copiedValue, setCopiedValue] = useState<string>("");

  const [newCode, setNewCode] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newWritten, setNewWritten] = useState(false);

  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

  function setOperationLock(pending: boolean) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(pending ? "admin-operation-pending" : "admin-operation-idle"));
  }

  const sorted = useMemo(
    () =>
      [...cards].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [cards],
  );

  async function loadCards() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/nfc-cards");
      const body = await res.json().catch(() => []);
      if (!res.ok || !Array.isArray(body)) {
        throw new Error("Could not load NFC cards.");
      }
      const parsed = body as AdminNfcCard[];
      setCards(parsed);
      setNotesDraft(
        parsed.reduce<Record<number, string>>((acc, c) => {
          acc[c.id] = c.adminNote ?? "";
          return acc;
        }, {}),
      );
    } catch (error) {
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCards();
  }, []);

  async function handleCreateCard() {
    setCreating(true);
    setOperationLock(true);
    try {
      const res = await fetch("/api/admin/nfc-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardCode: newCode.trim() || undefined,
          adminNote: newNote.trim() || undefined,
          isWritten: newWritten,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        details?: unknown;
        cardCode?: string;
      };
      if (!res.ok) {
        const detail =
          body.details && typeof body.details === "object"
            ? JSON.stringify(body.details)
            : "";
        const msg =
          (typeof body.error === "string" && body.error) ||
          (typeof body.message === "string" && body.message) ||
          (detail ? `${res.status}: ${detail}` : null);
        throw new Error(msg ?? `Could not create card (${res.status}).`);
      }
      setNewCode("");
      setNewNote("");
      setNewWritten(false);
      toast({
        title: "Card created",
        description: `Card ${body.cardCode ?? "?"} is ready.`,
      });
      await loadCards();
    } catch (error) {
      toast({
        title: "Create failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
      setOperationLock(false);
    }
  }

  async function handlePatchCard(
    card: AdminNfcCard,
    patch: { isWritten?: boolean; isSuspended?: boolean; adminNote?: string | null },
  ) {
    setSavePendingId(card.id);
    setOperationLock(true);
    try {
      const res = await fetch(`/api/admin/nfc-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Update failed");
      }
      toast({ title: "Updated", description: `Card ${card.code} updated.` });
      await loadCards();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavePendingId(null);
      setOperationLock(false);
    }
  }

  async function copyText(value: string, successTitle: string) {
    try {
      await copyToClipboardSafe(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue((v) => (v === value ? "" : v)), 1200);
      toast({ title: successTitle, description: "Copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy text.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6 text-slate-100" data-testid="admin-nfc-cards-page">
      <div>
        <h1 className="bg-gradient-to-r from-amber-100 via-yellow-300 to-white bg-clip-text text-3xl font-bold text-transparent">
          NFC Card Operations
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Create blank cards, manage activation lifecycle, and copy operational links.
        </p>
      </div>

      <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-100">Create blank card</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[160px_1fr_auto_auto]">
          <Input
            placeholder="c1001 (optional)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-400"
          />
          <Input
            placeholder="Internal note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-400"
          />
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <input
              type="checkbox"
              checked={newWritten}
              onChange={(e) => setNewWritten(e.target.checked)}
            />
            NFC written
          </label>
          <Button
            type="button"
            onClick={() => void handleCreateCard()}
            disabled={false}
            className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-300 text-black"
          >
            {creating ? "Creating..." : "Create"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((card) => (
            <Card
              key={card.id}
              className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl"
              data-testid={`nfc-card-${card.id}`}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-100">{card.code}</p>
                  <Badge variant="outline" className={statusBadgeClass(card.status)}>
                    {card.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      card.isCompleted
                        ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-300/35 bg-amber-500/10 text-amber-200"
                    }
                  >
                    {card.isCompleted ? "Completed" : "Not completed"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      card.isWritten
                        ? "border-cyan-300/35 bg-cyan-500/10 text-cyan-200"
                        : "border-slate-300/30 bg-slate-500/10 text-slate-300"
                    }
                  >
                    {card.isWritten ? "Written" : "Not written"}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300">
                  Created {new Date(card.createdAt).toLocaleString()}
                  {card.activatedAt ? ` · Activated ${new Date(card.activatedAt).toLocaleString()}` : ""}
                  {card.slug ? ` · /u/${card.slug}` : ""}
                  {card.businessName ? ` · ${card.businessName}` : ""}
                </p>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Copy NFC URL", value: card.nfcUrl },
                    { label: "Copy setup URL", value: card.setupUrl },
                    ...(card.publicUrl ? [{ label: "Copy public URL", value: card.publicUrl }] : []),
                    ...[{
                      label: "Copy settings URL",
                      value:
                        card.settingsUrl ||
                        `${window.location.origin}/settings/${card.code}?token=${card.settingsToken || ""}`,
                    }],
                  ].map((item) => (
                    <Button
                      key={item.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyText(item.value, item.label)}
                      className="h-7 border-white/20 bg-white/5 px-2 text-xs text-slate-100 hover:bg-white/10"
                    >
                      {copiedValue === item.value ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          {item.label}
                        </>
                      )}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <Textarea
                    rows={2}
                    value={notesDraft[card.id] ?? ""}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [card.id]: e.target.value }))
                    }
                    className="border-white/15 bg-white/5 text-xs text-slate-100 placeholder:text-slate-400"
                    placeholder="Internal note..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handlePatchCard(card, {
                        adminNote: (notesDraft[card.id] ?? "").trim() || null,
                      })
                    }
                    disabled={false}
                    className="h-8 border-white/20 bg-white/5 text-xs text-slate-100 hover:bg-white/10"
                  >
                    Save note
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handlePatchCard(card, {
                        isWritten: !card.isWritten,
                      })
                    }
                    disabled={false}
                    className="h-8 border-white/20 bg-white/5 text-xs text-slate-100 hover:bg-white/10"
                  >
                    {card.isWritten ? "Mark not written" : "Mark written"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handlePatchCard(card, {
                        isSuspended: card.status !== "suspended",
                      })
                    }
                    disabled={false}
                    className="h-8 border-white/20 bg-white/5 text-xs text-slate-100 hover:bg-white/10"
                  >
                    {card.status === "suspended" ? (
                      <>
                        <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                        Unsuspend
                      </>
                    ) : (
                      "Suspend"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
