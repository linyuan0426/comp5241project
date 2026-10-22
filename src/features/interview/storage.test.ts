import { describe, expect, it } from "vitest";
import { makeInterviewReport } from "../../test/fixtures";
import {
  INTERVIEW_STORAGE_KEY,
  clearInterviewSession,
  loadInterviewSession,
  saveInterviewSession,
} from "./storage";
import type { InterviewSession } from "./types";

function makeSession(): InterviewSession {
  return {
    version: 1,
    track: "general-swe",
    level: "junior",
    mode: "demo",
    currentQuestionIndex: 0,
    phase: "question",
    answers: [],
  };
}

describe("interview persistence", () => {
  it("round-trips the latest session independently", () => {
    const session = makeSession();
    saveInterviewSession(session);

    expect(loadInterviewSession()).toEqual(session);
    expect(localStorage.getItem(INTERVIEW_STORAGE_KEY)).toContain(
      '"track":"general-swe"',
    );
    expect(localStorage.getItem("genai-learning-demo:v1")).toBeNull();
  });

  it("preserves a completed report", () => {
    const session = {
      ...makeSession(),
      phase: "report" as const,
      report: makeInterviewReport(),
    };
    saveInterviewSession(session);

    expect(loadInterviewSession()?.report?.dimensions).toHaveLength(5);
  });

  it("rejects malformed state and can clear the latest session", () => {
    localStorage.setItem(INTERVIEW_STORAGE_KEY, '{"version":2}');
    expect(loadInterviewSession()).toBeNull();

    saveInterviewSession(makeSession());
    clearInterviewSession();
    expect(loadInterviewSession()).toBeNull();
  });
});
