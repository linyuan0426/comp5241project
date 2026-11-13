begin;

create table public.pathwise_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pathwise_profiles enable row level security;
revoke all on public.pathwise_profiles from public, anon, authenticated;

-- Existing accounts become students by default. Promote authorized teacher
-- accounts explicitly after applying this migration:
-- update public.pathwise_profiles
-- set role = 'teacher'
-- where email = 'teacher@example.com';
insert into public.pathwise_profiles (user_id, email, created_at, updated_at)
select
  users.id,
  coalesce(users.email, 'user-' || users.id::text),
  users.created_at,
  now()
from auth.users as users
on conflict (user_id) do nothing;

create or replace function public.pathwise_create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pathwise_profiles (user_id, email, display_name)
  values (
    new.id,
    coalesce(new.email, 'user-' || new.id::text),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.pathwise_create_user_profile() from public, anon, authenticated;

drop trigger if exists pathwise_on_auth_user_created on auth.users;
create trigger pathwise_on_auth_user_created
  after insert on auth.users
  for each row execute function public.pathwise_create_user_profile();

create or replace function public.pathwise_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.pathwise_profiles as profile
  where profile.user_id = (select auth.uid())
  limit 1
$$;

revoke all on function public.pathwise_my_role() from public, anon;
grant execute on function public.pathwise_my_role() to authenticated;

alter table public.pathwise_course_library
  add column if not exists updated_at timestamptz not null default now();

update public.pathwise_course_library
set updated_at = created_at
where updated_at > created_at + interval '1 second';

create or replace function public.pathwise_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pathwise_course_library_touch_updated_at
  on public.pathwise_course_library;
create trigger pathwise_course_library_touch_updated_at
  before update on public.pathwise_course_library
  for each row execute function public.pathwise_touch_updated_at();

create or replace function public.pathwise_teacher_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.pathwise_profiles
    where user_id = (select auth.uid()) and role = 'teacher'
  ) then
    raise exception 'Teacher access is required.' using errcode = '42501';
  end if;

  with course_stats as (
    select
      course.id,
      course.user_id,
      course.name,
      course.page_count,
      course.created_at,
      course.updated_at,
      course.learning_state is not null as has_study_kit,
      course.learning_state ->> 'currentStep' as current_step,
      coalesce((
        select count(*)
        from jsonb_array_elements(
          coalesce(course.learning_state #> '{bundle,plan}', '[]'::jsonb)
        ) as stage
        cross join lateral jsonb_array_elements(
          coalesce(stage -> 'tasks', '[]'::jsonb)
        ) as task
      ), 0)::integer as plan_total,
      coalesce((
        select count(*)
        from jsonb_array_elements(
          coalesce(course.learning_state #> '{bundle,plan}', '[]'::jsonb)
        ) as stage
        cross join lateral jsonb_array_elements(
          coalesce(stage -> 'tasks', '[]'::jsonb)
        ) as task
        where coalesce((task ->> 'completed')::boolean, false)
      ), 0)::integer as plan_completed,
      coalesce(jsonb_array_length(
        coalesce(course.learning_state #> '{bundle,quiz}', '[]'::jsonb)
      ), 0)::integer as quiz_total,
      coalesce((
        select count(*)
        from jsonb_array_elements(
          coalesce(course.learning_state #> '{bundle,quiz}', '[]'::jsonb)
        ) as question
        where question ? 'selectedIndex'
          and question ->> 'selectedIndex' is not null
      ), 0)::integer as quiz_answered,
      coalesce((
        select count(*)
        from jsonb_array_elements(
          coalesce(course.learning_state #> '{bundle,quiz}', '[]'::jsonb)
        ) as question
        where question ? 'selectedIndex'
          and question ->> 'selectedIndex' is not null
          and (question ->> 'selectedIndex')::integer = (question ->> 'answerIndex')::integer
      ), 0)::integer as quiz_correct,
      coalesce(jsonb_array_length(
        coalesce(course.learning_state #> '{bundle,quest,rooms}', '[]'::jsonb)
      ), 0)::integer as quest_total,
      coalesce((
        select count(*)
        from jsonb_array_elements(
          coalesce(course.learning_state -> 'questProgress', '[]'::jsonb)
        ) as progress
        where coalesce((progress ->> 'solved')::boolean, false)
      ), 0)::integer as quest_solved
    from public.pathwise_course_library as course
  ),
  student_rollup as (
    select
      profile.user_id,
      profile.email,
      profile.display_name,
      profile.created_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', course.id,
            'name', course.name,
            'pageCount', course.page_count,
            'createdAt', course.created_at,
            'updatedAt', course.updated_at,
            'hasStudyKit', course.has_study_kit,
            'currentStep', course.current_step,
            'planCompleted', course.plan_completed,
            'planTotal', course.plan_total,
            'quizAnswered', course.quiz_answered,
            'quizCorrect', course.quiz_correct,
            'quizTotal', course.quiz_total,
            'questSolved', course.quest_solved,
            'questTotal', course.quest_total
          )
          order by course.updated_at desc, course.id
        ) filter (where course.id is not null),
        '[]'::jsonb
      ) as courses
    from public.pathwise_profiles as profile
    left join course_stats as course on course.user_id = profile.user_id
    where profile.role = 'student'
    group by
      profile.user_id,
      profile.email,
      profile.display_name,
      profile.created_at
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', student.user_id,
        'email', student.email,
        'displayName', student.display_name,
        'joinedAt', student.created_at,
        'courses', student.courses
      )
      order by student.email
    ),
    '[]'::jsonb
  )
  into result
  from student_rollup as student;

  return result;
end;
$$;

revoke all on function public.pathwise_teacher_dashboard() from public, anon;
grant execute on function public.pathwise_teacher_dashboard() to authenticated;

commit;
