
-- Add vision board columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vision_quote text,
  ADD COLUMN IF NOT EXISTS vision_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vision_notification_time time;

-- Replace UPDATE policy so points stay locked but vision fields are editable
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND points = (SELECT p.points FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription jsonb NOT NULL,
  endpoint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push subs"
ON public.push_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own push subs"
ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own push subs"
ON public.push_subscriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

-- Storage bucket for vision board images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vision-board', 'vision-board', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Vision board public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vision-board');

CREATE POLICY "Users upload own vision images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vision-board'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own vision images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vision-board'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own vision images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vision-board'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
