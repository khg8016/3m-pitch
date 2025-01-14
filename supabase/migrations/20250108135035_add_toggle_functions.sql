-- Toggle like function
create or replace function toggle_like(video_id uuid, user_id uuid)
returns void
language plpgsql
security definer
as $$
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
  else
    insert into likes (video_id, user_id)
    values (toggle_like.video_id, toggle_like.user_id);
  end if;
end;
$$;

-- Toggle follow function
create or replace function toggle_follow(following_id uuid, follower_id uuid)
returns void
language plpgsql
security definer
as $$
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
  else
    insert into follows (following_id, follower_id)
    values (toggle_follow.following_id, toggle_follow.follower_id);
  end if;
end;
$$;

-- Toggle save function
create or replace function toggle_save(video_id uuid, user_id uuid)
returns void
language plpgsql
security definer
as $$
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
  else
    insert into saves (video_id, user_id)
    values (toggle_save.video_id, toggle_save.user_id);
  end if;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function toggle_like(uuid, uuid) to authenticated;
grant execute on function toggle_follow(uuid, uuid) to authenticated;
grant execute on function toggle_save(uuid, uuid) to authenticated;
