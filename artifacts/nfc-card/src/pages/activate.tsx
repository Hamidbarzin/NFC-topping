import { useParams, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useActivateCard, useGetCard, getGetCardQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Zap } from "lucide-react";
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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white border rounded-xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Card Already Activated</h1>
          <p className="text-gray-600 mb-6">This card has already been registered. Log in to access your account.</p>
          <Button className="w-full" onClick={() => setLocation("/login")}>Log In</Button>
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
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="px-6 py-3 border-b bg-white flex items-center">
        <img src={logo} alt="Topping Courier" className="h-12 w-auto" />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-black text-white rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-6 h-6" />
              <span className="text-2xl font-bold">$40 Credit Included</span>
            </div>
            <p className="text-gray-300 text-sm">Your smart card comes with $40 credit to get started with Topping Courier services.</p>
            {card && (
              <p className="mt-3 text-xs text-gray-400 font-mono">Card: {card.cardCode}</p>
            )}
          </div>

          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h1 className="text-2xl font-bold mb-1">Activate Your Smart Card</h1>
            <p className="text-gray-500 text-sm mb-6">Create your account to claim your card and credit.</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" data-testid="input-name" {...field} />
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
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith Logistics" data-testid="input-business-name" {...field} />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 8900" data-testid="input-phone" {...field} />
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" data-testid="input-email" {...field} />
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
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johnsmith" data-testid="input-username" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 6 characters" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={activateCard.isPending}
                  data-testid="button-activate"
                >
                  {activateCard.isPending ? "Activating..." : "Activate Card & Create Account"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
