DROP POLICY IF EXISTS "Avatar images are publicly readable by URL" ON storage.objects;

CREATE POLICY "Users can read their own avatar via API"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (
    auth.role() = 'service_role'
    OR (auth.uid() IS NOT NULL AND (auth.uid())::text = (storage.foldername(name))[1])
  )
);