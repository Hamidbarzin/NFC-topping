import type { ReactNode } from "react";
import type { Profile } from "@workspace/api-client-react";
import { externalContactHref } from "@/lib/url-normalize";

/** Shared shape for public profile + customer settings preview */
export type NfcProfileMobileModel = {
  businessName: string;
  jobTitle: string;
  shortBio: string;
  businessDescription: string;
  profilePhotoUrl: string;
  logoUrl: string;
  bannerUrl: string;
  bannerColor: string;
  phone: string;
  externalContactUrl: string;
  bookingUrl: string;
  instagram: string;
  ownerEmail: string;
  address: string;
  city: string;
  orderUrl: string;
  galleryUrls: string[];
  totalDeliveries: number;
  totalClients: number;
  rating: number | null;
};

export type ClientAccessPreviewModel = NfcProfileMobileModel;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "T";
}

function ensureProtocol(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function IconSave() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.11.37 2.3.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.3 21 3 13.7 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.28.2 2.47.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
    </svg>
  );
}

function IconWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M20.52 3.48A11.86 11.86 0 0012.07 0C5.55 0 .25 5.3.25 11.82c0 2.08.54 4.11 1.57 5.9L0 24l6.45-1.69a11.8 11.8 0 005.62 1.43h.01c6.52 0 11.82-5.3 11.82-11.82 0-3.15-1.22-6.1-3.38-8.44zM12.08 21.7a9.83 9.83 0 01-5.01-1.37l-.36-.21-3.83 1 1.02-3.73-.23-.38a9.8 9.8 0 01-1.5-5.2c0-5.43 4.42-9.85 9.86-9.85 2.63 0 5.1 1.02 6.95 2.89a9.78 9.78 0 012.89 6.95c0 5.43-4.43 9.85-9.79 9.9zm5.4-7.36c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.17.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.51-1.79-1.69-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.5h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.5 0 1.48 1.08 2.91 1.23 3.11.15.2 2.12 3.24 5.13 4.54.72.31 1.29.5 1.73.64.73.23 1.39.2 1.91.12.58-.09 1.78-.73 2.03-1.44.25-.7.25-1.31.18-1.44-.08-.13-.28-.2-.58-.35z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M7.75 2h8.5A5.76 5.76 0 0122 7.75v8.5A5.76 5.76 0 0116.25 22h-8.5A5.76 5.76 0 012 16.25v-8.5A5.76 5.76 0 017.75 2zm0 1.8A3.96 3.96 0 003.8 7.75v8.5a3.96 3.96 0 003.95 3.95h8.5a3.96 3.96 0 003.95-3.95v-8.5a3.96 3.96 0 00-3.95-3.95h-8.5zm8.95 1.35a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2zM12 6.85A5.15 5.15 0 1112 17.15 5.15 5.15 0 0112 6.85zm0 1.8A3.35 3.35 0 1012 15.35 3.35 3.35 0 0012 8.65z" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2v.5l-8 5-8-5V6h16zM4 18V8.73l7.47 4.67a1 1 0 001.06 0L20 8.73V18H4z" />
    </svg>
  );
}

function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
      <path d="M12 2a7 7 0 00-7 7c0 5.07 7 13 7 13s7-7.93 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
    </svg>
  );
}

function telHref(phone: string) {
  return `tel:${phone.trim()}`;
}

function instagramHref(username: string) {
  const clean = username.replace(/^@/, "").trim();
  return `https://instagram.com/${clean}`;
}

