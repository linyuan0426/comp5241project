begin;

alter table public.pathwise_progress
  drop constraint if exists pathwise_progress_record_key_check;

alter table public.pathwise_progress
  add constraint pathwise_progress_record_key_check check (record_key in (
    'genai-learning-demo:v1',
    'genai-interview-demo:v1',
    'genai-interview-task-workspace:v1',
    'genai-interview-task-scenario:v1',
    'genai-interview-task-brief:v1',
    'genai-workspace-demo:v1',
    'genai-scenario-discount:v1',
    'genai-fun-practice:v1'
  ));

commit;
