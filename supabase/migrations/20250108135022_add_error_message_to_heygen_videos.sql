-- Add error_message column to heygen_videos table
alter table heygen_videos add column if not exists error_message text;
