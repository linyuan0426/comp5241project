import { z } from "zod";
import type { LearningState } from "../types";

export const LEARNING_STORAGE_KEY = "genai-learning-demo:v1";
export const API_KEY_STORAGE_KEY = "genai-learning-demo:deepseek-key";

const taskSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  completed: z.boolean(),
});

const planStageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  outcome: z.string().min(1),
  tasks: z.array(taskSchema).min(1),
});

const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answerIndex: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  explanation: z.string().min(1),
  selectedIndex: z
    .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
    .optional(),
});

const learningStateSchema = z.object({
  version: z.literal(1),
  document: z.object({
    name: z.string().min(1),
    pageCount: z.number().int().positive(),
    characterCount: z.number().int().positive(),
  }),
  bundle: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    objectives: z.array(z.string().min(1)).min(1),
    plan: z.array(planStageSchema).min(1),
    quiz: z.array(quizQuestionSchema).min(1),
  }),
  currentStep: z.enum(["plan", "quiz", "progress"]),
});

export function loadLearningState(): LearningState | null {
  try {
    const stored = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!stored) return null;

    const parsed = learningStateSchema.safeParse(JSON.parse(stored));
    return parsed.success ? (parsed.data as LearningState) : null;
  } catch {
    return null;
  }
}

export function saveLearningState(state: LearningState) {
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is optional; the in-memory demo remains usable.
  }
}

export function clearLearningState() {
  localStorage.removeItem(LEARNING_STORAGE_KEY);
}

export function getApiKey() {
  try {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(apiKey: string) {
  sessionStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
}

export function clearApiKey() {
  sessionStorage.removeItem(API_KEY_STORAGE_KEY);
}
