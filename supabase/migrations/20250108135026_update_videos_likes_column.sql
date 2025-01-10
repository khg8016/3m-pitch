-- Add default value to likes column
alter table videos alter column likes set default 0;
update videos set likes = 0 where likes is null;
alter table videos alter column likes set not null;
