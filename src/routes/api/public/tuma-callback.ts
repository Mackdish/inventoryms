import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

/**
 * Public webhook endpoint for Tuma M-Pesa callbacks.
 *
 * Auth model:
 * - Tuma does not sign webhook payloads. We authenticate the callback by
 *   matching `payment_id` (or `merchant_request_id` / `checkout_request_id`)
 *   to a pending row WE created. Unknown references are rejected.
 * - All writes go through SECURITY DEFINER RPCs that scope to the matched
 *   payment, so a forged callback cannot mutate another tenant.
 *
 * Idempotency:
 * - Activation/failure RPCs short-circuit if the payment is already in a
 *   terminal state, so duplicate webhook deliveries are safe.
 */

const CallbackSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  payment_id: z.string().optional(),
  merchant_request_id: z.string().optional(),
  checkout_request_id: z.string().optional(),
  mpesa_receipt_number: z.string().optional(),
  amount: z.number().optional(),
  result_code: z.number().optional(),
  result_desc: z.string().optional(),
  message: z.string().optional(),
  failure_reason: z.string().optional(),
  phone: z.string().optional(),
});

export const Route = createFileRoute("/api/public/tuma-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        let parsed: z.infer<typeof CallbackSchema>;
        try {
          parsed = CallbackSchema.parse(JSON.parse(rawBody));
        } catch (e) {
          console.warn("Tuma webhook: bad payload", e);
          return new Response("Bad payload", { status: 400 });
        }

        // Tuma's payment_id is what we stored as tuma_reference.
        const ref =
          parsed.payment_id ||
          parsed.merchant_request_id ||
          parsed.checkout_request_id;
        if (!ref) {
          return new Response("Missing reference", { status: 400 });
        }

        // Verify we know this payment. Rejects forged callbacks.
        const { data: known } = await supabaseAdmin
          .from("payments")
          .select("id, status")
          .eq("tuma_reference", ref)
          .maybeSingle();
        if (!known) {
          console.warn("Tuma webhook: unknown reference", ref);
          return new Response("Unknown reference", { status: 404 });
        }

        const isSuccess =
          parsed.status === "completed" ||
          parsed.status === "success" ||
          parsed.result_code === 0;

        if (isSuccess) {
          const { data, error } = await supabaseAdmin.rpc(
            "activate_subscription_payment" as never,
            {
              _tuma_reference: ref,
              _mpesa_receipt: parsed.mpesa_receipt_number ?? null,
              _amount: parsed.amount ?? null,
            } as never
          );
          if (error) {
            console.error("activate_subscription_payment error", error);
            return new Response("Activation failed", { status: 500 });
          }
          return Response.json({ success: true, message: "Callback received", result: data });
        }

        const reason =
          parsed.failure_reason ||
          parsed.result_desc ||
          parsed.message ||
          parsed.status ||
          "failed";

        const { error } = await supabaseAdmin.rpc("fail_payment" as never, {
          _tuma_reference: ref,
          _reason: reason,
        } as never);
        if (error) {
          console.error("fail_payment error", error);
          return new Response("Failure handling failed", { status: 500 });
        }
        return Response.json({ success: true, message: "Callback received" });
      },
    },
  },
});
