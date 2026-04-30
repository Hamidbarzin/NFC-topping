import { useEffect, useState, type ReactNode } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, User, MapPin, Share2, ImageIcon, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { CardResolveResponse } from "@/pages/nfc-card";

const API = "/api";

const listParent = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06, duration: 0.35 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function normalizeCardCode(raw: string): string {
  return raw.trim().toLowerCase();
}

async function fetchResolve(cardCode: string): Promise<CardResolveResponse> {
  const res = await fetch(`${API}/cards/${encodeURIComponent(cardCode)}/resolve`);
  if (res.status === 404) {
    const err = new Error("not_found");
    err.name = "NotFoundError";
    throw err;
  }
  if (!res.ok) throw new Error("resolve_failed");
  return res.json() as Promise<CardResolveResponse>;
}

async function uploadImage(file: File, type: "logo"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API}/upload?type=${type}`, { method: "POST", body: formData });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.url !== "string") {
    throw new Error(typeof body.error === "string" ? body.error : "Upload failed");
  }
  return body.url as string;
}

const inputClass =
  "mt-2 h-[52px] rounded-2xl border border-gray-200 bg-white px-4 text-[16px] text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25";

const textareaClass =
  "mt-2 min-h-[128px] rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[16px] text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25";

function SectionShell({
  icon: Icon,
  kicker,
  title,
  children,
}: {
  icon: typeof Building2;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.section variants={listItem} className="rounded-[22px] border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <Icon className="h-5 w-5 text-amber-600" aria-hidden />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">{kicker}</p>
          <h2 className="mt-0.5 text-base font-bold text-gray-900">{title}</h2>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

/**
 * Blank-card activation — matches public profile card aesthetic (#f4efe8, amber hero).
 */
export default function SetupCardPage() {
  const { cardCode: rawCode } = useParams<{ cardCode: string }>();
  const code = rawCode ? normalizeCardCode(rawCode) : "";
  const [, setLocation] = useLocation();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    contact_name: "",
    business_name: "",
    category: "",
    job_title: "",
    phone: "",
    external_contact_url: "",
    booking_url: "",
    instagram: "",
    website: "",
    address: "",
    city: "",
    short_bio: "",
    logo_url: "",
    email: "",
    banner_color: "#1a1a2e",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ["setup-card-resolve", code],
    queryFn: () => fetchResolve(code),
    enabled: !!code,
    retry: false,
  });

  useEffect(() => {
    if (data?.state === "active" && data.slug) {
      setLocation(`/u/${data.slug}`);
    }
  }, [data, setLocation]);

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image.", variant: "destructive" });
      return;
    }
    try {
      const url = await uploadImage(file, "logo");
      set("logo_url", url);
      toast({ title: "Logo uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
    e.currentTarget.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code) return;
    if (!form.business_name.trim() || !form.phone.trim()) {
      setError("Business name and phone number are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/cards/${encodeURIComponent(code)}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.contact_name.trim(),
          business_name: form.business_name.trim(),
          phone: form.phone.trim(),
          external_contact_url: form.external_contact_url.trim(),
          booking_url: form.booking_url.trim(),
          instagram: form.instagram.trim(),
          website: form.website.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          category: form.category.trim(),
          job_title: form.job_title.trim(),
          short_bio: form.short_bio.trim(),
          logo_url: form.logo_url.trim() || undefined,
          email: form.email.trim(),
          banner_color:
            /^#[0-9A-Fa-f]{6}$/.test(form.banner_color.trim()) ? form.banner_color.trim() : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast({ title: "Already activated", description: "Opening your public page…" });
        const refreshed = await fetchResolve(code).catch(() => null);
        const slug =
          (refreshed?.state === "active" && refreshed.slug) ||
          (data?.state === "active" ? data.slug : null);
        if (slug) setLocation(`/u/${slug}`);
        return;
      }
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Activation failed");
      }
      const slug = body.slug as string | undefined;
      const settingsUrl = typeof body.settingsUrl === "string" ? (body.settingsUrl as string) : null;
      if (slug) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        toast({
          title: "You’re live!",
          description: settingsUrl
            ? `Public page is ready. Save your private editor link: ${origin}${settingsUrl}`
            : "Your profile is ready.",
        });
        setLocation(`/u/${slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const shellCard = "rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.14)] ring-1 ring-black/5";

  if (!code) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16 text-center text-sm text-gray-600">
        Invalid setup link.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 pb-16 pt-8">
        <div className={`mx-auto max-w-[430px] overflow-hidden ${shellCard}`}>
          <div className="h-36 animate-pulse bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100" />
          <div className="space-y-4 p-6">
            <div className="h-4 w-2/3 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>
        <p className="mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
          Preparing your activation…
        </p>
      </div>
    );
  }

  if (isError || !data) {
    const notFound =
      qError instanceof Error &&
      (qError.message === "not_found" || qError.name === "NotFoundError");
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16">
        <Card className={`mx-auto max-w-md ${shellCard} border-0`}>
          <CardContent className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {notFound ? "Card not found" : "Could not load"}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {notFound ? "This card code is not registered." : "Please try again later."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.state === "suspended") {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-16">
        <Card className={`mx-auto max-w-md ${shellCard} border border-rose-100`}>
          <CardContent className="p-10 text-center">
            <h1 className="text-xl font-bold text-gray-900">Card unavailable</h1>
            <p className="mt-2 text-sm text-gray-600">This card has been suspended.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.state === "active" && data.slug) {
    return (
      <div className="min-h-screen bg-[#f4efe8] px-4 py-20 text-center text-sm text-gray-600">
        Opening your profile…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe8] px-4 pb-20 pt-6 text-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mx-auto w-full max-w-[430px]"
      >
        <article className={`overflow-hidden ${shellCard}`}>
          <div className="relative h-[168px] overflow-hidden bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/25 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-orange-600/25 blur-2xl" />

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.12),_transparent_55%)]" />

            <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-900 shadow-sm ring-1 ring-black/5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Activate
                </span>
                <span className="max-w-[52%] text-right text-[10px] font-semibold leading-tight tracking-[0.2em] text-white/95 drop-shadow-sm">
                  TOPPING NFC
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md sm:text-[1.65rem]">
                  Activate Your Business Card
                </h1>
                <p className="mt-2 max-w-[20rem] text-sm leading-relaxed text-white/90 drop-shadow">
                  A quick, elegant setup — your public card will match this premium look.
                </p>
              </div>
            </div>
          </div>

          <div className="relative -mt-5 rounded-t-[28px] bg-white px-4 pb-8 pt-7 sm:px-6">
            <div className="mx-auto mb-6 flex max-w-sm items-center gap-3 rounded-2xl border border-amber-100/80 bg-gradient-to-r from-amber-50/90 to-orange-50/50 px-4 py-3 ring-1 ring-amber-100/60">
              <ShieldCheck className="h-9 w-9 shrink-0 text-amber-600" aria-hidden />
              <p className="text-xs leading-relaxed text-gray-700">
                Your details stay private until you publish. Large fields are built for easy tapping on
                mobile.
              </p>
            </div>

            <form onSubmit={onSubmit}>
              <motion.div
                className="space-y-5"
                variants={listParent}
                initial="hidden"
                animate="show"
              >
                <SectionShell icon={Building2} kicker="Business" title="Who you are">
                  <div>
                    <Label htmlFor="business_name" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Business name <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      id="business_name"
                      required
                      value={form.business_name}
                      onChange={(e) => set("business_name", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Chic M Salon"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">This headline appears on your public card.</p>
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Category
                    </Label>
                    <Input
                      id="category"
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                      className={inputClass}
                      placeholder="Beauty, logistics, restaurant…"
                    />
                  </div>
                  <div>
                    <Label htmlFor="job_title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Job / service title
                    </Label>
                    <Input
                      id="job_title"
                      value={form.job_title}
                      onChange={(e) => set("job_title", e.target.value)}
                      className={inputClass}
                      placeholder="Owner, stylist, courier…"
                    />
                  </div>
                </SectionShell>

                <SectionShell icon={User} kicker="Contact" title="How customers reach you">
                  <div>
                    <Label htmlFor="contact_name" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Your name <span className="font-normal normal-case tracking-normal text-gray-400">(optional)</span>
                    </Label>
                    <Input
                      id="contact_name"
                      value={form.contact_name}
                      onChange={(e) => set("contact_name", e.target.value)}
                      className={inputClass}
                      placeholder="If empty, we use your business name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Phone <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      required
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className={inputClass}
                      placeholder="+1 …"
                    />
                  </div>
                  <div>
                    <Label htmlFor="external_contact_url" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      External contact / link URL
                    </Label>
                    <Input
                      id="external_contact_url"
                      type="url"
                      inputMode="url"
                      value={form.external_contact_url}
                      onChange={(e) => set("external_contact_url", e.target.value)}
                      className={inputClass}
                      placeholder="https://…"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">Any link — social, chat, or your site.</p>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={inputClass}
                      placeholder="you@business.com"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">Shown on your card and used for account notices.</p>
                  </div>
                </SectionShell>

                <SectionShell icon={Share2} kicker="Online" title="Social & web">
                  <div>
                    <Label htmlFor="instagram" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Instagram
                    </Label>
                    <Input
                      id="instagram"
                      value={form.instagram}
                      onChange={(e) => set("instagram", e.target.value)}
                      className={inputClass}
                      placeholder="@yourbrand"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Website / order URL
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      inputMode="url"
                      value={form.website}
                      onChange={(e) => set("website", e.target.value)}
                      className={inputClass}
                      placeholder="https://"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">Used if you don’t set a dedicated booking link below.</p>
                  </div>
                  <div>
                    <Label htmlFor="booking_url" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Booking / online profile URL
                    </Label>
                    <Input
                      id="booking_url"
                      type="url"
                      inputMode="url"
                      value={form.booking_url}
                      onChange={(e) => set("booking_url", e.target.value)}
                      className={inputClass}
                      placeholder="https://calendly.com/…"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">Shown as the main “Book online” button (optional).</p>
                  </div>
                </SectionShell>

                <SectionShell icon={MapPin} kicker="Location" title="Where you operate">
                  <div>
                    <Label htmlFor="address" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      className={inputClass}
                      placeholder="Street, unit, area"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      className={inputClass}
                      placeholder="Toronto, Richmond Hill…"
                    />
                  </div>
                </SectionShell>

                <motion.section variants={listItem} className="rounded-[22px] border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
                  <Label htmlFor="short_bio" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Short bio
                  </Label>
                  <Textarea
                    id="short_bio"
                    rows={4}
                    value={form.short_bio}
                    onChange={(e) => set("short_bio", e.target.value)}
                    className={textareaClass}
                    placeholder="One or two sentences customers remember."
                  />
                </motion.section>

                <motion.section variants={listItem} className="rounded-[22px] border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
                  <Label htmlFor="banner_color" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Banner accent color
                  </Label>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Input
                      id="banner_color"
                      type="color"
                      className="h-12 w-16 cursor-pointer rounded-xl border border-gray-200 p-1"
                      value={form.banner_color}
                      onChange={(e) => set("banner_color", e.target.value)}
                    />
                    <Input
                      value={form.banner_color}
                      onChange={(e) => set("banner_color", e.target.value)}
                      className={`${inputClass} max-w-[10rem]`}
                      placeholder="#1a1a2e"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">Used behind your public card header.</p>
                </motion.section>

                <motion.section variants={listItem} className="rounded-[22px] border border-dashed border-amber-200/80 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                      <ImageIcon className="h-5 w-5 text-amber-600" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Brand</p>
                      <p className="text-base font-bold text-gray-900">Logo (optional)</p>
                    </div>
                  </div>
                  {form.logo_url ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <img
                        src={form.logo_url}
                        alt=""
                        className="h-24 w-24 rounded-[20px] border-[4px] border-white object-cover shadow-lg ring-1 ring-black/5"
                      />
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => set("logo_url", "")}>
                        Remove logo
                      </Button>
                    </div>
                  ) : null}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={onLogo}
                    className="mt-3 cursor-pointer border-0 bg-transparent p-0 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-amber-500 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white file:shadow-md"
                  />
                </motion.section>

                {error ? (
                  <motion.div
                    variants={listItem}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                  >
                    {error}
                  </motion.div>
                ) : null}

                <motion.div variants={listItem} className="pt-1">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-14 w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-base font-bold text-white shadow-lg shadow-amber-500/30 transition hover:brightness-105 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
                  >
                    {submitting ? "Activating…" : "Activate My Profile"}
                  </Button>
                  <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Secure activation · Topping NFC
                  </p>
                </motion.div>
              </motion.div>
            </form>
          </div>
        </article>
      </motion.div>
    </div>
  );
}
