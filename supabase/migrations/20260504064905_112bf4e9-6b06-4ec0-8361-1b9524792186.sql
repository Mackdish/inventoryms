ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.user_access_valid(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'active'
       AND (access_expires_at IS NULL OR access_expires_at > now())
     FROM public.profiles WHERE id = _user_id),
    false
  )
$$;