-- Drop all triggers and functions
drop trigger if exists on_comment_change on comments;
drop function if exists handle_comment_count();
drop function if exists update_comment_count();
drop function if exists increment_comment_count();
drop function if exists toggle_like();
drop function if exists toggle_follow();
drop function if exists toggle_save();

-- Reset counts to ensure accuracy
update videos v
set 
  likes = (select count(*) from likes l where l.video_id = v.id),
  saved_count = (select count(*) from saves s where s.video_id = v.id),
  comment_count = (select count(*) from comments c where c.video_id = v.id);

update profiles p
set follower_count = (select count(*) from follows f where f.following_id = p.id);
