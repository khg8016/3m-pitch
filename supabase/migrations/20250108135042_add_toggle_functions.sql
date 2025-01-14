-- Drop existing functions if they exist
drop function if exists toggle_like;
drop function if exists toggle_follow;
drop function if exists toggle_save;

-- Toggle like function
create or replace function toggle_like(
  p_video_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  like_exists boolean;
begin
  select exists(
    select 1 from likes
    where video_id = p_video_id
    and user_id = p_user_id
  ) into like_exists;

  if like_exists then
    delete from likes
    where video_id = p_video_id
    and user_id = p_user_id;

    update videos
    set likes = likes - 1
    where id = p_video_id;
  else
    insert into likes (video_id, user_id)
    values (p_video_id, p_user_id);

    update videos
    set likes = likes + 1
    where id = p_video_id;
  end if;
end;
$$;

-- Toggle follow function
create or replace function toggle_follow(
  p_following_id uuid,
  p_follower_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  follow_exists boolean;
begin
  select exists(
    select 1 from follows
    where following_id = p_following_id
    and follower_id = p_follower_id
  ) into follow_exists;

  if follow_exists then
    delete from follows
    where following_id = p_following_id
    and follower_id = p_follower_id;

    update profiles
    set follower_count = follower_count - 1
    where id = p_following_id;
  else
    insert into follows (following_id, follower_id)
    values (p_following_id, p_follower_id);

    update profiles
    set follower_count = follower_count + 1
    where id = p_following_id;
  end if;
end;
$$;

-- Toggle save function
create or replace function toggle_save(
  p_video_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  save_exists boolean;
begin
  select exists(
    select 1 from saves
    where video_id = p_video_id
    and user_id = p_user_id
  ) into save_exists;

  if save_exists then
    delete from saves
    where video_id = p_video_id
    and user_id = p_user_id;

    update videos
    set saved_count = saved_count - 1
    where id = p_video_id;
  else
    insert into saves (video_id, user_id)
    values (p_video_id, p_user_id);

    update videos
    set saved_count = saved_count + 1
    where id = p_video_id;
  end if;
end;
$$;

-- Grant execute permissions
grant execute on function toggle_like(uuid, uuid) to authenticated;
grant execute on function toggle_follow(uuid, uuid) to authenticated;
grant execute on function toggle_save(uuid, uuid) to authenticated;
