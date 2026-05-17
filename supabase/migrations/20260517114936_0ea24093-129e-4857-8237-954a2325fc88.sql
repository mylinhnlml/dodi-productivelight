
CREATE TABLE public.mission_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mission_id text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own mission progress" ON public.mission_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own mission progress" ON public.mission_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own mission progress" ON public.mission_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_mission_progress_updated_at BEFORE UPDATE ON public.mission_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_xp (
  user_id uuid NOT NULL PRIMARY KEY,
  total_xp integer NOT NULL DEFAULT 0,
  streak_count integer NOT NULL DEFAULT 0,
  last_active_date date,
  install_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  perfect_days text[] NOT NULL DEFAULT '{}',
  stickers_used text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own xp" ON public.user_xp FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own xp" ON public.user_xp FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own xp" ON public.user_xp FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_user_xp_updated_at BEFORE UPDATE ON public.user_xp FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
