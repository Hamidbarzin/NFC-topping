import { Link } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, LayoutDashboard, Settings, ShieldAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import logo from "/topping-courier-logo.png";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("nfc_token");
        queryClient.clear();
        window.location.href = "/login";
      },
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logo} alt="Topping Courier" className="h-11 w-auto" />
          
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium hover:text-gray-600 transition-colors flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            
            <Link href="/edit-profile" className="text-sm font-medium hover:text-gray-600 transition-colors flex items-center gap-1">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            
            {user?.isAdmin && (
              <Link href="/admin" className="text-sm font-medium hover:text-gray-600 transition-colors flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2 gap-1 text-gray-600">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>
      
      <footer className="bg-white border-t py-6 flex justify-center items-center">
        <img src={logo} alt="Topping Courier" className="h-7 w-auto opacity-70" />
      </footer>
    </div>
  );
}
