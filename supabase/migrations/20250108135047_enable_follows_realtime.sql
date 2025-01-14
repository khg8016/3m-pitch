-- Enable realtime for follows table
alter publication supabase_realtime add table follows;

-- Enable realtime for specific columns
comment on table follows is e'@realtime={"*":true}';
