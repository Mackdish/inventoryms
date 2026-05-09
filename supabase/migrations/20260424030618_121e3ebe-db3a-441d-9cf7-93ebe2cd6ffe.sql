
-- Add tuma reference + purpose to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS tuma_reference text,
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS failure_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_tuma_reference_uniq
  ON public.payments(tuma_reference)
  WHERE tuma_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_tenant_status_idx
  ON public.payments(tenant_id, status);

-- RPC: idempotent activation of a subscription payment
-- Marks payment completed, extends tenant subscription by 30 days from now,
-- sets subscription_status = 'active'. Safe to call multiple times.
CREATE OR REPLACE FUNCTION public.activate_subscription_payment(
  _tuma_reference text,
  _mpesa_receipt text,
  _amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments;
  v_tenant public.tenants;
  v_new_expiry timestamptz;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE tuma_reference = _tuma_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;

  -- Idempotent: already completed
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true, 'tenant_id', v_payment.tenant_id);
  END IF;

  -- Update payment
  UPDATE public.payments
  SET status = 'completed',
      mpesa_receipt_number = COALESCE(_mpesa_receipt, mpesa_receipt_number),
      amount = COALESCE(_amount, amount)
  WHERE id = v_payment.id;

  -- Only extend subscription for subscription-purpose payments
  IF v_payment.purpose = 'subscription' THEN
    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_payment.tenant_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'tenant_not_found');
    END IF;

    -- 30 days from payment date (now)
    v_new_expiry := now() + interval '30 days';

    UPDATE public.tenants
    SET subscription_status = 'active',
        subscription_expires_at = v_new_expiry
    WHERE id = v_tenant.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'tenant_id', v_payment.tenant_id,
    'expires_at', v_new_expiry
  );
END;
$$;

-- RPC: mark payment failed (called from webhook on failure result)
CREATE OR REPLACE FUNCTION public.fail_payment(
  _tuma_reference text,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE tuma_reference = _tuma_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;

  IF v_payment.status IN ('completed', 'failed') THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true);
  END IF;

  UPDATE public.payments
  SET status = 'failed',
      failure_reason = _reason
  WHERE id = v_payment.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
