DROP FUNCTION IF EXISTS public.get_redemption_rank(uuid);

CREATE OR REPLACE FUNCTION public.get_redemption_rank()
RETURNS TABLE (my_count bigint, my_rank bigint, total_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT user_id, COUNT(*)::bigint AS cnt
    FROM public.redemptions
    GROUP BY user_id
  ),
  me AS (
    SELECT COALESCE((SELECT cnt FROM counts WHERE user_id = auth.uid()), 0)::bigint AS cnt
  )
  SELECT
    (SELECT cnt FROM me) AS my_count,
    (1 + (SELECT COUNT(*) FROM counts WHERE cnt > (SELECT cnt FROM me)))::bigint AS my_rank,
    GREATEST(
      (SELECT COUNT(*) FROM counts),
      CASE WHEN (SELECT cnt FROM me) > 0 THEN 1 ELSE 0 END
    )::bigint AS total_users;
$$;

REVOKE EXECUTE ON FUNCTION public.get_redemption_rank() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_redemption_rank() TO authenticated;