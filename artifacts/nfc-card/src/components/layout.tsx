import { Link } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Settings, ShieldAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import logo from "/topping-courier-logo.png";
import { isLoginEnabled } from "@/config";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("nfc_token");
        queryClient.clear();
        window.location.href = isLoginEnabled() ? "/login" : "/";
      },
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f0f2f8" }}>
      <header style={{ background: "#1A2D7C" }} className="sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logo} alt="Topping Courier" className="h-16 w-auto" />

          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 text-white/80 hover:text-white">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </Link>

            <Link href="/edit-profile">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 text-white/80 hover:text-white">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </button>
            </Link>

            {user?.isAdmin && (
              <Link href="/admin">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 text-white/80 hover:text-white">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 ml-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "#F5A500", color: "#fff" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      <footer style={{ background: "#111E52" }} className="py-6 flex flex-col items-center gap-2">
        <img src={logo} alt="Topping Courier" className="h-12 w-auto opacity-90" />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© {new Date().getFullYear()} Topping Courier</p>
      </footer>
    </div>
  );
}
