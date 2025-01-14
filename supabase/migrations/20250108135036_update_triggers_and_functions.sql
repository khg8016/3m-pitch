-- Update comment count trigger
create or replace function update_comment_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update videos
    set comment_count = comment_count + 1
    where id = NEW.video_id;
  elsif (TG_OP = 'DELETE') then
    update videos
    set comment_count = comment_count - 1
    where id = OLD.video_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_change on comments;
create trigger on_comment_change
  after insert or delete on comments
  for each row execute procedure update_comment_count();

-- Toggle like function
create or replace function toggle_like(video_id uuid, user_id uuid)
returns void as $$
declare
  like_exists boolean;
begin
  select exists(
    select 1 from likes
    where likes.video_id = toggle_like.video_id
    and likes.user_id = toggle_like.user_id
  ) into like_exists;

  if like_exists then
    delete from likes
    where likes.video_id = toggle_like.video_id
    and likes.user_id = toggle_like.user_id;

    update videos
    set likes = likes - 1
    where id = video_id;
  else
    insert into likes (video_id, user_id)
    values (toggle_like.video_id, toggle_like.user_id);

    update videos
    set likes = likes + 1
    where id = video_id;
  end if;
end;
$$ language plpgsql security definer;

-- Toggle follow function
create or replace function toggle_follow(following_id uuid, follower_id uuid)
returns void as $$
declare
  follow_exists boolean;
begin
  select exists(
    select 1 from follows
    where follows.following_id = toggle_follow.following_id
    and follows.follower_id = toggle_follow.follower_id
  ) into follow_exists;

  if follow_exists then
    delete from follows
    where follows.following_id = toggle_follow.following_id
    and follows.follower_id = toggle_follow.follower_id;

    update profiles
    set follower_count = follower_count - 1
    where id = following_id;
  else
    insert into follows (following_id, follower_id)
    values (toggle_follow.following_id, toggle_follow.follower_id);

    update profiles
    set follower_count = follower_count + 1
    where id = following_id;
  end if;
end;
$$ language plpgsql security definer;

-- Toggle save function
create or replace function toggle_save(video_id uuid, user_id uuid)
returns void as $$
declare
  save_exists boolean;
begin
  select exists(
    select 1 from saves
    where saves.video_id = toggle_save.video_id
    and saves.user_id = toggle_save.user_id
  ) into save_exists;

  if save_exists then
    delete from saves
    where saves.video_id = toggle_save.video_id
    and saves.user_id = toggle_save.user_id;

    update videos
    set saved_count = saved_count - 1
    where id = video_id;
  else
    insert into saves (video_id, user_id)
    values (toggle_save.video_id, toggle_save.user_id);

    update videos
    set saved_count = saved_count + 1
    where id = video_id;
  end if;
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function toggle_like(uuid, uuid) to authenticated;
grant execute on function toggle_follow(uuid, uuid) to authenticated;
grant execute on function toggle_save(uuid, uuid) to authenticated;
