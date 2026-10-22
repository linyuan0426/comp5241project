import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { saveLearningState } from "./lib/storage";
import { makeBundle } from "./test/fixtures";

const { extractPdfMock, generateBundleMock } = vi.hoisted(() => ({
  extractPdfMock: vi.fn(),
  generateBundleMock: vi.fn(),
}));

vi.mock("./lib/pdf", () => ({
  PdfValidationError: class PdfValidationError extends Error {},
  extractPdf: extractPdfMock,
}));

vi.mock("./lib/deepseek", () => ({
  generateLearningBundle: generateBundleMock,
  testDeepSeekConnection: vi.fn(),
}));

describe("learning demo workflow", () => {
  beforeEach(() => {
    extractPdfMock.mockResolvedValue({
      meta: {
        name: "software-engineering-foundations.pdf",
        pageCount: 3,
        characterCount: 4598,
      },
      text: "A text-based software engineering course document.",
    });
    generateBundleMock.mockResolvedValue(makeBundle());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () =>
          new Blob(["sample"], { type: "application/pdf" }),
      }),
    );
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("completes the full plan and quiz workflow, then restores progress", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.click(screen.getByRole("button", { name: /load sample/i }));
    expect(await screen.findByText("Ready to generate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /generate study kit/i }));
    expect(
      screen.getByRole("heading", { name: "Bring your own API key" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("API key"), "sk-browser-session");
    await user.click(screen.getByRole("button", { name: /save & generate/i }));

    expect(
      await screen.findByRole("heading", { name: "Reliable Software Foundations" }),
    ).toBeInTheDocument();
    expect(generateBundleMock).toHaveBeenCalledWith(
      "sk-browser-session",
      expect.stringContaining("software engineering"),
    );
    expect(sessionStorage.getItem("genai-learning-demo:deepseek-key")).toBe(
      "sk-browser-session",
    );
    expect(localStorage.getItem("genai-learning-demo:v1")).not.toContain(
      "sk-browser-session",
    );

    for (const label of [
      "Summarize source control intent",
      "Draft a one-sentence commit message",
      "Identify a pure calculation",
      "Define predictable invalid-input behavior",
      "Write a regression scenario",
      "Name the API failure contract",
    ]) {
      await user.click(screen.getByRole("button", { name: label }));
    }
    expect(screen.getByText("100%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue to quiz/i }));
    const optionLabels = [
      "It keeps review and reasoning focused",
      "Its output depends only on its inputs",
      "A readable test structure",
      "Credentials need correction",
      "To turn integration failures into local errors",
    ];

    for (let index = 0; index < 5; index += 1) {
      await user.click(screen.getByRole("button", { name: optionLabels[index] }));
      expect(screen.getByText("Correct")).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", {
          name: index === 4 ? /see results/i : /next question/i,
        }),
      );
    }

    expect(
      screen.getByRole("heading", { name: "5 out of 5 correct" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /view progress/i }));

    expect(
      screen.getByRole("heading", { name: "Keep the momentum going." }),
    ).toBeInTheDocument();
    expect(screen.getByText("6/6")).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Keep the momentum going." }),
      ).toBeInTheDocument();
    });
    expect(
      localStorage.getItem("genai-learning-demo:v1"),
    ).not.toContain("sk-browser-session");
  });

  it("shows a clear validation error without clearing the current draft", async () => {
    extractPdfMock.mockRejectedValueOnce(
      new Error("No readable text was found. Scanned PDFs are not supported."),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /load sample/i }));
    expect(
      await screen.findByText(/could not be loaded/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /turn course notes/i }),
    ).toBeInTheDocument();
  });

  it("keeps the previous learning pack when replacing a document fails", async () => {
    const saved = {
      version: 1 as const,
      document: {
        name: "saved-course.pdf",
        pageCount: 3,
        characterCount: 4598,
      },
      bundle: makeBundle(),
      currentStep: "plan" as const,
    };
    saveLearningState(saved);
    sessionStorage.setItem("genai-learning-demo:deepseek-key", "sk-test");
    generateBundleMock.mockRejectedValueOnce(
      new Error("DeepSeek could not generate the study kit. Please retry."),
    );

    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Reliable Software Foundations" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Upload" }));
    await user.click(screen.getByRole("button", { name: /load sample/i }));
    await screen.findByText("Ready to generate");
    await user.click(screen.getByRole("button", { name: /generate study kit/i }));

    expect(
      await screen.findByText(/could not generate the study kit/i),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem("genai-learning-demo:v1") ?? "{}").document
        .name,
    ).toBe("saved-course.pdf");

    await user.click(screen.getByRole("button", { name: /return to saved pack/i }));
    expect(
      screen.getByRole("heading", { name: "Reliable Software Foundations" }),
    ).toBeInTheDocument();
  });

  it("opens the shared key dialog when Live interview has no key", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /mock interview/i }),
    );
    expect(
      screen.getByRole("heading", { name: /practice the thinking/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /connect key & start/i }),
    );
    expect(
      screen.getByRole("dialog", { name: "Bring your own API key" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /practice the thinking/i }),
    ).toBeInTheDocument();
  });
});
