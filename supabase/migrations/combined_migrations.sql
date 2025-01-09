-- Create heygen_videos table
create table if not exists heygen_videos (
  id uuid default uuid_generate_v4() primary key,
  video_id text,
  status text,
  video_url text,
  script text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id)
);

-- RLS policies for heygen_videos
alter table heygen_videos enable row level security;

create policy "Users can view their own heygen videos"
  on heygen_videos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own heygen videos"
  on heygen_videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own heygen videos"
  on heygen_videos for update
  using (auth.uid() = user_id);

-- Add is_uploaded to videos table
alter table videos add column if not exists is_uploaded boolean default false;

-- Update existing records to have is_uploaded = true
update videos set is_uploaded = true where video_url is not null;

-- Storage bucket for uploaded videos
insert into storage.buckets (id, name, public) values ('videos', 'videos', true)
on conflict (id) do nothing;

create policy "Videos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "Users can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'videos' 
    and auth.role() = 'authenticated'
  );
