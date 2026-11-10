import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { loadLearningState, saveLearningState } from "./lib/storage";
import { makeBundle } from "./test/fixtures";

const { extractPdfMock, generateBundleMock, recognizeImagesMock, uploadCourseFileMock } = vi.hoisted(() => ({
  extractPdfMock: vi.fn(),
  generateBundleMock: vi.fn(),
  recognizeImagesMock: vi.fn(),
  uploadCourseFileMock: vi.fn(),
}));

vi.mock("./lib/pdf", () => ({
  PdfValidationError: class PdfValidationError extends Error {},
  extractPdf: extractPdfMock,
}));

vi.mock("./lib/ai", () => ({
  generateLearningBundle: generateBundleMock,
  recognizePageImages: recognizeImagesMock,
}));

vi.mock("./lib/supabase", () => ({
  uploadCourseFile: uploadCourseFileMock,
  downloadCourseFile: vi.fn(),
}));

describe("learning demo workflow", () => {
  beforeEach(() => {
    extractPdfMock.mockResolvedValue({
      meta: {
        name: "software-engineering-foundations.pdf",
        pageCount: 3,
        characterCount: 4598,
      },
      pages: [{ text: "A text-based software engineering course document.", images: [] }],
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

  it("requests sign-in before loading or accepting a course file", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    render(<App account={{ open }} />);

    await user.click(screen.getByRole("button", { name: "Load sample" }));
    await user.click(screen.getByRole("button", { name: "Choose PDF or PPTX" }));
    const fileInput = screen.getByLabelText("Choose course file");
    fireEvent.change(fileInput, { target: { files: [new File(["sample"], "sample.pdf")] } });

    expect(open).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
    expect(extractPdfMock).not.toHaveBeenCalled();
  });

  it("retries storage without regenerating the study kit or reverting learning changes", async () => {
    const user = userEvent.setup();
    let finishUpload!: (path: string) => void;
    const retry = new Promise<string>((resolve) => { finishUpload = resolve; });
    uploadCourseFileMock.mockRejectedValueOnce(new Error("Unavailable")).mockReturnValueOnce(retry);
    render(<App account={{ userId: "learner", open: vi.fn() }} />);

    await user.click(screen.getByRole("button", { name: "Load sample" }));
    await user.click(await screen.findByRole("button", { name: "Generate study kit" }));
    await user.click(await screen.findByRole("button", { name: "Retry file upload" }));
    await user.click(screen.getByRole("button", { name: "Summarize source control intent" }));
    finishUpload("learner/course.pdf");

    await waitFor(() => expect(loadLearningState()?.document.filePath).toBe("learner/course.pdf"));
    expect(loadLearningState()?.bundle.plan[0].tasks[0].completed).toBe(true);
    expect(generateBundleMock).toHaveBeenCalledTimes(1);
    expect(uploadCourseFileMock).toHaveBeenCalledTimes(2);
    expect(uploadCourseFileMock.mock.calls[1][1]).toBe(uploadCourseFileMock.mock.calls[0][1]);
  });

  it("completes the full plan and quiz workflow, then restores progress", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.click(screen.getByRole("button", { name: /load sample/i }));
    expect(await screen.findByText("Ready to generate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /generate study kit/i }));
    expect(
      await screen.findByRole("heading", { name: "Reliable Software Foundations" }),
    ).toBeInTheDocument();
    expect(generateBundleMock).toHaveBeenCalledWith(expect.stringContaining("software engineering"));

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
  });

  it("shows a clear validation error without clearing the current draft", async () => {
    extractPdfMock.mockRejectedValueOnce(
      new Error("The PDF could not be opened."),
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

  it("recognizes an image-only page and uses the reviewed text for generation", async () => {
    const image = "data:image/png;base64,c2FtcGxl";
    extractPdfMock.mockResolvedValueOnce({
      meta: { name: "scanned-notes.pdf", pageCount: 2, characterCount: 0 },
      pages: [{ text: "", images: [image] }, { text: "", images: [] }],
    });
    recognizeImagesMock.mockResolvedValueOnce("A mislabeled test case.");
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /load sample/i }));
    expect(await screen.findByRole("button", { name: /generate study kit/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /recognize images on this page/i }));
    await waitFor(() => expect(screen.getByLabelText("Page 1 image text")).toHaveValue("A mislabeled test case."));
    expect(recognizeImagesMock).toHaveBeenCalledWith([image], "");

    fireEvent.change(screen.getByLabelText("Page 1 image text"), { target: { value: "A verified test case." } });
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Recognize images again" }));
    expect(recognizeImagesMock).toHaveBeenCalledTimes(1);
    recognizeImagesMock.mockRejectedValueOnce(new Error("Unavailable"));
    await user.click(screen.getByRole("button", { name: "Recognize images again" }));
    expect(await screen.findByText(/image recognition failed/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Page 1 image text")).toHaveValue("A verified test case.");
    await user.selectOptions(screen.getByLabelText("Review page"), "1");
    fireEvent.change(screen.getByLabelText("Page 2 native text"), { target: { value: "Discuss the result." } });
    await user.click(screen.getByRole("button", { name: /generate study kit/i }));
    expect(await screen.findByRole("heading", { name: "Reliable Software Foundations" })).toBeInTheDocument();
    expect(generateBundleMock).toHaveBeenLastCalledWith(
      "[Page 1]\nA verified test case.\n\n[Page 2]\nDiscuss the result.",
    );
  });

  it("preserves decision feedback and retries across a scenario refresh", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);
    const button = (name: RegExp) => screen.getByRole("button", { name });

    await user.click(button(/try scenario challenge/i));
    await user.click(button(/try a ticket without a discount/i));
    expect(screen.getByRole("status")).toHaveTextContent(/normal path/i);
    firstRender.unmount();
    render(<App />);
    await user.click(button(/try another choice/i));
    await user.click(button(/try a \$5 discount/i));
    await user.click(button(/continue to code review/i));
    await user.click(button(/accept the patch/i));
    expect(screen.getByRole("status")).toHaveTextContent(/still cost \$5/i);
    await user.click(button(/try another choice/i));
    await user.click(button(/clamp the total/i));
    await user.click(button(/finish challenge/i));
    expect(screen.getByRole("heading", { name: "Challenge complete" })).toBeInTheDocument();
    await user.click(button(/practice task interview/i));
    await user.click(button(/start demo interview/i));
    expect(screen.getByText(/your recorded decision was.*clamp the total/i)).toBeInTheDocument();
    await user.click(button(/back to practice/i));
    await user.click(button(/replay challenge/i));
    expect(screen.getByText("Decision history (4)")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
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

  it("asks a guest to sign in before starting a live interview", async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    render(<App account={{ open }} />);

    await user.click(screen.getByRole("button", { name: /mock interview/i }));
    await user.click(screen.getByRole("button", { name: "Sign in to start" }));
    expect(open).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /api key|test connection/i })).not.toBeInTheDocument();
  });

  it("restores a workspace and requires the saved change to be checked and staged before push", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);
    const button = (name: string) => screen.getByRole("button", { name });

    await user.click(button("Virtual Workspace"));
    await user.click(button("Clone project"));
    const editor = screen.getByRole("textbox", { name: "signup.js" });
    const original = (editor as HTMLTextAreaElement).value;

    fireEvent.change(editor, { target: { value: original.replace("Coming soon", "Sign up") } });
    expect(button("Check change")).toBeDisabled();
    await user.click(button("Save file"));
    await user.click(button("Check change"));
    expect(screen.getByText(/simulated check failed/i)).toBeInTheDocument();
    expect(button("Stage changes")).toBeDisabled();

    const validEdit = original.replace("Coming soon", "Register now");
    fireEvent.change(editor, { target: { value: validEdit } });
    await user.click(button("Save file"));
    await user.click(button("Check change"));
    await user.click(button("Stage changes"));

    const updatedEdit = validEdit.replace('"Register now"', "'Register now'");
    fireEvent.change(editor, { target: { value: updatedEdit } });
    await user.click(button("Save file"));
    expect(screen.getByText(/saved file changed after staging/i)).toBeInTheDocument();
    expect(button("Commit")).toBeDisabled();
    expect(button("Push")).toBeDisabled();

    firstRender.unmount();
    const resumed = render(<App />);
    expect(screen.getByRole("textbox", { name: "signup.js" })).toHaveValue(updatedEdit);
    await user.click(button("Check change"));
    await user.click(button("Stage changes"));
    await user.type(screen.getByRole("textbox", { name: "Commit message" }), "Update signup button");
    await user.click(button("Commit"));
    await user.click(button("Push"));
    expect(screen.getByText("Workflow complete")).toBeInTheDocument();

    await user.click(button("Practice task interview"));
    await user.click(button("Start demo interview"));
    expect(screen.getByText(/your recorded decision was.*register now/i)).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    const firstAnswer = "I kept the button update small so the change is easy to review.";
    await user.type(screen.getByLabelText("Your answer"), firstAnswer);
    await user.click(button("Send answer"));
    await user.type(screen.getByLabelText("Answer the follow-up"), "I would keep the copy change in a focused commit.");
    await user.click(button("Continue"));
    expect(screen.getByText(/the practice recorded this outcome.*simulated check passed/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your answer"), "I would verify the text and the signup action in the browser.");
    await user.click(button("Send answer"));
    await user.type(screen.getByLabelText("Answer the follow-up"), "I would compare the staged diff with the version I checked.");
    await user.click(button("Continue"));
    expect(screen.getByRole("heading", { name: "Your learning report is ready." })).toBeInTheDocument();

    await user.click(button("Review transcript"));
    await user.click(button("Retry question 1"));
    const revision = "The requirement was clearer registration copy, so I kept the change to the label.";
    fireEvent.change(screen.getByLabelText("Revised answer"), { target: { value: revision } });
    await user.click(button("Save revision"));

    resumed.unmount();
    render(<App />);
    await user.click(button("Review transcript"));
    expect(screen.getAllByText("Original answer")).toHaveLength(2);
    expect(screen.getByText(firstAnswer)).toBeInTheDocument();
    expect(screen.getByText("Latest revision")).toBeInTheDocument();
    expect(screen.getByText(revision)).toBeInTheDocument();
    await user.click(button("Mock Interview"));
    expect(screen.getByRole("heading", { name: /practice the thinking/i })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
