import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useActivateCard, useGetCard, getGetCardQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";
import logo from "/topping-courier-logo.png";
import { isLoginEnabled } from "@/config";
import { phoneFieldSchema } from "@/lib/phone-schema";

const cardCodeSchema = z.object({
  cardCode: z.string().min(1, "Please enter your card code"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  phone: phoneFieldSchema,
  email: z.string().email("Please enter a valid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type CardCodeForm = z.infer<typeof cardCodeSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cardCode, setCardCode] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const { data: card, isLoading: cardLoading } = useGetCard(cardCode ?? "", {
    query: {
      enabled: !!cardCode,
      queryKey: getGetCardQueryKey(cardCode ?? ""),
      retry: false,
    },
  });

  const activateCard = useActivateCard();

  const cardForm = useForm<CardCodeForm>({
    resolver: zodResolver(cardCodeSchema),
    defaultValues: { cardCode: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      businessName: "",
      phone: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onCardSubmit = (data: CardCodeForm) => {
    setCardError(null);
    const code = data.cardCode.trim().toUpperCase();
    setCardCode(code);
  };

  const cardStatus = cardCode && !cardLoading ? (card?.status ?? "not_found") : null;

  const onRegisterSubmit = (data: RegisterForm) => {
    if (!cardCode) return;
    const { confirmPassword, ...rest } = data;
    activateCard.mutate(
      { params: { code: cardCode }, data: rest },
      {
        onSuccess: (response) => {
          localStorage.setItem("nfc_token", response.token);
          toast({
            title: "Account created!",
            description: "Welcome to Topping Courier. Your $40 credit has been added.",
          });
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const message =
            (err as { data?: { error?: string } })?.data?.error ??
            "Activation failed. Please try again.";
          toast({ title: "Error", description: message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f0f2f8" }}>
      <header style={{ background: "#1A2D7C" }} className="px-6 py-3 flex items-center justify-between shadow-lg">
        <Link href="/">
          <img src={logo} alt="Topping Courier" className="h-16 w-auto cursor-pointer" />
        </Link>
        {isLoginEnabled() && (
          <Link href="/login">
            <button
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ color: "#F5A500", border: "1px solid #F5A500", background: "transparent" }}
            >
              Sign In
            </button>
          </Link>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold" style={{ color: "#1A2D7C" }}>
              Create Your Account
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Enter your card code and fill in your details to get started
            </p>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={
                  cardCode && cardStatus === "new"
                    ? { background: "#22c55e", color: "#fff" }
                    : { background: "#F5A500", color: "#fff" }
                }
              >
                {cardCode && cardStatus === "new" ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <span className="text-sm font-semibold" style={{ color: "#1A2D7C" }}>Card Code</span>
            </div>
            <div className="w-12 h-0.5" style={{ background: cardCode && cardStatus === "new" ? "#22c55e" : "#d1d5db" }} />
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={
                  cardCode && cardStatus === "new"
                    ? { background: "#F5A500", color: "#fff" }
                    : { background: "#e5e7eb", color: "#9ca3af" }
                }
              >
                2
              </div>
              <span className="text-sm font-semibold" style={{ color: cardCode && cardStatus === "new" ? "#1A2D7C" : "#9ca3af" }}>
                Your Info
              </span>
            </div>
          </div>

          {/* Step 1: Card Code */}
          {(!cardCode || cardStatus !== "new") && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFF3CC" }}>
                  <CreditCard className="w-5 h-5" style={{ color: "#F5A500" }} />
                </div>
                <div>
                  <h2 className="font-bold" style={{ color: "#1A2D7C" }}>Enter Your Card Code</h2>
                  <p className="text-xs text-gray-400">Found on the back of your NFC card</p>
                </div>
              </div>

              <Form {...cardForm}>
                <form onSubmit={cardForm.handleSubmit(onCardSubmit)} className="flex gap-3">
                  <FormField
                    control={cardForm.control}
                    name="cardCode"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="e.g. C1001"
                            className="h-11 font-mono uppercase"
                            data-testid="input-card-code"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <button
                    type="submit"
                    disabled={cardLoading}
                    className="h-11 px-4 rounded-lg font-bold flex items-center gap-2 transition-all hover:opacity-90 shrink-0"
                    style={{ background: "#F5A500", color: "#fff" }}
                  >
                    {cardLoading ? "..." : <><span>Next</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </Form>

              {cardCode && cardStatus === "active" && (
                <div className="mt-3 p-3 rounded-lg border text-sm" style={{ background: "#fff8e1", borderColor: "#F5A500", color: "#92400e" }}>
                  This card is already activated.
                  {isLoginEnabled() ? (
                    <>
                      {" "}
                      <Link href="/login" className="font-bold underline">
                        Sign in instead
                      </Link>
                    </>
                  ) : (
                    " Open this app on the device where you signed up, or use a new card."
                  )}
                </div>
              )}
              {cardCode && cardStatus === "not_found" && !cardLoading && (
                <div className="mt-3 p-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-700">
                  Card code not found. Please check and try again.
                </div>
              )}
            </div>
          )}

          {/* $40 Credit Banner */}
          {cardCode && cardStatus === "new" && (
            <>
              <div className="rounded-2xl p-5 mb-5 shadow-lg" style={{ background: "linear-gradient(135deg, #111E52, #1A2D7C)" }}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,165,0,0.2)" }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: "#F5A500" }} />
                  </div>
                  <span className="text-xl font-extrabold text-white">$40 Credit Included</span>
                </div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Card <span className="font-mono font-bold" style={{ color: "#F5A500" }}>{cardCode}</span> is valid. Complete your registration to claim your $40 Topping Courier credit.
                </p>
              </div>

              {/* Step 2: Registration Form */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-extrabold mb-1" style={{ color: "#1A2D7C" }}>Your Information</h2>
                <p className="text-gray-500 text-sm mb-6">Fill in your details to create your account.</p>

                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" className="h-11" data-testid="input-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Business Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Smith Logistics" className="h-11" data-testid="input-business-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="+1 647 339 0222"
                                className="h-11"
                                data-testid="input-phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" className="h-11" data-testid="input-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">toppingcourier.ca/u/</span>
                              <Input placeholder="johnsmith" className="h-11 pl-[160px]" data-testid="input-username" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Min. 6 characters" className="h-11" data-testid="input-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Repeat password" className="h-11" data-testid="input-confirm-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-12 rounded-lg font-bold text-base transition-all hover:opacity-90 mt-2"
                      style={{ background: "#F5A500", color: "#fff" }}
                      disabled={activateCard.isPending}
                      data-testid="button-register"
                    >
                      {activateCard.isPending ? "Creating Account..." : "Create Account & Claim $40 Credit"}
                    </button>

                    {isLoginEnabled() && (
                      <p className="text-center text-gray-400 text-xs">
                        Already have an account?{" "}
                        <Link href="/login" className="font-semibold" style={{ color: "#F5A500" }}>
                          Sign in
                        </Link>
                      </p>
                    )}
                  </form>
                </Form>
              </div>
            </>
          )}
        </div>
      </div>

      <footer style={{ background: "#111E52" }} className="py-5 flex flex-col items-center gap-2">
        <img src={logo} alt="Topping Courier" className="h-12 w-auto opacity-90" />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© {new Date().getFullYear()} Topping Courier. All rights reserved.</p>
      </footer>
    </div>
  );
}
