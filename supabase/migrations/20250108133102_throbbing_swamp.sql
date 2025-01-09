/*
  # Create videos table and storage

  1. New Tables
    - `videos`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `video_url` (text)
      - `views` (integer)
      - `likes` (integer)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for video access and creation
*/

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
  ON public.videos
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.videos
  FOR UPDATE
  USING (auth.uid() = user_id);