
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

UPDATE storage.buckets SET public = false WHERE id = 'vision-board';

DROP POLICY IF EXISTS "Vision board users select own" ON storage.objects;
DROP POLICY IF EXISTS "Vision board users insert own" ON storage.objects;
DROP POLICY IF EXISTS "Vision board users delete own" ON storage.objects;
CREATE POLICY "Vision board users select own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vision-board' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Vision board users insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vision-board' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Vision board users delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vision-board' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
RETURNS TABLE(redemption_id uuid, new_points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_reward public.rewards%ROWTYPE;
  v_points integer;
  v_red_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO v_reward FROM public.rewards WHERE id = _reward_id AND user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT points INTO v_points FROM public.profiles WHERE user_id = v_user FOR UPDATE;
  IF v_points IS NULL OR v_points < v_reward.cost THEN
    RAISE EXCEPTION 'Insufficient points' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.profiles SET points = points - v_reward.cost WHERE user_id = v_user;
  INSERT INTO public.redemptions (user_id, reward_id, reward_title, reward_emoji, cost)
  VALUES (v_user, v_reward.id, v_reward.title, v_reward.emoji, v_reward.cost)
  RETURNING id INTO v_red_id;
  RETURN QUERY SELECT v_red_id, v_points - v_reward.cost;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_reward(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can create their own redemptions" ON public.redemptions;

REVOKE ALL ON FUNCTION public.get_redemption_rank() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_redemption_rank() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_redemption_rank() TO authenticated;
