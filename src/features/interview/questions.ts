import type { InterviewQuestionId } from "./types";

export type InterviewQuestion = {
  id: InterviewQuestionId;
  topic: string;
  prompt: string;
  demoFollowUp: string;
  signals: string[];
  improvement: string;
};

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
