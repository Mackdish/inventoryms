REVOKE EXECUTE ON FUNCTION public.user_access_valid(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_access_valid(uuid) TO service_role;