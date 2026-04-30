import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { Plus, Trash2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { Profile } from "@workspace/api-client-react";
import { ProfilePlan } from "@workspace/api-client-react";
import { ClientAccessLivePreview } from "@/components/client-access-live-preview";
import { buildVCard } from "@/lib/vcard";
import { resolveMediaUrl } from "@/lib/media-url";
import { normalizeUserUrl } from "@/lib/url-normalize";

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


type AccessProfile = {
  id: number;
  slug: string;
  businessName: string;
  ownerName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  externalContactUrl?: string | null;
  bookingUrl?: string | null;
  ownerEmail?: string | null;
  address?: string | null;
  city?: string | null;
  orderUrl?: string | null;
  instagram?: string | null;
  shortBio?: string | null;
  businessDescription?: string | null;
  profilePhotoUrl?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  galleryUrls?: unknown;
  pricingItems?: Array<{
    name: string;
    description?: string | null;
    price: string;
    currency: string;
    billingType?: string | null;
    note?: string | null;
    buttonLabel?: string | null;
    linkUrl?: string | null;
  }>;
  customButtonLabel?: string | null;
  leadCaptureEnabled?: boolean | null;
  totalDeliveries?: number | null;
  totalClients?: number | null;
  rating?: number | null;
};

type PricingFormRow = {
  name: string;
  description: string;
  price: string;
  currency: string;
  billingType: string;
  note: string;
  buttonLabel: string;
  linkUrl: string;
};

type FormState = {
  businessName: string;
  ownerName: string;
  jobTitle: string;
  phone: string;
  externalContactUrl: string;
  bookingUrl: string;
  ownerEmail: string;
  customButtonLabel: string;
  leadCaptureEnabled: boolean;
  address: string;
  city: string;
  orderUrl: string;
  instagram: string;
  shortBio: string;
  businessDescription: string;
  profilePhotoUrl: string;
  logoUrl: string;
  bannerUrl: string;
  bannerColor: string;
  galleryUrls: string[];
  pricingRows: PricingFormRow[];
  totalDeliveries: string;
  totalClients: string;
  rating: string;
};

const EMPTY_PRICING_ROW: PricingFormRow = {
  name: "",
  description: "",
  price: "",
  currency: "CAD",
  billingType: "one-time",
  note: "",
  buttonLabel: "",
  linkUrl: "",
};

const EMPTY_FORM: FormState = {
  businessName: "",
  ownerName: "",
  jobTitle: "",
  phone: "",
  externalContactUrl: "",
  bookingUrl: "",
  ownerEmail: "",
  customButtonLabel: "",
  leadCaptureEnabled: true,
  address: "",
  city: "",
  orderUrl: "",
  instagram: "",
  shortBio: "",
  businessDescription: "",
  profilePhotoUrl: "",
  logoUrl: "",
  bannerUrl: "",
  bannerColor: "",
  galleryUrls: [],
  pricingRows: [],
  totalDeliveries: "",
  totalClients: "",
  rating: "",
};

const fieldClassName =
  "border-neutral-200 bg-white text-neutral-900 shadow-sm placeholder:text-neutral-400";
const labelClassName = "text-sm font-medium text-neutral-600";

function normalizeGalleryUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((u): u is string => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
}

function mapProfileToForm(profile: AccessProfile): FormState {
  const gallery = normalizeGalleryUrls(profile.galleryUrls);
  const td = profile.totalDeliveries ?? null;
  const tc = profile.totalClients ?? null;
  const rt = profile.rating != null && Number.isFinite(Number(profile.rating)) ? Number(profile.rating) : null;

  const pricingRows: PricingFormRow[] =
    Array.isArray(profile.pricingItems) && profile.pricingItems.length > 0
      ? profile.pricingItems.map((it) => ({
          name: it.name ?? "",
          description: it.description ?? "",
          price: it.price ?? "",
          currency: it.currency ?? "CAD",
          billingType: it.billingType ?? "one-time",
          note: it.note ?? "",
          buttonLabel: it.buttonLabel ?? "",
          linkUrl: it.linkUrl ?? "",
        }))
      : [];

  return {
    businessName: profile.businessName ?? "",
    ownerName: profile.ownerName ?? "",
    jobTitle: profile.jobTitle ?? "",
    phone: profile.phone ?? "",
    externalContactUrl: profile.externalContactUrl ?? "",
    bookingUrl: profile.bookingUrl ?? "",
    ownerEmail: profile.ownerEmail ?? "",
    customButtonLabel: profile.customButtonLabel ?? "",
    leadCaptureEnabled: profile.leadCaptureEnabled !== false,
    address: profile.address ?? "",
    city: profile.city ?? "",
    orderUrl: profile.orderUrl ?? "",
    instagram: profile.instagram ?? "",
    shortBio: profile.shortBio ?? "",
    businessDescription: profile.businessDescription ?? "",
    profilePhotoUrl: profile.profilePhotoUrl ?? "",
    logoUrl: profile.logoUrl ?? "",
    bannerUrl: profile.bannerUrl ?? "",
    bannerColor: profile.bannerColor ?? "",
    galleryUrls: gallery,
    pricingRows,
    totalDeliveries: td != null ? String(td) : "",
    totalClients: tc != null ? String(tc) : "",
    rating: rt != null && rt > 0 ? String(rt) : "",
  };
}

function parseNonNegativeInt(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parseRatingField(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0 || n > 5) return undefined;
  return n;
}

function normalizeHexColor(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : null;
}

function isValidGalleryUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  return value.startsWith("/") || /^https?:\/\//i.test(value);
}

