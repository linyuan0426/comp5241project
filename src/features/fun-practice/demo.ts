import type {
  FunPracticeTask,
  PracticeReview,
  TeamworkCase,
} from "./types";

const conceptSignals: Record<string, string[]> = {
  "stale-data": ["stale", "old", "outdat", "过期", "旧", "不一致"],
  invalidation: ["invalid", "expire", "refresh", "update", "过期", "刷新", "更新", "失效"],
  "request-order": ["request", "response", "order", "arrive", "请求", "响应", "顺序", "先后"],
  "latest-query": ["latest", "current", "ignore", "cancel", "最新", "当前", "忽略", "取消"],
  purpose: ["copy", "speed", "fast", "repeat", "复制", "加速", "重复"],
  boundary: ["fresh", "stale", "invalid", "expire", "新鲜", "过期", "失效", "更新"],
  independence: ["different order", "not always", "independent", "不一定", "不同顺序", "并行"],
  identity: ["request id", "identity", "cancel", "latest", "请求标识", "取消", "最新"],
  "transaction-atomicity": [
    "transaction", "atomic", "all or nothing", "commit together",
    "事务", "原子", "一起成功", "一起失败",
  ],
  "transaction-rollback": [
    "rollback", "roll back", "compensat", "undo", "revert",
    "回滚", "撤销", "补偿",
  ],
  "no-plaintext": [
    "plaintext", "recoverable", "read the password", "reset",
    "明文", "可恢复", "重置",
  ],
  "hash-verify": [
    "hash", "salted", "one-way", "verify", "verify the password",
    "哈希", "加盐", "单向", "验证",
  ],
};

function matchedCriteria(task: FunPracticeTask, answer: string) {
  const normalized = answer.toLowerCase();
  return task.criteria
    .filter(({ id }) => (conceptSignals[id] ?? []).some((signal) => normalized.includes(signal)))
    .map(({ id }) => id);
}

export function reviewDemoTask(task: FunPracticeTask, answer: string): PracticeReview {
  const satisfiedCriterionIds = matchedCriteria(task, answer);
  const missingCriterionIds = task.criteria
    .map(({ id }) => id)
    .filter((id) => !satisfiedCriterionIds.includes(id));
  const complete = missingCriterionIds.length === 0;

  if (complete) {
    return {
      status: "complete",
      satisfiedCriterionIds,
      missingCriterionIds,
      feedback: "You corrected the misunderstanding and connected it to the decision the app should make.",
      followUp: "",
      revisedMessage: task.correctExplanation,
    };
  }

  const missing = task.criteria.find(({ id }) => id === missingCriterionIds[0]);
  return {
    status: "needs-work",
    satisfiedCriterionIds,
    missingCriterionIds,
    feedback: satisfiedCriterionIds.length
      ? "That covers part of the idea. The explanation still needs one concrete step."
      : "The conclusion may be right, but the explanation needs a reason the team can use.",
    followUp: missing
      ? `What should the app do about this missing point: ${missing.label.toLowerCase()}`
      : "What should the app do when the underlying information changes?",
    revisedMessage: "I understand the issue better now. I still need the missing implementation detail.",
  };
}

export function demoTeamworkReview(
  teamworkCase: TeamworkCase,
  answer: string,
  advancedBoth: boolean,
): PracticeReview {
  const review = reviewDemoTask(teamworkCase.task, answer);
  if (advancedBoth && review.status === "complete") {
    return {
      status: "complete",
      satisfiedCriterionIds: teamworkCase.task.criteria.map(({ id }) => id),
      missingCriterionIds: [],
      feedback: "Your decision matches the requirement, and your explanation names a real trade-off.",
      followUp: "",
      revisedMessage: teamworkCase.task.correctExplanation,
    };
  }
  return review;
}
