import type { LearningBundle } from "../types";
import type { InterviewReport } from "../features/interview/types";

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

export function makeInterviewReport(): InterviewReport {
  return {
    summary:
      "The candidate communicates a structured approach and connects technical choices to evidence. More explicit failure handling would make future answers easier to evaluate.",
    dimensions: [
      {
        id: "problem-solving",
        label: "Problem solving",
        score: 4,
        evidence: "The answer starts with the main data structure and expected complexity.",
        improvement: "State the tie-breaking rule before choosing an implementation.",
      },
      {
        id: "correctness",
        label: "Technical correctness",
        score: 3,
        evidence: "The approach is plausible but does not cover every boundary case.",
        improvement: "List empty, duplicate, and tie cases explicitly.",
      },
      {
        id: "debugging",
        label: "Debugging and testing",
        score: 4,
        evidence: "The response proposes a reproduction and a focused test.",
        improvement: "Connect each log or test to the hypothesis it confirms.",
      },
      {
        id: "system-design",
        label: "System design",
        score: 3,
        evidence: "The answer covers storage and synchronization at a high level.",
        improvement: "Describe the conflict resolution contract and retry behavior.",
      },
      {
        id: "communication",
        label: "Communication",
        score: 4,
        evidence: "The response prioritizes impact and next steps.",
        improvement: "Add a short decision checkpoint for the product owner.",
      },
    ],
    strengths: [
      "Structured technical reasoning",
      "Clear explanation of tests and evidence",
    ],
    improvements: [
      "Cover failure paths more explicitly",
      "Quantify tradeoffs when possible",
    ],
    nextPractice: [
      "Retry one answer using a 30-second structure",
      "Write a conflict-resolution example for concurrent progress updates",
    ],
  };
}

const bookingEvidence = "Cancel at least 36 hours before the workshop.";
export const questSource = `[Page 1]
${bookingEvidence} Each workshop lasts 60 minutes. Tickets are available online.
Select a workshop, enter contact details, then confirm your booking.`;

export function makeQuest(): NonNullable<LearningBundle["quest"]> {
  const room = {
    prompt: "Restore the workshop guide.",
    hint: "Check the workshop policy.",
    explanation: "The workshop guide explains the rules.",
    evidence: bookingEvidence,
  };
  return {
    title: "Recover the workshop guide",
    mission: "Repair the guide before the registration desk opens.",
    rooms: [
      {
        ...room, kind: "match", title: "Find the rules",
        pairs: [
          { term: "Cancellation notice", meaning: "At least 36 hours" },
          { term: "Workshop duration", meaning: "60 minutes" },
          { term: "Ticket sales", meaning: "Online" },
        ],
      },
      {
        ...room, kind: "order", title: "Restore booking",
        steps: ["Select a workshop", "Enter contact details", "Confirm your booking"],
        evidence: "Select a workshop, enter contact details, then confirm your booking.",
      },
      {
        ...room, kind: "detective", title: "Audit the draft",
        claims: ["Workshops last one hour.", "The deadline is 24 hours.", "Tickets can be bought online."],
        falseIndex: 1,
        otherExcerpts: ["Each workshop lasts 60 minutes.", "Tickets are available online."],
        corrections: ["Require 12 hours of notice.", "Require 24 hours of notice.", "Require 36 hours of notice."],
        correctIndex: 2,
      },
      {
        ...room, kind: "apply", title: "Open registration",
        prompt: "A learner wants to cancel 40 hours before the workshop.",
        options: ["Decline the request", "Allow the cancellation", "Wait until the workshop starts"],
        correctIndex: 1,
      },
    ],
  };
}
