import type { LearningBundle, LearningState, QuizQuestion } from "../types";

export function getPlanProgress(bundle: LearningBundle) {
  const tasks = bundle.plan.flatMap((stage) => stage.tasks);
  const completed = tasks.filter((task) => task.completed).length;

  return {
    completed,
    total: tasks.length,
    percent: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
  };
}

export function getQuizStats(questions: QuizQuestion[]) {
  const answered = questions.filter((question) => question.selectedIndex !== undefined);
  const correct = answered.filter(
    (question) => question.selectedIndex === question.answerIndex,
  ).length;

  return {
    answered: answered.length,
    correct,
    incorrect: answered.length - correct,
    total: questions.length,
    percent:
      questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100),
  };
}

export function getOverallProgress(state: LearningState) {
  const plan = getPlanProgress(state.bundle);
  const quiz = getQuizStats(state.bundle.quiz);
  const quest = state.bundle.quest;
  const practiced = quest ? (state.questProgress?.filter((entry) => entry.solved).length ?? 0) : quiz.answered;
  const completed = plan.completed + practiced;
  const total = plan.total + (quest?.rooms.length ?? quiz.total);

  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function getNextQuestionIndex(questions: QuizQuestion[]) {
  return questions.findIndex((question) => question.selectedIndex === undefined);
}
