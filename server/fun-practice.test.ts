import { afterEach, describe, expect, it, vi } from "vitest";
import type { FunPracticeTask } from "../src/features/fun-practice/types.ts";
import { generateFunPractice, reviewFunPractice } from "./fun-practice.ts";
import type { AiProvider } from "./provider.ts";

const provider: AiProvider = {
  name: "openrouter",
  key: "test-key",
  model: "test-model",
};

const task: FunPracticeTask = {
  version: 1,
  id: "test-task",
  mode: "intern",
  title: "A confident mistake",
  concept: "Cache freshness",
  roleName: "Intern P",
  opening: "I never update the cache.",
  badLine: "I never update the cache.",
  criteria: [
    { id: "stale", label: "Cached copies can become stale." },
    { id: "refresh", label: "Explain a refresh or invalidation policy." },
  ],
  correctExplanation: "Invalidate cached data when its source changes.",
  evidence: "The course explains cache invalidation.",
  transferQuestion: {
    question: "What should happen when the source changes?",
    options: ["Keep the old copy", "Refresh or invalidate it", "Delete the source"],
    correctIndex: 1,
    explanation: "Freshness depends on updating the cached copy.",
  },
  sample: false,
};

function completion(content: object) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    choices: [{ message: { content: JSON.stringify(content) } }],
  })));
}

afterEach(() => vi.unstubAllGlobals());

describe("fun practice AI contracts", () => {
  it("normalizes generated tasks and forces server-owned metadata", async () => {
    completion({
      ...task,
      id: undefined,
      sample: undefined,
      title: "The cache from yesterday",
    });

    const generated = await generateFunPractice(
      provider,
      "intern",
      "Cache freshness",
      "Caching stores a copy. Invalidating stale data protects freshness.",
    );

    expect(generated.id).toMatch(/^ai-/);
    expect(generated.sample).toBe(false);
    expect(generated.mode).toBe("intern");
    expect(generated.title).toBe("The cache from yesterday");
  });

  it("accepts a complete review with every criterion classified", async () => {
    completion({
      status: "complete",
      satisfiedCriterionIds: ["stale", "refresh"],
      missingCriterionIds: [],
      feedback: "You explained both the stale copy and the recovery policy.",
      followUp: "",
      revisedMessage: "Now I understand invalidation.",
    });

    const review = await reviewFunPractice(
      provider,
      task,
      "The cache becomes stale; invalidate it when the source changes.",
      1,
    );

    expect(review.status).toBe("complete");
    expect(review.missingCriterionIds).toEqual([]);
  });
});
