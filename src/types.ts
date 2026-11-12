import type { Quest, QuestProgress } from "./features/learning/quest-data";

export type Step = "upload" | "plan" | "quest" | "quiz" | "progress";

export type PlanTask = {
  id: string;
  label: string;
  completed: boolean;
};

export type PlanStage = {
  id: string;
  title: string;
  outcome: string;
  tasks: PlanTask[];
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
  selectedIndex?: 0 | 1 | 2 | 3;
};

export type LearningBundle = {
  title: string;
  summary: string;
  objectives: string[];
  plan: PlanStage[];
  quiz: QuizQuestion[];
  quest?: Quest;
};

export type DocumentMeta = {
  name: string;
  pageCount: number;
  characterCount: number;
  filePath?: string;
};

export type LearningState = {
  version: 1;
  document: DocumentMeta;
  bundle: LearningBundle;
  questProgress?: QuestProgress;
  currentStep: Exclude<Step, "upload">;
};

export type ExtractedDocument = {
  meta: DocumentMeta;
  pages: DocumentPage[];
};

export type DocumentPage = {
  text: string;
  images: string[];
  recognizedText?: string;
  skippedImages?: number;
};
