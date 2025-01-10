-- Create saves table
create table "public"."saves" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "video_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    constraint "saves_pkey" primary key ("id"),
    constraint "saves_user_id_video_id_key" unique ("user_id", "video_id"),
    constraint "saves_video_id_fkey" foreign key ("video_id") references "public"."videos"("id") on delete cascade,
    constraint "saves_user_id_fkey" foreign key ("user_id") references "auth"."users"("id") on delete cascade
);

-- Set up RLS
alter table "public"."saves" enable row level security;

create policy "Users can save videos"
on "public"."saves"
for all
to authenticated
using (
    auth.uid() = user_id
)
with check (
    auth.uid() = user_id
);

-- Add saved_count to videos table
alter table "public"."videos" add column "saved_count" integer not null default 0;

-- Create trigger to update saved_count
create or replace function public.handle_saved_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.videos
    set saved_count = saved_count + 1
    where id = NEW.video_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.videos
    set saved_count = saved_count - 1
    where id = OLD.video_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger on_save_change
  after insert or delete on public.saves
  for each row execute function public.handle_saved_count();
