export type AiProvider = { name: "deepseek" | "openrouter"; key: string; model: string };

export class ProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "ProviderError";
  }
}

type Completion = {
  choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>;
};

export async function requestCompletion(provider: AiProvider, body: Record<string, unknown>) {
  const router = provider.name === "openrouter";
  const endpoint = router
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.deepseek.com/chat/completions";

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        model: provider.model,
        ...(router
          ? { reasoning: { effort: "none" }, provider: { require_parameters: true } }
          : { thinking: { type: "disabled" } }),
      }),
      signal: AbortSignal.timeout(50_000),
    });
  } catch {
    throw new ProviderError("The AI service did not respond. Please try again.");
  }

  if (!response.ok) {
    if (response.status === 429) throw new ProviderError("The AI service is busy. Please try again shortly.", 429);
    throw new ProviderError("The AI service could not complete the request. Please try again.");
  }

  const result: Completion | null = await response.json().catch(() => null);
  const choice = result?.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new ProviderError("The AI response was cut off. Try a shorter document or answer.");
  }
  if (typeof choice?.message?.content !== "string" || !choice.message.content.trim()) {
    throw new ProviderError("The AI service returned an empty or unreadable response. Please try again.");
  }
  return choice.message.content.trim();
}
