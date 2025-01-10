-- Create likes table
create table if not exists likes (
  id uuid default uuid_generate_v4() primary key,
  video_id uuid references videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(video_id, user_id)
);

-- Enable RLS
alter table likes enable row level security;

-- Policies
-- Everyone can view likes
create policy "Likes are viewable by everyone"
  on likes for select
  using (true);

-- Users can insert their own likes
create policy "Users can create likes"
  on likes for insert
  with check (auth.uid() = user_id);

-- Users can delete their own likes
create policy "Users can delete their own likes"
  on likes for delete
  using (auth.uid() = user_id);

-- Create function to update like count
create or replace function update_like_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update videos
    set likes = likes + 1
    where id = NEW.video_id;
  elsif (TG_OP = 'DELETE') then
    update videos
    set likes = likes - 1
    where id = OLD.video_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Create triggers
create trigger like_count_trigger
  after insert or delete on likes
  for each row
  execute function update_like_count();
