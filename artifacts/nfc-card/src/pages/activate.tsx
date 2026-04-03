import { useParams, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useActivateCard, useGetCard, getGetCardQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign } from "lucide-react";
import logo from "/topping-courier-logo.png";

const activateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type ActivateForm = z.infer<typeof activateSchema>;

export default function Activate() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const alreadyActive = search.includes("already=true");
  const { toast } = useToast();

  const { data: card } = useGetCard(code!, {
    query: { enabled: !!code, queryKey: getGetCardQueryKey(code!) }
  });

  const activateCard = useActivateCard();

  const form = useForm<ActivateForm>({
    resolver: zodResolver(activateSchema),
    defaultValues: {
      name: "",
      businessName: "",
      phone: "",
      email: "",
      username: "",
      password: "",
    },
  });

  if (alreadyActive) {
    return (
      <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f0f2f8" }}>
        <header style={{ background: "#1A2D7C" }} className="px-6 py-3 flex items-center shadow-lg">
          <img src={logo} alt="Topping Courier" className="h-16 w-auto" />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF3CC" }}>
              <CreditCard className="w-7 h-7" style={{ color: "#F5A500" }} />
            </div>
            <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#1A2D7C" }}>Card Already Activated</h1>
            <p className="text-gray-500 mb-6">This card has already been registered. Log in to access your account.</p>
            <button
              onClick={() => setLocation("/login")}
              className="w-full h-12 rounded-lg font-bold text-base transition-all hover:opacity-90"
              style={{ background: "#F5A500", color: "#fff" }}
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = (data: ActivateForm) => {
    activateCard.mutate(
      { params: { code: code! }, data },
      {
        onSuccess: (response) => {
          localStorage.setItem("nfc_token", response.token);
          toast({ title: "Card activated!", description: "Welcome to Topping Courier. Your $40 credit has been added." });
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const message = (err as { data?: { error?: string } })?.data?.error ?? "Activation failed. Please try again.";
          toast({ title: "Error", description: message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f0f2f8" }}>
      <header style={{ background: "#1A2D7C" }} className="px-6 py-3 flex items-center shadow-lg">
        <img src={logo} alt="Topping Courier" className="h-16 w-auto" />
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="max-w-md w-full">
          <div className="rounded-2xl p-6 mb-5 shadow-lg" style={{ background: "linear-gradient(135deg, #111E52, #1A2D7C)" }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,165,0,0.2)" }}>
                <DollarSign className="w-5 h-5" style={{ color: "#F5A500" }} />
              </div>
              <span className="text-2xl font-extrabold text-white">$40 Credit Included</span>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              Your smart card comes with $40 credit to get started with Topping Courier services.
            </p>
            {card && (
              <p className="mt-3 text-xs font-mono" style={{ color: "#F5A500" }}>Card: {card.cardCode}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#1A2D7C" }}>Activate Your Smart Card</h1>
            <p className="text-gray-500 text-sm mb-6">Create your account to claim your card and credit.</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" data-testid="input-name" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith Logistics" data-testid="input-business-name" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" data-testid="input-phone" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" data-testid="input-email" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johnsmith" data-testid="input-username" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 6 characters" data-testid="input-password" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  className="w-full h-12 rounded-lg font-bold text-base transition-all hover:opacity-90 mt-2"
                  style={{ background: "#F5A500", color: "#fff" }}
                  disabled={activateCard.isPending}
                  data-testid="button-activate"
                >
                  {activateCard.isPending ? "Activating..." : "Activate Card & Create Account"}
                </button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
