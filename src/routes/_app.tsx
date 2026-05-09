import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, FileText, Receipt,
  Users, ChevronDown, ChevronRight, LogOut, Menu, X, Bell, User as UserIcon,
  CreditCard, Lock, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

// Routes that remain accessible even when subscription is locked.
const UNLOCKED_PATHS = ["/billing", "/profile"];

function isSubscriptionLocked(tenant: { subscription_status: string; trial_ends_at: string; subscription_expires_at: string | null } | null): boolean {
  if (!tenant) return false;
  const now = Date.now();
  if (tenant.subscription_status === "active") {
    if (!tenant.subscription_expires_at) return false;
    return new Date(tenant.subscription_expires_at).getTime() < now;
  }
  if (tenant.subscription_status === "trial") {
    return new Date(tenant.trial_ends_at).getTime() < now;
  }
  // expired, cancelled
  return true;
}

interface NavItem {
  label: string;
  to?: string;
  icon: React.ElementType;
  children?: { label: string; to: string }[];
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  {
    label: "Products", icon: Package, children: [
      { label: "All Products", to: "/products" },
      { label: "Categories", to: "/categories" },
    ],
  },
  { label: "Sales Orders", to: "/sales", icon: ShoppingCart },
  { label: "Purchase Orders", to: "/purchases", icon: Receipt },
  { label: "Package", to: "/deliveries", icon: Truck },
  { label: "Invoices", to: "/invoices", icon: FileText },
  { label: "Bills", to: "/bills", icon: FileText },
  {
    label: "Accounts", icon: Users, children: [
      { label: "All Staff", to: "/accounts/staff" },
      { label: "Customers", to: "/accounts/customers" },
      { label: "Vendors", to: "/accounts/vendors" },
    ],
  },
];

function AppLayout() {
  const { user, profile, tenant, loading, signOut, isSuperAdmin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [openMobile, setOpenMobile] = useState(false);

  const locked = useMemo(() => !isSuperAdmin && isSubscriptionLocked(tenant), [tenant, isSuperAdmin]);

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/login" });
    }
  }, [loading, user, nav]);

  // Hard-lock: when subscription expired, force user to /billing (or /profile/logout).
  // Super admins are exempt.
  useEffect(() => {
    if (loading || !tenant || isSuperAdmin) return;
    if (!locked) return;
    const allowed = UNLOCKED_PATHS.some((p) => loc.pathname === p || loc.pathname.startsWith(p + "/"));
    if (!allowed) {
      nav({ to: "/billing" });
    }
  }, [locked, loc.pathname, loading, tenant, nav, isSuperAdmin]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  const trialDaysLeft = tenant?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const showTrialBanner = tenant?.subscription_status === "trial" && !locked;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar transition-transform md:static md:translate-x-0",
          openMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-base font-bold">InventoryMS</span>
          </Link>
          <button className="md:hidden" onClick={() => setOpenMobile(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User card */}
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
              {(profile?.full_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{profile?.full_name ?? "User"}</div>
              <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {profile?.role ?? "operative"}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => <NavItemRender key={item.label} item={item} onNav={() => setOpenMobile(false)} />)}
          {isSuperAdmin && (
            <NavItemRender
              item={{ label: "Admin: Users", to: "/admin/users", icon: ShieldCheck }}
              onNav={() => setOpenMobile(false)}
            />
          )}
        </nav>

        <div className="border-t p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-primary px-4 text-primary-foreground md:px-6">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setOpenMobile(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-medium opacity-90">
              {isSuperAdmin ? "Platform Admin" : (tenant?.name ?? "Workspace")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
              <Bell className="h-4 w-4" />
            </button>
            <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
              <UserIcon className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {locked && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-destructive/15 px-4 py-2 text-sm text-destructive md:px-6">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="font-semibold">Subscription required.</span>
              <span className="opacity-90">Renew with M-Pesa to unlock InventoryMS.</span>
            </div>
          </div>
        )}

        {showTrialBanner && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-warning/15 px-4 py-2 text-sm md:px-6">
            <div>
              <span className="font-semibold">Free trial:</span>{" "}
              {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} remaining` : "expired"}.
            </div>
            <Link to="/billing">
              <Button size="sm" variant="default" className="h-8 gap-2 bg-primary hover:opacity-90">
                <CreditCard className="h-3.5 w-3.5" /> Upgrade now
              </Button>
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {openMobile && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpenMobile(false)} />
      )}
    </div>
  );
}

function NavItemRender({ item, onNav }: { item: NavItem; onNav: () => void }) {
  const loc = useLocation();
  const isChildActive = item.children?.some((c) => loc.pathname.startsWith(c.to));
  const [open, setOpen] = useState(!!isChildActive);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
            isChildActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-muted"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l pl-3">
            {item.children.map((c) => {
              const active = loc.pathname === c.to || loc.pathname.startsWith(c.to + "/");
              return (
                <Link
                  key={c.to}
                  to={c.to}
                  onClick={onNav}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition",
                    active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-muted"
                  )}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active = loc.pathname === item.to || (item.to && loc.pathname.startsWith(item.to + "/"));
  return (
    <Link
      to={item.to!}
      onClick={onNav}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-muted"
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
