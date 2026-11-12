import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { interviewSessionSchema } from "../src/features/interview/types.ts";
import { readServerConfig, type ServerEnvironment } from "./config.ts";
import { generateInterviewFollowUp, generateInterviewReport } from "./interview.ts";
import {
  funPracticeCreateInputSchema,
  funPracticeReviewInputSchema,
  generateFunPractice,
  reviewFunPractice,
} from "./fun-practice.ts";
import { ProviderError } from "./provider.ts";
import { generateLearningBundle, recognizePageImages } from "./study.ts";

export const maxAiBodyBytes = 4_000_000;

const imageSchema = z.string().max(1_600_000)
  .regex(/^data:image\/(jpeg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/);

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("study-kit"), sourceText: z.string().trim().min(1).max(31_000) }),
  z.object({
    action: z.literal("image-text"),
    images: z.array(imageSchema).min(1).max(8),
    nativeText: z.string().max(4_000),
  }),
  z.object({
    action: z.literal("interview-follow-up"),
    session: interviewSessionSchema,
    answer: z.string().trim().min(1).max(4_000),
  }),
  z.object({ action: z.literal("interview-report"), session: interviewSessionSchema }),
  funPracticeCreateInputSchema,
  funPracticeReviewInputSchema,
]);

function respond(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleAiRequest(request: Request, env: ServerEnvironment = process.env) {
  if (request.method !== "POST") return respond({ error: "Use POST for this endpoint." }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return respond({ error: "Sign in to use AI." }, 401);

  const config = readServerConfig(env);
  if (!config) return respond({ error: "AI service is not configured. Ask the project administrator." }, 503);

  if (Number(request.headers.get("content-length")) > maxAiBodyBytes) {
    return respond({ error: "This request is too large. Try fewer or smaller images." }, 413);
  }

  const body = await request.text().catch(() => "");
  const bodyBytes = Buffer.byteLength(body);
  if (bodyBytes > maxAiBodyBytes) {
    return respond({ error: "This request is too large. Try fewer or smaller images." }, 413);
  }

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(JSON.parse(body));
  } catch {
    return respond({ error: "The request data is invalid or too large." }, 400);
  }

  if (input.action !== "image-text" && bodyBytes > 150_000) {
    return respond({ error: "This request is too long. Try a shorter answer or document." }, 413);
  }

  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      if (authError?.status && authError.status >= 500) {
        return respond({ error: "Sign-in verification is temporarily unavailable." }, 503);
      }
      return respond({ error: "Your session has expired. Sign in again to continue." }, 401);
    }

    const { data: allowed, error: quotaError } = await supabase.rpc("pathwise_consume_ai_quota");
    if (quotaError) return respond({ error: "AI usage could not be checked. Try again later." }, 503);
    if (allowed !== true) return respond({ error: "You have reached today's AI usage limit." }, 429);

    const provider = config.provider;
    switch (input.action) {
      case "study-kit":
        return respond({ data: await generateLearningBundle(provider, input.sourceText) });
      case "image-text":
        return respond({ data: await recognizePageImages(provider, input.images, input.nativeText) });
      case "interview-follow-up":
        return respond({ data: await generateInterviewFollowUp(provider, input.session, input.answer) });
      case "interview-report":
        return respond({ data: await generateInterviewReport(provider, input.session) });
      case "fun-practice-create":
        return respond({
          data: await generateFunPractice(provider, input.mode, input.concept, input.sourceText),
        });
      case "fun-practice-review":
        return respond({
          data: await reviewFunPractice(provider, input.task, input.answer, input.turn),
        });
    }
  } catch (error) {
    if (error instanceof ProviderError) return respond({ error: error.message }, error.status);
    return respond({ error: "The AI request could not be completed. Please try again." }, 503);
  }
}
