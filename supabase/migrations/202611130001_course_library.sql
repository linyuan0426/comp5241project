begin;

create table public.pathwise_course_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 1024),
  file_path text unique check (file_path is null or split_part(file_path, '/', 1) = user_id::text),
  page_count integer not null check (page_count between 1 and 50),
  pages jsonb check (pages is null or (jsonb_typeof(pages) = 'array' and pg_column_size(pages) <= 1000000)),
  learning_state jsonb check (learning_state is null or (jsonb_typeof(learning_state) = 'object' and pg_column_size(learning_state) <= 1000000)),
  has_pack boolean generated always as (learning_state is not null) stored,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

create index pathwise_course_library_owner_created
  on public.pathwise_course_library (user_id, created_at desc, id);

alter table public.pathwise_course_library enable row level security;
revoke all on public.pathwise_course_library from public, anon, authenticated;
grant select, delete on public.pathwise_course_library to authenticated;
grant insert (id, name, file_path, page_count, pages, learning_state) on public.pathwise_course_library to authenticated;
grant update (pages, learning_state, version) on public.pathwise_course_library to authenticated;

create policy "Read own course library" on public.pathwise_course_library
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add to own course library" on public.pathwise_course_library
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own course library" on public.pathwise_course_library
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own course library entries" on public.pathwise_course_library
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Delete own Pathwise course files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'pathwise-course-files' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Preserve each account's current learning pack and progress.
insert into public.pathwise_course_library (user_id, name, file_path, page_count, learning_state)
select user_id, value #>> '{document,name}',
  case when split_part(value #>> '{document,filePath}', '/', 1) = user_id::text
    then value #>> '{document,filePath}' end,
  (value #>> '{document,pageCount}')::integer, value
from public.pathwise_progress
where record_key = 'genai-learning-demo:v1'
  and value ->> 'version' = '1'
  and jsonb_typeof(value -> 'bundle') = 'object'
  and char_length(value #>> '{document,name}') between 1 and 1024
  and value #>> '{document,pageCount}' ~ '^([1-9]|[1-4][0-9]|50)$'
  and pg_column_size(value) <= 1000000;

commit;
