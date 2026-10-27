create table public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  severity text not null check (severity in ('low', 'medium', 'high')),
  description text not null check (char_length(description) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.security_alerts enable row level security;

revoke all on public.security_alerts from anon, authenticated;
grant select on public.security_alerts to authenticated;

create policy "Users can read their own security alerts"
  on public.security_alerts
  for select
  to authenticated
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'security_alerts'
  ) then
    alter publication supabase_realtime add table public.security_alerts;
  end if;
end
$$;
