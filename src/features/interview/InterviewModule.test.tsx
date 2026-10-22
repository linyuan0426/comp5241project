import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeInterviewReport } from "../../test/fixtures";
import InterviewModule from "./InterviewModule";
import { INTERVIEW_QUESTIONS } from "./questions";
import { INTERVIEW_STORAGE_KEY } from "./storage";

const { followUpMock, reportMock } = vi.hoisted(() => ({
  followUpMock: vi.fn(),
  reportMock: vi.fn(),
}));

vi.mock("./api", () => ({
  generateInterviewFollowUp: followUpMock,
  generateInterviewReport: reportMock,
}));

const longAnswer =
  "I would state my approach, explain correctness and complexity, test edge cases, and discuss the main tradeoff.";

describe("interview module", () => {
  beforeEach(() => {
    followUpMock.mockReset();
    reportMock.mockReset();
    followUpMock
      .mockResolvedValueOnce("Which failure case would you inspect first?")
      .mockResolvedValueOnce("How would you isolate the case-normalization bug?")
      .mockResolvedValueOnce("How would you resolve concurrent progress edits?")
      .mockResolvedValueOnce("What would you tell the product owner?");
    reportMock.mockResolvedValue(makeInterviewReport());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("completes, persists, and restarts the offline Demo interview", async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <InterviewModule apiKey="" onRequestApiKey={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /start demo interview/i }));
    expect(
      screen.getByText(/follow-ups and scores are simulated locally/i),
    ).toBeInTheDocument();

    for (let index = 0; index < INTERVIEW_QUESTIONS.length; index += 1) {
      await user.type(screen.getByLabelText("Your answer"), longAnswer);
      await user.click(screen.getByRole("button", { name: "Send answer" }));
      expect(
        await screen.findByText(INTERVIEW_QUESTIONS[index].demoFollowUp),
      ).toBeInTheDocument();

      await user.type(screen.getByLabelText("Answer the follow-up"), longAnswer);
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    expect(
      await screen.findByRole("heading", {
        name: "Your learning report is ready.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/formative practice feedback/i)).toBeInTheDocument();
    expect(localStorage.getItem(INTERVIEW_STORAGE_KEY)).toContain(
      '"mode":"demo"',
    );
    expect(followUpMock).not.toHaveBeenCalled();
    expect(reportMock).not.toHaveBeenCalled();

    firstRender.unmount();
    render(<InterviewModule apiKey="" onRequestApiKey={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Your learning report is ready." }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /practice again/i }));
    expect(
      screen.getByRole("heading", { name: /practice the thinking/i }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(INTERVIEW_STORAGE_KEY)).toBeNull();
  });

  it("completes a live interview with four follow-ups and an AI report", async () => {
    const user = userEvent.setup();
    render(<InterviewModule apiKey="sk-live" onRequestApiKey={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /start live interview/i }));

    for (let index = 0; index < INTERVIEW_QUESTIONS.length; index += 1) {
      await user.type(screen.getByLabelText("Your answer"), longAnswer);
      await user.keyboard("{Enter}");
      const followUp = [
        "Which failure case would you inspect first?",
        "How would you isolate the case-normalization bug?",
        "How would you resolve concurrent progress edits?",
        "What would you tell the product owner?",
      ][index];
      expect(await screen.findByText(followUp)).toBeInTheDocument();
      await user.type(screen.getByLabelText("Answer the follow-up"), longAnswer);
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    expect(
      await screen.findByRole("heading", {
        name: "Your learning report is ready.",
      }),
    ).toBeInTheDocument();
    expect(followUpMock).toHaveBeenCalledTimes(4);
    expect(reportMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(INTERVIEW_STORAGE_KEY)).not.toContain("sk-live");
  });

  it("preserves the answer on API failure and allows an explicit Demo switch", async () => {
    followUpMock.mockReset();
    followUpMock.mockRejectedValueOnce(new Error("DeepSeek is unavailable."));
    const user = userEvent.setup();
    render(<InterviewModule apiKey="sk-live" onRequestApiKey={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /start live interview/i }));
    await user.type(screen.getByLabelText("Your answer"), longAnswer);
    await user.click(screen.getByRole("button", { name: "Send answer" }));

    expect(await screen.findByText("DeepSeek is unavailable.")).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveValue(longAnswer);

    await user.click(
      screen.getByRole("button", { name: /continue in demo mode/i }),
    );
    expect(screen.getByText(/follow-ups and scores are simulated locally/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send answer" }));
    expect(
      await screen.findByText(INTERVIEW_QUESTIONS[0].demoFollowUp),
    ).toBeInTheDocument();
  });
});