function buildPricingPayload(rows: PricingFormRow[]): any[] {
  const out: any[] = [];
  for (const r of rows) {
    const name = r.name.trim();
    if (!name) continue;
    const price = r.price.trim();
    const currency = (r.currency.trim() || "CAD").slice(0, 16);
    if (!price) continue;
    const linkRaw = r.linkUrl.trim();
    const btRaw = r.billingType.trim().toLowerCase();
    const billingType = (["one-time", "hourly", "daily", "monthly", "custom"] as const).includes(btRaw as any)
      ? (btRaw as "one-time" | "hourly" | "daily" | "monthly" | "custom")
      : "one-time";
    out.push({
      name,
      description: r.description.trim() || null,
      price,
      currency,
      billingType: billingType || undefined,
      note: r.note.trim() || null,
      buttonLabel: r.buttonLabel.trim() || null,
      linkUrl: linkRaw ? normalizeUserUrl(linkRaw) : null,
    });
  }
  return out;
}

function formToPatchBody(form: FormState): Record<string, unknown> {
  const ext = form.externalContactUrl.trim();
  const book = form.bookingUrl.trim();
  const body: Record<string, unknown> = {
    businessName: form.businessName.trim(),
    ownerName: form.ownerName.trim() || null,
    jobTitle: form.jobTitle.trim() || null,
    phone: form.phone.trim() || null,
    externalContactUrl: ext ? normalizeUserUrl(ext) : null,
    bookingUrl: book ? normalizeUserUrl(book) : null,
    ownerEmail: form.ownerEmail.trim() || null,
    customButtonLabel: form.customButtonLabel.trim() || null,
    leadCaptureEnabled: form.leadCaptureEnabled,
    address: form.address.trim() || null,
    city: form.city.trim() || null,
    orderUrl: form.orderUrl.trim() || null,
    instagram: form.instagram.trim() || null,
    shortBio: form.shortBio.trim() || null,
    businessDescription: form.businessDescription.trim() || null,
    profilePhotoUrl: form.profilePhotoUrl.trim() || null,
    logoUrl: form.logoUrl.trim() || null,
    bannerUrl: form.bannerUrl.trim() || null,
    bannerColor: normalizeHexColor(form.bannerColor),
    galleryUrls: form.galleryUrls,
    pricingItems: buildPricingPayload(form.pricingRows),
  };

  const td = parseNonNegativeInt(form.totalDeliveries);
  const tc = parseNonNegativeInt(form.totalClients);
  const rt = parseRatingField(form.rating);
  if (td !== undefined) body.totalDeliveries = td;
  if (tc !== undefined) body.totalClients = tc;
  if (rt !== undefined) body.rating = rt;

  return body;
}

