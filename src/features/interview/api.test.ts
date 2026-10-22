import { afterEach, describe, expect, it, vi } from "vitest";
import { makeInterviewReport } from "../../test/fixtures";
import {
  generateInterviewFollowUp,
  generateInterviewReport,
  normalizeInterviewReport,
} from "./api";
import { INTERVIEW_QUESTIONS } from "./questions";
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
  it("requests exactly one contextual follow-up with deepseek-chat", async () => {
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
      "sk-interview",
      current,
      "I would count words in a map and explain complexity.",
    );

    expect(followUp).toContain("same frequency");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(body.model).toBe("deepseek-chat");
    expect(body.response_format).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-interview",
    );
  });

  it("generates a schema-valid five-dimension report in JSON mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      completionResponse(JSON.stringify(makeInterviewReport())),
    );
    vi.stubGlobal("fetch", fetchMock);

    const report = await generateInterviewReport("sk-interview", session());
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
    await expect(generateInterviewReport("sk-test", session())).rejects.toThrow(
      "invalid interview report",
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(completionResponse("")));
    await expect(
      generateInterviewFollowUp("sk-test", session(), "A sufficiently detailed answer"),
    ).rejects.toThrow("empty interviewer response");
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
      generateInterviewFollowUp("sk-test", session(), "Detailed answer"),
    ).rejects.toThrow("Invalid key");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    await expect(
      generateInterviewFollowUp("sk-test", session(), "Detailed answer"),
    ).rejects.toThrow("too many requests");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      generateInterviewFollowUp("sk-test", session(), "Detailed answer"),
    ).rejects.toThrow("Could not reach DeepSeek");
  });
});
