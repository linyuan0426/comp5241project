import { afterEach, describe, expect, it, vi } from "vitest";
import { makeInterviewReport } from "../../test/fixtures";
import {
  generateInterviewFollowUp,
  generateInterviewReport,
  normalizeInterviewReport,
} from "../../../server/interview";
import type { AiProvider } from "../../../server/provider";

const provider: AiProvider = { name: "deepseek", key: "sk-interview", model: "deepseek-flash" };
import { createTaskQuestions, INTERVIEW_QUESTIONS } from "./questions";
import type { InterviewSession } from "./types";

function session(): InterviewSession {
  return {
    version: 1,
    track: "general-swe",
    level: "junior",
    mode: "live",
    currentQuestionIndex: 3,
    phase: "report",
    answers: INTERVIEW_QUESTIONS.map((question) => ({
      questionId: question.id,
      initialAnswer: "I would explain the approach, correctness, and tradeoffs.",
      followUp: question.demoFollowUp,
      followUpAnswer: "I would verify the failure path with a focused test.",
    })),
  };
}

function completionResponse(content: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("live interview API", () => {
  it("requests exactly one contextual follow-up with deepseek-flash", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      completionResponse("What happens when two words have the same frequency?"),
    );
    vi.stubGlobal("fetch", fetchMock);
    const current = {
      ...session(),
      currentQuestionIndex: 0 as const,
      phase: "follow-up" as const,
      answers: [],
    };

    const followUp = await generateInterviewFollowUp(
      provider,
      current,
      "I would count words in a map and explain complexity.",
    );

    expect(followUp).toContain("same frequency");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(body.model).toBe("deepseek-flash");
    expect(body.response_format).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-interview",
    );
  });

  it("sends the saved task question and recorded evidence for a follow-up", async () => {
    const task = {
      kind: "scenario" as const,
      title: "the checkout discount challenge",
      decision: "Clamp the total at zero.",
      result: "The simulated total was zero.",
      evidence: ["The learner initially considered using Math.abs."],
    };
    const questions = createTaskQuestions(task);
    const fetchMock = vi.fn().mockResolvedValue(completionResponse("Which boundary would you test?"));
    vi.stubGlobal("fetch", fetchMock);

    await generateInterviewFollowUp(provider, {
      ...session(), task, questions, currentQuestionIndex: 1, phase: "question", answers: [],
    }, "I would test the exact price.");

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.messages[1].content).toContain(questions[1].prompt);
    expect(body.messages[1].content).toContain(task.evidence[0]);
    expect(body.messages[1].content).toContain("I would test the exact price.");
  });

  it("generates a schema-valid five-dimension report in JSON mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      completionResponse(JSON.stringify(makeInterviewReport())),
    );
    vi.stubGlobal("fetch", fetchMock);

    const report = await generateInterviewReport(provider, session());
    expect(report.dimensions.map((dimension) => dimension.id)).toEqual([
      "problem-solving",
      "correctness",
      "debugging",
      "system-design",
      "communication",
    ]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).response_format).toEqual({
      type: "json_object",
    });
  });

  it("rejects reports with dimensions in the wrong order", () => {
    const invalid = makeInterviewReport();
    invalid.dimensions.reverse();
    expect(() => normalizeInterviewReport(invalid)).toThrow();
  });

  it("reports malformed JSON and empty interviewer responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completionResponse("not-json")));
    await expect(generateInterviewReport(provider, session())).rejects.toThrow(
      "invalid interview report",
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completionResponse("")));
    await expect(
      generateInterviewFollowUp(provider, session(), "A sufficiently detailed answer"),
    ).rejects.toThrow("empty or unreadable response");
  });

  it("maps authentication, rate-limit, and network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Invalid key" } }), {
          status: 401,
        }),
      ),
    );
    await expect(
      generateInterviewFollowUp(provider, session(), "Detailed answer"),
    ).rejects.toThrow("AI service could not complete");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    await expect(
      generateInterviewFollowUp(provider, session(), "Detailed answer"),
    ).rejects.toThrow("AI service is busy");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      generateInterviewFollowUp(provider, session(), "Detailed answer"),
    ).rejects.toThrow("AI service did not respond");
  });
});
