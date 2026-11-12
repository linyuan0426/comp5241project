import type { InterviewQuestion, InterviewSession, InterviewTask } from "./types.ts";
import { scenarioCases } from "../learning/scenario-cases.ts";

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "coding-reasoning",
    topic: "Coding reasoning",
    prompt:
      "Design a function that returns the third most frequent word in a list of article titles. Walk me through your data structures, complexity, and how you would handle empty input or ties.",
    demoFollowUp:
      "What would change if the title collection were too large to fit comfortably in memory?",
    signals: [
      "hash",
      "map",
      "frequency",
      "complexity",
      "tie",
      "empty",
      "edge",
      "heap",
      "sort",
    ],
    improvement:
      "State the core data structure, time and space complexity, and tie-breaking rule before considering optimizations.",
  },
  {
    id: "debugging",
    topic: "Debugging and testing",
    prompt:
      "A login endpoint intermittently returns HTTP 500 only when the email contains mixed-case letters. Describe how you would isolate the cause and what tests you would add.",
    demoFollowUp:
      "Which hypothesis would you test first, and what observation would confirm it?",
    signals: [
      "reproduce",
      "log",
      "hypothesis",
      "test",
      "case",
      "normalize",
      "email",
      "regression",
      "boundary",
    ],
    improvement:
      "Separate reproduction, hypothesis testing, root-cause proof, and regression coverage so the diagnosis is evidence-driven.",
  },
  {
    id: "system-design",
    topic: "System design",
    prompt:
      "Design how learner progress for document plans and quizzes should flow from the browser to storage and back. Cover API shape, persistence, synchronization, and failure handling.",
    demoFollowUp:
      "What happens if the same learner edits progress from two tabs at almost the same time?",
    signals: [
      "api",
      "storage",
      "sync",
      "conflict",
      "version",
      "retry",
      "failure",
      "local",
      "server",
      "schema",
    ],
    improvement:
      "Cover the write path, read path, concurrent updates, conflict resolution, and recovery behavior as one contract.",
  },
  {
    id: "collaboration",
    topic: "Collaboration",
    prompt:
      "Your teammate's API change breaks the frontend shortly before a demo. Explain how you would communicate the issue, prioritize the response, and contain the risk.",
    demoFollowUp:
      "What would you say if the product owner asks the team to hide the problem until after the demo?",
    signals: [
      "communicate",
      "owner",
      "priority",
      "rollback",
      "risk",
      "demo",
      "impact",
      "plan",
      "transparent",
      "timeline",
    ],
    improvement:
      "Make impact, ownership, immediate containment, and the next decision point explicit to the people affected.",
  },
];

export function getSessionQuestions(session: InterviewSession) {
  return session.questions ?? INTERVIEW_QUESTIONS;
}

export function createTaskQuestions(task: InterviewTask): InterviewQuestion[] {
  if (task.focus === "source-verification") {
    return [
      {
        id: "coding-reasoning",
        topic: "Verify an AI claim",
        prompt: `In ${task.title}, you ${task.decision.replace(/^Flagged/, "flagged")} Which part of the source contradicts the claim, and how did it inform your correction?`,
        demoFollowUp: "Which word, number, or condition in the excerpt makes your correction more precise?",
        signals: ["claim", "evidence", "source", "correct", "condition"],
        improvement: "Quote the relevant detail, explain the conflict, and state the corrected claim.",
      },
      {
        id: "debugging",
        topic: "Check a new claim",
        prompt: "How would you check another AI claim if the course material gives only partial evidence?",
        demoFollowUp: "What would you tell a reader if you could only verify one part of the answer?",
        signals: ["verify", "source", "evidence", "uncertain", "check"],
        improvement: "Describe which claims the evidence supports and what you would check next.",
      },
    ];
  }
  const workspace = task.kind === "workspace";
  const scenario = scenarioCases[task.scenarioId ?? "discount"];
  return [
    {
      id: "coding-reasoning",
      topic: "Explain your decision",
      prompt: `In ${task.title}, your recorded decision was “${task.decision}”. Explain the requirement behind that choice and one trade-off you considered.`,
      demoFollowUp: workspace
        ? "If a teammate proposed a broader change to the page, what would you keep in this commit and why?"
        : scenario.followUps[0],
      signals: workspace ? ["label", "scope", "requirement", "review", "commit"] : [...scenario.signals, "requirement"],
      improvement: "Name the requirement, explain your choice, and contrast it with a plausible alternative.",
    },
    {
      id: "debugging",
      topic: "Verify the outcome",
      prompt: `The practice recorded this outcome: “${task.result}” How would you verify the change on a real project, and what would that evidence tell you?`,
      demoFollowUp: workspace
        ? "If the staged file differs from what you just checked, what would you verify before committing?"
        : scenario.followUps[1],
      signals: workspace ? ["test", "check", "stage", "diff", "commit", "push"] : ["test", "expected", ...scenario.signals],
      improvement: "Give a specific check, its expected result, and what you would do if the result differed.",
    },
  ];
}
