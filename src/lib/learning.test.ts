import { describe, expect, it } from "vitest";
import { makeBundle } from "../test/fixtures";
import {
  getNextQuestionIndex,
  getOverallProgress,
  getPlanProgress,
  getQuizStats,
} from "./learning";

describe("learning progress", () => {
  it("calculates plan completion from nested tasks", () => {
    const bundle = makeBundle();
    expect(getPlanProgress(bundle)).toEqual({ completed: 0, total: 6, percent: 0 });

    bundle.plan[0].tasks[0].completed = true;
    bundle.plan[1].tasks[0].completed = true;
    bundle.plan[1].tasks[1].completed = true;

    expect(getPlanProgress(bundle)).toEqual({ completed: 3, total: 6, percent: 50 });
  });

  it("counts correct and incorrect quiz answers", () => {
    const questions = makeBundle().quiz;
    questions[0].selectedIndex = 1;
    questions[1].selectedIndex = 0;
    questions[2].selectedIndex = 1;

    expect(getQuizStats(questions)).toMatchObject({
      answered: 3,
      correct: 2,
      incorrect: 1,
      total: 5,
      percent: 40,
    });
  });

  it("combines plan and quiz participation into overall progress", () => {
    const bundle = makeBundle();
    bundle.plan[0].tasks[0].completed = true;
    bundle.quiz[0].selectedIndex = 1;

    expect(
      getOverallProgress({
        version: 1,
        document: { name: "course.pdf", pageCount: 3, characterCount: 1000 },
        bundle,
        currentStep: "quiz",
      }),
    ).toBe(18);
  });

  it("returns the first unanswered question", () => {
    const questions = makeBundle().quiz;
    questions[0].selectedIndex = 1;
    questions[2].selectedIndex = 0;

    expect(getNextQuestionIndex(questions)).toBe(1);
    questions.forEach((question, index) => {
      question.selectedIndex = (index === 2 ? 0 : 1) as 0 | 1;
    });
    expect(getNextQuestionIndex(questions)).toBe(-1);
  });
});
