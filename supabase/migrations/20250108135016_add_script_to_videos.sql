/*
  # Add script field to videos table

  1. Changes
    - Add `script` column to `videos` table
*/

ALTER TABLE public.videos
ADD COLUMN script TEXT;
