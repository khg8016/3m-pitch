-- Create follows table
create table if not exists follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(follower_id, following_id)
);

-- Enable RLS
alter table follows enable row level security;

-- Add follower_count and following_count to profiles
alter table profiles 
  add column if not exists follower_count integer default 0,
  add column if not exists following_count integer default 0;

update profiles set follower_count = 0 where follower_count is null;
update profiles set following_count = 0 where following_count is null;

alter table profiles 
  alter column follower_count set not null,
  alter column following_count set not null;

-- Policies
-- Everyone can view follows
create policy "Follows are viewable by everyone"
  on follows for select
  using (true);

-- Users can follow others
create policy "Users can follow others"
  on follows for insert
  with check (auth.uid() = follower_id);

-- Users can unfollow others
create policy "Users can unfollow others"
  on follows for delete
  using (auth.uid() = follower_id);

-- Create function to update follower and following counts
create or replace function update_follow_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    -- Increment follower count for the user being followed
    update profiles
    set follower_count = follower_count + 1
    where id = NEW.following_id;
    
    -- Increment following count for the follower
    update profiles
    set following_count = following_count + 1
    where id = NEW.follower_id;
  elsif (TG_OP = 'DELETE') then
    -- Decrement follower count for the user being unfollowed
    update profiles
    set follower_count = GREATEST(0, follower_count - 1)
    where id = OLD.following_id;
    
    -- Decrement following count for the follower
    update profiles
    set following_count = GREATEST(0, following_count - 1)
    where id = OLD.follower_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Create triggers
create trigger follow_count_trigger
  after insert or delete on follows
  for each row
  execute function update_follow_count();
