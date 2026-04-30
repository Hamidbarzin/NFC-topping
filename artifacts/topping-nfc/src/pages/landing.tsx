import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { getGetProfileBySlugQueryKey, useGetProfileBySlug } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  NfcProfileMobileCard,
  profileToMobileModel,
  type NfcProfileMobileModel,
} from "@/components/nfc-profile-mobile-card";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  MessageCircleMore,
  QrCode,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";

/** Static demo for landing hero — mirrors real public card UI */
const LANDING_CARD_PREVIEW: NfcProfileMobileModel = {
  businessName: "Topping Courier",
  jobTitle: "Logistics Manager",
  shortBio: "Fast, reliable deliveries with real-time updates.",
  businessDescription:
    "We handle pickups and last-mile delivery so your customers always get a professional handoff.",
  profilePhotoUrl: "",
  logoUrl: "",
  bannerUrl: "",
  bannerColor: "#d97706",
  phone: "+1 647 339 0222",
  externalContactUrl: "https://toppingcourier.ca",
  bookingUrl: "https://toppingcourier.ca",
  instagram: "",
  ownerEmail: "hello@toppingcourier.ca",
  address: "87 Windrow Street",
  city: "Richmond Hill",
  orderUrl: "https://toppingcourier.ca",
  galleryUrls: [],
  totalDeliveries: 120,
  totalClients: 48,
  rating: 4.9,
};

/** Public profile slug for hero preview + demo link. Override with `VITE_LANDING_PREVIEW_SLUG` or `?preview=slug`. */
const LANDING_DEFAULT_PREVIEW_SLUG =
  (import.meta.env.VITE_LANDING_PREVIEW_SLUG as string | undefined)?.trim() || "f1001";

function useLandingPreviewSlug(): string {
  const [slug, setSlug] = useState(LANDING_DEFAULT_PREVIEW_SLUG);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("preview")?.trim();
    if (fromUrl) setSlug(fromUrl);
  }, []);

  return slug;
}

