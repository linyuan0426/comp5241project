import type { FunPracticeMode, FunPracticeTask, TeamworkCase } from "./types";

export const funPracticeDescriptions: Record<FunPracticeMode, {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
}> = {
  intern: {
    eyebrow: "Role reversal",
    title: "Teach the AI intern",
    description: "Spot a confidently wrong explanation and help this intern recover.",
    badge: "Recommended demo",
  },
  teamwork: {
    eyebrow: "Decision lab",
    title: "Rescue the team",
    description: "A teammate has a very optimistic idea. Choose what happens next.",
    badge: "2 short cases",
  },
  roommate: {
    eyebrow: "Explain it simply",
    title: "Help your roommate",
    description: "They know every word separately. Make the concept click before tomorrow.",
    badge: "Quick explanation",
  },
};

const cacheTask: FunPracticeTask = {
  version: 1,
  id: "demo-intern-cache",
  mode: "intern",
  title: "Intern P's caching breakthrough",
  concept: "Cache freshness",
  roleName: "Intern P",
  opening: "I optimized the whole product. I put everything in the cache and never update it. Fast, stable, and permanently yesterday.",
  badLine: "I put everything in the cache and never update it.",
  criteria: [
    { id: "stale-data", label: "Explain that cached copies can become stale when the source changes." },
    { id: "invalidation", label: "Explain that the cache needs an update, expiry, or invalidation strategy." },
  ],
  correctExplanation:
    "A cache stores a copy to make reads faster. If the source changes while the copy never updates, users may see stale data. The app needs a freshness policy such as expiry or invalidation.",
  evidence:
    "Caching improves read performance by storing a copy. A cache is useful only when its freshness policy keeps that copy consistent enough for the product requirement.",
  transferQuestion: {
    question: "Product prices change once per minute. Which cache policy best matches the requirement?",
    options: [
      "Never refresh the cached prices",
      "Expire or invalidate the cached price when it can become outdated",
      "Store the price as a user's password",
    ],
    correctIndex: 1,
    explanation:
      "The freshness policy should match how often prices change and how much stale data the product can tolerate.",
  },
  sample: true,
};

const searchTask: FunPracticeTask = {
  version: 1,
  id: "demo-intern-search",
  mode: "intern",
  title: "Intern P discovers a race condition",
  concept: "Async response ordering",
  roleName: "Intern P",
  opening: "I show whichever search response arrives last. It arrived last, so it must know the latest query. That is just science.",
  badLine: "I show whichever search response arrives last.",
  criteria: [
    { id: "request-order", label: "Explain that a response belongs to the request that created it." },
    { id: "latest-query", label: "Explain how to ignore stale responses or otherwise keep results matched to the latest query." },
  ],
  correctExplanation:
    "Requests and responses can arrive in different orders. The UI should associate each response with its request and update results only when that request still represents the latest query.",
  evidence:
    "When several asynchronous requests overlap, completion order does not necessarily match send order. Consumers should check whether a response is still current before applying it.",
  transferQuestion: {
    question: "A student searches Monday availability, then quickly searches Friday. Monday returns last. What should the page display?",
    options: [
      "Monday results because they arrived last",
      "Friday results if Friday is still the latest query",
      "Both lists mixed together",
    ],
    correctIndex: 1,
    explanation:
      "Arrival order is not request identity. The displayed results must match the latest active query.",
  },
  sample: true,
};

const transactionTask: FunPracticeTask = {
  version: 1,
  id: "demo-intern-transaction",
  mode: "intern",
  title: "Intern P ships half a transaction",
  concept: "Atomic transactions",
  roleName: "Intern P",
  opening: "I saved the order, charged the card, and then updated inventory. The last step failed, but two out of three is still a passing grade, right?",
  badLine: "Two out of three is still a passing grade, right?",
  criteria: [
    { id: "transaction-atomicity", label: "Explain that related writes must succeed or fail as one atomic operation." },
    { id: "transaction-rollback", label: "Explain how a transaction rollback or equivalent recovery protects consistency." },
  ],
  correctExplanation:
    "A multi-step checkout should commit only when every required write succeeds. A transaction or compensating recovery prevents a charged payment from existing without the matching order and inventory update.",
  evidence:
    "Multiple related writes may fail partway through. Atomicity means the committed state includes either every required change or none of them.",
  transferQuestion: {
    question: "A payment succeeds but updating the seat reservation fails. What should happen to the payment?",
    options: [
      "Keep the payment and label the missing seat a rounding error",
      "Roll back or compensate so the learner is not charged for no seat",
      "Show a success page and let support discover the gap later",
    ],
    correctIndex: 1,
    explanation:
      "The checkout must not leave a committed charge without the seat the learner paid for.",
  },
  sample: true,
};

