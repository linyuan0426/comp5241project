import { z } from "zod";
import type { LearningState } from "../types";
import { guestProgress, type ProgressStorage } from "../features/account/progress-storage";
import { questProgressSchema, questSchema } from "../features/learning/quest-data";

export const LEARNING_STORAGE_KEY = "genai-learning-demo:v1";

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

export const learningStateSchema = z.object({
  version: z.literal(1),
  document: z.object({
    name: z.string().min(1),
    pageCount: z.number().int().positive(),
    characterCount: z.number().int().positive(),
    filePath: z.string().min(1).optional(),
  }),
  bundle: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    objectives: z.array(z.string().min(1)).min(1),
    plan: z.array(planStageSchema).min(1),
    quiz: z.array(quizQuestionSchema).min(1),
    quest: questSchema.optional(),
  }),
  questProgress: questProgressSchema.optional(),
  currentStep: z.enum(["plan", "quest", "quiz", "progress"]),
});

export function loadLearningState(storage: ProgressStorage = guestProgress): LearningState | null {
  try {
    const stored = storage.getItem(LEARNING_STORAGE_KEY);
    if (!stored) return null;

    const parsed = learningStateSchema.safeParse(JSON.parse(stored));
    if (!parsed.success) return null;
    const state = parsed.data as LearningState;
    if (state.currentStep === "quest" && !state.bundle.quest) state.currentStep = "plan";
    return state;
  } catch {
    return null;
  }
}

export function saveLearningState(state: LearningState, storage: ProgressStorage = guestProgress) {
  try {
    storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is optional; the in-memory demo remains usable.
  }
}

export function clearLearningState(storage: ProgressStorage = guestProgress) {
  storage.removeItem(LEARNING_STORAGE_KEY);
}
