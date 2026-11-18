-- anon et authenticated ne doivent détenir aucun privilège de table que la RLS ne filtre pas.
do $$
declare bad text;
begin
  select string_agg(table_name || ':' || privilege_type || '→' || grantee, ', ' order by table_name)
  into bad
  from information_schema.table_privileges
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER');
  if bad is not null then
    raise exception 'privilèges non filtrés par la RLS : %', bad;
  end if;
end $$;
select 'table privileges check passed';
