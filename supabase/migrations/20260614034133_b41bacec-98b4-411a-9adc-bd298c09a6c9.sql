REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_user_xp_monotonic() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_mission_progress_monotonic() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_mission_progress_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_sticker_unlock() FROM PUBLIC, anon, authenticated;