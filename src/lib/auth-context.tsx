import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureTenantForCurrentUser } from "@/lib/ensure-tenant";

export type AppRole = "owner" | "manager" | "operative" | "super_admin";

export interface ProfileData {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  email: string;
  role: AppRole;
  status: string;
}

export interface TenantData {
  id: string;
  name: string;
  owner_id: string;
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  trial_ends_at: string;
  subscription_expires_at: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  tenant: TenantData | null;
  loading: boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SUPER_ADMIN_EMAIL = "macknonvulimu708@gmail.com";

/**
 * Controls whether the app automatically creates a tenant + profile for any
 * authenticated user that doesn't have one yet.
 *
 * Configure via Vite env var `VITE_AUTO_PROVISION_TENANT`:
 *   - "true"  (default) → enabled
 *   - "false"           → disabled (user sees "no workspace" until manually provisioned)
 *
 * Set separately in dev (.env) and production builds as needed.
 */
const AUTO_PROVISION_TENANT: boolean =
  (import.meta.env.VITE_AUTO_PROVISION_TENANT ?? "true")
    .toString()
    .toLowerCase() !== "false";

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfileAndTenant = async (uid: string) => {
    const { data: authUser } = await supabase.auth.getUser();
    const email = authUser?.user?.email ?? "";
    const fullName =
      (authUser?.user?.user_metadata?.full_name as string | undefined) ?? null;

    let { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    const isSuper =
      prof?.role === "super_admin" ||
      email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // Fallback: if the user has no profile or no tenant (and isn't super admin),
    // call the secure server function to provision them. This is idempotent.
    if (AUTO_PROVISION_TENANT && (!prof || (!prof.tenant_id && !isSuper))) {
      try {
        await ensureTenantForCurrentUser({ fullName });
        const { data: refreshed } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();
        prof = refreshed;
      } catch (err) {
        console.error("ensureTenant failed:", err);
      }
    }

    setProfile((prof as ProfileData) ?? null);

    if (prof?.tenant_id) {
      const { data: t } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", prof.tenant_id)
        .maybeSingle();
      setTenant((t as TenantData) ?? null);
    } else {
      setTenant(null);
    }
  };

  const refresh = async () => {
    if (user) await loadProfileAndTenant(user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfileAndTenant(s.user.id), 0);
      } else {
        setProfile(null);
        setTenant(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfileAndTenant(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  return (
    <Ctx.Provider value={{ user, session, profile, tenant, loading, isSuperAdmin, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
