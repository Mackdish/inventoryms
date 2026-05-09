import { supabase } from "@/integrations/supabase/client";
import { ensureTenant } from "@/lib/tenant.functions";

/**
 * Calls the secure `ensureTenant` server function with the current user's
 * access token in the Authorization header. The server function validates the
 * token via `requireSupabaseAuth` and provisions a tenant + profile (using the
 * service-role key) if one doesn't already exist.
 *
 * Safe to call on every login/signup — server-side logic is idempotent.
 */
export async function ensureTenantForCurrentUser(opts?: {
  businessName?: string;
  fullName?: string | null;
}) {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error("No active session");
  }

  return ensureTenant({
    data: {
      businessName: opts?.businessName,
      fullName: opts?.fullName ?? null,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
