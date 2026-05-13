
-- Restrict avatar listing to user's own folder
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Avatar images are publicly readable by URL"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      auth.role() = 'service_role'
      OR (auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1])
      OR current_setting('request.method', true) = 'GET'
    )
  );

-- Lock down handle_new_user so only the trigger can run it
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
