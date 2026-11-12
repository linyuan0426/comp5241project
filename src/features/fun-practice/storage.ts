import { z } from "zod";
import type { ProgressStorage } from "../account/progress-storage";
import { practiceSessionSchema, type PracticeSession } from "./types";

const storageKey = "genai-fun-practice:v1";

export function loadPracticeSession(storage: ProgressStorage): PracticeSession | null {
  try {
    const parsed = practiceSessionSchema.safeParse(
      JSON.parse(storage.getItem(storageKey) ?? "null"),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function savePracticeSession(storage: ProgressStorage, session: PracticeSession) {
  storage.setItem(storageKey, JSON.stringify(session));
}

export function clearPracticeSession(storage: ProgressStorage) {
  storage.removeItem(storageKey);
}

export function createPracticeSession(task: PracticeSession["task"]): PracticeSession {
  const now = Date.now();
  return {
    version: 1,
    id: crypto.randomUUID(),
    task,
    status: "in-progress",
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function appendPracticeTurn(
  session: PracticeSession,
  turn: PracticeSession["turns"][number],
): PracticeSession {
  const complete = turn.review.status === "complete";
  const reachedLimit = session.turns.length + 1 >= 3;
  return {
    ...session,
    turns: [...session.turns, turn],
    status: complete ? "complete" : reachedLimit ? "needs-review" : "in-progress",
    updatedAt: Date.now(),
  };
}

export function isPracticeSession(value: unknown): value is PracticeSession {
  return practiceSessionSchema.safeParse(value).success;
}

export const practiceSessionArraySchema = z.array(practiceSessionSchema);
