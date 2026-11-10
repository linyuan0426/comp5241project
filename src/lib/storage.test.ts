import { describe, expect, it } from "vitest";
import { makeBundle } from "../test/fixtures";
import type { LearningState } from "../types";
import {
  LEARNING_STORAGE_KEY,
  clearLearningState,
  loadLearningState,
  saveLearningState,
} from "./storage";

function makeState(): LearningState {
  return {
    version: 1,
    document: {
      name: "sample-course.pdf",
      pageCount: 3,
      characterCount: 4598,
    },
    bundle: makeBundle(),
    currentStep: "plan",
  };
}

describe("local persistence", () => {
  it("round-trips a versioned learning state", () => {
    const state = makeState();
    saveLearningState(state);

    expect(loadLearningState()).toEqual(state);
    expect(localStorage.getItem(LEARNING_STORAGE_KEY)).toContain('"version":1');
  });

  it("ignores malformed or unsupported state", () => {
    localStorage.setItem(LEARNING_STORAGE_KEY, "{not valid json");
    expect(loadLearningState()).toBeNull();

    localStorage.setItem(
      LEARNING_STORAGE_KEY,
      JSON.stringify({ ...makeState(), version: 2 }),
    );
    expect(loadLearningState()).toBeNull();
  });

  it("clears the study kit without clearing other progress", () => {
    localStorage.setItem("genai-workspace-demo:v1", "{}");
    saveLearningState(makeState());
    clearLearningState();

    expect(loadLearningState()).toBeNull();
    expect(localStorage.getItem("genai-workspace-demo:v1")).toBe("{}");
  });
});
