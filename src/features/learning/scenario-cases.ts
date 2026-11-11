export const scenarioIds = ["discount", "booking", "search", "merge"] as const;
export type ScenarioId = (typeof scenarioIds)[number];

type Choice = { label: string; feedback: string; advances: boolean };

type ScenarioStep = {
  title: string;
  situation: string;
  hint: string;
  code?: string;
  choices: readonly [Choice, Choice, Choice];
};

type ScenarioCase = {
  title: string;
  interviewTitle: string;
  description: string;
  completion: string;
  nextLabel: string;
  steps: readonly [ScenarioStep, ScenarioStep];
  followUps: readonly [string, string];
  signals: readonly string[];
};

const discountSteps = [
  {
    title: "Investigate the negative total",
    situation: "A student buys a workshop ticket for $10 and enters a $15 discount. The checkout displays −$5. What would you check first?",
    hint: "Compare a normal purchase with a purchase whose discount exceeds the price.",
    choices: [
      {
        label: "Try a $5 discount and then a $15 discount",
        feedback: "The $5 discount gives $5. The $15 discount gives −$5. You isolated the failure to discounts larger than the price.",
        advances: true,
      },
      {
        label: "Try a ticket without a discount",
        feedback: "The total stays at $10. That verifies the normal path, but gives no evidence about the reported negative total.",
        advances: false,
      },
      {
        label: "Check the label on the checkout button",
        feedback: "The label is correct. The negative amount still appears, so inspect the values used in the total calculation.",
        advances: false,
      },
    ],
  },
  {
    title: "Review the AI’s suggested fix",
    situation: "The AI proposes making every result positive. The requirement is that an oversized discount makes the ticket free.",
    code: "return Math.abs(price - discount);",
    hint: "What does the AI’s formula return for a $10 ticket with a $15 discount? What total does the requirement expect?",
    choices: [
      {
        label: "Accept the patch because it removes negative totals",
        feedback: "Math.abs turns −$5 into $5. The ticket would still cost $5 even though the discount should make it free.",
        advances: false,
      },
      {
        label: "Clamp the total at zero and test discounts below, at, and above the price",
        feedback: "Math.max(0, price - discount) gives $5, $0, and $0 for $5, $10, and $15 discounts. All three cases match the requirement.",
        advances: true,
      },
      {
        label: "Keep the calculation and hide the minus sign",
        feedback: "The screen would display $5 while the calculation still returns −$5. Formatting does not fix the total.",
        advances: false,
      },
    ],
  },
] as const satisfies ScenarioCase["steps"];

