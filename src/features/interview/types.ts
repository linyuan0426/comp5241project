import { z } from "zod";
import { scenarioIds } from "../learning/scenario-cases.ts";

export type InterviewMode = "live" | "demo";
export type InterviewPhase = "question" | "follow-up" | "report";

export const interviewQuestionIds = [
  "coding-reasoning",
  "debugging",
  "system-design",
  "collaboration",
] as const;

export type InterviewQuestionId = (typeof interviewQuestionIds)[number];

export const interviewTaskSchema = z.object({
  kind: z.enum(["workspace", "scenario"]),
  focus: z.literal("source-verification").optional(),
  scenarioId: z.enum(scenarioIds).optional(),
  title: z.string().min(1),
  decision: z.string().min(1),
  result: z.string().min(1),
  evidence: z.array(z.string()).max(6),
  attemptId: z.string().optional(),
});

export type InterviewTask = z.infer<typeof interviewTaskSchema>;

const interviewQuestionSchema = z.object({
  id: z.enum(interviewQuestionIds),
  topic: z.string().min(1),
  prompt: z.string().min(1),
  demoFollowUp: z.string().min(1),
  signals: z.array(z.string()),
  improvement: z.string().min(1),
});

export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const interviewDimensionIds = [
  "problem-solving",
  "correctness",
  "debugging",
  "system-design",
  "communication",
] as const;

export type InterviewDimensionId = (typeof interviewDimensionIds)[number];

export const dimensionIdSchema = z.enum(interviewDimensionIds);
export const scoreSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const interviewAnswerSchema = z.object({
  questionId: z.string().min(1),
  initialAnswer: z.string().min(1),
  followUp: z.string().min(1),
  followUpAnswer: z.string(),
});

const dimensionSchema = z.object({
  label: z.string().trim().min(1),
  score: scoreSchema,
  evidence: z.string().trim().min(1),
  improvement: z.string().trim().min(1),
});

export const interviewReportSchema = z.object({
  summary: z.string().trim().min(20),
  dimensions: z.tuple([
    dimensionSchema.extend({ id: z.literal("problem-solving") }),
    dimensionSchema.extend({ id: z.literal("correctness") }),
    dimensionSchema.extend({ id: z.literal("debugging") }),
    dimensionSchema.extend({ id: z.literal("system-design") }),
    dimensionSchema.extend({ id: z.literal("communication") }),
  ]),
  strengths: z.array(z.string().trim().min(1)).min(1).max(4),
  improvements: z.array(z.string().trim().min(1)).min(1).max(4),
  nextPractice: z.array(z.string().trim().min(1)).min(1).max(4),
});

export const interviewSessionSchema = z.object({
  version: z.literal(1),
  track: z.literal("general-swe"),
  level: z.literal("junior"),
  mode: z.enum(["live", "demo"]),
  currentQuestionIndex: z.number().int().min(0).max(interviewQuestionIds.length - 1),
  phase: z.enum(["question", "follow-up", "report"]),
  answers: z.array(interviewAnswerSchema).max(4),
  report: interviewReportSchema.optional(),
  task: interviewTaskSchema.optional(),
  questions: z.array(interviewQuestionSchema).min(2).max(interviewQuestionIds.length).optional(),
  revisions: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.string().min(1),
  })).optional(),
}).refine((session) => {
  const questionCount = session.questions?.length ?? interviewQuestionIds.length;
  return Boolean(session.task) === Boolean(session.questions)
    && session.currentQuestionIndex < questionCount
    && session.answers.length <= questionCount;
});

export type InterviewAnswer = z.infer<typeof interviewAnswerSchema>;
export type InterviewReport = z.infer<typeof interviewReportSchema>;
export type InterviewSession = z.infer<typeof interviewSessionSchema>;
