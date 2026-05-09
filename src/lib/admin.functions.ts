import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUPER_ADMIN_EMAIL = "macknonvulimu708@gmail.com";

async function assertSuperAdmin(userId: string, email: string | undefined, tag: string) {
  console.log(`[${tag}] assertSuperAdmin start`, { userId, email });
  if (email && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    console.log(`[${tag}] assertSuperAdmin OK via email match`);
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error(`[${tag}] assertSuperAdmin profile lookup error`, {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      status: (error as any).status,
      full: error,
    });
  }
  console.log(`[${tag}] assertSuperAdmin profile role`, data?.role);
  if (data?.role !== "super_admin") {
    console.warn(`[${tag}] assertSuperAdmin DENIED`, { userId, email, role: data?.role });
    throw new Error("Forbidden: super admin only");
  }
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tag = "adminListUsers";
    const startedAt = Date.now();
    console.log(`[${tag}] called`, {
      userId: context.userId,
      email: context.claims.email,
    });
    try {
      await assertSuperAdmin(context.userId, context.claims.email as string | undefined, tag);

      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role, status, tenant_id, access_expires_at, created_at")
        .order("created_at", { ascending: false });
      if (pErr) {
        console.error(`[${tag}] profiles query error`, {
          message: pErr.message,
          code: (pErr as any).code,
          details: (pErr as any).details,
          hint: (pErr as any).hint,
          status: (pErr as any).status,
          full: pErr,
        });
        throw new Error(pErr.message);
      }
      console.log(`[${tag}] profiles loaded`, { count: profiles?.length ?? 0 });

      const tenantIds = Array.from(new Set((profiles ?? []).map((p) => p.tenant_id).filter(Boolean) as string[]));
      let tenants: Array<{
        id: string;
        name: string;
        owner_id: string;
        subscription_status: string;
        trial_ends_at: string;
        subscription_expires_at: string | null;
        created_at: string;
      }> = [];
      if (tenantIds.length) {
        const { data: tData, error: tErr } = await supabaseAdmin
          .from("tenants")
          .select("id, name, owner_id, subscription_status, trial_ends_at, subscription_expires_at, created_at")
          .in("id", tenantIds);
        if (tErr) {
          console.error(`[${tag}] tenants query error`, {
            message: tErr.message,
            code: (tErr as any).code,
            details: (tErr as any).details,
            hint: (tErr as any).hint,
            status: (tErr as any).status,
            full: tErr,
          });
          throw new Error(tErr.message);
        }
        tenants = tData ?? [];
      }
      console.log(`[${tag}] tenants loaded`, { count: tenants.length });

      const tenantMap = new Map(tenants.map((t) => [t.id, t]));
      const result = {
        users: (profiles ?? []).map((p) => ({
          ...p,
          tenant: p.tenant_id ? tenantMap.get(p.tenant_id) ?? null : null,
        })),
      };
      console.log(`[${tag}] success`, {
        users: result.users.length,
        ms: Date.now() - startedAt,
      });
      return result;
    } catch (err) {
      const e = err as any;
      console.error(`[${tag}] failed`, {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
        status: e?.status,
        stack: e?.stack,
        full: err,
        ms: Date.now() - startedAt,
      });
      throw err;
    }
  });

const GrantSchema = z.object({
  tenantId: z.string().uuid(),
  days: z.number().int().min(1).max(3650),
});

export const adminGrantAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GrantSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId, context.claims.email as string | undefined, "adminGrantAccess");

    const { data: tenant, error: rErr } = await supabaseAdmin
      .from("tenants")
      .select("subscription_expires_at")
      .eq("id", data.tenantId)
      .single();
    if (rErr || !tenant) throw new Error(rErr?.message ?? "Tenant not found");

    const base = tenant.subscription_expires_at && new Date(tenant.subscription_expires_at).getTime() > Date.now()
      ? new Date(tenant.subscription_expires_at)
      : new Date();
    const newExpiry = new Date(base.getTime() + data.days * 24 * 60 * 60 * 1000);

    const { error: uErr } = await supabaseAdmin
      .from("tenants")
      .update({
        subscription_status: "active",
        subscription_expires_at: newExpiry.toISOString(),
      })
      .eq("id", data.tenantId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, expiresAt: newExpiry.toISOString() };
  });

const RevokeSchema = z.object({ tenantId: z.string().uuid() });

export const adminRevokeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RevokeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId, context.claims.email as string | undefined, "adminRevokeAccess");
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({
        subscription_status: "expired",
        subscription_expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const StatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
});

export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId, context.claims.email as string | undefined, "adminSetUserStatus");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UserGrantSchema = z.object({
  userId: z.string().uuid(),
  days: z.number().int().min(1).max(3650),
});

export const adminGrantUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UserGrantSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tag = "adminGrantUserAccess";
    const startedAt = Date.now();
    console.log(`[${tag}] called`, {
      actorUserId: context.userId,
      actorEmail: context.claims.email,
      targetUserId: data.userId,
      days: data.days,
    });
    try {
      await assertSuperAdmin(context.userId, context.claims.email as string | undefined, tag);

      const { data: profile, error: rErr } = await supabaseAdmin
        .from("profiles")
        .select("access_expires_at, email")
        .eq("id", data.userId)
        .single();
      if (rErr || !profile) {
        console.error(`[${tag}] target profile lookup failed`, {
          found: !!profile,
          message: rErr?.message,
          code: (rErr as any)?.code,
          details: (rErr as any)?.details,
          hint: (rErr as any)?.hint,
          status: (rErr as any)?.status,
          full: rErr,
        });
        throw new Error(rErr?.message ?? "User not found");
      }
      console.log(`[${tag}] current expiry`, {
        targetEmail: profile.email,
        access_expires_at: profile.access_expires_at,
      });

      const base = profile.access_expires_at && new Date(profile.access_expires_at).getTime() > Date.now()
        ? new Date(profile.access_expires_at)
        : new Date();
      const newExpiry = new Date(base.getTime() + data.days * 24 * 60 * 60 * 1000);

      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({ status: "active", access_expires_at: newExpiry.toISOString() })
        .eq("id", data.userId);
      if (uErr) {
        console.error(`[${tag}] update failed`, {
          message: uErr.message,
          code: (uErr as any).code,
          details: (uErr as any).details,
          hint: (uErr as any).hint,
          status: (uErr as any).status,
          full: uErr,
        });
        throw new Error(uErr.message);
      }
      console.log(`[${tag}] success`, {
        targetUserId: data.userId,
        newExpiry: newExpiry.toISOString(),
        ms: Date.now() - startedAt,
      });
      return { ok: true, expiresAt: newExpiry.toISOString() };
    } catch (err) {
      const e = err as any;
      console.error(`[${tag}] failed`, {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
        status: e?.status,
        stack: e?.stack,
        full: err,
        ms: Date.now() - startedAt,
      });
      throw err;
    }
  });

const UserRevokeSchema = z.object({ userId: z.string().uuid() });

export const adminRevokeUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UserRevokeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId, context.claims.email as string | undefined, "adminRevokeUserAccess");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ access_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
