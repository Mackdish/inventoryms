import { createServerFn } from "@tanstack/start";

// ─── Types ────────────────────────────────────────────────────────────────────

type StkPushInput = { phone: string };
type StkPushResult =
  | { ok: true; tumaReference: string; message?: string }
  | { ok: false; message: string };

type PaymentStatusInput = { tumaReference: string };
type PaymentStatusResult = {
  payment: {
    status: string;
    mpesa_receipt_number: string | null;
    failure_reason: string | null;
    tuma_reference: string | null;
  } | null;
};

type OverviewResult = {
  tenant: {
    subscription_status: string;
    subscription_expires_at: string | null;
    trial_ends_at: string | null;
  } | null;
  payments: {
    id: string;
    amount: number;
    status: string;
    phone_number: string | null;
    mpesa_receipt_number: string | null;
    failure_reason: string | null;
    tuma_reference: string | null;
    purpose: string;
    created_at: string;
  }[];
  role: string;
};

// ─── Server functions ─────────────────────────────────────────────────────────

export const initiateSubscriptionStkPush = createServerFn()
  .validator((input: StkPushInput) => input)
  .handler(async ({ data }): Promise<StkPushResult> => {
    const { phone } = data;

    // ── PASTE YOUR EXISTING STK PUSH LOGIC HERE ──────────────────────────────
    // Example:
    //   const result = await tumaClient.stkPush({ phone, amount: 2000, ... })
    //   return { ok: true, tumaReference: result.reference }
    // ─────────────────────────────────────────────────────────────────────────

    throw new Error("initiateSubscriptionStkPush: not yet implemented");
  });

export const getPaymentStatus = createServerFn()
  .validator((input: PaymentStatusInput) => input)
  .handler(async ({ data }): Promise<PaymentStatusResult> => {
    const { tumaReference } = data;

    // ── PASTE YOUR EXISTING STATUS CHECK LOGIC HERE ───────────────────────────
    // Example:
    //   const { data: payment } = await supabaseAdmin
    //     .from("payments")
    //     .select("status, mpesa_receipt_number, failure_reason, tuma_reference")
    //     .eq("tuma_reference", tumaReference)
    //     .maybeSingle()
    //   return { payment }
    // ─────────────────────────────────────────────────────────────────────────

    throw new Error("getPaymentStatus: not yet implemented");
  });

export const getSubscriptionOverview = createServerFn()
  .handler(async (): Promise<OverviewResult> => {
    // ── PASTE YOUR EXISTING OVERVIEW LOGIC HERE ───────────────────────────────
    // Example:
    //   const user = await getServerSession()
    //   const { data: tenant } = await supabaseAdmin
    //     .from("tenants")
    //     .select("subscription_status, subscription_expires_at, trial_ends_at")
    //     .eq("id", user.tenantId)
    //     .single()
    //   const { data: payments } = await supabaseAdmin
    //     .from("payments")
    //     .select("*")
    //     .eq("tenant_id", user.tenantId)
    //     .order("created_at", { ascending: false })
    //   return { tenant, payments: payments ?? [], role: user.role }
    // ─────────────────────────────────────────────────────────────────────────

    throw new Error("getSubscriptionOverview: not yet implemented");
  });