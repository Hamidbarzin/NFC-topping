import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CreditCard,
  Menu,
  X,
  Wifi,
  ChevronRight,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/crm", label: "CRM", icon: CreditCard },
  { href: "/admin/nfc-cards", label: "NFC Cards", icon: Wifi },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [refreshLockEnabled, setRefreshLockEnabled] = useState(false);
  const [operationLockActive, setOperationLockActive] = useState(false);

  useEffect(() => {
    const onPending = () => setOperationLockActive(true);
    const onIdle = () => setOperationLockActive(false);
    window.addEventListener("admin-operation-pending", onPending);
    window.addEventListener("admin-operation-idle", onIdle);
    return () => {
      window.removeEventListener("admin-operation-pending", onPending);
      window.removeEventListener("admin-operation-idle", onIdle);
    };
  }, []);

  const effectiveRefreshLock = refreshLockEnabled || operationLockActive;

  useEffect(() => {
    if (!effectiveRefreshLock) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [effectiveRefreshLock]);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-[#020617] via-[#0B1225] to-[#130A23] text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(139,92,246,0.16),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(250,204,21,0.07),transparent_40%)]" />
      <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col border-r border-white/10 bg-slate-950/90 text-slate-100 backdrop-blur-xl",
          "transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20 ring-1 ring-cyan-300/35">
            <Wifi className="w-4 h-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-lg font-bold text-transparent">
            Topping NFC
          </span>
          <button
            className="ml-auto text-slate-300 lg:hidden"
            onClick={() => setOpen(false)}
            data-testid="button-close-sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
            Admin
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/admin" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-cyan-500/80 to-violet-500/80 text-white shadow-[0_8px_24px_rgba(56,189,248,0.35)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-xs text-slate-300">Admin Panel v2.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-white/10 bg-slate-950/70 px-4 backdrop-blur-xl">
          <button
            className="text-slate-200 lg:hidden"
            onClick={() => setOpen(true)}
            data-testid="button-open-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-200 sm:block">
              {navItems.find((n) => location === n.href || (n.href !== "/admin" && location.startsWith(n.href)))?.label ?? "Admin"}
            </span>
            {effectiveRefreshLock ? (
              <span className="hidden items-center gap-1 rounded-full border border-amber-300/35 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100 sm:inline-flex">
                <Lock className="h-3 w-3" />
                Refresh Lock Active
              </span>
            ) : null}
          </div>
          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mr-2 h-9 border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
              onClick={() => setRefreshLockEnabled((v) => !v)}
            >
              <Lock className="mr-2 h-4 w-4" />
              {refreshLockEnabled ? "Disable Refresh Lock" : "Enable Refresh Lock"}
            </Button>
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gradient-to-b from-white/[0.02] to-transparent p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
