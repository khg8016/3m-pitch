/*
  # Comprehensive RLS Policy Fix

  1. Changes
    - Add INSERT policy for profiles
    - Fix UUID comparisons in video policies
    - Update storage policies for better security
*/

-- Add missing INSERT policy for profiles
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Fix video policies with proper UUID handling
DROP POLICY IF EXISTS "Users can insert their own videos" ON videos;

CREATE POLICY "Users can insert their own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update storage policy with proper path checking
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );