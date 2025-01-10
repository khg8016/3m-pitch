create table "public"."comment_likes" (
  "id" uuid not null default uuid_generate_v4(),
  "comment_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
  constraint "comment_likes_pkey" primary key ("id"),
  constraint "comment_likes_comment_id_fkey" foreign key ("comment_id") references "public"."comments"("id") on delete cascade,
  constraint "comment_likes_user_id_fkey" foreign key ("user_id") references "public"."profiles"("id") on delete cascade,
  constraint "comment_likes_unique" unique ("comment_id", "user_id")
);

create index "comment_likes_comment_id_idx" on "public"."comment_likes" ("comment_id");
create index "comment_likes_user_id_idx" on "public"."comment_likes" ("user_id");

-- Add trigger to update likes count in comments table
create or replace function update_comment_likes_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update comments
    set likes = likes + 1
    where id = NEW.comment_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update comments
    set likes = likes - 1
    where id = OLD.comment_id;
    return OLD;
  end if;
  return NULL;
end;
$$ language plpgsql;

create trigger comment_likes_trigger
after insert or delete on comment_likes
for each row
execute function update_comment_likes_count();
