-- Add likes column to comments table
alter table "public"."comments" add column "likes" integer not null default 0;

-- Update existing comments to have 0 likes
update "public"."comments" set "likes" = 0 where "likes" is null;

-- Add trigger to count likes
create or replace function count_comment_likes()
returns trigger as $$
declare
  like_count integer;
begin
  select count(*) into like_count
  from comment_likes
  where comment_id = (case when TG_OP = 'DELETE' then OLD.comment_id else NEW.comment_id end);

  update comments
  set likes = like_count
  where id = (case when TG_OP = 'DELETE' then OLD.comment_id else NEW.comment_id end);

  return null;
end;
$$ language plpgsql security definer;

-- Create trigger to update likes count
drop trigger if exists update_comment_likes_count on comment_likes;
create trigger update_comment_likes_count
after insert or delete on comment_likes
for each row
execute function count_comment_likes();
