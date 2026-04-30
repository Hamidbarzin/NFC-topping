"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export type PublicProfileViewModel = {
  id: string | number;
  slug?: string | null;
  business_name?: string | null;
  businessName?: string | null;
  category?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
  banner_color?: string | null;
  bannerColor?: string | null;
  order_url?: string | null;
  orderUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  external_contact_url?: string | null;
  externalContactUrl?: string | null;
  booking_url?: string | null;
  bookingUrl?: string | null;
  email?: string | null;
  ownerEmail?: string | null;
  instagram?: string | null;
  address?: string | null;
};

function businessNameOf(p: PublicProfileViewModel): string {
  return (p.business_name ?? p.businessName ?? "").trim() || "Business";
}

function logoUrlOf(p: PublicProfileViewModel): string | null {
  const v = (p.logo_url ?? p.logoUrl ?? "").trim();
  return v || null;
}

function bannerColorOf(p: PublicProfileViewModel): string {
  return (p.banner_color ?? p.bannerColor ?? "#0f2027").trim() || "#0f2027";
}

function orderUrlOf(p: PublicProfileViewModel): string | null {
  const v = (p.order_url ?? p.orderUrl ?? "").trim();
  return v || null;
}

function emailOf(p: PublicProfileViewModel): string | null {
  const v = (p.email ?? p.ownerEmail ?? "").trim();
  return v || null;
}

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function externalContactHref(raw: string): string {
  const t = raw.trim();
  if (!t) return "#";
  if (/^https?:\/\//i.test(t)) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10) return `https://wa.me/${digits}`;
  return `https://${t}`;
}

function externalContactOf(p: PublicProfileViewModel): string | null {
  const v =
    p.external_contact_url ??
    p.externalContactUrl ??
    p.whatsapp ??
    "";
  const s = String(v).trim();
  return s || null;
}

function instagramUrl(handle: string): string {
  const h = handle.replace(/^@/, "").trim();
  return `https://instagram.com/${h}`;
}

function buildVCard(profile: PublicProfileViewModel): string {
  const org = businessNameOf(profile);
  const phone = profile.phone?.trim() ?? "";
  const email = emailOf(profile) ?? "";
  const website = orderUrlOf(profile) ? ensureProtocol(orderUrlOf(profile)!) : "";
  const address = profile.address?.trim() ?? "";
  const note =
    profile.category?.trim() || `Professional services by ${org}`;

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${org}`,
    `ORG:${org}`,
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    email ? `EMAIL:${email}` : "",
    website ? `URL:${website}` : "",
    address ? `ADR:;;${address};;;;` : "",
    `NOTE:${note}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowUpRightCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16 8l-8 8M10 8h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPhone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6.5 4h3l1.5 4-2 1.5c1.2 2.4 3.1 4.3 5.5 5.5l1.5-2 4 1.5v3c0 .8-.6 1.5-1.4 1.7-5.6 1.5-11.5-4.4-10-10C5 4.6 5.7 4 6.5 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWhatsApp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3a8.6 8.6 0 0 0-7.4 13L3 21l5.2-1.4A8.6 8.6 0 1 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.7c.2-.6.6-.7 1-.7h.6c.2 0 .5.1.6.7.1.6.6 2 .6 2.1 0 .2-.2.4-.4.6l-.5.5c-.2.2-.2.4 0 .8.5 1 1.7 2.3 2.7 2.8.4.2.6.2.8 0l.6-.6c.2-.2.4-.3.7-.2.3.1 1.8.8 2.1 1 .3.1.5.2.6.4 0 .3 0 .9-.4 1.8-.4.8-1.6 1-2 1-.4 0-.9 0-2.4-.6-3.3-1.4-4.8-4.6-4.9-4.8-.1-.2-1.2-2-1.2-3.8 0-1.8 1-2.7 1.2-3Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconMail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 7h16v10H4V7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 7l8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M16 8.2h.01M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMapPin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}

function IconSave(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7 3h10l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 3v6h6V3M9 21v-7h6v7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShare(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8.5 10.5 15 7l-6.5-3.5v7Zm0 3 6.5 3.5L15 17l-6.5-3.5v7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="6" r="2" fill="currentColor" />
      <circle cx="18" cy="12" r="2" fill="currentColor" />
      <circle cx="6" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

type ProfileUiUpdate = {
  banner_color?: string | null;
  logo_url?: string | null;
};

const PROFILE_UI_EVENT = "topping-profile-ui-update";

export default function ProfilePublicView({
  profile,
}: {
  profile: PublicProfileViewModel;
}) {
  const [live, setLive] = useState<ProfileUiUpdate>({});

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<ProfileUiUpdate>;
      setLive((prev) => ({ ...prev, ...ce.detail }));
    };
    window.addEventListener(PROFILE_UI_EVENT, onUpdate as EventListener);
    return () => window.removeEventListener(PROFILE_UI_EVENT, onUpdate as EventListener);
  }, []);

  const merged: PublicProfileViewModel = useMemo(
    () => ({
      ...profile,
      banner_color: live.banner_color ?? profile.banner_color,
      bannerColor: live.banner_color ?? profile.bannerColor,
      logo_url: live.logo_url ?? profile.logo_url,
      logoUrl: live.logo_url ?? profile.logoUrl,
    }),
    [profile, live.banner_color, live.logo_url],
  );

  const name = businessNameOf(merged);
  const banner = bannerColorOf(merged);
  const logo = logoUrlOf(merged);
  const order = orderUrlOf(merged);
  const email = emailOf(merged);
  const category = merged.category?.trim() || "";
  const address = merged.address?.trim() || "";

  const initials = useMemo(() => {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [name]);

  const contacts = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      href: string;
      icon: ReactNode;
      iconWrap: string;
    }> = [];

    if (merged.phone?.trim()) {
      items.push({
        key: "call",
        label: "Call",
        href: `tel:${merged.phone.trim()}`,
        icon: <IconPhone className="h-5 w-5 text-white" />,
        iconWrap: "bg-emerald-500",
      });
    }
    {
      const ext = externalContactOf(merged);
      if (ext) {
        items.push({
          key: "external",
          label: "Link",
          href: externalContactHref(ext),
          icon: <IconWhatsApp className="h-5 w-5 text-white" />,
          iconWrap: "bg-slate-600",
        });
      }
    }
    if (email) {
      items.push({
        key: "email",
        label: "Email",
        href: `mailto:${email}`,
        icon: <IconMail className="h-5 w-5 text-white" />,
        iconWrap: "bg-blue-600",
      });
    }
    if (merged.instagram?.trim()) {
      items.push({
        key: "instagram",
        label: "Instagram",
        href: instagramUrl(merged.instagram.trim()),
        icon: <IconInstagram className="h-5 w-5 text-white" />,
        iconWrap: "bg-pink-500",
      });
    }
    return items;
  }, [merged.phone, merged.instagram, email, merged]);

  const gridCols =
    contacts.length === 1
      ? "grid-cols-1"
      : contacts.length === 2
        ? "grid-cols-2"
        : contacts.length === 3
          ? "grid-cols-3"
          : "grid-cols-2";

  const publicUrl =
    typeof window !== "undefined" ? window.location.href : "";

  async function handleSaveContact() {
    const vCard = buildVCard(merged);
    const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(merged.slug ?? "contact").toString()}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (navigator.share && publicUrl) {
      try {
        await navigator.share({ title: name, text: `${name} on Topping`, url: publicUrl });
        return;
      } catch {
        // cancelled
      }
    }
    if (publicUrl) {
      try {
        await navigator.clipboard.writeText(publicUrl);
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className={`min-h-screen bg-[#f0ede8] text-neutral-900 ${plusJakarta.className}`}>
      <div className="mx-auto w-full max-w-md pb-28">
        <div className="relative">
          <section
            className="relative h-[185px] w-full overflow-hidden bg-[#0f2027]"
            style={
              {
                backgroundImage: `linear-gradient(145deg, ${banner}, #0f2027)`,
              } as CSSProperties
            }
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/35 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-sky-400/30 blur-2xl" />

            <div className="relative z-[1] flex items-start justify-between px-4 pt-4">
              <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-neutral-900 shadow-sm">
                NFC · Active ✓
              </span>
              <span className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-md">
                TOPPING
              </span>
            </div>
          </section>

          <div className="relative z-10 -mt-12 px-4">
            <div className="rounded-[28px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
              <div className="px-4 pt-4">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="h-[92px] w-[92px] overflow-hidden rounded-[22px] border-4 border-white bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_10px_30px_rgba(15,23,42,0.18)]">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[28px] font-extrabold text-neutral-900">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-emerald-500 text-white shadow-sm">
                      <IconCheck className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="min-w-0 pt-1">
                    <h1 className="text-[22px] font-extrabold leading-tight text-neutral-900">
                      {name}
                    </h1>
                    {category ? (
                      <p className="mt-1 text-[13.5px] text-neutral-500">{category}</p>
                    ) : null}
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Verified profile
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-4 mt-4 h-px bg-neutral-200" />

              <div className="flex flex-col gap-[10px] p-[14px]">
                {order ? (
                  <a
                    href={ensureProtocol(order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#111] px-4 py-3 text-white shadow-sm transition hover:bg-black"
                  >
                    <span className="text-sm font-semibold">Order online</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      <IconArrowUpRightCircle className="h-6 w-6 text-white" />
                    </span>
                  </a>
                ) : null}

                {contacts.length ? (
                  <div className={`grid ${gridCols} gap-3`}>
                    {contacts.map((c) => (
                      <a
                        key={c.key}
                        href={c.href}
                        target={c.key === "call" || c.key === "email" ? undefined : "_blank"}
                        rel={c.key === "call" || c.key === "email" ? undefined : "noopener noreferrer"}
                        className="flex flex-col items-center gap-2 rounded-2xl bg-neutral-100 px-3 py-3 text-center transition hover:bg-neutral-200/80"
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${c.iconWrap}`}
                        >
                          {c.icon}
                        </span>
                        <span className="text-xs font-semibold text-neutral-800">{c.label}</span>
                      </a>
                    ))}
                  </div>
                ) : null}

                {category ? (
                  <div className="rounded-[28px] bg-neutral-100 p-4">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-neutral-500">
                      ABOUT
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-800">{category}</p>
                  </div>
                ) : null}

                {address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-[28px] bg-white p-4 ring-1 ring-neutral-200 transition hover:bg-neutral-50"
                  >
                    <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-orange-500 text-white">
                      <IconMapPin className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-neutral-500">
                        ADDRESS
                      </p>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-neutral-900">
                        {address}
                      </p>
                    </div>
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleSaveContact}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 px-4 py-3 text-sm font-extrabold text-neutral-900 shadow-sm transition hover:brightness-105"
                >
                  <IconSave className="h-5 w-5" />
                  Save to contacts
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50"
                >
                  <IconShare className="h-5 w-5 text-neutral-700" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 px-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
          Topping · NFC Business Cards · Canada
        </p>
      </div>
    </div>
  );
}
