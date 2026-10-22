import { describe, expect, it } from "vitest";
import { makeBundle } from "../test/fixtures";
import type { LearningState } from "../types";
import {
  API_KEY_STORAGE_KEY,
  LEARNING_STORAGE_KEY,
  clearApiKey,
  clearLearningState,
  getApiKey,
  loadLearningState,
  saveLearningState,
  setApiKey,
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

  it("clears learning data without touching the session key", () => {
    saveLearningState(makeState());
    setApiKey("sk-session-only");
    clearLearningState();

    expect(loadLearningState()).toBeNull();
    expect(getApiKey()).toBe("sk-session-only");
  });

  it("keeps the API key out of localStorage", () => {
    setApiKey("  sk-demo-key  ");

    expect(sessionStorage.getItem(API_KEY_STORAGE_KEY)).toBe("sk-demo-key");
    expect(localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull();

    clearApiKey();
    expect(getApiKey()).toBe("");
  });
});
