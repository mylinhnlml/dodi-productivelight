
-- Add notification_enabled to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_enabled boolean NOT NULL DEFAULT false;

-- Allow updating notification_enabled (existing policy locks points; keep that)
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

-- notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notification_logs_user_type_sent_idx
  ON public.notification_logs (user_id, type, sent_at DESC);
