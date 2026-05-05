import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";

type MembershipDraft = {
  planKey: string;
  fullName: string;
  email: string;
  phone?: string;
  businessName?: string;
  paymentMethod?: "card";
  cardLast4?: string;
  status?: "trial" | "pending_verification" | "active";
  trialEndsAt?: string;
  nextBillingAt?: string;
  purchasedAt: string;
};

function safeReadMember(planKey: string, userSlug: string): MembershipDraft | null {
  const raw = localStorage.getItem(`membership:${userSlug}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MembershipDraft;
    if (!parsed || parsed.planKey !== planKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function MembershipUserPage() {
  const params = useParams<{ plan?: string; userSlug?: string }>();
  const planKey = (params.plan ?? "").toLowerCase();
  const userSlug = (params.userSlug ?? "").toLowerCase();

  if (!planKey || !userSlug) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-white">
        <h1 className="text-3xl font-semibold">Member page not found</h1>
        <Button className="mt-6" asChild>
          <Link href="/landing">Back to landing</Link>
        </Button>
      </div>
    );
  }

  const member = safeReadMember(planKey, userSlug);

  if (!member) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-white">
        <h1 className="text-3xl font-semibold">No membership found for this page</h1>
        <p className="mt-3 text-gray-300">
          Please purchase your plan first to generate your dedicated page.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href={`/membership/${planKey}`}>Go to purchase</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/landing">Landing</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (member.status && member.status !== "active") {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-white">
        <h1 className="text-3xl font-semibold">Membership is not active yet</h1>
        <p className="mt-3 text-gray-300">
          Complete payment verification with your access code to activate this page.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href={`/membership/${planKey}/verify/${userSlug}`}>Enter access code</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/membership/${planKey}`}>Back to plan</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#060B17] to-[#0C1224] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Dedicated member page</p>
        <h1 className="mt-2 text-4xl font-semibold">{member.fullName}</h1>
        <p className="mt-2 text-gray-300">Welcome to your private membership portal.</p>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Your subscription details</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-200">
            <p>
              <span className="text-gray-400">Plan:</span> {member.planKey}
            </p>
            <p>
              <span className="text-gray-400">Email:</span> {member.email}
            </p>
            {member.phone ? (
              <p>
                <span className="text-gray-400">Phone:</span> {member.phone}
              </p>
            ) : null}
            {member.businessName ? (
              <p>
                <span className="text-gray-400">Business:</span> {member.businessName}
              </p>
            ) : null}
            {member.paymentMethod ? (
              <p>
                <span className="text-gray-400">Payment:</span>{" "}
                {`Credit/Debit (ending ${member.cardLast4 ?? "****"})`}
              </p>
            ) : null}
            {member.trialEndsAt ? (
              <p>
                <span className="text-gray-400">Trial ends:</span>{" "}
                {new Date(member.trialEndsAt).toLocaleString()}
              </p>
            ) : null}
            {member.nextBillingAt ? (
              <p>
                <span className="text-gray-400">Next auto-billing:</span>{" "}
                {new Date(member.nextBillingAt).toLocaleString()}
              </p>
            ) : null}
            <p>
              <span className="text-gray-400">Purchased at:</span>{" "}
              {new Date(member.purchasedAt).toLocaleString()}
            </p>
            <p>
              <span className="text-gray-400">Page URL:</span> /membership/{planKey}/user/{userSlug}
            </p>
          </div>
        </section>

        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/landing">Go to landing</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/membership/${planKey}`}>Change plan page</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
