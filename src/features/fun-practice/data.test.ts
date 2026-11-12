import { describe, expect, it } from "vitest";
import { internTasks, roommateTasks, teamworkCases } from "./data";
import { reviewDemoTask } from "./demo";
import { funPracticeTaskSchema } from "./types";

describe("fun practice story library", () => {
  it("provides four distinct, valid stories for every practice mode", () => {
    const groups = [
      internTasks,
      roommateTasks.map(({ task }) => task),
      teamworkCases.map(({ task }) => task),
    ];

    for (const tasks of groups) {
      expect(tasks).toHaveLength(4);
      expect(new Set(tasks.map(({ id }) => id)).size).toBe(4);
      for (const task of tasks) {
        expect(funPracticeTaskSchema.parse(task)).toEqual(task);
        expect(task.criteria.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("keeps each team incident decision-focused and locally reviewable", () => {
    for (const incident of teamworkCases) {
      expect(incident.steps).toHaveLength(2);
      expect(incident.steps.every((step) => step.options.length === 3)).toBe(true);
      expect(incident.steps.every((step) => step.options.filter(({ advances }) => advances).length === 1)).toBe(true);
    }

    const transaction = internTasks.find(({ concept }) => concept === "Atomic transactions");
    expect(transaction).toBeDefined();
    expect(reviewDemoTask(
      transaction!,
      "Keep the writes together in one transaction and roll back if one step fails.",
    ).status).toBe("complete");
  });
});
