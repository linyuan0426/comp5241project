import { afterEach, describe, expect, it, vi } from "vitest";
import { makeBundle } from "../test/fixtures";
import {
  DeepSeekError,
  generateLearningBundle,
  normalizeLearningBundle,
  testDeepSeekConnection,
} from "./deepseek";

function rawBundle() {
  return {
    title: "Reliable Software Foundations",
    summary:
      "A source-grounded learning path that connects change visibility, clear function contracts, automated testing, and predictable API integration behavior for software engineering students.",
    objectives: ["Trace a focused change.", "Design boundaries.", "Use tests for feedback."],
    plan: [
      {
        title: "Change",
        outcome: "Make intent visible.",
        tasks: ["Review a branch", "Write a focused commit"],
      },
      {
        title: "Boundaries",
        outcome: "Separate pure logic.",
        tasks: ["Name inputs", "Handle invalid input"],
      },
      {
        title: "Feedback",
        outcome: "Protect behavior.",
        tasks: ["Arrange a test", "Assert a result"],
      },
    ],
    quiz: makeBundle().quiz.map(({ prompt, options, answerIndex, explanation }) => ({
      prompt,
      options,
      answerIndex,
      explanation,
    })),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeepSeek learning generation", () => {
  it("validates and normalizes stable task and question IDs", () => {
    const bundle = normalizeLearningBundle(rawBundle());

    expect(bundle.plan).toHaveLength(3);
    expect(bundle.quiz).toHaveLength(5);
    expect(bundle.plan[0].id).toBe("stage-1");
    expect(bundle.plan[1].tasks[1].id).toBe("task-2-2");
    expect(bundle.quiz[0].id).toBe("question-1");
    expect(bundle.plan[0].tasks[0].completed).toBe(false);
  });

  it("sends JSON mode to deepseek-chat and returns a validated pack", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(rawBundle()) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateLearningBundle("sk-test", "Source course text");
    expect(result.title).toBe("Reliable Software Foundations");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(body.model).toBe("deepseek-chat");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-test",
    );
    expect(String(body.messages[1].content)).toContain("<source_document>");
  });

  it("rejects malformed model output with a retryable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"title":"Incomplete"}' } }],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(generateLearningBundle("sk-test", "Source")).rejects.toThrow(
      "invalid study kit",
    );
  });

  it("reports an unreadable API response with a retryable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
    );

    await expect(generateLearningBundle("sk-test", "Source")).rejects.toThrow(
      "unreadable response",
    );
  });

  it("reports an invalid API key without exposing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Authentication failed" } }), {
          status: 401,
        }),
      ),
    );

    const error = await generateLearningBundle("sk-secret", "Source").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(DeepSeekError);
    expect((error as DeepSeekError).status).toBe(401);
    expect((error as Error).message).toBe("Authentication failed");
    expect((error as Error).message).not.toContain("sk-secret");
  });

  it("handles rate limits and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    await expect(generateLearningBundle("sk-test", "Source")).rejects.toThrow(
      "too many requests",
    );

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(generateLearningBundle("sk-test", "Source")).rejects.toThrow(
      "Could not reach DeepSeek",
    );
  });

  it("tests a key through the models endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await testDeepSeekConnection("sk-test");
    expect(fetchMock).toHaveBeenCalledWith("https://api.deepseek.com/models", {
      headers: { Authorization: "Bearer sk-test" },
    });
  });
});
