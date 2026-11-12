import { callAi } from "../../lib/ai";
import {
  funPracticeTaskSchema,
  practiceReviewSchema,
  type FunPracticeMode,
  type FunPracticeTask,
  type PracticeReview,
} from "./types";

export async function createAiPractice(mode: FunPracticeMode, concept: string, sourceText: string) {
  const result = await callAi<unknown>("fun-practice-create", {
    mode,
    concept,
    sourceText,
  });
  return funPracticeTaskSchema.parse(result);
}

export async function reviewAiPractice(
  task: FunPracticeTask,
  answer: string,
  turn: number,
) {
  const result = await callAi<unknown>("fun-practice-review", {
    task,
    answer,
    turn,
  });
  return practiceReviewSchema.parse(result);
}
