-- Function to increment a count in any table
create or replace function increment_count(
  table_name text,
  column_name text,
  row_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  query text;
begin
  query := format(
    'update %I set %I = %I + 1 where id = $1',
    table_name,
    column_name,
    column_name
  );
  execute query using row_id;
end;
$$;

-- Function to decrement a count in any table
create or replace function decrement_count(
  table_name text,
  column_name text,
  row_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  query text;
begin
  query := format(
    'update %I set %I = greatest(0, %I - 1) where id = $1',
    table_name,
    column_name,
    column_name
  );
  execute query using row_id;
end;
$$;

-- Grant execute permissions
grant execute on function increment_count(text, text, uuid) to authenticated;
grant execute on function decrement_count(text, text, uuid) to authenticated;

-- Enable realtime for all relevant tables
alter publication supabase_realtime add table videos;
alter publication supabase_realtime add table profiles;
