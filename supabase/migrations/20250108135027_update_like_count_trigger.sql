-- Update trigger function to prevent negative likes
create or replace function update_like_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update videos
    set likes = GREATEST(0, likes + 1)
    where id = NEW.video_id;
  elsif (TG_OP = 'DELETE') then
    update videos
    set likes = GREATEST(0, likes - 1)
    where id = OLD.video_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;
