import { supabase } from "@/integrations/supabase/client";
import {
  adminListUsers,
  adminGrantAccess,
  adminRevokeAccess,
  adminSetUserStatus,
  adminGrantUserAccess,
  adminRevokeUserAccess,
} from "@/lib/admin.functions";

async function authHeaders(): Promise<{ Authorization: string }> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return { Authorization: `Bearer ${token}` };
}

export async function callAdminListUsers() {
  return adminListUsers({ headers: await authHeaders() });
}

export async function callAdminGrantAccess(tenantId: string, days: number) {
  return adminGrantAccess({ data: { tenantId, days }, headers: await authHeaders() });
}

export async function callAdminRevokeAccess(tenantId: string) {
  return adminRevokeAccess({ data: { tenantId }, headers: await authHeaders() });
}

export async function callAdminSetUserStatus(userId: string, status: "active" | "suspended") {
  return adminSetUserStatus({ data: { userId, status }, headers: await authHeaders() });
}

export async function callAdminGrantUserAccess(userId: string, days: number) {
  return adminGrantUserAccess({ data: { userId, days }, headers: await authHeaders() });
}

export async function callAdminRevokeUserAccess(userId: string) {
  return adminRevokeUserAccess({ data: { userId }, headers: await authHeaders() });
}
