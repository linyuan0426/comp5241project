begin;

drop function if exists public.pathwise_teacher_dashboard();

create or replace function public.pathwise_teacher_dashboard(p_identifier text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  normalized_identifier text := lower(btrim(coalesce(p_identifier, '')));
begin
  if not exists (
    select 1
    from public.pathwise_profiles
    where user_id = (select auth.uid()) and role = 'teacher'
  ) then
    raise exception 'Teacher access is required.' using errcode = '42501';
  end if;

  if normalized_identifier = '' then
    return '[]'::jsonb;
  end if;

  with requested_students as (
    select
      profile.user_id,
      profile.email,
      profile.display_name,
      profile.created_at
    from public.pathwise_profiles as profile
    where profile.role = 'student'
      and (
        lower(profile.email) = normalized_identifier
        or profile.user_id::text = normalized_identifier
      )
  ),
  course_stats as (
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
          and (question ->> 'selectedIndex')::integer =
              (question ->> 'answerIndex')::integer
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
    where course.user_id in (select user_id from requested_students)
  ),
  student_rollup as (
    select
      student.user_id,
      student.email,
      student.display_name,
      student.created_at,
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
    from requested_students as student
    left join course_stats as course on course.user_id = student.user_id
    group by
      student.user_id,
      student.email,
      student.display_name,
      student.created_at
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

revoke all on function public.pathwise_teacher_dashboard(text) from public, anon;
grant execute on function public.pathwise_teacher_dashboard(text) to authenticated;

notify pgrst, 'reload schema';

commit;