function LandingHeroPhonePreview({ previewSlug }: { previewSlug: string }) {
  const { data: profile, isLoading, isSuccess, isError } = useGetProfileBySlug(previewSlug, {
    query: {
      queryKey: getGetProfileBySlugQueryKey(previewSlug),
      retry: false,
      staleTime: 120_000,
    },
  });

  const live = isSuccess && profile;
  const model: NfcProfileMobileModel = live ? profileToMobileModel(profile) : LANDING_CARD_PREVIEW;

  const creditBalanceValue =
    live && typeof profile.creditBalance === "string"
      ? Number(profile.creditBalance)
      : live && typeof profile.creditBalance === "number"
        ? profile.creditBalance
        : 0;
  const safeCreditBalance = Number.isFinite(creditBalanceValue) ? creditBalanceValue : 0;
  const isCreditExpired =
    !!live &&
    !!profile.creditExpiresAt &&
    new Date(profile.creditExpiresAt).getTime() < Date.now();

  const walletSlot = live ? (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Wallet</p>
      <p className="mt-2 text-lg font-bold tabular-nums text-gray-900">${safeCreditBalance.toFixed(2)}</p>
      {isCreditExpired ? (
        <p className="mt-1 text-xs text-rose-600">Credit expired</p>
      ) : profile.creditExpiresAt ? (
        <p className="mt-1 text-[11px] text-gray-500">
          Expires {new Date(profile.creditExpiresAt).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  ) : (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Wallet</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">$55.00</p>
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div className="absolute inset-0 rounded-[2.75rem] bg-gradient-to-br from-orange-500/30 to-violet-500/25 blur-2xl" />
      <div className="relative text-center">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
          Live card preview
        </p>
        {live ? (
          <p className="mb-2 text-[10px] text-gray-500">
            Same UI as your public page{" "}
            <Link className="text-amber-200/90 underline-offset-2 hover:underline" href={`/u/${previewSlug}`}>
              /u/{previewSlug}
            </Link>
          </p>
        ) : isError ? (
          <p className="mb-2 text-[10px] text-amber-200/70">Demo data (profile not reachable from this build)</p>
        ) : null}
        <div className="relative mx-auto rounded-[2.75rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-[0_32px_64px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" aria-hidden />
          <div className="relative h-[520px] overflow-hidden rounded-[2rem] bg-zinc-950">
            <div className="absolute left-1/2 top-0 w-[430px] -translate-x-1/2 origin-top scale-[0.64]">
              {isLoading ? (
                <div className="mx-auto w-full max-w-[430px] space-y-4 overflow-hidden rounded-[32px] border border-white/10 bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
                  <div className="h-40 animate-pulse rounded-2xl bg-neutral-200/80" />
                  <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-neutral-200/80" />
                  <div className="mx-auto h-6 w-48 animate-pulse rounded-lg bg-neutral-200/80" />
                  <div className="mx-auto h-4 w-36 animate-pulse rounded-lg bg-neutral-200/80" />
                  <div className="h-12 animate-pulse rounded-2xl bg-neutral-200/80" />
                  <div className="h-12 animate-pulse rounded-2xl bg-neutral-200/80" />
                </div>
              ) : (
                <NfcProfileMobileCard
                  model={model}
                  previewMode
                  onSaveContact={() => {}}
                  onShare={() => Promise.resolve()}
                  walletSlot={walletSlot}
                />
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-orange-300/25 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-orange-100">
            NFC ready
          </span>
          <span className="rounded-full border border-violet-300/25 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-100">
            CRM sync
          </span>
        </div>
      </div>
    </div>
  );
}

function RevealSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </section>
  );
}

const howItWorks = [
  {
    title: "Tap the card",
    description: "Customer taps NFC card or scans QR and instantly opens your profile.",
    icon: Smartphone,
  },
  {
    title: "Customer fills info",
    description: "Lead fills a clean activation/contact form in seconds.",
    icon: CheckCircle2,
  },
  {
    title: "Leads go to CRM",
    description: "Every lead and profile update appears in your CRM dashboard.",
    icon: LayoutDashboard,
  },
];

const features = [
  { title: "NFC + QR", description: "Share offline and online with one card.", icon: QrCode },
  { title: "Lead Capture Form", description: "Convert visits into real customer data.", icon: Sparkles },
  { title: "CRM Dashboard", description: "Manage contacts, status, and activity in one place.", icon: LayoutDashboard },
  { title: "Smart Contact Link", description: "Use any booking/contact URL with your custom CTA label.", icon: MessageCircleMore },
  { title: "Analytics", description: "Track taps and profile engagement over time.", icon: BarChart3 },
  { title: "Credit System", description: "Use wallet credits with expiry and transaction history.", icon: Wallet },
];

const plans = [
  { name: "Starter", price: "$19", subtitle: "Perfect to launch your first digital card." },
  { name: "Pro", price: "$49", subtitle: "For growing teams that need CRM insights." },
  { name: "Business", price: "$99", subtitle: "Advanced controls for serious scaling." },
];

export default function Landing() {
  const previewSlug = useLandingPreviewSlug();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-[#060B17] to-[#0C1224] text-white">
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-56 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-[0.16em] text-amber-100">TOPPING NFC</span>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" className="rounded-xl text-gray-300 hover:bg-white/10 hover:text-white" asChild>
              <Link href="/admin">Admin</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:py-14">
        <RevealSection className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-200">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              Smart NFC SaaS platform
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.06] text-white md:text-5xl lg:text-6xl">
              Turn every tap into a{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                customer
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-300 md:text-lg">
              Smart NFC cards with built-in CRM and lead capture — the same live card your customers see after setup.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:flex">
              <Button
                className="h-11 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-black shadow-[0_14px_30px_rgba(249,115,22,0.35)] transition-transform duration-300 hover:scale-[1.02] hover:from-orange-400 hover:to-amber-300 sm:w-auto"
                asChild
              >
                <Link href="/c/c1001">
                  Get your card
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full rounded-2xl border-white/20 bg-white/5 text-white backdrop-blur-xl transition-transform duration-300 hover:scale-[1.02] hover:bg-white/10 sm:w-auto"
                asChild
              >
                <Link href={`/u/${previewSlug}`}>See demo</Link>
              </Button>
            </div>
          </div>

          <LandingHeroPhonePreview previewSlug={previewSlug} />
        </RevealSection>

        <RevealSection className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">How it works</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {howItWorks.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-black/30 p-5 transition-transform duration-300 hover:scale-[1.02]"
              >
                <item.icon className="h-5 w-5 text-orange-300" />
                <h3 className="mt-3 text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Features</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-transform duration-300 hover:scale-[1.02] hover:border-orange-300/30"
              >
                <feature.icon className="h-5 w-5 text-violet-200" />
                <h3 className="mt-3 text-lg font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:grid-cols-2 md:p-8">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Demo preview only</p>
            <h3 className="mt-3 text-xl font-semibold">Public profile preview</h3>
            <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1522] to-[#0f1322] p-4">
              <p className="text-lg font-semibold">Sample Business</p>
              <p className="text-sm text-gray-300">Example preview content for demo mode.</p>
              <div className="mt-3 grid gap-2">
                <div className="rounded-xl bg-white/10 px-3 py-2 text-sm">Call</div>
                <div className="rounded-xl bg-white/10 px-3 py-2 text-sm">Smart Contact Link</div>
                <div className="rounded-xl bg-white/10 px-3 py-2 text-sm">Website</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Demo preview only</p>
            <h3 className="mt-3 text-xl font-semibold">Lead card preview</h3>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">c1001</p>
                <span className="rounded-full bg-orange-500/20 px-2 py-1 text-xs text-orange-200">Active</span>
              </div>
              <p className="mt-3 text-sm text-gray-300">Credit: $45.00</p>
              <p className="text-sm text-gray-300">Owner: Topping Courier</p>
              <p className="text-sm text-gray-300">Tap count: 82</p>
            </div>
          </div>
        </RevealSection>

        <RevealSection>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Pricing</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-transform duration-300 hover:scale-[1.02]"
              >
                <p className="text-sm font-medium text-gray-300">{plan.name}</p>
                <p className="mt-2 text-3xl font-semibold">
                  {plan.price}
                  <span className="ml-1 text-sm text-gray-400">/mo</span>
                </p>
                <p className="mt-2 text-sm text-gray-300">{plan.subtitle}</p>
                <Button
                  variant="outline"
                  className="mt-5 h-10 w-full rounded-xl border-white/20 bg-white/5 text-white transition-colors hover:bg-white/10"
                >
                  Choose {plan.name}
                </Button>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1A1010] via-[#1B1526] to-[#121728] p-6 text-center shadow-2xl md:p-9">
          <h2 className="text-3xl font-semibold">Start collecting leads today</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-300">
            Launch your NFC profile in minutes and turn every real-world interaction into measurable growth.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:justify-center">
            <Button
              className="h-11 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-black shadow-[0_14px_30px_rgba(249,115,22,0.35)] transition-transform duration-300 hover:scale-[1.02] sm:w-auto"
              asChild
            >
              <Link href="/c/c1001">Get started</Link>
            </Button>
          </div>
        </RevealSection>
      </main>

      <footer className="border-t border-white/10 bg-black/40">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 text-sm text-gray-400 sm:flex sm:items-center sm:justify-between">
          <p className="font-medium text-gray-300">TOPPING NFC</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/landing" className="hover:text-white">
              Home
            </Link>
            <Link href={`/u/${previewSlug}`} className="hover:text-white">
              Demo
            </Link>
            <Link href="/admin" className="hover:text-white">
              Admin
            </Link>
            <a href="mailto:support@toppingcard.com" className="hover:text-white">
              support@toppingcard.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