const passwordTask: FunPracticeTask = {
  version: 1,
  id: "demo-intern-password",
  mode: "intern",
  title: "Intern P's password support plan",
  concept: "Credential storage",
  roleName: "Intern P",
  opening: "I store passwords in plain text so support can read them back. Debugging has never been easier!",
  badLine: "I store passwords in plain text so support can read them back.",
  criteria: [
    { id: "no-plaintext", label: "Explain that applications should not store recoverable plaintext passwords." },
    { id: "hash-verify", label: "Explain salted one-way hashing and verification without recovering the original password." },
  ],
  correctExplanation:
    "Passwords should be processed with a slow, salted, one-way hash. Login verifies a candidate password against the stored hash, and support should use reset flows instead of reading the original password.",
  evidence:
    "Authentication systems store password verifiers rather than recoverable passwords. A reset flow changes the credential without exposing the old value.",
  transferQuestion: {
    question: "Support needs to help a learner who forgot a password. What should the product do?",
    options: [
      "Email the old password from the database",
      "Ask support to read the password aloud",
      "Offer a secure reset flow and never recover the original password",
    ],
    correctIndex: 2,
    explanation:
      "The original password should remain unrecoverable, even to support.",
  },
  sample: true,
};

const roommateTaskSamples: FunPracticeTask[] = [
  {
    ...cacheTask,
    id: "demo-roommate-cache",
    mode: "roommate",
    title: "My roommate meets the cache",
    concept: "Cache freshness",
    roleName: "Roommate R",
    opening: "Cache is like a fridge, right? If I put a snack there, it stays fresh forever. Please tell me the database is the supermarket.",
    criteria: [
      { id: "purpose", label: "Explain that caching stores a copy to speed up repeated access." },
      { id: "boundary", label: "Explain that freshness and invalidation matter, so the fridge analogy has limits." },
    ],
    sample: true,
  },
  {
    ...searchTask,
    id: "demo-roommate-search",
    mode: "roommate",
    title: "Roommate R asks one last question",
    concept: "Async response ordering",
    roleName: "Roommate R",
    opening: "Wait. If I send message A and then B, B will always come back first? My chat seems to disagree with my intuition.",
    criteria: [
      { id: "independence", label: "Explain that asynchronous work can finish in a different order from when it started." },
      { id: "identity", label: "Explain how to use request identity or cancellation to avoid showing a stale result." },
    ],
    sample: true,
  },
  {
    ...transactionTask,
    id: "demo-roommate-transaction",
    mode: "roommate",
    title: "Roommate R splits the exam answer",
    concept: "Atomic transactions",
    roleName: "Roommate R",
    opening: "If step one succeeds and step two fails, why can't we just keep the successful half? Half an answer is still an answer.",
    criteria: [
      { id: "transaction-atomicity", label: "Explain why related changes must commit together." },
      { id: "transaction-rollback", label: "Explain that rollback or compensation removes the incomplete result." },
    ],
    sample: true,
  },
  {
    ...passwordTask,
    id: "demo-roommate-password",
    mode: "roommate",
    title: "Roommate R checks the password",
    concept: "Credential storage",
    roleName: "Roommate R",
    opening: "Why can't support just look up my password and tell me? It is my account, so it should be my password to read.",
    criteria: [
      { id: "no-plaintext", label: "Explain that passwords should not be recoverable by support." },
      { id: "hash-verify", label: "Explain secure reset and hash verification." },
    ],
    sample: true,
  },
];

