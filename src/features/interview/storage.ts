import { guestProgress, type ProgressStorage } from "../account/progress-storage";
import { interviewSessionSchema, interviewTaskSchema, type InterviewSession, type InterviewTask } from "./types";

export const INTERVIEW_STORAGE_KEY = "genai-interview-demo:v1";
const taskBriefKey = "genai-interview-task-brief:v1";

function sessionKey(kind?: InterviewTask["kind"]) {
  return kind ? `genai-interview-task-${kind}:v1` : INTERVIEW_STORAGE_KEY;
}

export function loadInterviewSession(kind?: InterviewTask["kind"], storage: ProgressStorage = guestProgress): InterviewSession | null {
  try {
    const stored = storage.getItem(sessionKey(kind));
    if (!stored) return null;
    const parsed = interviewSessionSchema.safeParse(JSON.parse(stored));
    return parsed.success && parsed.data.task?.kind === kind ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveInterviewSession(session: InterviewSession, storage: ProgressStorage = guestProgress) {
  try {
    storage.setItem(sessionKey(session.task?.kind), JSON.stringify(session));
  } catch {
    // The interview remains usable in memory if browser storage is unavailable.
  }
}

export function clearInterviewSession(kind?: InterviewTask["kind"], storage: ProgressStorage = guestProgress) {
  try {
    storage.removeItem(sessionKey(kind));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

export function loadTaskBrief(storage: ProgressStorage = guestProgress): InterviewTask | null {
  try {
    const stored = storage.getItem(taskBriefKey);
    const parsed = interviewTaskSchema.safeParse(stored ? JSON.parse(stored) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveTaskBrief(task: InterviewTask, storage: ProgressStorage = guestProgress) {
  try {
    storage.setItem(taskBriefKey, JSON.stringify(task));
  } catch {
    // The current brief remains available in memory.
  }
}
