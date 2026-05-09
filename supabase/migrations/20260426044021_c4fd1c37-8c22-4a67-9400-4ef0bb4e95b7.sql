
DO $$
DECLARE
  v_super_id uuid := 'f7300fac-a417-4afc-896d-f46e9eef849f';
  v_tenant_id uuid;
  v_existing_tenant uuid;
BEGIN
  -- Skip if profile already has a tenant
  SELECT tenant_id INTO v_existing_tenant FROM public.profiles WHERE id = v_super_id;

  IF v_existing_tenant IS NOT NULL THEN
    RAISE NOTICE 'Super admin already has tenant %', v_existing_tenant;
    RETURN;
  END IF;

  -- Only proceed if the super admin profile actually exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_super_id) THEN
    RAISE NOTICE 'Super admin profile does not exist yet, skipping';
    RETURN;
  END IF;

  INSERT INTO public.tenants (name, owner_id, subscription_status, subscription_expires_at)
  VALUES ('Super Admin Workspace', v_super_id, 'active', now() + interval '100 years')
  RETURNING id INTO v_tenant_id;

  UPDATE public.profiles
  SET tenant_id = v_tenant_id
  WHERE id = v_super_id;
END $$;
