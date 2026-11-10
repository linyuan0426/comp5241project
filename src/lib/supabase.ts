import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase = url && key && !url.includes("YOUR_PROJECT_REF") && !key.startsWith("replace_")
  ? createClient(url, key)
  : null;

const courseFilesBucket = "pathwise-course-files";

export async function uploadCourseFile(userId: string, file: File) {
  if (!supabase) throw new Error("Course file storage is unavailable.");
  const isPptx = /\.pptx$/i.test(file.name)
    || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  const path = `${userId}/${crypto.randomUUID()}.${isPptx ? "pptx" : "pdf"}`;
  const { error } = await supabase.storage.from(courseFilesBucket).upload(path, file, {
    contentType: isPptx
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/pdf",
  });
  if (error) throw error;
  return path;
}

export async function downloadCourseFile(path: string) {
  if (!supabase) throw new Error("Course file storage is unavailable.");
  const { data, error } = await supabase.storage.from(courseFilesBucket).download(path);
  if (error) throw error;
  return data;
}
