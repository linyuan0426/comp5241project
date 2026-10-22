import type { LearningBundle } from "../types";

export function makeBundle(): LearningBundle {
  return {
    title: "Reliable Software Foundations",
    summary:
      "This learning pack follows a change from an isolated branch through a small function, an automated test, and a stable API contract. It emphasizes explicit boundaries and observable behavior so that every engineering decision remains understandable and safe to evolve.",
    objectives: [
      "Explain how focused commits make changes reviewable.",
      "Design functions with explicit input and failure contracts.",
      "Use tests to protect observable behavior.",
    ],
    plan: [
      {
        id: "stage-1",
        title: "Make changes visible",
        outcome: "Explain the purpose of a focused branch and commit.",
        tasks: [
          { id: "task-1-1", label: "Summarize source control intent", completed: false },
          { id: "task-1-2", label: "Draft a one-sentence commit message", completed: false },
        ],
      },
      {
        id: "stage-2",
        title: "Shape function boundaries",
        outcome: "Separate core logic from input and output.",
        tasks: [
          { id: "task-2-1", label: "Identify a pure calculation", completed: false },
          { id: "task-2-2", label: "Define predictable invalid-input behavior", completed: false },
        ],
      },
      {
        id: "stage-3",
        title: "Protect behavior with tests",
        outcome: "Describe arrange, act, and assert.",
        tasks: [
          { id: "task-3-1", label: "Write a regression scenario", completed: false },
          { id: "task-3-2", label: "Name the API failure contract", completed: false },
        ],
      },
    ],
    quiz: [
      {
        id: "question-1",
        prompt: "Why should a branch contain one concern?",
        options: [
          "It makes unrelated changes impossible",
          "It keeps review and reasoning focused",
          "It removes the need for tests",
          "It automatically merges main",
        ],
        answerIndex: 1,
        explanation:
          "A focused branch makes the intent of a change easier to review and reason about.",
      },
      {
        id: "question-2",
        prompt: "What makes a pure function easier to test?",
        options: [
          "It hides mutable state",
          "It requires a database",
          "Its output depends only on its inputs",
          "It retries network requests",
        ],
        answerIndex: 2,
        explanation:
          "The same inputs always produce the same output, so the test does not need surrounding state.",
      },
      {
        id: "question-3",
        prompt: "What does arrange, act, assert describe?",
        options: [
          "A Git merge strategy",
          "A readable test structure",
          "A REST status code family",
          "A user interface animation",
        ],
        answerIndex: 1,
        explanation:
          "Arrange prepares input, act performs the operation, and assert checks the result.",
      },
      {
        id: "question-4",
        prompt: "What does a 401 API response usually indicate?",
        options: [
          "Credentials need correction",
          "The request succeeded",
          "The client should wait for a rate limit",
          "The resource was deleted",
        ],
        answerIndex: 0,
        explanation: "A 401 response signals an authentication problem.",
      },
      {
        id: "question-5",
        prompt: "Why validate an API response shape?",
        options: [
          "To replace all unit tests",
          "To turn integration failures into local errors",
          "To hide server status codes",
          "To make every response successful",
        ],
        answerIndex: 1,
        explanation:
          "Validation catches invalid field names and types close to the integration boundary.",
      },
    ],
  };
}
