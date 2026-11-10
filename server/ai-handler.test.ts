import { afterEach, expect, it, vi } from "vitest";
import { handleAiRequest } from "./ai-handler.ts";

const env = {
  VITE_SUPABASE_URL: "https://pathwise-test.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  AI_PROVIDER: "openrouter",
  OPENROUTER_API_KEY: "server-only-key",
};

function imageRequest(token?: string) {
  return new Request("https://pathwise.test/api/ai", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({
      action: "image-text",
      nativeText: "Course notes",
      images: ["data:image/png;base64,c2FtcGxl"],
    }),
  });
}

function mockNetwork(allowed: boolean) {
  const network = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const authorization = new Headers(init?.headers).get("authorization");
    if (url === `${env.VITE_SUPABASE_URL}/auth/v1/user`) {
      return authorization === "Bearer learner-session"
        ? Response.json({ id: "11111111-1111-4111-8111-111111111111", aud: "authenticated" })
        : Response.json({ message: "Invalid token" }, { status: 401 });
    }
    if (url === `${env.VITE_SUPABASE_URL}/rest/v1/rpc/pathwise_consume_ai_quota`) {
      expect(authorization).toBe("Bearer learner-session");
      return Response.json(allowed);
    }
    if (url === "https://openrouter.ai/api/v1/chat/completions") {
      expect(authorization).toBe("Bearer server-only-key");
      return Response.json({ choices: [{ message: { content: "A line from the course image." } }] });
    }
    throw new Error("Unexpected network request.");
  });
  vi.stubGlobal("fetch", network);
  return network;
}

afterEach(() => vi.unstubAllGlobals());

it("rejects guests and quota exhaustion before reaching the AI provider", async () => {
  const network = mockNetwork(false);
  expect((await handleAiRequest(imageRequest(), env)).status).toBe(401);
  expect(network).not.toHaveBeenCalled();

  expect((await handleAiRequest(imageRequest("invalid-token"), env)).status).toBe(401);
  expect(network).toHaveBeenCalledTimes(1);

  expect((await handleAiRequest(imageRequest("learner-session"), env)).status).toBe(429);
  expect(network).toHaveBeenCalledTimes(3);
  expect(network.mock.calls.some(([url]) => String(url).includes("openrouter.ai"))).toBe(false);
});

it("authorizes the learner then calls OpenRouter with only the server key", async () => {
  const network = mockNetwork(true);
  const response = await handleAiRequest(imageRequest("learner-session"), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: "A line from the course image." });

  const upstream = network.mock.calls.find(([url]) => String(url).includes("openrouter.ai"));
  expect(upstream).toBeDefined();
  const body = String(upstream?.[1]?.body);
  expect(JSON.parse(body).model).toBe("deepseek/deepseek-v4.1-flash");
  expect(body).not.toContain("learner-session");
});
