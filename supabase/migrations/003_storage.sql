-- ScholarGrid Storage Bucket Policies
-- Run this in Supabase SQL Editor AFTER creating the buckets in the Dashboard:
--   1. notes-files (public: true)
--   2. avatars     (public: true)

-- ============================================================
-- NOTES FILES
-- ============================================================
CREATE POLICY "Auth users upload notes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'notes-files' AND auth.role() = 'authenticated');
CREATE POLICY "Public read notes files" ON storage.objects
  FOR SELECT USING (bucket_id = 'notes-files');
CREATE POLICY "Uploader can delete note file" ON storage.objects
  FOR DELETE USING (bucket_id = 'notes-files' AND auth.uid()::text = owner);

-- ============================================================
-- AVATARS
-- ============================================================
CREATE POLICY "User uploads own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "User updates own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
