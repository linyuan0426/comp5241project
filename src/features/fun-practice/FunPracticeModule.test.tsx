import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import FunPracticeModule from "./FunPracticeModule";
import {
  funPracticeDescriptions,
  internTasks,
  roommateTasks,
  teamworkCases,
} from "./data";
import type { FunPracticeTask } from "./types";

const answerSignals: Record<string, string> = {
  "stale-data": "stale old data",
  invalidation: "invalidate and refresh",
  "request-order": "request and response order",
  "latest-query": "latest current request",
  purpose: "copy speeds repeated access",
  boundary: "freshness invalidate",
  independence: "different order asynchronous",
  identity: "request id latest cancel",
  "transaction-atomicity": "transaction atomic together",
  "transaction-rollback": "rollback incomplete changes",
  "no-plaintext": "plaintext secure reset",
  "hash-verify": "salted one-way hash verify",
};

function completeAnswer(task: FunPracticeTask) {
  return task.criteria.map(({ id }) => answerSignals[id]).join(". ");
}

describe("fun practice demos", () => {
  beforeEach(() => localStorage.clear());

  it("turns a partial correction into a targeted follow-up and restores it", async () => {
    const user = userEvent.setup();
    const first = render(<FunPracticeModule canUseLive={false} />);

    await user.click(
      screen.getByRole("button", { name: /Take the challenge: Intern P's caching breakthrough/i }),
    );
    const explanation = screen.getByRole("textbox", { name: "Your explanation" });
    await user.click(screen.getByRole("button", { name: /Quote$/i }));
    expect((explanation as HTMLTextAreaElement).value).toContain("I put everything in the cache");
    expect(screen.getByText(/Replying to Intern P/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "React with 😂" }));
    expect(screen.getByRole("button", { name: "Remove reaction 😂" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Nudge AI" }));
    expect(screen.getByText(/You nudged Intern P's keyboard/i)).toBeInTheDocument();
    await user.clear(explanation);
    await user.type(
      explanation,
      "Never updating the cache means users see stale old data.",
    );
    await user.click(screen.getByRole("button", { name: "Send to AI" }));

    expect(
      screen.getByRole("heading", { name: /What should the app do about this missing point/i }),
    ).toBeInTheDocument();
    first.unmount();
    render(<FunPracticeModule canUseLive={false} />);
    expect(screen.getByText(/Never updating the cache means users see stale old data/i)).toBeInTheDocument();
  });

  it("completes the team incident and asks for reasoning", async () => {
    const user = userEvent.setup();
    render(<FunPracticeModule canUseLive={false} />);

    await user.click(screen.getByRole("tab", { name: /Rescue the team/i }));
    await user.click(
      screen.getByRole("button", { name: /Enter the incident: Forever Fresh Pricing/i }),
    );
    await user.click(screen.getByRole("button", { name: /Compare the source price/i }));
    await user.click(screen.getByRole("button", { name: /Next decision/i }));
    await user.click(screen.getByRole("button", { name: /Use a one-minute expiry/i }));
    await user.click(screen.getByRole("button", { name: /Explain the trade-off/i }));

    await user.type(
      screen.getByRole("textbox", { name: "Explain your team decision" }),
      "The source changes while the cached copy stays old. A one-minute expiry keeps data fresh enough without refreshing every request.",
    );
    await user.click(screen.getByRole("button", { name: "Submit explanation" }));

    expect(screen.getByText("Teaching complete")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Product prices change once per minute/i }),
    ).toBeInTheDocument();
  });

  it("lets the learner retry a partial team explanation", async () => {
    const user = userEvent.setup();
    render(<FunPracticeModule canUseLive={false} />);

    await user.click(screen.getByRole("tab", { name: /Rescue the team/i }));
    await user.click(
      screen.getByRole("button", { name: /Enter the incident: Forever Fresh Pricing/i }),
    );
    await user.click(screen.getByRole("button", { name: /Compare the source price/i }));
    await user.click(screen.getByRole("button", { name: /Next decision/i }));
    await user.click(screen.getByRole("button", { name: /Use a one-minute expiry/i }));
    await user.click(screen.getByRole("button", { name: /Explain the trade-off/i }));

    const explanation = screen.getByRole("textbox", { name: "Explain your team decision" });
    await user.type(
      explanation,
      "A one-minute expiry keeps the cached copy from staying stale.",
    );
    await user.click(screen.getByRole("button", { name: "Submit explanation" }));

    expect(screen.getByText("One more round")).toBeInTheDocument();
    expect(explanation).toBeEnabled();

    await user.type(
      explanation,
      "The source changes while the cached copy stays old. A one-minute expiry keeps data fresh enough without refreshing every request.",
    );
    expect(screen.getByRole("button", { name: "Submit explanation" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Submit explanation" }));

    expect(screen.getByText("Teaching complete")).toBeInTheDocument();
  });

  it("uses the selected case rubric for a later team incident", async () => {
    const user = userEvent.setup();
    render(<FunPracticeModule canUseLive={false} />);

    await user.click(screen.getByRole("tab", { name: /Rescue the team/i }));
    await user.click(
      screen.getByRole("button", { name: /Enter the incident: The Three-Step Checkout Disaster/i }),
    );
    await user.click(screen.getByRole("button", { name: /Compare all three records/i }));
    await user.click(screen.getByRole("button", { name: /Next decision/i }));
    await user.click(screen.getByRole("button", { name: /Run the required writes/i }));
    await user.click(screen.getByRole("button", { name: /Explain the trade-off/i }));
    await user.type(
      screen.getByRole("textbox", { name: "Explain your team decision" }),
      "Keep the related writes in one transaction and roll back if any step fails.",
    );
    await user.click(screen.getByRole("button", { name: "Submit explanation" }));

    expect(screen.getByText("Teaching complete")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /A payment succeeds/i }),
    ).toBeInTheDocument();
  });
});

const singleChatStories = [
  ...internTasks.map((task) => ({ mode: "intern" as const, task })),
  ...roommateTasks.map(({ task }) => ({ mode: "roommate" as const, task })),
];

describe.each(singleChatStories)("complete story: $task.title", ({ mode, task }) => {
  beforeEach(() => localStorage.clear());

  it("opens, evaluates the explanation, and completes the story", async () => {
    const user = userEvent.setup();
    render(<FunPracticeModule canUseLive={false} />);

    if (mode !== "intern") {
      await user.click(
        screen.getByRole("tab", { name: funPracticeDescriptions[mode].title }),
      );
    }
    await user.click(
      screen.getByRole("button", { name: `Take the challenge: ${task.title}` }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Your explanation" }),
      completeAnswer(task),
    );
    await user.click(screen.getByRole("button", { name: "Send to AI" }));

    expect(screen.getByText("Teaching complete")).toBeInTheDocument();
  });
});

describe.each(teamworkCases)("complete team story: $title", (incident) => {
  beforeEach(() => localStorage.clear());

  it("uses both poll steps and completes the selected incident", async () => {
    const user = userEvent.setup();
    render(<FunPracticeModule canUseLive={false} />);

    await user.click(
      screen.getByRole("tab", { name: funPracticeDescriptions.teamwork.title }),
    );
    await user.click(
      screen.getByRole("button", { name: `Enter the incident: ${incident.title}` }),
    );

    for (const [index, step] of incident.steps.entries()) {
      const action = step.options.find(({ advances }) => advances);
      expect(action).toBeDefined();
      await user.click(screen.getByRole("button", { name: action!.label }));
      await user.click(
        screen.getByRole("button", {
          name: index === 0 ? "Next decision" : "Explain the trade-off",
        }),
      );
    }

    await user.type(
      screen.getByRole("textbox", { name: "Explain your team decision" }),
      completeAnswer(incident.task),
    );
    await user.click(screen.getByRole("button", { name: "Submit explanation" }));
    expect(screen.getByText("Teaching complete")).toBeInTheDocument();
  });
});
