import type { LearningBundle } from "../types";
import { supabase } from "./supabase";

async function getAccessToken() {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("Sign in to use AI.");
  return token;
}

async function postAi<Result>(token: string, action: string, input: object) {
  let response: Response;
  try {
    response = await fetch("/api/ai", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...input }),
    });
  } catch {
    throw new Error("The AI service could not be reached. Please try again.");
  }

  const result = await response.json().catch(() => null) as { data?: Result; error?: string } | null;
  if (!response.ok || result?.data === undefined) {
    throw new Error(result?.error || "The AI service could not complete the request. Please try again.");
  }
  return result.data;
}

export async function callAi<Result>(action: string, input: object) {
  return postAi<Result>(await getAccessToken(), action, input);
}

export function generateLearningBundle(sourceText: string) {
  return callAi<LearningBundle>("study-kit", { sourceText });
}

const maxImageChars = 1_500_000;
const maxBatchChars = 3_500_000;

async function prepareImage(url: string) {
  if (url.length <= maxImageChars) return url;

  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not resize the course image.");

  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const resized = canvas.toDataURL("image/jpeg", 0.85);
  if (resized.length > maxImageChars) throw new Error("This image is too large to recognize.");
  return resized;
}

export async function recognizePageImages(images: string[], nativeText: string) {
  const token = await getAccessToken();
  const batches: string[][] = [];
  let batch: string[] = [];
  let characters = 0;
  for (const url of images) {
    const image = await prepareImage(url);
    if (batch.length === 8 || characters + image.length > maxBatchChars) {
      batches.push(batch);
      batch = [];
      characters = 0;
    }
    batch.push(image);
    characters += image.length;
  }
  if (batch.length) batches.push(batch);

  const transcriptions: string[] = [];
  for (const images of batches) {
    const text = await postAi<string>(token, "image-text", { images, nativeText: nativeText.slice(0, 4000) });
    if (text) transcriptions.push(text);
  }
  return transcriptions.join("\n\n");
}
