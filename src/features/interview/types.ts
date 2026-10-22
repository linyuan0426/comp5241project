import { z } from "zod";

export type InterviewMode = "live" | "demo";
export type InterviewPhase = "question" | "follow-up" | "report";

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
  currentQuestionIndex: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  phase: z.enum(["question", "follow-up", "report"]),
  answers: z.array(interviewAnswerSchema).max(4),
  report: interviewReportSchema.optional(),
});

export type InterviewAnswer = z.infer<typeof interviewAnswerSchema>;
export type InterviewReport = z.infer<typeof interviewReportSchema>;
export type InterviewSession = z.infer<typeof interviewSessionSchema>;

export const interviewQuestionIds = [
  "coding-reasoning",
  "debugging",
  "system-design",
  "collaboration",
] as const;

export type InterviewQuestionId = (typeof interviewQuestionIds)[number];
