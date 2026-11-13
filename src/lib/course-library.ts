import { z } from "zod";
import type { DocumentPage, LearningState } from "../types";
import { learningStateSchema } from "./storage";
import { courseFilesBucket, supabase } from "./supabase";

const table = "pathwise_course_library";
const summaryColumns = "id,name,file_path,page_count,created_at,has_pack";

export type LibraryEntry = {
  id: string;
  name: string;
  file_path: string | null;
  page_count: number;
  created_at: string;
  has_pack: boolean;
};

const savedPagesSchema = z.array(z.object({
  text: z.string(),
  recognizedText: z.string().optional(),
})).min(1).max(50);

export type LibraryCourse = LibraryEntry & {
  version: number;
  pages: z.infer<typeof savedPagesSchema> | null;
  learning: LearningState | null;
};

function client() {
  if (!supabase) throw new Error("Course library is unavailable.");
  return supabase;
}

function savedPages(pages: DocumentPage[]) {
  return pages.map(({ text, recognizedText }) => ({ text, recognizedText }));
}

export async function listLibrary() {
  const { data, error } = await client().from(table).select(summaryColumns)
    .order("created_at", { ascending: false }).order("id");
  if (error) throw new Error("Could not load your course library. Try again.");
  return data as LibraryEntry[];
}

export async function openLibraryCourse(id: string): Promise<LibraryCourse> {
  const { data, error } = await client().from(table)
    .select(`${summaryColumns},version,pages,learning_state`).eq("id", id).single();
  if (error) throw new Error("Could not open this course. Reload your library and try again.");
  const learning = learningStateSchema.safeParse(data.learning_state);
  if (data.learning_state !== null && !learning.success) throw new Error("This study kit could not be read.");
  return {
    ...data,
    pages: savedPagesSchema.safeParse(data.pages).data ?? null,
    learning: learning.success ? {
      ...learning.data,
      document: { ...learning.data.document, filePath: data.file_path ?? undefined },
    } : null,
  };
}

export async function addLibraryCourse(id: string, name: string, filePath: string, pages: DocumentPage[]) {
  const { error } = await client().from(table).insert({
    id, name, file_path: filePath, page_count: pages.length, pages: savedPages(pages),
  });
  // A retry may follow a response lost after the insert committed.
  if (error && error.code !== "23505") throw new Error("Could not save this course to your library. Try again.");
  return openLibraryCourse(id);
}

export class LibraryConflictError extends Error {
  constructor() {
    super("This course changed elsewhere. Reload it to use the latest saved version.");
  }
}

export async function updateLibraryCourse(id: string, version: number, changes: { learning?: LearningState; pages?: DocumentPage[] }) {
  const { data, error } = await client().from(table).update({
    ...(changes.learning ? { learning_state: changes.learning } : {}),
    version: version + 1,
    ...(changes.pages ? { pages: savedPages(changes.pages) } : {}),
  }).eq("id", id).eq("version", version).select("version").maybeSingle();
  if (error) throw new Error("Could not save your study kit or progress. Try again.");
  if (!data) throw new LibraryConflictError();
  return data.version as number;
}

export async function removeLibraryCourse(course: LibraryEntry) {
  if (course.file_path) {
    const { error } = await client().storage.from(courseFilesBucket).remove([course.file_path]);
    if (error) throw new Error("Could not delete the original file. Try again.");
  }
  const { error } = await client().from(table).delete().eq("id", course.id);
  if (error) throw new Error("Could not remove the library entry. Try again.");
}
