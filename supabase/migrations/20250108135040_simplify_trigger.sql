-- Drop existing triggers and functions
drop trigger if exists on_comment_change on comments;
drop function if exists update_comment_count;
drop function if exists increment_comment_count;
drop function if exists add_comment_and_update_count;

-- Create simple trigger function
create or replace function handle_comment_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update videos
    set comment_count = comment_count + 1
    where id = NEW.video_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update videos
    set comment_count = comment_count - 1
    where id = OLD.video_id;
    return OLD;
  end if;
  return null;
end;
$$;

-- Create trigger
create trigger handle_comment_count
after insert or delete on comments
for each row execute function handle_comment_count();

-- Enable realtime for both tables
alter publication supabase_realtime add table videos;
alter publication supabase_realtime add table comments;

-- Reset comment counts (in case they got out of sync)
update videos v
set comment_count = (
  select count(*)
  from comments c
  where c.video_id = v.id
);
