-- Create comments table
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table comments enable row level security;

-- Policies
-- Everyone can view comments
create policy "Comments are viewable by everyone"
  on comments for select
  using (true);

-- Users can insert their own comments
create policy "Users can create comments"
  on comments for insert
  with check (auth.uid() = user_id);

-- Users can update their own comments
create policy "Users can update their own comments"
  on comments for update
  using (auth.uid() = user_id);

-- Users can delete their own comments
create policy "Users can delete their own comments"
  on comments for delete
  using (auth.uid() = user_id);

-- Add comment count to videos
alter table videos add column if not exists comment_count integer default 0;

-- Create function to update comment count
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
  return NEW;
end;
$$ language plpgsql security definer;

-- Create triggers
create trigger comment_count_trigger
  after insert or delete on comments
  for each row
  execute function update_comment_count();
