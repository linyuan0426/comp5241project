import { z } from "zod";

export const funPracticeModes = ["intern", "teamwork", "roommate"] as const;
export const funPracticeModeSchema = z.enum(funPracticeModes);
export type FunPracticeMode = z.infer<typeof funPracticeModeSchema>;

const criterionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(180),
});

const transferQuestionSchema = z.object({
  question: z.string().trim().min(1).max(500),
  options: z.tuple([
    z.string().trim().min(1).max(240),
    z.string().trim().min(1).max(240),
    z.string().trim().min(1).max(240),
  ]),
  correctIndex: z.number().int().min(0).max(2),
  explanation: z.string().trim().min(1).max(500),
});

export const funPracticeTaskSchema = z.object({
  version: z.literal(1),
  id: z.string().trim().min(1).max(80),
  mode: funPracticeModeSchema,
  title: z.string().trim().min(1).max(140),
  concept: z.string().trim().min(1).max(140),
  roleName: z.string().trim().min(1).max(80),
  opening: z.string().trim().min(1).max(800),
  badLine: z.string().trim().min(1).max(500).optional(),
  criteria: z.array(criterionSchema).min(2).max(4),
  correctExplanation: z.string().trim().min(1).max(1_000),
  evidence: z.string().trim().min(1).max(800),
  transferQuestion: transferQuestionSchema,
  sample: z.boolean(),
});

export type FunPracticeTask = z.infer<typeof funPracticeTaskSchema>;

export const practiceStatusSchema = z.enum(["in-progress", "complete", "needs-review"]);
export type PracticeStatus = z.infer<typeof practiceStatusSchema>;

export const practiceReviewSchema = z.object({
  status: z.enum(["complete", "needs-work"]),
  satisfiedCriterionIds: z.array(z.string().trim().min(1)).max(4),
  missingCriterionIds: z.array(z.string().trim().min(1)).max(4),
  feedback: z.string().trim().min(1).max(700),
  followUp: z.string().trim().max(500),
  revisedMessage: z.string().trim().min(1).max(700),
});

export type PracticeReview = z.infer<typeof practiceReviewSchema>;

export const practiceTurnSchema = z.object({
  id: z.string().trim().min(1),
  answer: z.string().trim().min(1).max(2_000),
  review: practiceReviewSchema,
  source: z.enum(["demo", "ai"]),
  createdAt: z.number().int().nonnegative(),
});

export type PracticeTurn = z.infer<typeof practiceTurnSchema>;

export const transferResultSchema = z.object({
  selectedIndex: z.number().int().min(0).max(2),
  correct: z.boolean(),
});

export const practiceSessionSchema = z.object({
  version: z.literal(1),
  id: z.string().trim().min(1),
  task: funPracticeTaskSchema,
  status: practiceStatusSchema,
  turns: z.array(practiceTurnSchema).max(3),
  teamworkProgress: z.object({
    caseId: z.string().trim().min(1),
    step: z.number().int().min(0).max(2),
    advancedStepIds: z.array(z.string().trim().min(1)).max(2),
  }).optional(),
  transfer: transferResultSchema.optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type PracticeSession = z.infer<typeof practiceSessionSchema>;

export type TeamworkStep = {
  title: string;
  situation: string;
  options: [
    { id: string; label: string; outcome: string; advances: boolean },
    { id: string; label: string; outcome: string; advances: boolean },
    { id: string; label: string; outcome: string; advances: boolean },
  ];
};

export type TeamworkCase = {
  id: string;
  title: string;
  concept: string;
  opening: string;
  steps: [TeamworkStep, TeamworkStep];
  reflectionPrompt: string;
  task: FunPracticeTask;
};
