import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { handleAiRequest, maxAiBodyBytes } from "./server/ai-handler.ts";
import type { ServerEnvironment } from "./server/config.ts";

function localAi(env: ServerEnvironment): Plugin {
  return {
    name: "pathwise-local-ai",
    configureServer(server) {
      server.middlewares.use("/api/ai", async (incoming, outgoing) => {
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          if (incoming.method === "POST") {
            for await (const chunk of incoming) {
              size += chunk.length;
              if (size <= maxAiBodyBytes) chunks.push(chunk);
            }
          }
          if (size > maxAiBodyBytes) {
            outgoing.writeHead(413, { "Content-Type": "application/json" });
            outgoing.end(JSON.stringify({ error: "This request is too large." }));
            return;
          }

          const headers = new Headers();
          for (const [name, value] of Object.entries(incoming.headers)) {
            if (typeof value === "string") headers.set(name, value);
          }
          const request = new Request("http://localhost/api/ai", {
            method: incoming.method,
            headers,
            body: incoming.method === "POST" ? Buffer.concat(chunks).toString("utf8") : undefined,
          });
          const response = await handleAiRequest(request, env);
          outgoing.writeHead(response.status, Object.fromEntries(response.headers));
          outgoing.end(await response.text());
        } catch {
          outgoing.writeHead(503, { "Content-Type": "application/json" });
          outgoing.end(JSON.stringify({ error: "The local AI service could not complete the request." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (publicKey && !publicKey.startsWith("sb_publishable_") && !publicKey.startsWith("replace_")) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be the Supabase publishable key.");
  }
  return {
    plugins: [react(), localAi(env)],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
      restoreMocks: true,
    },
  };
});
