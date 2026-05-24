
ALTER FUNCTION public.enforce_user_xp_monotonic() SECURITY INVOKER;
ALTER FUNCTION public.enforce_mission_progress_monotonic() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.enforce_user_xp_monotonic() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_mission_progress_monotonic() FROM PUBLIC, anon, authenticated;
