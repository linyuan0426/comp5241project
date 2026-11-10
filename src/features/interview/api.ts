import { callAi } from "../../lib/ai";
import type { InterviewReport, InterviewSession } from "./types";

export function generateInterviewFollowUp(session: InterviewSession, answer: string) {
  return callAi<string>("interview-follow-up", { session, answer });
}

export function generateInterviewReport(session: InterviewSession) {
  return callAi<InterviewReport>("interview-report", { session });
}
