-- First remove the existing foreign key constraint
alter table "public"."comments" drop constraint if exists "comments_user_id_fkey";

-- Then add the new foreign key constraint to profiles
alter table "public"."comments"
  add constraint "comments_user_id_fkey"
  foreign key ("user_id")
  references "public"."profiles"("id")
  on delete cascade;

-- Add index for better performance
create index if not exists "comments_user_id_idx" on "public"."comments" ("user_id");
