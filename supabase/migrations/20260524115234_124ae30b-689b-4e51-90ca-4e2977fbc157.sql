
DROP POLICY IF EXISTS "Vision board public read" ON storage.objects;

CREATE POLICY "Users list own vision images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vision-board'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
