import type { AiProvider } from "./provider.ts";

export type ServerEnvironment = Record<string, string | undefined>;

export function readServerConfig(env: ServerEnvironment) {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  const providerName = env.AI_PROVIDER?.trim() || "deepseek";
  if (providerName !== "deepseek" && providerName !== "openrouter") return null;

  const key = (providerName === "openrouter" ? env.OPENROUTER_API_KEY : env.DEEPSEEK_API_KEY)?.trim();
  if (!supabaseUrl || !supabaseKey || !key || key.startsWith("replace_")
    || supabaseKey.startsWith("replace_") || supabaseUrl.includes("YOUR_PROJECT_REF")) return null;

  const provider: AiProvider = {
    name: providerName,
    key,
    model: providerName === "openrouter"
      ? env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4.1-flash"
      : "deepseek-flash",
  };
  return { supabaseUrl, supabaseKey, provider };
}
