import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";

type PlanConfig = {
  title: string;
  priceLabel: string;
  subtitle: string;
  features: string[];
};

const PLAN_MAP: Record<string, PlanConfig> = {
  starter: {
    title: "Starter",
    priceLabel: "$19/mo",
    subtitle: "Perfect to launch your first digital card.",
    features: ["Single profile", "Basic contact actions", "Simple analytics"],
  },
  pro: {
    title: "Pro",
    priceLabel: "$49/mo",
    subtitle: "Best for teams that need CRM insight.",
    features: ["Everything in Starter", "Lead pipeline", "Advanced analytics"],
  },
  business: {
    title: "Business",
    priceLabel: "$99/mo",
    subtitle: "Advanced controls for serious scaling.",
    features: ["Everything in Pro", "Priority support", "Multi-member management"],
  },
};

type MembershipDraft = {
  planKey: string;
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  paymentMethod: "card";
  cardLast4?: string;
  status: "trial" | "pending_verification" | "active";
  trialEndsAt: string;
  nextBillingAt: string;
  purchasedAt: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function MembershipPlanPage() {
  const params = useParams<{ plan?: string }>();
  const [, setLocation] = useLocation();
  const planKey = (params.plan ?? "").toLowerCase();
  const plan = PLAN_MAP[planKey];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [error, setError] = useState("");

  const fallbackSlug = useMemo(() => `member-${Date.now()}`, []);

  if (!plan) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-white">
        <h1 className="text-3xl font-semibold">Membership plan not found</h1>
        <p className="mt-3 text-gray-300">Use one of these plans: starter, pro, business.</p>
        <Button className="mt-6" asChild>
          <Link href="/landing">Back to landing</Link>
        </Button>
      </div>
    );
  }

  async function onPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !phone.trim() || !businessName.trim()) {
      setError("Please enter full name, email, phone, and business name.");
      return;
    }

    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 12 || !cardExpiry.trim() || !cardCvc.trim()) {
      setError("Please complete card number, expiry, and CVC.");
      return;
    }

    const userSlug = slugify(fullName) || fallbackSlug;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const nextBillingAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const payload: MembershipDraft = {
      planKey,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      paymentMethod: "card",
      cardLast4: digits.slice(-4),
      status: "pending_verification",
      trialEndsAt,
      nextBillingAt,
      purchasedAt: now.toISOString(),
    };

    try {
      const response = await fetch("/api/membership/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSlug,
          phone: phone.trim(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to send verification SMS.");
      }

      localStorage.setItem(`membership:${userSlug}`, JSON.stringify(payload));
      setLocation(`/membership/${planKey}/verify/${userSlug}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send verification SMS.";
      setError(message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#060B17] to-[#0C1224] text-white">
      <main className="mx-auto w-full max-w-5xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Membership</p>
        <h1 className="mt-2 text-4xl font-semibold">{plan.title} Plan</h1>
        <p className="mt-3 max-w-2xl text-gray-300">{plan.subtitle}</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-gray-300">Price</p>
            <p className="mt-1 text-3xl font-semibold">{plan.priceLabel}</p>
            <ul className="mt-5 space-y-2 text-sm text-gray-200">
              {plan.features.map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">1-week free trial + auto billing</h2>
            <p className="mt-2 text-sm text-gray-300">
              Start your free 7-day trial. Card is saved for automatic monthly billing after trial.
            </p>
            <form className="mt-5 space-y-4" onSubmit={onPurchase}>
              <div>
                <label className="mb-1 block text-sm text-gray-300" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none ring-0 placeholder:text-gray-500 focus:border-orange-400"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none ring-0 placeholder:text-gray-500 focus:border-orange-400"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none ring-0 placeholder:text-gray-500 focus:border-orange-400"
                  placeholder="+1 647 000 0000"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-300" htmlFor="businessName">
                  Business name
                </label>
                <input
                  id="businessName"
                  className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none ring-0 placeholder:text-gray-500 focus:border-orange-400"
                  placeholder="Topping Courier"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                />
              </div>

              <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium text-gray-200">Payment method: Credit / Debit Card</p>
                <input
                  className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-400"
                  placeholder="Card number"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-400"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(event.target.value)}
                  />
                  <input
                    className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-400"
                    placeholder="CVC"
                    value={cardCvc}
                    onChange={(event) => setCardCvc(event.target.value)}
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}

              <Button className="w-full">Start trial and continue</Button>
            </form>
          </section>
        </div>

        <Button variant="ghost" className="mt-8 text-gray-300 hover:text-white" asChild>
          <Link href="/landing">Back to landing</Link>
        </Button>
      </main>
    </div>
  );
}
