-- Drop existing policies
drop policy if exists "Comments are viewable by everyone" on comments;
drop policy if exists "Users can create comments" on comments;
drop policy if exists "Users can update their own comments" on comments;
drop policy if exists "Users can delete their own comments" on comments;

-- Create new policies using profiles.user_id
create policy "Comments are viewable by everyone"
  on comments for select
  using (true);

create policy "Users can create comments"
  on comments for insert
  with check (user_id = (select id from profiles where auth.uid() = profiles.id));

create policy "Users can update their own comments"
  on comments for update
  using (user_id = (select id from profiles where auth.uid() = profiles.id));

create policy "Users can delete their own comments"
  on comments for delete
  using (user_id = (select id from profiles where auth.uid() = profiles.id));

-- Add policies for comment_likes
create policy "Comment likes are viewable by everyone"
  on comment_likes for select
  using (true);

create policy "Users can create comment likes"
  on comment_likes for insert
  with check (user_id = (select id from profiles where auth.uid() = profiles.id));

create policy "Users can delete their own comment likes"
  on comment_likes for delete
  using (user_id = (select id from profiles where auth.uid() = profiles.id));

-- Enable RLS on comment_likes
alter table comment_likes enable row level security;
