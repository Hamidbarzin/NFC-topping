import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import logo from "/topping-courier-logo.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    login.mutate(
      { data },
      {
        onSuccess: (response) => {
          localStorage.setItem("nfc_token", response.token);
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f0f2f8" }}>
      <header style={{ background: "#1A2D7C" }} className="px-6 py-3 flex items-center justify-center shadow-lg">
        <img src={logo} alt="Topping Courier" className="h-16 w-auto" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold" style={{ color: "#1A2D7C" }}>Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to access your digital card dashboard</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: "#1A2D7C" }} className="font-semibold">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" data-testid="input-email" className="h-11" {...field} />
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
                        <Input type="password" placeholder="Your password" data-testid="input-password" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  className="w-full h-12 rounded-lg font-bold text-base transition-all hover:opacity-90 mt-2"
                  style={{ background: "#F5A500", color: "#fff" }}
                  disabled={login.isPending}
                  data-testid="button-login"
                >
                  {login.isPending ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </Form>
          </div>

          <p className="text-center text-gray-500 text-sm mt-4">
            Don't have an account?{" "}
            <Link href="/" className="font-semibold" style={{ color: "#F5A500" }}>
              Get a card
            </Link>
          </p>
        </div>
      </div>

      <footer style={{ background: "#111E52" }} className="py-5 flex justify-center">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© {new Date().getFullYear()} Topping Courier. All rights reserved.</p>
      </footer>
    </div>
  );
}
