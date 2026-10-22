export type Step = "upload" | "plan" | "quiz" | "progress";

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
};

export type DocumentMeta = {
  name: string;
  pageCount: number;
  characterCount: number;
};

export type LearningState = {
  version: 1;
  document: DocumentMeta;
  bundle: LearningBundle;
  currentStep: Exclude<Step, "upload">;
};

export type ExtractedDocument = {
  meta: DocumentMeta;
  text: string;
};
