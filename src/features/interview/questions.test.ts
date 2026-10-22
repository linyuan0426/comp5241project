import { describe, expect, it } from "vitest";
import { createDemoFollowUp, createDemoReport } from "./demo";
import { INTERVIEW_QUESTIONS } from "./questions";
import type { InterviewSession } from "./types";

function completedSession(): InterviewSession {
  return {
    version: 1,
    track: "general-swe",
    level: "junior",
    mode: "demo",
    currentQuestionIndex: 3,
    phase: "report",
    answers: INTERVIEW_QUESTIONS.map((question, index) => ({
      questionId: question.id,
      initialAnswer: `I would use a map and explain complexity, edge cases, failure handling, and tradeoffs for question ${index + 1}.`,
      followUp: question.demoFollowUp,
      followUpAnswer:
        "I would test the hypothesis, inspect evidence, and document the next decision for the team.",
    })),
  };
}

describe("interview question bank", () => {
  it("covers the four required interview topics in order", () => {
    expect(INTERVIEW_QUESTIONS.map((question) => question.topic)).toEqual([
      "Coding reasoning",
      "Debugging and testing",
      "System design",
      "Collaboration",
    ]);
  });

  it("provides one deterministic follow-up per question", () => {
    INTERVIEW_QUESTIONS.forEach((question, index) => {
      expect(createDemoFollowUp(index)).toBe(question.demoFollowUp);
      expect(question.demoFollowUp.length).toBeGreaterThan(20);
    });
  });

  it("creates an ordered five-dimension Demo report with evidence", () => {
    const report = createDemoReport(completedSession());

    expect(report.dimensions.map((dimension) => dimension.id)).toEqual([
      "problem-solving",
      "correctness",
      "debugging",
      "system-design",
      "communication",
    ]);
    expect(report.dimensions.every((dimension) => dimension.score >= 1)).toBe(true);
    expect(report.dimensions.every((dimension) => dimension.evidence.length > 0)).toBe(
      true,
    );
    expect(report.summary).toContain("not a live AI model");
  });
});
