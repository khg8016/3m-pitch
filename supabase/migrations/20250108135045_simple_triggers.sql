-- Drop all previous functions and triggers
drop trigger if exists on_comment_change on comments;
drop trigger if exists on_like_change on likes;
drop trigger if exists on_follow_change on follows;
drop trigger if exists on_save_change on saves;

drop function if exists handle_comment_count();
drop function if exists update_comment_count();
drop function if exists increment_comment_count();
drop function if exists toggle_like();
drop function if exists toggle_follow();
drop function if exists toggle_save();
drop function if exists increment_count();
drop function if exists decrement_count();

-- Create triggers for each action
create or replace function handle_like_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update videos set likes = likes + 1 where id = NEW.video_id;
  elsif (TG_OP = 'DELETE') then
    update videos set likes = greatest(0, likes - 1) where id = OLD.video_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_change
  after insert or delete on likes
  for each row execute function handle_like_count();

create or replace function handle_follow_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update profiles set follower_count = follower_count + 1 where id = NEW.following_id;
  elsif (TG_OP = 'DELETE') then
    update profiles set follower_count = greatest(0, follower_count - 1) where id = OLD.following_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_follow_change
  after insert or delete on follows
  for each row execute function handle_follow_count();

create or replace function handle_save_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update videos set saved_count = saved_count + 1 where id = NEW.video_id;
  elsif (TG_OP = 'DELETE') then
    update videos set saved_count = greatest(0, saved_count - 1) where id = OLD.video_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_save_change
  after insert or delete on saves
  for each row execute function handle_save_count();

create or replace function handle_comment_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update videos set comment_count = comment_count + 1 where id = NEW.video_id;
  elsif (TG_OP = 'DELETE') then
    update videos set comment_count = greatest(0, comment_count - 1) where id = OLD.video_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_comment_change
  after insert or delete on comments
  for each row execute function handle_comment_count();

-- Enable realtime for all tables
alter publication supabase_realtime add table videos;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table likes;
alter publication supabase_realtime add table follows;
alter publication supabase_realtime add table saves;
alter publication supabase_realtime add table comments;

-- Reset counts to ensure accuracy
update videos v
set 
  likes = (select count(*) from likes l where l.video_id = v.id),
  saved_count = (select count(*) from saves s where s.video_id = v.id),
  comment_count = (select count(*) from comments c where c.video_id = v.id);

update profiles p
set follower_count = (select count(*) from follows f where f.following_id = p.id);
