import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";

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
  accessCode: string;
  purchasedAt: string;
};

function readMember(userSlug: string): MembershipDraft | null {
  const raw = localStorage.getItem(`membership:${userSlug}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MembershipDraft;
  } catch {
    return null;
  }
}

export default function MembershipVerifyPage() {
  const params = useParams<{ plan?: string; userSlug?: string }>();
  const [, setLocation] = useLocation();
  const planKey = (params.plan ?? "").toLowerCase();
  const userSlug = (params.userSlug ?? "").toLowerCase();
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");

  const member = useMemo(() => (userSlug ? readMember(userSlug) : null), [userSlug]);

  if (!planKey || !userSlug || !member || member.planKey !== planKey) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-white">
        <h1 className="text-3xl font-semibold">Verification page not found</h1>
        <Button className="mt-6" asChild>
          <Link href="/landing">Back to landing</Link>
        </Button>
      </div>
    );
  }

  const currentMember = member;

  function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (inputCode.trim() !== currentMember.accessCode) {
      setError("Access code is invalid.");
      return;
    }

    const next: MembershipDraft = { ...currentMember, status: "active" };
    localStorage.setItem(`membership:${userSlug}`, JSON.stringify(next));
    setLocation(`/membership/${planKey}/user/${userSlug}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#060B17] to-[#0C1224] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Payment confirmed</p>
        <h1 className="mt-2 text-4xl font-semibold">Enter your access code</h1>
        <p className="mt-3 text-gray-300">
          Trial: 7 days free. Your monthly billing is automatic after trial. We generated your access code
          after successful payment setup.
        </p>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-gray-300">Code sent to: {currentMember.email}</p>
          <p className="mt-2 text-xs text-amber-200">
            Demo mode: your generated code is <span className="font-semibold">{currentMember.accessCode}</span>
          </p>
          <form className="mt-5 space-y-3" onSubmit={onVerify}>
            <input
              className="h-10 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-400"
              placeholder="Enter 6-digit access code"
              value={inputCode}
              onChange={(event) => setInputCode(event.target.value)}
            />
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <Button className="w-full">Verify and activate</Button>
          </form>
        </section>
      </main>
    </div>
  );
}
