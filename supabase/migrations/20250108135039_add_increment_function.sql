-- Drop existing function if it exists
drop function if exists increment_comment_count;

-- Create function to increment comment count
create or replace function increment_comment_count(video_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update videos
  set comment_count = comment_count + 1
  where id = video_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function increment_comment_count(uuid) to authenticated;

-- Drop the previous trigger since we're handling it manually now
drop trigger if exists on_comment_change on comments;
drop function if exists update_comment_count;

-- Ensure realtime is enabled for videos table
alter publication supabase_realtime add table videos;
