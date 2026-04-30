import { useState, type ReactNode } from "react";
import type { Profile } from "@workspace/api-client-react";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Link2,
  Mail,
  MapPin,
  Phone,
  Share2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media-url";
import { externalContactHref } from "@/lib/url-normalize";

type Props = {
  profile: Profile;
  safeCreditBalance: number;
  isCreditExpired: boolean;
  onSaveContact: () => void;
  onShare: () => void | Promise<void>;
  /** Fits inside a scrollable preview (e.g. client settings) instead of forcing full viewport height. */
  embedded?: boolean;
};

function profileHasCreditField(p: Profile): boolean {
  const c = p.creditBalance;
  if (c === null || c === undefined) return false;
  if (typeof c === "string" && !c.trim()) return false;
  return true;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const fromWords = (a + b).toUpperCase();
  if (fromWords) return fromWords;
  const ch = name.trim()[0];
  return ch ? ch.toUpperCase() : "?";
}

function ensureProtocol(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function telHref(phone: string): string {
  return `tel:${phone.trim()}`;
}

function mapsSearchHref(address: string, city: string): string {
  const q = [address.trim(), city.trim()].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || address)}`;
}

function HeroSvgPattern({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-full w-full text-white", className)}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <circle cx="320" cy="40" r="80" fill="currentColor" />
      <circle cx="60" cy="180" r="60" fill="currentColor" />
      <circle cx="200" cy="110" r="120" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="350" cy="180" r="50" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function SectionCardShell({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-nfc-card border border-nfc-cream3 bg-white shadow-sm", className)}
    >
      <div className="flex items-center gap-2 border-b border-nfc-cream3 px-4 pb-2.5 pt-3.5">
        <div className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-nfc-amber-light text-nfc-amber">
          <Icon className="size-[13px]" strokeWidth={2} aria-hidden />
        </div>
        <h2 className="font-nfc-heading text-[11px] font-bold uppercase tracking-[0.1em] text-nfc-ink3">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function NfcPremiumPublicView({
  profile,
  safeCreditBalance,
  isCreditExpired,
  onSaveContact,
  onShare,
  embedded = false,
}: Props) {
  const displayName = profile.businessName?.trim() || profile.slug;

  const job = profile.jobTitle?.trim() || "";
  const cityLine = profile.city?.trim() || "";
  const heroSubtitle =
    [job, cityLine].filter(Boolean).join(" · ") ||
    profile.shortBio?.trim() ||
    profile.category?.trim() ||
    "";

  const aboutText = profile.shortBio?.trim() || profile.businessDescription?.trim() || "";

  const profilePhoto = profile.profilePhotoUrl?.trim() || "";
  const logoPhoto = profile.logoUrl?.trim() || "";
  const avatarSrc = resolveMediaUrl(profilePhoto || logoPhoto);

  const email = profile.ownerEmail?.trim() || "";
  const phone = profile.phone?.trim() || "";
  const externalLink = profile.externalContactUrl?.trim() || "";
  const address = profile.address?.trim() || "";
  const city = profile.city?.trim() || "";
  const orderUrl = profile.orderUrl?.trim() || "";
  const bookingUrl = profile.bookingUrl?.trim() || "";
  const effectiveBookingUrl = bookingUrl || externalLink || orderUrl;
  const primaryButtonLabel = profile.customButtonLabel?.trim() || "Book Online";
  const pricingItems = Array.isArray(profile.pricingItems)
    ? profile.pricingItems.filter((p) => p.name?.trim())
    : [];
  const leadCaptureEnabled = profile.leadCaptureEnabled !== false;
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    serviceInterest: "",
  });
  const [leadSending, setLeadSending] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState<string | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);

  const gallery = Array.isArray(profile.galleryUrls)
    ? profile.galleryUrls
        .filter((u) => typeof u === "string" && u.trim())
        .map((u) => ({ raw: u.trim(), resolved: resolveMediaUrl(u.trim()) }))
        .filter((x) => x.resolved)
    : [];

  /** Location card only when street address exists (city supplements maps query + subtitle). */
  const showLocationCard = Boolean(address);
  const mapsHref = showLocationCard ? mapsSearchHref(address, city) : "";
  const hasContactBlock = email || phone || externalLink;
  const showWallet = profileHasCreditField(profile);
  const showBookOnline = Boolean(effectiveBookingUrl);
  const showLeadForm = leadCaptureEnabled && !embedded;

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLeadSuccess(null);
    setLeadError(null);
    if (!leadForm.name.trim()) {
      setLeadError("Please enter your name.");
      return;
    }
    if (!leadForm.phone.trim() && !leadForm.email.trim()) {
      setLeadError("Please enter phone or email.");
      return;
    }
    setLeadSending(true);
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(profile.slug)}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadForm.name.trim(),
          phone: leadForm.phone.trim() || null,
          email: leadForm.email.trim() || null,
          message: leadForm.message.trim() || null,
          serviceInterest: leadForm.serviceInterest.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLeadError(typeof body.error === "string" ? body.error : "Could not send request.");
        return;
      }
      setLeadSuccess("Thank you. Your request has been sent.");
      setLeadForm({
        name: "",
        phone: "",
        email: "",
        message: "",
        serviceInterest: "",
      });
    } catch {
      setLeadError("Network error. Please try again.");
    } finally {
      setLeadSending(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-x-hidden bg-nfc-cream font-nfc-sans text-nfc-ink antialiased",
        embedded ? "min-h-0 rounded-[28px]" : "min-h-screen",
      )}
    >
      <header className="relative min-h-[220px] overflow-hidden bg-nfc-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-nfc-ink2/90 via-nfc-ink to-nfc-amber/15"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.06]">
          <HeroSvgPattern />
        </div>

        <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-nfc-amber/35 bg-nfc-amber/15 px-3 py-1.5">
          <span className="size-[7px] shrink-0 rounded-full bg-nfc-amber motion-safe:animate-pulse" aria-hidden />
          <span className="font-nfc-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-nfc-amber">
            NFC ACTIVE
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-lg px-6 pt-8">
          <div className="flex items-end gap-4">
            <div className="shrink-0 rounded-full bg-gradient-to-br from-nfc-amber to-nfc-ink p-[3px]">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-nfc-ink2">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-nfc-heading text-[26px] font-extrabold text-nfc-amber">
                    {initials(displayName)}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="font-nfc-heading text-[22px] font-extrabold leading-[1.15] tracking-tight text-white">
                {displayName}
              </h1>
              {heroSubtitle ? (
                <p className="mt-1 text-[13px] font-light leading-snug tracking-wide text-white/50">{heroSubtitle}</p>
              ) : null}
            </div>
          </div>

          {(showWallet || showBookOnline) && (
            <div className="mt-4 flex items-center justify-between gap-3 pb-5 pt-4">
              {showWallet ? (
                <div className="rounded-nfc-control border border-nfc-amber/25 bg-nfc-amber/[0.12] px-3.5 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/40">Wallet</p>
                  <p className="font-nfc-heading text-xl font-bold leading-tight text-nfc-amber">
                    ${safeCreditBalance.toFixed(2)}
                  </p>
                  {isCreditExpired ? (
                    <p className="mt-0.5 text-[11px] font-medium text-white/70">Expired</p>
                  ) : profile.creditExpiresAt ? (
                    <p className="mt-0.5 text-[10px] text-white/45">
                      Exp. {new Date(profile.creditExpiresAt).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
              ) : (
                <span />
              )}
              {showBookOnline ? (
                <a
                  href={ensureProtocol(effectiveBookingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-nfc-control bg-nfc-amber px-[18px] py-2.5 font-nfc-heading text-xs font-bold uppercase tracking-wide text-nfc-ink outline-none transition hover:brightness-110 motion-safe:hover:-translate-y-px active:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-nfc-ink"
                >
                  <ExternalLink className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                  {primaryButtonLabel}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-5">
        {aboutText ? (
          <SectionCardShell icon={Info} title="About">
            <p className="px-4 py-3.5 text-[13.5px] font-light leading-[1.75] text-nfc-ink2">{aboutText}</p>
          </SectionCardShell>
        ) : null}

        {hasContactBlock ? (
          <SectionCardShell icon={Phone} title="Contact">
            <div className="flex flex-col divide-y divide-nfc-cream3">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="group flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-nfc-cream focus-visible:bg-nfc-cream focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nfc-amber/30 active:bg-nfc-cream2"
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-nfc-icon bg-nfc-cream2 text-nfc-ink2">
                    <Mail className="size-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-normal text-nfc-ink3">Email</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-nfc-ink">{email}</p>
                  </div>
                  <ChevronRight
                    className="size-3.5 shrink-0 text-nfc-ink3/70 transition group-hover:translate-x-0.5 group-hover:text-nfc-amber"
                    strokeWidth={2}
                    aria-hidden
                  />
                </a>
              ) : null}
              {phone ? (
                <a
                  href={telHref(phone)}
                  className="group flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-nfc-cream focus-visible:bg-nfc-cream focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nfc-amber/30 active:bg-nfc-cream2"
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-nfc-icon bg-nfc-cream2 text-nfc-ink2">
                    <Phone className="size-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-normal text-nfc-ink3">Phone</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-nfc-ink">{phone}</p>
                  </div>
                  <ChevronRight
                    className="size-3.5 shrink-0 text-nfc-ink3/70 transition group-hover:translate-x-0.5 group-hover:text-nfc-amber"
                    strokeWidth={2}
                    aria-hidden
                  />
                </a>
              ) : null}
              {externalLink ? (
                <a
                  href={externalContactHref(externalLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-nfc-cream focus-visible:bg-nfc-cream focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nfc-amber/30 active:bg-nfc-cream2"
                >
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-nfc-icon bg-nfc-cream2 text-nfc-ink2">
                    <Link2 className="size-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-normal text-nfc-ink3">External link</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-nfc-ink">{externalLink}</p>
                  </div>
                  <ChevronRight
                    className="size-3.5 shrink-0 text-nfc-ink3/70 transition group-hover:translate-x-0.5 group-hover:text-nfc-amber"
                    strokeWidth={2}
                    aria-hidden
                  />
                </a>
              ) : null}
            </div>
          </SectionCardShell>
        ) : null}

        {gallery.length > 0 ? (
          <SectionCardShell icon={ImageIcon} title="Gallery">
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {gallery.slice(0, 9).map(({ raw, resolved }, i) => (
                <div key={`${raw}-${i}`} className="aspect-square overflow-hidden rounded-md bg-nfc-cream2">
                  <img src={resolved} alt="" className="size-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </SectionCardShell>
        ) : null}

        {showLocationCard && mapsHref ? (
          <section className="overflow-hidden rounded-nfc-card border border-nfc-cream3 bg-white shadow-sm">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-nfc-cream focus-visible:bg-nfc-cream focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nfc-amber/30 active:bg-nfc-cream2"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-nfc-icon bg-nfc-amber-light text-nfc-amber">
                <MapPin className="size-4" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-nfc-ink">{address}</p>
                <p className="mt-0.5 text-xs text-nfc-ink3">
                  {city ? `${city} · ` : ""}View on Maps
                </p>
              </div>
              <ChevronRight className="ml-auto size-3.5 shrink-0 text-nfc-ink3/70" strokeWidth={2} aria-hidden />
            </a>
          </section>
        ) : null}

        {pricingItems.length > 0 ? (
          <SectionCardShell icon={Banknote} title="Pricing">
            <div className="flex flex-col gap-3 px-4 py-3.5">
              {pricingItems.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="rounded-nfc-control border border-nfc-cream3 bg-nfc-cream/40 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-nfc-heading text-sm font-bold text-nfc-ink">{item.name}</p>
                      {item.description?.trim() ? (
                        <p className="mt-1 text-[12.5px] font-light leading-relaxed text-nfc-ink2">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-nfc-heading text-sm font-extrabold tabular-nums text-nfc-amber">
                      {item.currency.trim()} {item.price.trim()}
                    </p>
                  </div>
                  {item.note?.trim() ? (
                    <p className="mt-2 text-[11px] font-medium leading-snug text-nfc-ink3">{item.note}</p>
                  ) : null}
                  {item.billingType?.trim() ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-nfc-ink3">
                      {item.billingType}
                    </p>
                  ) : null}
                  {item.linkUrl?.trim() ? (
                    <a
                      href={ensureProtocol(item.linkUrl.trim())}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-nfc-ink2 underline-offset-2 hover:text-nfc-amber"
                    >
                      <ExternalLink className="size-3" strokeWidth={2} aria-hidden />
                      {item.buttonLabel?.trim() || "Learn more"}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCardShell>
        ) : null}

        {showLeadForm ? (
          <SectionCardShell icon={User} title="Request Service">
            <form className="space-y-2.5 px-4 py-3.5" onSubmit={submitLead}>
              <input
                className="h-10 w-full rounded-nfc-control border border-nfc-cream3 px-3 text-sm outline-none focus:border-nfc-amber"
                placeholder="Name *"
                value={leadForm.name}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="h-10 w-full rounded-nfc-control border border-nfc-cream3 px-3 text-sm outline-none focus:border-nfc-amber"
                placeholder="Phone"
                value={leadForm.phone}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <input
                className="h-10 w-full rounded-nfc-control border border-nfc-cream3 px-3 text-sm outline-none focus:border-nfc-amber"
                placeholder="Email"
                value={leadForm.email}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                className="h-10 w-full rounded-nfc-control border border-nfc-cream3 px-3 text-sm outline-none focus:border-nfc-amber"
                placeholder="Service interest (optional)"
                value={leadForm.serviceInterest}
                onChange={(e) =>
                  setLeadForm((prev) => ({ ...prev, serviceInterest: e.target.value }))
                }
              />
              <textarea
                className="min-h-[84px] w-full rounded-nfc-control border border-nfc-cream3 px-3 py-2 text-sm outline-none focus:border-nfc-amber"
                placeholder="Message / request"
                value={leadForm.message}
                onChange={(e) => setLeadForm((prev) => ({ ...prev, message: e.target.value }))}
              />
              {leadError ? <p className="text-xs text-rose-600">{leadError}</p> : null}
              {leadSuccess ? <p className="text-xs text-emerald-600">{leadSuccess}</p> : null}
              <button
                type="submit"
                disabled={leadSending}
                className="h-10 w-full rounded-nfc-control bg-nfc-ink text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
              >
                {leadSending ? "Sending..." : "Submit Request"}
              </button>
            </form>
          </SectionCardShell>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onSaveContact}
            className="flex items-center justify-center gap-2 rounded-[14px] border border-nfc-ink bg-nfc-ink px-3 py-3.5 font-nfc-heading text-xs font-bold uppercase tracking-wide text-white outline-none transition hover:bg-nfc-ink2 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-nfc-amber focus-visible:ring-offset-2 focus-visible:ring-offset-nfc-cream"
          >
            <User className="size-[15px] shrink-0" strokeWidth={2} aria-hidden />
            Save Contact
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="flex items-center justify-center gap-2 rounded-[14px] border border-nfc-cream3 bg-transparent px-3 py-3.5 font-nfc-heading text-xs font-bold uppercase tracking-wide text-nfc-ink2 outline-none transition hover:bg-nfc-cream2 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-nfc-amber focus-visible:ring-offset-2 focus-visible:ring-offset-nfc-cream"
          >
            <Share2 className="size-[15px] shrink-0" strokeWidth={2} aria-hidden />
            Share Profile
          </button>
        </div>
      </main>

      <footer className="px-6 pb-6 pt-2 text-center">
        <p className="text-[10.5px] font-normal uppercase tracking-[0.12em] text-nfc-ink3">
          Powered by <span className="font-semibold text-nfc-amber">TOPPING · NFC</span>
        </p>
      </footer>
    </div>
  );
}
