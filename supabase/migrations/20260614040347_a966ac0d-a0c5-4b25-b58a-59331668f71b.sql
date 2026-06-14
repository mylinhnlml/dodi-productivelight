DROP POLICY IF EXISTS "Users can insert their own survey" ON public.survey;
DROP POLICY IF EXISTS "Users can update their own survey" ON public.survey;
DROP POLICY IF EXISTS "Users can view their own survey" ON public.survey;

CREATE POLICY "Users can insert their own survey"
  ON public.survey FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey"
  ON public.survey FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own survey"
  ON public.survey FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.survey FROM anon;