function mapsSearchHref(address: string, city: string) {
  const q = [address.trim(), city.trim()].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || address)}`;
}

type QuickIconProps = { children: ReactNode; label: string; href?: string };
function QuickLink({ children, label, href }: QuickIconProps) {
  const className =
    "flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gray-50 py-3 text-xs font-medium text-gray-700";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={`${className} transition hover:bg-gray-100`}>
        {children}
        <span>{label}</span>
      </a>
    );
  }
  return (
    <span className={`${className} cursor-not-allowed opacity-40`} aria-disabled="true">
      {children}
      <span>{label}</span>
    </span>
  );
}

type Props = {
  model: NfcProfileMobileModel;
  onSaveContact: () => void;
  onShare: () => void | Promise<void>;
  /** e.g. credit wallet — rendered after primary CTA */
  walletSlot?: ReactNode;
  /** Customer settings preview: no navigation, only Save/Share work */
  previewMode?: boolean;
};

export function NfcProfileMobileCard({
  model,
  onSaveContact,
  onShare,
  walletSlot,
  previewMode = false,
}: Props) {
  const hasPhone = Boolean(model.phone?.trim());
  const hasExternal = Boolean(model.externalContactUrl?.trim());
  const hasInstagram = Boolean(model.instagram?.trim());
  const hasAddress = Boolean(model.address?.trim());
  const effectiveBookUrl = (model.bookingUrl || model.orderUrl)?.trim() ?? "";
  const hasBook = Boolean(effectiveBookUrl);
  const hasEmail = Boolean(model.ownerEmail?.trim());

  const displayName = model.businessName.trim() || "Your business";
  const displayTitle = model.jobTitle.trim();
  const displaySubtitle = model.shortBio.trim();

  const profilePhotoSrc = model.profilePhotoUrl.trim();
  const logoSrc = model.logoUrl.trim();
  const avatarSrc = profilePhotoSrc || logoSrc;
  const bannerSrc = model.bannerUrl.trim();
  const bannerColor = model.bannerColor.trim();
  const galleryImages = model.galleryUrls.filter((u) => typeof u === "string" && u.trim()).slice(0, 9);

  const phoneLink = hasPhone ? telHref(model.phone) : undefined;
  const externalLink = hasExternal ? externalContactHref(model.externalContactUrl) : undefined;
  const instagramLink = hasInstagram ? instagramHref(model.instagram) : undefined;
  const emailLink = hasEmail ? `mailto:${model.ownerEmail.trim()}` : undefined;

  const showStats =
    model.totalDeliveries > 0 ||
    model.totalClients > 0 ||
    (model.rating != null && model.rating > 0);

  const mapHref =
    hasAddress || model.city.trim()
      ? mapsSearchHref(model.address, model.city)
      : undefined;

  const externalRow = hasExternal ? (
    previewMode ? (
      <span className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 font-semibold text-white">
        <IconWhatsapp />
        External link
      </span>
    ) : (
      <a
        href={externalLink}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 font-semibold text-white transition hover:bg-amber-600 active:scale-[0.99]"
      >
        <IconWhatsapp />
        Open link
      </a>
    )
  ) : (
    <span className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500/40 py-3.5 font-semibold text-white/90">
      <IconWhatsapp />
      Link
    </span>
  );

  const emailRow = hasEmail ? (
    previewMode ? (
      <span className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 py-3.5 font-semibold text-gray-800">
        <IconEmail />
        Email
      </span>
    ) : (
      <a
        href={emailLink}
        className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 py-3.5 font-semibold text-gray-800 transition hover:bg-gray-50 active:scale-[0.99]"
      >
        <IconEmail />
        Email
      </a>
    )
  ) : (
    <span className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-3.5 font-semibold text-gray-400">
      <IconEmail />
      Email
    </span>
  );

  return (
    <article className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.16)] ring-1 ring-black/5">
      <div
        className={`relative h-56 overflow-hidden ${bannerSrc ? "bg-cover bg-center" : bannerColor ? "" : "bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400"}`}
        style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : bannerColor ? { backgroundColor: bannerColor } : undefined}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />

        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1 text-xs font-bold text-black shadow-sm">
          NFC Active ✓
        </span>

        <span className="absolute right-4 top-4 max-w-[55%] text-right text-[10px] font-semibold leading-tight tracking-[0.2em] text-white/95 drop-shadow-sm">
          TOPPING NFC
        </span>
      </div>

      <div className="relative -mt-14 px-6 text-center">
        <div className="relative mx-auto h-28 w-28 overflow-visible">
          <div className="h-28 w-28 overflow-hidden rounded-full border-[5px] border-white bg-gradient-to-br from-amber-300 to-yellow-200 shadow-xl">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-black">
                {initials(displayName)}
              </div>
            )}
          </div>
          {logoSrc && profilePhotoSrc ? (
            <div className="absolute -bottom-1 -right-1 h-10 w-10 overflow-hidden rounded-xl border-2 border-white bg-white shadow-lg">
              <img src={logoSrc} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">{displayName}</h1>
        {displayTitle ? <p className="mt-1 font-semibold text-amber-600">{displayTitle}</p> : null}
        {displaySubtitle ? <p className="mt-1 text-sm text-gray-500">{displaySubtitle}</p> : null}

        {showStats ? (
          <div className="mx-1 mt-6 grid grid-cols-3 rounded-2xl bg-gray-50 py-4">
            <div className="text-center">
              <div className="text-xl font-bold tabular-nums text-gray-900">{model.totalDeliveries}</div>
              <div className="mt-1 text-[10px] tracking-[0.18em] text-gray-500">DELIVERIES</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold tabular-nums text-gray-900">{model.totalClients}</div>
              <div className="mt-1 text-[10px] tracking-[0.18em] text-gray-500">CLIENTS</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold tabular-nums text-gray-900">
                {model.rating != null && model.rating > 0 ? model.rating.toFixed(1) : "—"}
              </div>
              <div className="mt-1 text-[10px] tracking-[0.18em] text-gray-500">RATING</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-6 px-6 pb-6 pt-8">
        <div className="grid grid-cols-2 gap-3">
          {externalRow}
          {emailRow}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <QuickLink label="Call" href={previewMode ? undefined : phoneLink}>
            <IconPhone />
          </QuickLink>
          <QuickLink label="Link" href={previewMode ? undefined : externalLink}>
            <IconWhatsapp />
          </QuickLink>
          <QuickLink label="IG" href={previewMode ? undefined : instagramLink}>
            <IconInstagram />
          </QuickLink>
          <QuickLink label="Map" href={previewMode ? undefined : mapHref}>
            <IconLocation />
          </QuickLink>
        </div>

        {hasBook && !previewMode ? (
          <a
            href={ensureProtocol(effectiveBookUrl)}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 py-4 text-center font-bold text-black shadow-md transition active:scale-[0.985]"
          >
            Book Online
          </a>
        ) : hasBook && previewMode ? (
          <span className="block w-full rounded-2xl bg-gradient-to-r from-amber-400/70 to-yellow-200/80 py-4 text-center font-bold text-black/80 shadow-md">
            Book Online
          </span>
        ) : null}

        {walletSlot ? <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">{walletSlot}</div> : null}

        {model.businessDescription.trim() ? (
          <section className="rounded-3xl bg-gray-50 p-5 text-left">
            <p className="mb-2 text-xs uppercase tracking-[0.22em] text-gray-400">About</p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{model.businessDescription}</p>
          </section>
        ) : null}

        {galleryImages.length > 0 ? (
          <section className="text-left">
            <p className="mb-3 pl-1 text-xs uppercase tracking-[0.22em] text-gray-400">Gallery</p>
            <div className="grid grid-cols-3 gap-2">
              {galleryImages.map((img, i) => (
                <div
                  key={`${img}-${i}`}
                  className="aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-100"
                >
                  <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {hasAddress || model.city.trim() ? (
          previewMode || !mapHref ? (
            <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-5 text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm">
                <IconLocation />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{model.address.trim() || "—"}</p>
                <p className="mt-1 text-xs text-gray-500">{model.city.trim() || ""}</p>
              </div>
            </div>
          ) : (
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl bg-gray-50 p-5 text-left transition hover:bg-gray-100"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm">
                <IconLocation />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{model.address.trim() || "—"}</p>
                <p className="mt-1 text-xs text-gray-500">{model.city.trim() || ""}</p>
              </div>
            </a>
          )
        ) : null}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={onSaveContact}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black py-4 font-semibold text-white transition active:scale-[0.99]"
          >
            <IconSave />
            Save to Contacts
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="w-full rounded-2xl border border-gray-200 py-3.5 text-gray-600 transition hover:bg-gray-50"
          >
            Share Profile
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 py-5 text-center">
        <p className="text-[10px] tracking-[0.25em] text-gray-400">POWERED BY TOPPING • NFC</p>
      </div>
    </article>
  );
}

export function profileToMobileModel(profile: Profile): NfcProfileMobileModel {
  const g = profile.galleryUrls;
  const galleryUrls = Array.isArray(g)
    ? g.filter((u): u is string => typeof u === "string" && u.trim().length > 0).map((u) => u.trim())
    : [];
  const rating =
    profile.rating != null && Number.isFinite(Number(profile.rating)) ? Number(profile.rating) : null;

  return {
    businessName: profile.businessName ?? "",
    jobTitle: profile.jobTitle?.trim() ?? "",
    shortBio: profile.shortBio?.trim() ?? "",
    businessDescription: profile.businessDescription?.trim() ?? "",
    profilePhotoUrl: profile.profilePhotoUrl?.trim() ?? "",
    logoUrl: profile.logoUrl?.trim() ?? "",
    bannerUrl: profile.bannerUrl?.trim() ?? "",
    bannerColor: profile.bannerColor?.trim() ?? "",
    phone: profile.phone?.trim() ?? "",
    externalContactUrl: profile.externalContactUrl?.trim() ?? "",
    bookingUrl: profile.bookingUrl?.trim() ?? "",
    instagram: profile.instagram?.trim() ?? "",
    ownerEmail: profile.ownerEmail?.trim() ?? "",
    address: profile.address?.trim() ?? "",
    city: profile.city?.trim() ?? "",
    orderUrl: profile.orderUrl?.trim() ?? "",
    galleryUrls,
    totalDeliveries: Number(profile.totalDeliveries) || 0,
    totalClients: Number(profile.totalClients) || 0,
    rating,
  };
}
