-- Add is_uploaded column to videos table
alter table videos add column if not exists is_uploaded boolean default false;

-- Update existing records to have is_uploaded = true
update videos set is_uploaded = true where video_url is not null;
