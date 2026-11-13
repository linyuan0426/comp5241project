import { z } from "zod";
import { supabase } from "../../lib/supabase";

export type AccountRole = "student" | "teacher";

const teacherCourseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  pageCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  hasStudyKit: z.boolean(),
  currentStep: z.enum(["plan", "quest", "quiz", "progress"]).nullable(),
  planCompleted: z.number().int().nonnegative(),
  planTotal: z.number().int().nonnegative(),
  quizAnswered: z.number().int().nonnegative(),
  quizCorrect: z.number().int().nonnegative(),
  quizTotal: z.number().int().nonnegative(),
  questSolved: z.number().int().nonnegative(),
  questTotal: z.number().int().nonnegative(),
});

const teacherStudentSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
  joinedAt: z.string(),
  courses: z.array(teacherCourseSchema),
});

const teacherDashboardSchema = z.array(teacherStudentSchema);

export type TeacherCourse = z.infer<typeof teacherCourseSchema>;
export type TeacherStudent = z.infer<typeof teacherStudentSchema>;

function client() {
  if (!supabase) throw new Error("Teacher access is unavailable until Supabase is configured.");
  return supabase;
}

export async function loadAccountRole(): Promise<AccountRole> {
  const { data, error } = await client().rpc("pathwise_my_role");
  if (error) throw new Error("Could not verify this account’s role.");
  return data === "teacher" ? "teacher" : "student";
}

export async function findTeacherStudent(identifier: string): Promise<TeacherStudent[]> {
  const normalized = identifier.trim();
  if (!normalized) return [];
  const { data, error } = await client().rpc("pathwise_teacher_dashboard", {
    p_identifier: normalized,
  });
  if (error) throw new Error("Could not load this student’s learning data.");
  const parsed = teacherDashboardSchema.safeParse(data);
  if (!parsed.success) throw new Error("The teacher dashboard returned an unexpected data format.");
  return parsed.data;
}
