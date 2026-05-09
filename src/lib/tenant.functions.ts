import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUPER_ADMIN_EMAIL = "macknonvulimu708@gmail.com";

const InputSchema = z.object({
  businessName: z.string().trim().min(1).max(255).optional(),
  fullName: z.string().trim().min(1).max(255).optional().nullable(),
});

export const ensureTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims.email as string | undefined) ?? "";
    const fullName =
      data.fullName ??
      ((claims.user_metadata as Record<string, unknown> | undefined)?.full_name as
        | string
        | undefined) ??
      null;
    const isSuper = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    const { data: existing, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id, role, email, full_name, status")
      .eq("id", userId)
      .maybeSingle();

    if (readErr) {
      throw new Error(`Failed to load profile: ${readErr.message}`);
    }

    if (existing?.tenant_id) {
      return {
        profileId: existing.id,
        tenantId: existing.tenant_id,
        created: false,
      };
    }

    if (isSuper) {
      if (!existing) {
        const { error: insErr } = await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            email,
            full_name: fullName,
            role: "super_admin",
            status: "active",
          },
          { onConflict: "id" },
        );
        if (insErr) throw new Error(`Failed to create super admin profile: ${insErr.message}`);
      }
      return { profileId: userId, tenantId: null, created: false };
    }

    const businessName =
      data.businessName?.trim() ||
      (fullName?.trim() ? `${fullName.trim()}'s Workspace` : "My Workspace");

    const { data: newTenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({ name: businessName, owner_id: userId })
      .select("id")
      .single();

    if (tErr || !newTenant) {
      throw new Error(`Failed to create workspace: ${tErr?.message ?? "unknown"}`);
    }

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        tenant_id: newTenant.id,
        email,
        full_name: fullName,
        role: existing?.role ?? "owner",
        status: "active",
      },
      { onConflict: "id" },
    );

    if (pErr) {
      throw new Error(`Failed to link profile to workspace: ${pErr.message}`);
    }

    return { profileId: userId, tenantId: newTenant.id, created: true };
  });
