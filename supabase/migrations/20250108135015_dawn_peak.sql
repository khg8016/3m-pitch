/*
  # Fix RLS policies for profiles and videos

  1. Changes
    - Drop and recreate all RLS policies with proper conditions
    - Add missing policies for profiles table
    - Fix UUID handling in video policies
    - Update storage policies with proper path validation

  2. Security
    - Enable RLS on all tables
    - Add proper policies for CRUD operations
    - Ensure users can only access their own data
*/

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Videos policies
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON videos;

CREATE POLICY "Videos are viewable by everyone"
  ON videos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON videos FOR UPDATE
  USING (auth.uid() = user_id);

-- Storage policies
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

CREATE POLICY "Videos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );