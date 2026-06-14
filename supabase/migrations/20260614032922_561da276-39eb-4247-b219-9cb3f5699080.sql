ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal_completion_rate text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS life_goal text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS life_goal_other text;