export const internTasks = [cacheTask, searchTask, transactionTask, passwordTask];
export const roommateTasks = [
  { title: "Cache freshness", task: roommateTaskSamples[0] },
  { title: "Async response ordering", task: roommateTaskSamples[1] },
  { title: "Atomic transactions", task: roommateTaskSamples[2] },
  { title: "Credential storage", task: roommateTaskSamples[3] },
];

export const teamworkCases: TeamworkCase[] = [
  {
    id: "team-cache",
    title: "Forever Fresh Pricing",
    concept: "Cache freshness",
    opening: "Your teammate committed a cache that never refreshes. The demo is fast. Customers are seeing last month's sale price.",
    steps: [
      {
        title: "What would you check first?",
        situation: "The database has the correct price, but the product page keeps showing the old one.",
        options: [
          { id: "old-copy", label: "Compare the source price with the cached copy and its timestamp", outcome: "The source changed while the cached copy remained valid. You found a freshness failure.", advances: true },
          { id: "font", label: "Check whether the old price uses a deprecated font", outcome: "The font renders, but changing it will not change the stale price.", advances: false },
          { id: "favicon", label: "Ask the browser to draw a newer favicon", outcome: "The favicon is excellent. The cached price is still stale.", advances: false },
        ],
      },
      {
        title: "Which fix respects the requirement?",
        situation: "Prices change once per minute. The service must stay fast while tolerating at most one minute of stale data.",
        options: [
          { id: "expire", label: "Use a one-minute expiry or targeted invalidation", outcome: "The cache stays useful while its freshness policy matches the product requirement.", advances: true },
          { id: "never", label: "Keep the copy forever and call it historical accuracy", outcome: "The result is still wrong. Calling stale data historical does not meet the requirement.", advances: false },
          { id: "db-only", label: "Remove caching and query the database for every request", outcome: "This protects freshness by giving up the speed requirement. It is a possible fallback, but not the best fit for the stated trade-off.", advances: false },
        ],
      },
    ],
    reflectionPrompt: "Why is refreshing every request not the only correct answer here?",
    task: {
      ...cacheTask,
      id: "demo-team-cache",
      mode: "teamwork",
      title: "Rescuing the checkout team",
      concept: "Cache freshness",
      roleName: "Team Lead",
      opening: "The team chose a cache that never expires. Explain the failure and the freshness trade-off before shipping it.",
      sample: true,
    },
  },
  {
    id: "team-search",
    title: "Latest Arrival Wins",
    concept: "Async response ordering",
    opening: "Your teammate renders whichever search response arrives last. The search input says 'catalog'. The results say 'cats'.",
    steps: [
      {
        title: "What evidence would expose the bug?",
        situation: "The 'cat' request starts first, and the 'catalog' request starts second. The first response takes longer.",
        options: [
          { id: "delay", label: "Delay the first response so it arrives after the second", outcome: "The stale 'cat' response overwrites the current results. You reproduced the race condition.", advances: true },
          { id: "zoom", label: "Zoom the page to 110 percent", outcome: "The layout changes. The response ordering and result mismatch remain.", advances: false },
          { id: "reload", label: "Reload until the right result appears", outcome: "A lucky reload is not evidence that the race condition is fixed.", advances: false },
        ],
      },
      {
        title: "How should the UI handle responses?",
        situation: "The product requirement is that visible results always match the latest query.",
        options: [
          { id: "current", label: "Apply a response only if its request is still the latest query", outcome: "A stale response can arrive late without replacing the current results.", advances: true },
          { id: "last", label: "Apply responses in arrival order", outcome: "This preserves the exact bug. Arrival order is not query freshness.", advances: false },
          { id: "longest", label: "Show whichever result list is longest", outcome: "List length does not prove which query the response belongs to.", advances: false },
        ],
      },
    ],
    reflectionPrompt: "Why does debouncing improve the situation but not prove every stale response is safe?",
    task: {
      ...searchTask,
      id: "demo-team-search",
      mode: "teamwork",
      title: "Rescuing the search team",
      concept: "Async response ordering",
      roleName: "Team Lead",
      opening: "The search team believes the last response is the newest response. Help them connect request identity to the visible state.",
      sample: true,
    },
  },
  {
    id: "team-transaction",
    title: "The Three-Step Checkout Disaster",
    concept: "Atomic transactions",
    opening: "Checkout writes an order, a payment, and an inventory reservation. The last write failed, but the first two are still in the database.",
    steps: [
      {
        title: "What evidence would you inspect first?",
        situation: "The learner sees a payment error, but the payment service accepted the charge.",
        options: [
          { id: "partial-state", label: "Compare all three records after the failure to find the partial commit", outcome: "The payment exists, the order exists, and inventory was never reserved. You found an inconsistent committed state.", advances: true },
          { id: "button-color", label: "Change the checkout button from blue to green", outcome: "The new color looks optimistic. The database still contains a charge without a seat.", advances: false },
          { id: "error-toast", label: "Make the error message say “probably fine”", outcome: "The message is friendlier, but the learner has still been charged.", advances: false },
        ],
      },
      {
        title: "Which repair makes the checkout consistent?",
        situation: "The requirement is that either the payment and seat both commit, or neither is saved.",
        options: [
          { id: "transaction", label: "Run the required writes in one transaction and roll back on failure", outcome: "Related writes now commit together or fail together, so no charge survives without a seat.", advances: true },
          { id: "retry", label: "Automatically retry the last step without checking earlier writes", outcome: "Retrying may duplicate data while leaving the initial partial state unresolved.", advances: false },
          { id: "hide", label: "Hide failed records from the admin page", outcome: "The partial state still exists and can corrupt payments and inventory.", advances: false },
        ],
      },
    ],
    reflectionPrompt: "Why is an automatic retry unsafe without first defining the transaction boundary?",
    task: {
      ...transactionTask,
      id: "demo-team-transaction",
      mode: "teamwork",
      title: "Rescuing the checkout transaction",
      concept: "Atomic transactions",
      roleName: "Team Lead",
      opening: "The checkout team treats three related writes as three independent successes. Explain why that leaves a dangerous partial state.",
      sample: true,
    },
  },
  {
    id: "team-password",
    title: "The Support Inbox Password",
    concept: "Credential storage",
    opening: "The backend team added a support endpoint that returns plaintext passwords. They say it saves five minutes per ticket.",
    steps: [
      {
        title: "What is the first risk to verify?",
        situation: "The reset flow already works, but support occasionally reads passwords from the database.",
        options: [
          { id: "audit", label: "Audit storage, logs, and support access for plaintext credentials", outcome: "Plaintext passwords are present in the database and one debug log. You identified the exposure path.", advances: true },
          { id: "label", label: "Rename the support button to “Secure Lookup”", outcome: "The label changed. The system still exposes the original password.", advances: false },
          { id: "faster", label: "Add a loading spinner to make the lookup feel safer", outcome: "A spinner does not protect a credential that can be read directly.", advances: false },
        ],
      },
      {
        title: "Which change should the team ship?",
        situation: "Support still needs to help locked-out learners.",
        options: [
          { id: "hash-reset", label: "Store salted one-way hashes and use a secure reset flow", outcome: "Support can help without recovering or seeing the original password.", advances: true },
          { id: "encrypt", label: "Keep reversible encryption and give every support agent the key", outcome: "Reversible storage still creates a path to recover passwords and multiplies the access risk.", advances: false },
          { id: "client", label: "Encrypt passwords only in the browser with a public algorithm", outcome: "The server still needs a safe verifier, and improvised client storage does not solve credential exposure.", advances: false },
        ],
      },
    ],
    reflectionPrompt: "Why does a secure reset flow beat letting support recover the original password?",
    task: {
      ...passwordTask,
      id: "demo-team-password",
      mode: "teamwork",
      title: "Rescuing the support credentials",
      concept: "Credential storage",
      roleName: "Team Lead",
      opening: "The support team can read every learner's password. Explain why faster tickets are not worth keeping that access.",
      sample: true,
    },
  },
];

export function tasksForMode(mode: FunPracticeMode) {
  if (mode === "intern") return internTasks;
  if (mode === "roommate") return roommateTasks.map(({ task }) => task);
  return teamworkCases.map(({ task }) => task);
}
