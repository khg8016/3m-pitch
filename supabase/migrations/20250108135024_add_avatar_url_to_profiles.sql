-- Add avatar_url column to profiles table
alter table profiles add column if not exists avatar_url text;
