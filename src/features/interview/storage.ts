import { interviewSessionSchema, type InterviewSession } from "./types";

export const INTERVIEW_STORAGE_KEY = "genai-interview-demo:v1";

export function loadInterviewSession(): InterviewSession | null {
  try {
    const stored = localStorage.getItem(INTERVIEW_STORAGE_KEY);
    if (!stored) return null;
    const parsed = interviewSessionSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveInterviewSession(session: InterviewSession) {
  try {
    localStorage.setItem(INTERVIEW_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The interview remains usable in memory if browser storage is unavailable.
  }
}

export function clearInterviewSession() {
  localStorage.removeItem(INTERVIEW_STORAGE_KEY);
}
