-- Drop existing function if it exists
drop function if exists add_comment_and_update_count;

-- Create function to handle comment insertion and count update in a transaction
create or replace function add_comment_and_update_count(
  p_video_id uuid,
  p_user_id uuid,
  p_content text
)
returns json
language plpgsql
security definer
as $$
declare
  v_comment record;
  v_video record;
begin
  -- Start transaction
  begin
    -- Insert new comment
    insert into comments (video_id, user_id, content, likes)
    values (p_video_id, p_user_id, p_content, 0)
    returning * into v_comment;

    -- Update video comment count
    update videos
    set comment_count = comment_count + 1
    where id = p_video_id
    returning * into v_video;

    -- Return the results
    return json_build_object(
      'comment', v_comment,
      'video', v_video
    );
  exception
    when others then
      -- Rollback happens automatically
      raise exception 'Failed to add comment: %', SQLERRM;
  end;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function add_comment_and_update_count(uuid, uuid, text) to authenticated;
