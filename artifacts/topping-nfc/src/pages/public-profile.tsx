import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Wifi } from "lucide-react";
import { useGetProfileBySlug, useRecordTap, getGetProfileBySlugQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { NfcPremiumPublicView } from "@/components/nfc-premium-public-view";
import { toast } from "@/hooks/use-toast";
import { buildVCard } from "@/lib/vcard";

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


const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function RedirectToCardSetup({ code }: { code: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/setup/${encodeURIComponent(code)}`, { replace: true });
  }, [code, setLocation]);
  return (
    <div className="min-h-screen bg-nfc-cream px-4 py-16 font-nfc-sans text-nfc-ink2">
      <div className="mx-auto max-w-lg rounded-nfc-card border border-nfc-cream3 bg-white p-10 text-center shadow-sm">
        <p className="font-nfc-heading text-sm font-bold text-nfc-ink">Opening setup…</p>
        <p className="mt-2 text-xs font-normal leading-relaxed text-nfc-ink3">
          One moment — we use the same premium form for every activation.
        </p>
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, isLoading, error } = useGetProfileBySlug(slug!, {
    query: { enabled: !!slug, queryKey: getGetProfileBySlugQueryKey(slug!) },
  });
  const recordTap = useRecordTap();
  const lastTappedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    if (lastTappedSlugRef.current === slug) return;
    lastTappedSlugRef.current = slug;
    recordTap.mutate({ slug });
  }, [slug, recordTap]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nfc-cream px-4 py-10 font-nfc-sans text-nfc-ink">
        <div className="mx-auto max-w-lg animate-pulse space-y-4 rounded-nfc-card border border-nfc-cream3 bg-white p-6 shadow-sm">
          <div className="mx-auto size-20 rounded-full bg-nfc-cream3" />
          <div className="mx-auto h-5 w-44 rounded-nfc-control bg-nfc-cream3" />
          <div className="mx-auto h-4 w-64 rounded-nfc-control bg-nfc-cream3" />
          <div className="h-12 rounded-nfc-control bg-nfc-cream3" />
          <div className="h-12 rounded-nfc-control bg-nfc-cream3" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    const errorMsg = error as { status?: number } | null;
    const isInactive = errorMsg?.status === 403;

    return (
      <div className="min-h-screen bg-nfc-cream px-5 py-12 font-nfc-sans text-nfc-ink">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center justify-center">
          <Card className="w-full rounded-nfc-card border border-nfc-cream3 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-nfc-control bg-nfc-amber-light text-nfc-amber ring-2 ring-nfc-amber/30">
              <Wifi className="size-7 text-nfc-ink" strokeWidth={2} />
            </div>
            <h1 className="font-nfc-heading text-xl font-extrabold tracking-tight text-nfc-ink">
              {isInactive ? "This card is not active" : "Profile not found"}
            </h1>
            <p className="mt-3 text-sm font-normal leading-relaxed text-nfc-ink2">
              {isInactive
                ? "Please contact Topping NFC support."
                : "The profile link is unavailable or may have been removed."}
            </p>
            <p className="mt-8 text-[10.5px] font-normal uppercase tracking-[0.12em] text-nfc-ink3">
              Powered by <span className="font-semibold text-nfc-amber">TOPPING · NFC</span>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const galleryLen = Array.isArray(profile.galleryUrls) ? profile.galleryUrls.length : 0;
  const hasPublishedProfileData =
    !!profile.ownerName?.trim() ||
    !!profile.jobTitle?.trim() ||
    !!profile.phone?.trim() ||
    !!profile.externalContactUrl?.trim() ||
    !!profile.bookingUrl?.trim() ||
    !!profile.instagram?.trim() ||
    !!profile.address?.trim() ||
    !!profile.city?.trim() ||
    !!profile.orderUrl?.trim() ||
    !!profile.profilePhotoUrl?.trim() ||
    !!profile.logoUrl?.trim() ||
    !!profile.bannerUrl?.trim() ||
    !!profile.ownerEmail?.trim() ||
    !!profile.shortBio?.trim() ||
    !!profile.businessDescription?.trim() ||
    !!profile.category?.trim() ||
    galleryLen > 0 ||
    (Array.isArray(profile.pricingItems) && profile.pricingItems.some((p) => p.name?.trim())) ||
    (profile.totalDeliveries ?? 0) > 0 ||
    (profile.totalClients ?? 0) > 0 ||
    (profile.rating != null && Number(profile.rating) > 0);

  if (!profile.isClaimed && !hasPublishedProfileData) {
    return <RedirectToCardSetup code={slug!} />;
  }

  const viewerProfile = profile;

  const creditBalanceValue =
    typeof profile.creditBalance === "string"
      ? Number(profile.creditBalance)
      : typeof profile.creditBalance === "number"
        ? profile.creditBalance
        : 0;
  const safeCreditBalance = Number.isFinite(creditBalanceValue) ? creditBalanceValue : 0;
  const isCreditExpired =
    !!profile.creditExpiresAt &&
    new Date(profile.creditExpiresAt).getTime() < Date.now();
  const publicUrl =
    typeof window !== "undefined" ? window.location.href : `${BASE}/u/${profile.slug}`;

  async function handleSaveContact() {
    try {
      const vCard = buildVCard({
        fullName: viewerProfile.ownerName?.trim() || viewerProfile.businessName,
        organization: viewerProfile.businessName,
        phone: viewerProfile.phone ?? "",
        email: viewerProfile.ownerEmail ?? "",
        website: viewerProfile.orderUrl ?? "",
        addressLine: [viewerProfile.address?.trim(), viewerProfile.city?.trim()]
          .filter(Boolean)
          .join(", "),
        note:
          viewerProfile.shortBio?.trim() ||
          viewerProfile.businessDescription?.trim() ||
          viewerProfile.category?.trim() ||
          `Professional services by ${viewerProfile.businessName}`,
      });
      const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${viewerProfile.slug || "contact"}.vcf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Contact downloaded", description: "vCard file is ready." });
    } catch {
      toast({ title: "Could not create contact file", description: "Please try again." });
    }
  }

  async function handleCopyLink() {
    try {
      await copyToClipboardSafe(publicUrl);
      toast({ title: "Link copied", description: "Profile URL copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the URL manually." });
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: viewerProfile.businessName,
          text: `${viewerProfile.businessName} on Topping NFC`,
          url: publicUrl,
        });
        return;
      } catch {}
    }
    await handleCopyLink();
  }

  return (
    <NfcPremiumPublicView
      profile={viewerProfile}
      safeCreditBalance={safeCreditBalance}
      isCreditExpired={isCreditExpired}
      onSaveContact={handleSaveContact}
      onShare={handleShare}
    />
  );
}
