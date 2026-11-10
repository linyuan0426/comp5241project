begin;

create table public.pathwise_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_key text not null check (record_key in (
    'genai-learning-demo:v1',
    'genai-interview-demo:v1',
    'genai-interview-task-workspace:v1',
    'genai-interview-task-scenario:v1',
    'genai-interview-task-brief:v1',
    'genai-workspace-demo:v1',
    'genai-scenario-discount:v1'
  )),
  value jsonb,
  version integer not null default 1,
  primary key (user_id, record_key)
);

alter table public.pathwise_progress enable row level security;
revoke all on public.pathwise_progress from anon, authenticated;
grant select on public.pathwise_progress to authenticated;
create policy "Read own Pathwise progress" on public.pathwise_progress
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.pathwise_save_progress(
  p_user_id uuid, p_key text, p_value jsonb, p_version integer
)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  saved_version integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if pg_column_size(p_value) > 1000000 then
    raise exception 'Progress record too large' using errcode = '22023';
  end if;

  if p_version = 0 then
    insert into public.pathwise_progress (user_id, record_key, value)
    values (p_user_id, p_key, p_value)
    on conflict (user_id, record_key) do nothing
    returning version into saved_version;
  else
    update public.pathwise_progress
      set value = p_value, version = version + 1
      where user_id = p_user_id and record_key = p_key and version = p_version
      returning version into saved_version;
  end if;
  return saved_version;
end;
$$;

revoke all on function public.pathwise_save_progress(uuid, text, jsonb, integer) from public, anon;
grant execute on function public.pathwise_save_progress(uuid, text, jsonb, integer) to authenticated;

create table public.pathwise_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  requests integer not null,
  primary key (user_id, usage_day)
);

alter table public.pathwise_ai_usage enable row level security;
revoke all on public.pathwise_ai_usage from anon, authenticated;

create function public.pathwise_consume_ai_quota()
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return false;
  end if;
  insert into public.pathwise_ai_usage as usage_row (user_id, usage_day, requests)
  values (caller, (now() at time zone 'UTC')::date, 1)
  on conflict (user_id, usage_day) do update
    set requests = usage_row.requests + 1
    where usage_row.requests < 60;
  return found;
end;
$$;

revoke all on function public.pathwise_consume_ai_quota() from public, anon;
grant execute on function public.pathwise_consume_ai_quota() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pathwise-course-files', 'pathwise-course-files', false, 10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
);

create policy "Upload own Pathwise course files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'pathwise-course-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Read own Pathwise course files" on storage.objects
  for select to authenticated using (
    bucket_id = 'pathwise-course-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
