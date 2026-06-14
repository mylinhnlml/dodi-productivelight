CREATE TABLE IF NOT EXISTS public.survey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  age_range text,
  goal_completion_rate text,
  life_goal text,
  life_goal_other text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey TO authenticated;
GRANT ALL ON public.survey TO service_role;

ALTER TABLE public.survey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own survey"
  ON public.survey FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey"
  ON public.survey FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey"
  ON public.survey FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_survey_updated_at
  BEFORE UPDATE ON public.survey
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();