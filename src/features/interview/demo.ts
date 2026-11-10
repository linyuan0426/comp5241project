import { getSessionQuestions, INTERVIEW_QUESTIONS } from "./questions";
import type {
  InterviewAnswer,
  InterviewDimensionId,
  InterviewReport,
  InterviewSession,
  InterviewQuestion,
} from "./types";

const DIMENSION_LABELS: Record<InterviewDimensionId, string> = {
  "problem-solving": "Problem solving",
  correctness: "Technical correctness",
  debugging: "Debugging and testing",
  "system-design": "System design",
  communication: "Communication",
};

const DIMENSION_IMPROVEMENTS: Record<InterviewDimensionId, string> = {
  "problem-solving":
    "Start with assumptions and a concrete approach before discussing optimizations.",
  correctness:
    "Call out edge cases and explain why the proposed solution remains correct.",
  debugging:
    "Connect each hypothesis to a test or observation that can confirm or reject it.",
  "system-design":
    "Explain data ownership, API contracts, and failure recovery as one flow.",
  communication:
    "Lead with impact and next actions, then add technical details for the audience.",
};

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function rubricScore(text: string, signals: string[]) {
  if (!text.trim()) return 1;
  const lower = text.toLowerCase();
  const matches = signals.filter((signal) => lower.includes(signal)).length;
  let score = 2;
  if (wordCount(text) >= 20) score += 1;
  if (matches >= 2) score += 1;
  if (wordCount(text) >= 45 && matches >= 4) score += 1;
  return Math.min(5, score) as 1 | 2 | 3 | 4 | 5;
}

function answerText(answer: InterviewAnswer) {
  return `${answer.initialAnswer} ${answer.followUpAnswer}`.trim();
}

function evidenceFor(session: InterviewSession, questionIndex: number) {
  const answer = session.answers[questionIndex]?.initialAnswer.trim();
  if (!answer) return "No answer was captured for this dimension.";
  return answer.length > 150 ? `${answer.slice(0, 147)}...` : answer;
}

function dimensionScore(
  session: InterviewSession,
  questionIndexes: number[],
  signals: string[],
) {
  const text = questionIndexes
    .map((index) => {
      const answer = session.answers[index];
      return answer ? answerText(answer) : "";
    })
    .join(" ");
  return rubricScore(text, signals);
}

export function createDemoFollowUp(questionIndex: number, questions: InterviewQuestion[] = INTERVIEW_QUESTIONS) {
  return questions[questionIndex].demoFollowUp;
}

export function createDemoReport(session: InterviewSession): InterviewReport {
  const questions = getSessionQuestions(session);
  const designIndex = session.task ? 0 : 2;
  const communicationIndex = session.task ? 1 : 3;
  const first = questions[0].signals;
  const second = questions[1].signals;
  const design = questions[designIndex].signals;
  const communication = questions[communicationIndex].signals;

  const scores: Record<InterviewDimensionId, 1 | 2 | 3 | 4 | 5> = {
    "problem-solving": dimensionScore(session, [0, 1], [...first, ...second]),
    correctness: dimensionScore(session, session.task ? [0, 1] : [0, 2], [...first, ...(session.task ? second : design)]),
    debugging: dimensionScore(session, [1], second),
    "system-design": dimensionScore(session, [designIndex], design),
    communication: dimensionScore(session, [communicationIndex], communication),
  };

  const evidenceMap: Record<InterviewDimensionId, number> = {
    "problem-solving": 0,
    correctness: 0,
    debugging: 1,
    "system-design": designIndex,
    communication: communicationIndex,
  };

  function dimension<T extends InterviewDimensionId>(id: T) {
    return {
      id,
      label: session.task && id === "system-design" ? "Design trade-offs" : DIMENSION_LABELS[id],
      score: scores[id],
      evidence: evidenceFor(session, evidenceMap[id]),
      improvement: session.task && id !== "communication"
        ? questions[evidenceMap[id]].improvement
        : DIMENSION_IMPROVEMENTS[id],
    };
  }

  const dimensions: InterviewReport["dimensions"] = [
    dimension("problem-solving"),
    dimension("correctness"),
    dimension("debugging"),
    dimension("system-design"),
    dimension("communication"),
  ];

  const strongDimensions = dimensions
    .filter((dimension) => dimension.score >= 4)
    .map((dimension) => `${dimension.label}: ${dimension.evidence}`);
  const improvementDimensions = dimensions
    .filter((dimension) => dimension.score < 4)
    .map((dimension) => dimension.improvement);
  const average =
    dimensions.reduce((total, dimension) => total + dimension.score, 0) /
    dimensions.length;

  return {
    summary: `This Demo mode report was generated from a local rubric, not a live AI model or a hiring assessment. The simulated overall signal is ${average.toFixed(
      1,
    )} out of 5. Use it to reflect on structure, evidence, and tradeoff coverage in your answers.`,
    dimensions,
    strengths:
      strongDimensions.length > 0
        ? strongDimensions.slice(0, 3)
        : ["You completed the full interview and produced material for reflection."],
    improvements:
      improvementDimensions.length > 0
        ? improvementDimensions.slice(0, 3)
        : ["Keep practicing concise tradeoff summaries and explicit edge-case checks."],
    nextPractice: [
      "Retry one answer with a 30-second structure: approach, correctness, tradeoff, and next test.",
      "Record a second answer that explicitly mentions failure handling and user impact.",
      "Compare your two attempts and keep the clearer evidence and decision sequence.",
    ],
  };
}
