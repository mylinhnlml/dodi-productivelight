
-- point_events table
CREATE TABLE public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  CONSTRAINT point_events_unique_per_day UNIQUE (user_id, task_id, awarded_date)
);

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own point events"
ON public.point_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Restrict points column on profiles: replace blanket update policy with one that forbids changing points
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND points = (SELECT points FROM public.profiles WHERE user_id = auth.uid())
);
