-- Ensure realtime is properly enabled
begin;
  -- Drop existing publication if it exists
  drop publication if exists supabase_realtime;

  -- Create new publication with specific tables
  create publication supabase_realtime for table videos, comments, follows, profiles;

  -- Enable replication for all tables
  alter table follows replica identity full;
  alter table videos replica identity full;
  alter table profiles replica identity full;
commit;

-- Verify and reset triggers
drop trigger if exists handle_comment_count on comments;
drop function if exists handle_comment_count();

create or replace function handle_comment_count()
returns trigger
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  -- Get actual comment count
  select count(*)
  into v_count
  from comments
  where video_id = CASE
    WHEN TG_OP = 'INSERT' THEN NEW.video_id
    WHEN TG_OP = 'DELETE' THEN OLD.video_id
  END;

  -- Update videos table with actual count
  update videos
  set comment_count = v_count
  where id = CASE
    WHEN TG_OP = 'INSERT' THEN NEW.video_id
    WHEN TG_OP = 'DELETE' THEN OLD.video_id
  END;

  -- Log the update (this will appear in your database logs)
  raise notice 'Updated comment_count for video % to %',
    CASE
      WHEN TG_OP = 'INSERT' THEN NEW.video_id
      WHEN TG_OP = 'DELETE' THEN OLD.video_id
    END,
    v_count;

  return null;
end;
$$;

create trigger handle_comment_count
after insert or delete on comments
for each row execute function handle_comment_count();

-- Reset all comment counts to ensure accuracy
update videos v
set comment_count = (
  select count(*)
  from comments c
  where c.video_id = v.id
);
