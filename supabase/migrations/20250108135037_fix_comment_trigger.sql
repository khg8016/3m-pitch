-- Drop existing trigger first
drop trigger if exists on_comment_change on comments;

-- Then drop the function
drop function if exists update_comment_count() cascade;

-- Create improved comment count trigger function
create or replace function update_comment_count()
returns trigger as $$
declare
  updated_video record;
begin
  if (TG_OP = 'INSERT') then
    update videos
    set comment_count = comment_count + 1
    where id = NEW.video_id
    returning * into updated_video;
    
    perform pg_notify(
      'comment_count_update',
      json_build_object(
        'video_id', NEW.video_id,
        'comment_count', updated_video.comment_count
      )::text
    );
    
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update videos
    set comment_count = comment_count - 1
    where id = OLD.video_id
    returning * into updated_video;
    
    perform pg_notify(
      'comment_count_update',
      json_build_object(
        'video_id', OLD.video_id,
        'comment_count', updated_video.comment_count
      )::text
    );
    
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Create new trigger
create trigger on_comment_change
  after insert or delete on comments
  for each row execute procedure update_comment_count();

-- Enable realtime for videos table
alter publication supabase_realtime add table videos;
