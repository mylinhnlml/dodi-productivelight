
DROP POLICY IF EXISTS "Users can view own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can update own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can delete own completions" ON public.task_completions;

CREATE POLICY "Users can view own completions" ON public.task_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.task_completions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own completions" ON public.task_completions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.task_completions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
