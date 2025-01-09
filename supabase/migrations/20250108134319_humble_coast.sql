/*
  # Fix RLS policies for videos table and storage

  1. Changes
    - Add missing RLS policies for videos table
    - Update storage policies for better access control
*/

-- Add missing RLS policies for videos table
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON videos;

CREATE POLICY "Videos are viewable by everyone"
  ON videos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Update storage policies
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated'
  );