function buildPremiumPreviewProfile(form: FormState, p: AccessProfile): Profile {
  const td = parseNonNegativeInt(form.totalDeliveries) ?? 0;
  const tc = parseNonNegativeInt(form.totalClients) ?? 0;
  const rt = parseRatingField(form.rating);
  const bannerColor = normalizeHexColor(form.bannerColor) ?? "#f59e0b";
  const ext = form.externalContactUrl.trim();
  const book = form.bookingUrl.trim();

  return {
    id: p.id,
    slug: p.slug,
    businessName: form.businessName.trim() || p.businessName || p.slug,
    jobTitle: form.jobTitle.trim() || null,
    shortBio: form.shortBio.trim() || null,
    businessDescription: form.businessDescription.trim() || null,
    category: null,
    phone: form.phone.trim() || null,
    externalContactUrl: ext ? normalizeUserUrl(ext) : null,
    bookingUrl: book ? normalizeUserUrl(book) : null,
    instagram: form.instagram.trim() || null,
    address: form.address.trim() || null,
    city: form.city.trim() || null,
    orderUrl: form.orderUrl.trim() || null,
    profilePhotoUrl: form.profilePhotoUrl.trim() || null,
    logoUrl: form.logoUrl.trim() || null,
    bannerUrl: form.bannerUrl.trim() || null,
    resumeUrl: null,
    bannerColor,
    galleryUrls: form.galleryUrls.map((u) => u.trim()).filter(Boolean),
    pricingItems: buildPricingPayload(form.pricingRows),
    totalDeliveries: td,
    totalClients: tc,
    rating: rt ?? null,
    isActive: true,
    isClaimed: true,
    plan: ProfilePlan.basic,
    creditBalance: null,
    creditAwardedAt: null,
    creditExpiresAt: null,
    creditNote: null,
    expiresAt: null,
    ownerEmail: form.ownerEmail.trim() || null,
    customButtonLabel: form.customButtonLabel.trim() || null,
    leadCaptureEnabled: form.leadCaptureEnabled,
    ownerName: form.ownerName.trim() || null,
    settingsAccessToken: null,
    settingsAccessExpiresAt: null,
    settingsAccessCreatedAt: null,
    tapCount: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

async function uploadImage(
  file: File,
  type: "profile" | "logo" | "banner" | "gallery",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/upload?type=${type}`, {
    method: "POST",
    body: formData,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.url !== "string") {
    throw new Error(typeof body.error === "string" ? body.error : "Image upload failed");
  }
  return body.url as string;
}

function FriendlyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen bg-[#f4efe8] px-4 py-12 text-neutral-900">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center">
        <Card className="w-full rounded-[28px] border border-white/60 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <CardContent className="p-0">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg">
              <Wifi className="h-7 w-7 text-neutral-900" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">{title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ClientAccessPage() {
  const params = useParams<{
    accessToken?: string;
    cardCode?: string;
  }>();

  const accessToken =
    new URLSearchParams(window.location.search).get("token") ||
    params.accessToken ||
    "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState<string>("");
  const draftStorageKey = accessToken ? `customer-settings-draft:${accessToken}` : null;

  const previewProfile = useMemo(
    () => (profile ? buildPremiumPreviewProfile(form, profile) : null),
    [form, profile],
  );
  const invalidGalleryUrls = useMemo(
    () => form.galleryUrls.filter((url) => !isValidGalleryUrl(url)),
    [form.galleryUrls],
  );

  useEffect(() => {
    async function loadProfile() {
      if (!accessToken) {
        setErrorCode("invalid_token");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorCode(null);

      try {
        const res = await fetch(`/api/client-access/${new URLSearchParams(window.location.search).get("token") || ""}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorCode(typeof body.error === "string" ? body.error : "invalid_token");
          setLoading(false);
          return;
        }

        const loaded = body as AccessProfile;
        const profileForm = mapProfileToForm(loaded);
        let nextForm = profileForm;

        if (draftStorageKey && typeof window !== "undefined") {
          const rawDraft = window.localStorage.getItem(draftStorageKey);
          if (rawDraft) {
            try {
              const parsed = JSON.parse(rawDraft) as { form?: Partial<FormState> };
              if (parsed.form && typeof parsed.form === "object") {
                const g = parsed.form.galleryUrls;
                const pr = parsed.form.pricingRows;
                nextForm = {
                  ...profileForm,
                  ...parsed.form,
                  galleryUrls: Array.isArray(g)
                    ? g.filter((u) => typeof u === "string")
                    : profileForm.galleryUrls,
                  pricingRows: Array.isArray(pr)
                    ? pr.filter((r) => r && typeof r === "object")
                    : profileForm.pricingRows,
                };
              }
            } catch {
              window.localStorage.removeItem(draftStorageKey);
            }
          }
        }

        setProfile(loaded);
        setForm(nextForm);
      } catch {
        setErrorCode("network_error");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [accessToken, draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || !profile) return;
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        form,
        updatedAt: new Date().toISOString(),
      }),
    );
  }, [draftStorageKey, form, profile]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    field: "profilePhotoUrl" | "logoUrl" | "bannerUrl",
    type: "profile" | "logo" | "banner",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = await uploadImage(file, type);
      setField(field, url);
      setMessage("");
      toast({ title: "Uploaded", description: "Image uploaded successfully." });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function handleGalleryUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      return;
    }
    try {
      const url = await uploadImage(file, "gallery");
      setForm((prev) => ({ ...prev, galleryUrls: [...prev.galleryUrls, url] }));
      setMessage("");
      toast({ title: "Uploaded", description: "Added to gallery preview." });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      event.currentTarget.value = "";
    }
  }

  function removeGalleryUrl(url: string) {
    setForm((prev) => ({ ...prev, galleryUrls: prev.galleryUrls.filter((u) => u !== url) }));
  }

  function addPricingRow() {
    setForm((prev) => ({
      ...prev,
      pricingRows: [...prev.pricingRows, { ...EMPTY_PRICING_ROW }],
    }));
  }

  function updatePricingRow(index: number, patch: Partial<PricingFormRow>) {
    setForm((prev) => ({
      ...prev,
      pricingRows: prev.pricingRows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function removePricingRow(index: number) {
    setForm((prev) => ({
      ...prev,
      pricingRows: prev.pricingRows.filter((_, i) => i !== index),
    }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    if (invalidGalleryUrls.length > 0) {
      toast({
        title: "Invalid gallery URL",
        description: "Gallery items must start with http(s):// or /",
        variant: "destructive",
      });
      return;
    }

    const extRaw = form.externalContactUrl.trim();
    if (extRaw && !normalizeUserUrl(extRaw)) {
      toast({
        title: "Invalid external link",
        description: "Enter a valid URL for the external contact link.",
        variant: "destructive",
      });
      return;
    }
    const bookRaw = form.bookingUrl.trim();
    if (bookRaw && !normalizeUserUrl(bookRaw)) {
      toast({
        title: "Invalid booking URL",
        description: "Enter a valid URL for booking or your online profile.",
        variant: "destructive",
      });
      return;
    }
    for (const row of form.pricingRows) {
      const nm = row.name.trim();
      if (nm && !row.price.trim()) {
        toast({
          title: "Pricing incomplete",
          description: `Add a price for “${nm}” or clear the service name.`,
          variant: "destructive",
        });
        return;
      }
    }
    for (const row of form.pricingRows) {
      if (!row.name.trim()) continue;
      const link = row.linkUrl.trim();
      if (link && !normalizeUserUrl(link)) {
        toast({
          title: "Invalid pricing link",
          description: `Check the link URL for “${row.name.trim()}”.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/client-access/${accessToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPatchBody(form)),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errCode = typeof body.error === "string" ? body.error : "";
        if (
          errCode === "invalid_token" ||
          errCode === "token_expired" ||
          errCode === "profile_not_found"
        ) {
          setErrorCode(errCode);
        }
        const detail =
          typeof (body as { message?: unknown }).message === "string"
            ? String((body as { message: string }).message)
            : "";
        toast({
          title: "Save failed",
          description:
            detail ||
            (errCode === "validation_error"
              ? "Some fields are invalid. Check ratings (0–5), numbers, and URLs."
              : "We could not save your changes."),
          variant: "destructive",
        });
        return;
      }

      const payload = body as { profile?: AccessProfile };
      const updated = payload.profile;
      if (!updated) {
        toast({
          title: "Save failed",
          description: "Unexpected response from server.",
          variant: "destructive",
        });
        return;
      }
      setProfile(updated);
      setForm(mapProfileToForm(updated));
      if (draftStorageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }
      setMessage("Your profile was updated successfully.");
      toast({ title: "Saved", description: "Changes are live on your public page." });
    } catch {
      toast({
        title: "Network error",
        description: "Could not reach server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSharePreview() {
    const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
    const slugUrl = profile?.slug && origin ? `${origin}/u/${profile.slug}` : "";

    try {
      if (navigator.share && slugUrl) {
        await navigator.share({
          title: form.businessName.trim() || "My profile",
          text: "My digital NFC card",
          url: slugUrl,
        });
        return;
      }
    } catch {
      /* dismissed */
    }
    try {
      const out = slugUrl || (typeof window !== "undefined" ? window.location.href : "");
      if (out) await copyToClipboardSafe(out);
      toast({ title: "Link copied", description: "Public profile URL copied." });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy link.", variant: "destructive" });
    }
  }

  function handleSaveContactPreview() {
    try {
      const org = form.businessName.trim() || "Contact";
      const vCard = buildVCard({
        fullName: form.ownerName.trim() || org,
        organization: org,
        phone: form.phone.trim(),
        email: form.ownerEmail.trim(),
        website: form.orderUrl.trim(),
        addressLine: [form.address.trim(), form.city.trim()].filter(Boolean).join(", "),
        note:
          form.shortBio.trim() ||
          form.businessDescription.trim() ||
          `Professional services by ${org}`,
      });
      const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(form.businessName.trim() || "contact").replace(/\s+/g, "_")}.vcf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Contact downloaded", description: "vCard file is ready." });
    } catch {
      toast({ title: "Could not create contact file", description: "Please try again.", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-10 text-neutral-900">
        <div className="mx-auto w-full max-w-[430px] animate-pulse space-y-4">
          <div className="h-56 rounded-[32px] bg-neutral-200/80" />
          <div className="h-40 rounded-[28px] bg-neutral-200/80" />
          <div className="h-48 rounded-[28px] bg-neutral-200/80" />
        </div>
      </div>
    );
  }
if (errorCode === "invalid_token") {
  return (
    <FriendlyState
      title="Profile Not Found"
      description="This NFC profile could not be loaded. Please check the card link or try again."
    />
  );
}
if (errorCode === "token_expired") {
  return (
    <FriendlyState
      title="Profile Unavailable"
      description="This NFC profile is not available right now. Please try again later."
    />
  );
}
  if (errorCode === "profile_not_found") {
    return (
      <FriendlyState
        title="Profile Not Found"
        description="The profile for this link no longer exists."
      />
    );
  }

  if (errorCode === "network_error" || !profile) {
    return (
      <FriendlyState
        title="Something went wrong"
        description="We could not load your profile right now. Please try again later."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe8] px-4 pb-14 pt-8 text-neutral-900">
      <div className="mx-auto w-full max-w-[430px] space-y-8">
        <div>
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-neutral-900">
            Edit your card
          </h1>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Changes below update your public NFC page. Preview updates as you type.
          </p>
        </div>

        {previewProfile ? (
          <ClientAccessLivePreview
            profile={previewProfile}
            safeCreditBalance={0}
            isCreditExpired={false}
            onSaveContact={handleSaveContactPreview}
            onShare={handleSharePreview}
          />
        ) : null}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="rounded-[28px] border border-white/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-neutral-900">Photos & banner</CardTitle>
              <p className="text-sm text-neutral-500">
                Banner is the wide image on top; logo or profile photo appears on the card.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bannerColor" className={labelClassName}>
                    Banner accent color
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="bannerColor"
                      type="color"
                      value={form.bannerColor || "#f59e0b"}
                      onChange={(e) => setField("bannerColor", e.target.value)}
                      className="h-11 w-16 cursor-pointer p-1"
                    />
                    <Input
                      value={form.bannerColor}
                      onChange={(e) => setField("bannerColor", e.target.value)}
                      className={fieldClassName}
                      placeholder="#f59e0b"
                    />
                  </div>
                  <p className="text-xs text-neutral-500">
                    Used when no banner image is uploaded.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className={labelClassName}>Banner image</Label>
                  {form.bannerUrl ? (
                    <img
                      src={resolveMediaUrl(form.bannerUrl)}
                      alt=""
                      className="h-28 w-full rounded-2xl border border-neutral-200 object-cover"
                    />
                  ) : (
                    <p className="text-xs text-neutral-500">No banner yet — a gold gradient shows instead.</p>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleUpload(e, "bannerUrl", "banner")}
                    className={`${fieldClassName} file:border-0 file:bg-amber-50 file:text-neutral-900`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-neutral-200"
                    onClick={() => setField("bannerUrl", "")}
                  >
                    Remove banner
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={labelClassName}>Logo (square)</Label>
                    {form.logoUrl ? (
                      <img
                        src={resolveMediaUrl(form.logoUrl)}
                        alt=""
                        className="h-24 w-24 rounded-2xl border border-neutral-200 object-cover"
                      />
                    ) : null}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUpload(e, "logoUrl", "logo")}
                      className={`${fieldClassName} file:border-0 file:bg-amber-50 file:text-neutral-900`}
                    />
                    <Button type="button" variant="outline" className="w-full border-neutral-200" onClick={() => setField("logoUrl", "")}>
                      Remove logo
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClassName}>Profile photo</Label>
                    {form.profilePhotoUrl ? (
                      <img
                        src={resolveMediaUrl(form.profilePhotoUrl)}
                        alt=""
                        className="h-24 w-24 rounded-full border border-neutral-200 object-cover"
                      />
                    ) : null}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handleUpload(e, "profilePhotoUrl", "profile")}
                      className={`${fieldClassName} file:border-0 file:bg-amber-50 file:text-neutral-900`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-neutral-200"
                      onClick={() => setField("profilePhotoUrl", "")}
                    >
                      Remove profile photo
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-white/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-neutral-900">Gallery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {form.galleryUrls.map((u) => (
                  <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-200">
                    <img src={resolveMediaUrl(u)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white"
                      onClick={() => removeGalleryUrl(u)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => void handleGalleryUpload(e)}
                className={`${fieldClassName} file:border-0 file:bg-amber-50 file:text-neutral-900`}
              />
              <div className="space-y-2">
                <Label className={labelClassName}>Or paste image URLs (one per line)</Label>
                <Textarea
                  rows={4}
                  value={form.galleryUrls.join("\n")}
                  onChange={(e) =>
                    setField(
                      "galleryUrls",
                      e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean),
                    )
                  }
                  className={fieldClassName}
                  placeholder="https://..."
                />
                {invalidGalleryUrls.length > 0 ? (
                  <p className="text-xs text-rose-600">
                    {invalidGalleryUrls.length} invalid URL detected. Use `https://...` or `/...`.
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Tip: direct image URLs only. Invalid links will not render on the profile.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-white/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-neutral-900">Stats (optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="totalDeliveries" className={labelClassName}>
                  Deliveries
                </Label>
                <Input
                  id="totalDeliveries"
                  inputMode="numeric"
                  value={form.totalDeliveries}
                  onChange={(e) => setField("totalDeliveries", e.target.value)}
                  className={fieldClassName}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalClients" className={labelClassName}>
                  Clients
                </Label>
                <Input
                  id="totalClients"
                  inputMode="numeric"
                  value={form.totalClients}
                  onChange={(e) => setField("totalClients", e.target.value)}
                  className={fieldClassName}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating" className={labelClassName}>
                  Rating (0–5)
                </Label>
                <Input
                  id="rating"
                  inputMode="decimal"
                  value={form.rating}
                  onChange={(e) => setField("rating", e.target.value)}
                  className={fieldClassName}
                  placeholder="4.9"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-white/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-neutral-900">Business</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className={labelClassName}>
                  Business name *
                </Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  className={fieldClassName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName" className={labelClassName}>
                  Owner name
                </Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) => setField("ownerName", e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className={labelClassName}>
                  Title / role
                </Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => setField("jobTitle", e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortBio" className={labelClassName}>
                  Short bio
                </Label>
                <Textarea
                  id="shortBio"
                  rows={3}
                  value={form.shortBio}
                  onChange={(e) => setField("shortBio", e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessDescription" className={labelClassName}>
                  About (longer)
                </Label>
                <Textarea
                  id="businessDescription"
                  rows={5}
                  value={form.businessDescription}
                  onChange={(e) => setField("businessDescription", e.target.value)}
                  className={fieldClassName}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-white/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-neutral-900">Contact & links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className={labelClassName}>
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalContactUrl" className={labelClassName}>
                  External contact / link URL
                </Label>
                <Input
                  id="externalContactUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={form.externalContactUrl}
                  onChange={(e) => setField("externalContactUrl", e.target.value)}
                  className={fieldClassName}
                />
                <p className="text-xs text-neutral-500">
                  Any link you want visitors to open — website, social, chat, or booking.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bookingUrl" className={labelClassName}>
                  Booking / online profile URL
                </Label>
                <Input
                  id="bookingUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://calendly.com/…"
                  value={form.bookingUrl}
                  onChange={(e) => setField("bookingUrl", e.target.value)}
                  className={fieldClassName}
                />
                <p className="text-xs text-neutral-500">
                  Shown as the main “Book online” action on your public page (optional).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customButtonLabel" className={labelClassName}>
                  Custom button label
                </Label>
                <Input
                  id="customButtonLabel"
                  value={form.customButtonLabel}
                  onChange={(e) => setField("customButtonLabel", e.target.value)}
                  className={fieldClassName}
                  placeholder="Book Online"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={form.leadCaptureEnabled}
                  onChange={(e) => setField("leadCaptureEnabled", e.target.checked)}
                />
                Enable lead capture form on public page
              </label>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail" className={labelClassName}>
                  Email
                </Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setField("ownerEmail", e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className={labelClassName}>
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={form.instagram}
                  onChange={(e) => setField("instagram", e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderUrl" className={labelClassName}>
                  Website / order link
                </Label>
                <Input
                  id="orderUrl"
                  type="url"
                  inputMode="url"
                  value={form.orderUrl}
                  onChange={(e) => setField("orderUrl", e.target.value)}
                  className={fieldClassName}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-white/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-neutral-900">Pricing &amp; services</CardTitle>
              <p className="text-sm font-normal text-neutral-500">
                Add services or packages. Leave rows empty or remove them — nothing shows until you add a name and price.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              {form.pricingRows.map((row, index) => (
                <div
                  key={`pricing-${index}`}
                  className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Item {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-neutral-500 hover:text-red-600"
                      onClick={() => removePricingRow(index)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className={labelClassName}>Service or package name</Label>
                      <Input
                        value={row.name}
                        onChange={(e) => updatePricingRow(index, { name: e.target.value })}
                        className={fieldClassName}
                        placeholder="e.g. Standard delivery"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClassName}>Price</Label>
                      <Input
                        value={row.price}
                        onChange={(e) => updatePricingRow(index, { price: e.target.value })}
                        className={fieldClassName}
                        placeholder="99.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClassName}>Currency</Label>
                      <Input
                        value={row.currency}
                        onChange={(e) => updatePricingRow(index, { currency: e.target.value })}
                        className={fieldClassName}
                        placeholder="CAD"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClassName}>Billing type</Label>
                      <Input
                        value={row.billingType}
                        onChange={(e) => updatePricingRow(index, { billingType: e.target.value })}
                        className={fieldClassName}
                        placeholder="one-time / hourly / daily / monthly / custom"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className={labelClassName}>Description</Label>
                      <Textarea
                        rows={2}
                        value={row.description}
                        onChange={(e) => updatePricingRow(index, { description: e.target.value })}
                        className={fieldClassName}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className={labelClassName}>Note (optional)</Label>
                      <Input
                        value={row.note}
                        onChange={(e) => updatePricingRow(index, { note: e.target.value })}
                        className={fieldClassName}
                        placeholder="e.g. Per stop, taxes extra"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className={labelClassName}>Button label (optional)</Label>
                      <Input
                        value={row.buttonLabel}
                        onChange={(e) => updatePricingRow(index, { buttonLabel: e.target.value })}
                        className={fieldClassName}
                        placeholder="Learn more"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className={labelClassName}>Button link (optional)</Label>
                      <Input
                        type="url"
                        inputMode="url"
                        value={row.linkUrl}
                        onChange={(e) => updatePricingRow(index, { linkUrl: e.target.value })}
                        className={fieldClassName}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-dashed border-neutral-300 bg-white"
                onClick={addPricingRow}
              >
                <Plus className="mr-2 size-4" aria-hidden />
                Add pricing item
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-white/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-neutral-900">Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="address" className={labelClassName}>
                  Address
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className={labelClassName}>
                  City
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  className={fieldClassName}
                />
              </div>
            </CardContent>
          </Card>

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {message}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <p className="pb-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
          Topping · NFC Business Cards
        </p>
      </div>
    </div>
  );
}