export const scenarioCases: Record<ScenarioId, ScenarioCase> = {
  discount: {
    title: "Checkout discount",
    interviewTitle: "the checkout discount challenge",
    description: "Investigate a checkout bug and decide whether to accept the AI’s fix.",
    completion: "You isolated the boundary case and verified the proposed fix against the requirement.",
    nextLabel: "Continue to code review",
    steps: discountSteps,
    followUps: [
      "Why would making every total positive fail to satisfy the discount requirement?",
      "Which inputs would you use immediately below, at, and above the price, and what totals would you expect?",
    ],
    signals: ["price", "discount", "zero", "boundary"],
  },
  booking: {
    title: "Duplicate workshop booking",
    interviewTitle: "the duplicate workshop booking challenge",
    description: "Find out why a retry reserves two seats, then pick a fix that keeps retries safe.",
    completion: "You reproduced a duplicate booking and verified that a retry can return the original booking.",
    nextLabel: "Continue to retry design",
    followUps: [
      "Why should a retry reuse the same request ID while a new booking uses a different one?",
      "If two copies of the request arrive at the same time, what would you check in the database?",
    ],
    signals: ["request", "retry", "duplicate", "booking", "database", "unique"],
    steps: [
      {
        title: "Trace the second booking",
        situation: "A student reserves a seat. The app times out and retries, then shows two confirmations. What evidence would tell you whether two seats were actually reserved?",
        hint: "Compare what the screen shows with what the booking service recorded.",
        choices: [
          { label: "Check both requests and count the booking records", feedback: "The first request saved a booking before timing out. The retry saved a second booking. Two seats were actually reserved.", advances: true },
          { label: "Reload the page and count the confirmation messages", feedback: "The messages disappear on refresh, but the two saved bookings still reserve seats.", advances: false },
          { label: "Check the response from a single successful request", feedback: "One successful response shows the normal path. It leaves out the timed-out request that might already have saved a booking.", advances: false },
        ],
      },
      {
        title: "Make a retry safe",
        situation: "An AI suggestion is to disable the booking button after a click. The app can still retry automatically if a response is lost. Which change addresses that behavior?",
        hint: "The booking service needs a way to tell a repeat request from a new booking.",
        choices: [
          { label: "Disable the button and keep the booking service as it is", feedback: "This prevents repeated clicks. An automatic retry can still create a second booking.", advances: false },
          { label: "Stop showing confirmations for retried requests", feedback: "The second confirmation disappears, but the booking service still reserves two seats.", advances: false },
          { label: "Reuse a request ID on retry and enforce its uniqueness when saving", feedback: "A retry with the same ID returns the original booking, even if requests overlap. A new request ID can still create a separate booking.", advances: true },
        ],
      },
    ],
  },
  search: {
    title: "Search results out of order",
    interviewTitle: "the search results challenge",
    description: "Reproduce a search that shows results for an older query and decide which response to display.",
    completion: "You reproduced the response order and kept the results matched to the latest query.",
    nextLabel: "Continue to response handling",
    followUps: [
      "Why can an older response arrive last even when the requests were sent in order?",
      "How would you make the older response arrive last in a repeatable test?",
    ],
    signals: ["query", "response", "order", "latest", "request", "delay"],
    steps: [
      {
        title: "Reproduce the mismatched results",
        situation: "A student types ‘cat’, then quickly types ‘catalog’. The input says ‘catalog’, but the results sometimes show cats. What would you test?",
        hint: "The order in which responses arrive may differ from the order in which requests were sent.",
        choices: [
          { label: "Run the ‘catalog’ search alone with a fast connection", feedback: "The correct results appear, but this test never has two requests in flight.", advances: false },
          { label: "Delay the ‘cat’ response until after the ‘catalog’ response", feedback: "‘Catalog’ results appear first. When ‘cat’ arrives later, it overwrites them. You can now reproduce the bug on demand.", advances: true },
          { label: "Check whether both queries fit in the input field", feedback: "Both queries display correctly. The mismatch is between the input and the results returned by the requests.", advances: false },
        ],
      },
      {
        title: "Keep results matched to the query",
        situation: "The AI suggests delaying requests until typing stops. That reduces the number of requests, but an earlier request may still be running. What should the app do when a response arrives?",
        hint: "Decide which query a response belongs to before updating the list.",
        choices: [
          { label: "Show results only if the response belongs to the latest request", feedback: "The ‘catalog’ response updates the results. The delayed ‘cat’ response is ignored, so the results still match the input.", advances: true },
          { label: "Show whichever response arrives last", feedback: "The delayed ‘cat’ response still wins and replaces the results for ‘catalog’.", advances: false },
          { label: "Always display the longer list of results", feedback: "A longer list can still belong to the older query. List size gives no evidence about which request is current.", advances: false },
        ],
      },
    ],
  },
  merge: {
    title: "Git merge conflict",
    interviewTitle: "the Git merge conflict challenge",
    description: "Resolve two changes to the same button while preserving both teammates’ requirements.",
    completion: "You combined both changes and verified that the button still meets both requirements.",
    nextLabel: "Continue to verification",
    followUps: [
      "How would you decide which parts to keep if both changes touched the same line?",
      "What would a test check to prove both requirements still hold after the merge?",
    ],
    signals: ["merge", "conflict", "label", "disabled", "button", "diff"],
    steps: [
      {
        title: "Review the two changes",
        situation: "Two teammates edit the same registration button. One changes its label to ‘Register now’. The other disables it when the event is full. Git reports a conflict. Both requirements are approved. How would you resolve it?",
        hint: "Check what each change does before deciding how the final button should behave.",
        choices: [
          { label: "Keep the change from the newer commit", feedback: "That keeps one requirement. The timestamp gives you no reason to drop the other change.", advances: false },
          { label: "Keep both versions as separate buttons", feedback: "The page now offers two registration buttons. One of them can still be active when the event is full.", advances: false },
          { label: "Combine the label and disabled condition on one button", feedback: "One button says ‘Register now’ and becomes disabled when the event is full. Both requirements survive the merge.", advances: true },
        ],
      },
      {
        title: "Verify the merged behavior",
        situation: "The conflict markers are gone and the page renders. What should you verify before committing the merge?",
        hint: "A clean merge and a successful build do not tell you whether the button changes state correctly.",
        choices: [
          { label: "Check that the label is correct with seats available", feedback: "The label is correct in the open state. This misses the behavior when the event is full.", advances: false },
          { label: "Review the diff and test the label and click behavior with seats available and full", feedback: "The diff preserves both changes. The button has the expected label and works with seats available, then blocks registration when full.", advances: true },
          { label: "Check only that Git no longer lists unmerged files", feedback: "Git can confirm that the conflict is marked resolved. It cannot confirm what the button does.", advances: false },
        ],
      },
    ],
  },
};
