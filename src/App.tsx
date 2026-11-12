import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Code2,
  FileText,
  GraduationCap,
  KeyRound,
  ListChecks,
  Map,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  UploadCloud,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { lazy, Suspense, useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { AccountControls } from "./features/account/AccountShell";
import { useProgressStorage } from "./features/account/progress-storage";
import InterviewModule from "./features/interview/InterviewModule";
import { loadTaskBrief, saveTaskBrief } from "./features/interview/storage";
import type { InterviewTask } from "./features/interview/types";
import WorkspaceModule from "./features/workspace/WorkspaceModule";
import KnowledgeQuest from "./features/learning/KnowledgeQuest";
import { newQuestProgress } from "./features/learning/quest-data";
import DocumentReview from "./features/learning/DocumentReview";
import ScenarioChallenge from "./features/learning/ScenarioChallenge";
import { generateLearningBundle, recognizePageImages } from "./lib/ai";
import { LanguageSwitch } from "./lib/i18n";
import { downloadCourseFile, uploadCourseFile } from "./lib/supabase";
import { countDocumentCharacters, DOCUMENT_LIMITS, joinDocumentPages } from "./lib/document";
import {
  getNextQuestionIndex,
  getOverallProgress,
  getPlanProgress,
  getQuizStats,
} from "./lib/learning";
import { extractPdf, PdfValidationError } from "./lib/pdf";
import { clearLearningState, loadLearningState, saveLearningState } from "./lib/storage";
import type {
  DocumentPage,
  ExtractedDocument,
  LearningBundle,
  LearningState,
  Step,
} from "./types";

const FunPracticeModule = lazy(() => import("./features/fun-practice/FunPracticeModule"));

const STEPS: Array<{ id: Step; label: string; icon: typeof UploadCloud }> = [
  { id: "upload", label: "Upload", icon: UploadCloud },
  { id: "plan", label: "Learning plan", icon: ListChecks },
  { id: "quest", label: "Knowledge Quest", icon: Map },
  { id: "quiz", label: "Quiz", icon: CircleHelp },
  { id: "progress", label: "Progress", icon: Target },
];

type WorkspaceSection = "learning" | "fun" | "interview" | "workspace" | "challenge" | "task-interview";

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

type StagePlanProps = {
  bundle: LearningBundle;
  onToggleTask: (stageId: string, taskId: string) => void;
  onContinue: () => void;
  onPractice: () => void;
};

function StagePlan({ bundle, onToggleTask, onContinue, onPractice }: StagePlanProps) {
  const planProgress = getPlanProgress(bundle);

  return (
    <div className="page-grid plan-layout">
      <section className="panel intro-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Your study map</p>
            <h1>{bundle.title}</h1>
          </div>
          <span className="status-pill">
            <Sparkles size={14} />
            AI generated
          </span>
        </div>
        <p className="summary-copy">{bundle.summary}</p>
        <div className="objective-grid">
          {bundle.objectives.map((objective, index) => (
            <div className="objective" key={objective}>
              <span>{index + 1}</span>
              <p>{objective}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel plan-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Three focused stages</p>
            <h2>Build understanding step by step</h2>
          </div>
          <div className="mini-progress">
            <strong>{planProgress.percent}%</strong>
            <span>complete</span>
          </div>
        </div>

        <div className="plan-stages">
          {bundle.plan.map((stage, stageIndex) => {
            const stageTasks = stage.tasks.filter((task) => task.completed).length;
            const stageComplete = stageTasks === stage.tasks.length;
            return (
              <article className="plan-stage" key={stage.id}>
                <div className={`stage-number ${stageComplete ? "complete" : ""}`}>
                  {stageComplete ? <Check size={18} /> : stageIndex + 1}
                </div>
                <div className="stage-content">
                  <div className="stage-title-row">
                    <h3>{stage.title}</h3>
                    <span>
                      {stageTasks}/{stage.tasks.length}
                    </span>
                  </div>
                  <p className="stage-outcome">{stage.outcome}</p>
                  <div className="task-list">
                    {stage.tasks.map((task) => (
                      <button
                        aria-pressed={task.completed}
                        className={`task-button ${task.completed ? "checked" : ""}`}
                        key={task.id}
                        onClick={() => onToggleTask(stage.id, task.id)}
                        type="button"
                      >
                        <span className="task-check">
                          {task.completed ? <Check size={14} /> : null}
                        </span>
                        <span>{task.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="panel-footer">
          <p>
            {planProgress.completed} of {planProgress.total} tasks complete
          </p>
          <div className="result-actions">
            <button className="button secondary" onClick={onPractice} type="button">
              <Zap size={16} />
              Practice this concept
            </button>
            <button className="button primary" onClick={onContinue} type="button">
              {bundle.quest ? "Play Knowledge Quest" : "Continue to quiz"}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

type QuizViewProps = {
  bundle: LearningBundle;
  questionIndex: number;
  onAnswer: (questionId: string, optionIndex: 0 | 1 | 2 | 3) => void;
  onNext: (nextIndex: number) => void;
  onFinish: () => void;
  onChallenge: () => void;
};

function QuizView({
  bundle,
  questionIndex,
  onAnswer,
  onNext,
  onFinish,
  onChallenge,
}: QuizViewProps) {
  const stats = getQuizStats(bundle.quiz);
  const isComplete = questionIndex >= bundle.quiz.length;
  const question = bundle.quiz[Math.min(questionIndex, bundle.quiz.length - 1)];

  if (isComplete) {
    return (
      <section className="panel quiz-complete">
        <div className="completion-orbit">
          <Trophy size={38} />
        </div>
        <p className="eyebrow">Quiz complete</p>
        <h1>{stats.correct} out of {stats.total} correct</h1>
        <p>
          You answered {stats.answered} questions with {stats.percent}% accuracy. Review
          any missed concepts before moving to your progress summary.
        </p>
        <div className="result-actions">
          <button className="button secondary" onClick={onChallenge} type="button">
            Try scenario challenge
          </button>
          <button
            className="button secondary"
            onClick={() => onNext(0)}
            type="button"
          >
            Review questions
          </button>
          <button className="button primary" onClick={onFinish} type="button">
            View progress
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    );
  }

  const answered = question.selectedIndex !== undefined;

  return (
    <div className="quiz-layout">
      <aside className="quiz-rail">
        <p className="eyebrow">Knowledge check</p>
        <h2>Five questions. Instant feedback.</h2>
        <p>Use the explanations to close gaps before your final progress review.</p>
        <div className="question-dots" aria-label="Quiz progress">
          {bundle.quiz.map((item, index) => {
            const state =
              item.selectedIndex === undefined
                ? "pending"
                : item.selectedIndex === item.answerIndex
                  ? "correct"
                  : "incorrect";
            return (
              <span
                aria-label={`Question ${index + 1}: ${state}`}
                className={`question-dot ${state} ${index === questionIndex ? "current" : ""}`}
                key={item.id}
              >
                {index + 1}
              </span>
            );
          })}
        </div>
        <div className="quiz-score">
          <span>Current score</span>
          <strong>{stats.correct}/{stats.answered}</strong>
        </div>
        <button className="text-button" onClick={onChallenge} type="button">Try scenario challenge</button>
      </aside>

      <section className="panel question-panel">
        <div className="question-meta">
          <span>Question {questionIndex + 1} of {bundle.quiz.length}</span>
          <span>{answered ? "Answer locked" : "Choose one answer"}</span>
        </div>
        <h2>{question.prompt}</h2>
        <div className="answer-list">
          {question.options.map((option, optionIndex) => {
            const typedIndex = optionIndex as 0 | 1 | 2 | 3;
            const isSelected = question.selectedIndex === typedIndex;
            const isCorrect = question.answerIndex === typedIndex;
            const state = answered
              ? isCorrect
                ? "correct"
                : isSelected
                  ? "incorrect"
                  : ""
              : "";

            return (
              <button
                aria-label={option}
                aria-pressed={isSelected}
                className={`answer-option ${state}`}
                disabled={answered}
                key={option}
                onClick={() => onAnswer(question.id, typedIndex)}
                type="button"
              >
                <span className="option-letter">
                  {answered && isCorrect ? <Check size={16} /> : String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {answered ? (
          <div
            className={`feedback ${question.selectedIndex === question.answerIndex ? "correct" : "incorrect"}`}
            role="status"
          >
            <div>
              {question.selectedIndex === question.answerIndex ? (
                <CheckCircle2 size={20} />
              ) : (
                <X size={20} />
              )}
              <strong>
                {question.selectedIndex === question.answerIndex
                  ? "Correct"
                  : "Not quite"}
              </strong>
            </div>
            <p>{question.explanation}</p>
          </div>
        ) : null}

        <div className="question-footer">
          <span>{stats.answered} of {stats.total} answered</span>
          <button
            className="button primary"
            disabled={!answered}
            onClick={() => onNext(questionIndex + 1)}
            type="button"
          >
            {questionIndex === bundle.quiz.length - 1 ? "See results" : "Next question"}
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

function CourseFileDownload({ path, name }: { path: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const file = await downloadCourseFile(path);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("The original course file could not be downloaded. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="button secondary" disabled={busy} onClick={() => void download()} type="button">
        {busy ? "Downloading…" : "Download original course file"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

type ProgressViewProps = {
  learning: LearningState;
  onReviewPlan: () => void;
  onReviewQuiz: () => void;
  onReviewQuest: () => void;
  onReset: () => void;
};

function ProgressView({
  learning,
  onReviewPlan,
  onReviewQuiz,
  onReviewQuest,
  onReset,
}: ProgressViewProps) {
  const plan = getPlanProgress(learning.bundle);
  const quiz = getQuizStats(learning.bundle.quiz);
  const overall = getOverallProgress(learning);
  const quest = learning.bundle.quest;
  const solvedRooms = learning.questProgress?.filter((room) => room.solved).length ?? 0;
  const missedQuestions = learning.bundle.quiz.filter(
    (question) =>
      question.selectedIndex !== undefined &&
      question.selectedIndex !== question.answerIndex,
  );

  return (
    <div className="progress-page">
      <section className="panel progress-hero">
        <div>
          <p className="eyebrow">Learning snapshot</p>
          <h1>Keep the momentum going.</h1>
          <p>
            {quest ? "Your progress combines completed study tasks and rooms solved in Knowledge Quest."
              : "Your progress combines completed study tasks and quiz participation."}
          </p>
          {learning.document.filePath ? (
            <CourseFileDownload path={learning.document.filePath} name={learning.document.name} />
          ) : null}
        </div>
        <div
          aria-label={`${overall}% overall progress`}
          className="progress-ring"
          style={{ "--ring-progress": `${overall * 3.6}deg` } as CSSProperties}
        >
          <div>
            <strong>{overall}%</strong>
            <span>overall</span>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Learning statistics">
        <article className="stat-card blue">
          <ListChecks size={22} />
          <span>Plan tasks</span>
          <strong>{plan.completed}/{plan.total}</strong>
          <p>{plan.percent}% completed</p>
        </article>
        <article className="stat-card violet">
          <Trophy size={22} />
          <span>Quiz score</span>
          <strong>{quiz.percent}%</strong>
          <p>{quiz.correct} correct, {quiz.incorrect} incorrect</p>
        </article>
        {quest ? (
          <article className="stat-card teal">
            <KeyRound size={22} />
            <span>Quest rooms</span>
            <strong>{solvedRooms}/{quest.rooms.length}</strong>
            <button className="text-button" onClick={onReviewQuest} type="button">Review quest</button>
          </article>
        ) : (
        <article className="stat-card teal">
          <Zap size={22} />
          <span>Knowledge checks</span>
          <strong>{quiz.answered}/{quiz.total}</strong>
          <p>Questions answered</p>
        </article>
        )}
      </section>

      <div className="progress-columns">
        <section className="panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Plan completion</p>
              <h2>Stage by stage</h2>
            </div>
            <button className="text-button" onClick={onReviewPlan} type="button">
              Review plan
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="stage-summary-list">
            {learning.bundle.plan.map((stage) => {
              const done = stage.tasks.filter((task) => task.completed).length;
              return (
                <div className="stage-summary" key={stage.id}>
                  <div className={done === stage.tasks.length ? "done" : ""}>
                    {done === stage.tasks.length ? <Check size={16} /> : null}
                  </div>
                  <span>{stage.title}</span>
                  <strong>{done}/{stage.tasks.length}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Concept review</p>
              <h2>{missedQuestions.length ? "Topics to revisit" : "Quiz insights"}</h2>
            </div>
            <button className="text-button" onClick={onReviewQuiz} type="button">
              Review quiz
              <ChevronRight size={16} />
            </button>
          </div>
          {missedQuestions.length ? (
            <div className="review-list">
              {missedQuestions.map((question) => (
                <div key={question.id}>
                  <span className="review-icon"><RotateCcw size={15} /></span>
                  <p>{question.prompt}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="all-correct">
              <CheckCircle2 size={32} />
              <strong>No missed concepts yet</strong>
              <p>Finish the quiz or review all answers to see personalized insights.</p>
            </div>
          )}
        </section>
      </div>

      <section className="reset-row">
        <div>
          <strong>Start a fresh demo</strong>
          <p>This clears the current document, plan, quiz answers, and progress.</p>
        </div>
        <button className="button secondary danger-button" onClick={onReset} type="button">
          <RotateCcw size={17} />
          Reset demo
        </button>
      </section>
    </div>
  );
}

export default function App({ account }: { account?: AccountControls }) {
  const storage = useProgressStorage();
  const [section, setSection] = useState<WorkspaceSection>(() => {
    const hash = window.location.hash;
    if (hash === "#workspace") return "workspace";
    if (hash === "#challenge") return "challenge";
    if (hash === "#task-interview") return "task-interview";
    if (hash === "#interview") return "interview";
    return hash === "#fun" ? "fun" : "learning";
  });
  const [taskBrief, setTaskBrief] = useState(() => loadTaskBrief(storage));
  const [learning, setLearning] = useState<LearningState | null>(() => loadLearningState(storage));
  const latestLearning = useRef(learning);
  const [view, setView] = useState<Step>(() => learning?.currentStep ?? "upload");
  const [draft, setDraft] = useState<ExtractedDocument | null>(null);
  const sourceFile = useRef<File | null>(null);
  const [pendingCourseFile, setPendingCourseFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"parse" | "generate" | "recognize" | "upload" | null>(null);
  const [recognizingPage, setRecognizingPage] = useState<number | null>(null);
  const [pageError, setPageError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [quizIndex, setQuizIndex] = useState(() => {
    if (!learning) return 0;
    const next = getNextQuestionIndex(learning.bundle.quiz);
    return next === -1 ? learning.bundle.quiz.length : next;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function commitLearning(next: LearningState) {
    latestLearning.current = next;
    setLearning(next);
    saveLearningState(next, storage);
  }

  function navigate(step: Step) {
    setSection("learning");
    if (step === "upload") {
      if (!learning) setView("upload");
      return;
    }

    if (!learning || (step === "quest" && !learning.bundle.quest)) return;
    if (step === "quiz") {
      const next = getNextQuestionIndex(learning.bundle.quiz);
      setQuizIndex(next === -1 ? learning.bundle.quiz.length : next);
    }
    const nextState = { ...learning, currentStep: step };
    commitLearning(nextState);
    setView(step);
  }

  function switchSection(next: WorkspaceSection) {
    setSection(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  function startTaskInterview(task: InterviewTask) {
    saveTaskBrief(task, storage);
    setTaskBrief(task);
    switchSection("task-interview");
  }

  function requireSignIn() {
    if (!account || account.userId) return true;
    account.open();
    return false;
  }

  async function processFile(file: File) {
    if (busy || !requireSignIn()) return;
    setBusy("parse");
    setPageError("");
    try {
      const isPptx = /\.pptx$/i.test(file.name)
        || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      const extracted = isPptx
        ? await (await import("./lib/pptx")).extractPptx(file)
        : await extractPdf(file);
      sourceFile.current = file;
      setDraft(extracted);
    } catch (error) {
      if (error instanceof PdfValidationError) {
        setPageError(error.message);
      } else {
        setPageError(
          `This document could not be read. ${errorMessage(error)} Choose a PDF or PPTX.`,
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function loadSample() {
    if (busy || !requireSignIn()) return;
    setBusy("parse");
    setPageError("");
    try {
      const response = await fetch("/sample-course.pdf");
      if (!response.ok) throw new Error("Sample not found");
      const blob = await response.blob();
      const file = new File([blob], "software-engineering-foundations.pdf", {
        type: "application/pdf",
      });
      const extracted = await extractPdf(file);
      sourceFile.current = file;
      setDraft(extracted);
    } catch (error) {
      setPageError(
        error instanceof PdfValidationError
          ? error.message
          : `The sample PDF could not be loaded. ${errorMessage(error)}`,
      );
    } finally {
      setBusy(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const [file] = Array.from(event.dataTransfer.files);
    if (file) void processFile(file);
  }

  function requestGeneration() {
    if (!draft || busy || !requireSignIn()) return;
    void generateKit();
  }

  async function generateKit() {
    if (!draft || busy) return;
    const characterCount = countDocumentCharacters(draft.pages);
    if (characterCount === 0 || characterCount > DOCUMENT_LIMITS.maxCharacters) return;
    setBusy("generate");
    setPageError("");
    try {
      const bundle = await generateLearningBundle(joinDocumentPages(draft.pages));
      let filePath: string | undefined;
      const file = sourceFile.current;
      if (account?.userId && file) {
        try {
          filePath = await uploadCourseFile(account.userId, file);
        } catch {
          // The learner can retry the file upload without regenerating the study kit.
        }
      }
      const next: LearningState = {
        version: 1,
        document: { ...draft.meta, characterCount, filePath },
        bundle,
        currentStep: "plan",
      };
      commitLearning(next);
      setPendingCourseFile(account?.userId && !filePath ? file : null);
      sourceFile.current = null;
      setDraft(null);
      setQuizIndex(0);
      setView("plan");
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function retryCourseUpload() {
    if (busy || !account?.userId || !pendingCourseFile) return;
    setBusy("upload");
    try {
      const filePath = await uploadCourseFile(account.userId, pendingCourseFile);
      const current = latestLearning.current;
      if (current) commitLearning({ ...current, document: { ...current.document, filePath } });
      setPendingCourseFile(null);
    } catch {
      // Keep the original file available for another retry.
    } finally {
      setBusy(null);
    }
  }

  function editPage(index: number, patch: Partial<DocumentPage>) {
    setDraft((current) => current && {
      ...current,
      pages: current.pages.map((page, pageIndex) => pageIndex === index ? { ...page, ...patch } : page),
    });
  }

  function requestRecognition(index: number) {
    if (busy || !requireSignIn()) return;
    void recognizeImages(index);
  }

  async function recognizeImages(index: number) {
    const page = draft?.pages[index];
    if (!page?.images.length || busy) return;
    setBusy("recognize");
    setRecognizingPage(index);
    setPageError("");
    try {
      const recognizedText = await recognizePageImages(page.images, page.text);
      editPage(index, { recognizedText });
    } catch (error) {
      setPageError(`Page ${index + 1} image recognition failed. ${errorMessage(error)}`);
    } finally {
      setBusy(null);
      setRecognizingPage(null);
    }
  }

  function toggleTask(stageId: string, taskId: string) {
    if (!learning) return;
    const bundle = {
      ...learning.bundle,
      plan: learning.bundle.plan.map((stage) =>
        stage.id !== stageId
          ? stage
          : {
              ...stage,
              tasks: stage.tasks.map((task) =>
                task.id === taskId ? { ...task, completed: !task.completed } : task,
              ),
            },
      ),
    };
    commitLearning({ ...learning, bundle });
  }

  function answerQuestion(questionId: string, optionIndex: 0 | 1 | 2 | 3) {
    if (!learning) return;
    const bundle = {
      ...learning.bundle,
      quiz: learning.bundle.quiz.map((question) =>
        question.id === questionId && question.selectedIndex === undefined
          ? { ...question, selectedIndex: optionIndex }
          : question,
      ),
    };
    commitLearning({ ...learning, currentStep: "quiz", bundle });
  }

  function resetDemo() {
    if (busy || !window.confirm("Reset the demo and clear all saved learning progress?")) return;
    clearLearningState(storage);
    latestLearning.current = null;
    setLearning(null);
    setPendingCourseFile(null);
    sourceFile.current = null;
    setDraft(null);
    setPageError("");
    setQuizIndex(0);
    setView("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function requestNewDocument() {
    if (busy || !window.confirm("Generating from a new document will replace the current learning progress. Continue?")) {
      return;
    }
    sourceFile.current = null;
    setDraft(null);
    setPageError("");
    setView("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openQuiz() {
    if (!learning) return;
    const next = getNextQuestionIndex(learning.bundle.quiz);
    setQuizIndex(next === -1 ? learning.bundle.quiz.length : next);
    navigate("quiz");
  }

  function recordQuestAttempt(index: number, solved: boolean) {
    const current = latestLearning.current;
    if (!current?.bundle.quest) return;
    const progress = current.questProgress ?? newQuestProgress(current.bundle.quest);
    if (progress.findIndex((entry) => !entry.solved) !== index) return;
    commitLearning({
      ...current,
      questProgress: progress.map((entry, roomIndex) =>
        roomIndex === index ? { solved, misses: entry.misses + Number(!solved) } : entry),
    });
  }

  function replayQuest() {
    if (learning?.bundle.quest) {
      commitLearning({ ...learning, questProgress: newQuestProgress(learning.bundle.quest) });
    }
  }

  function openQuestInterview() {
    const quest = learning?.bundle.quest;
    if (!quest || !learning.questProgress?.every((entry) => entry.solved)) return;
    const detective = quest.rooms[2];
    startTaskInterview({
      kind: "scenario",
      focus: "source-verification",
      title: quest.title,
      decision: `Flagged the claim “${detective.claims[detective.falseIndex]}”.`,
      result: detective.corrections[detective.correctIndex],
      evidence: [detective.evidence, quest.rooms[3].evidence],
    });
  }

  const quest = learning?.bundle.quest;
  const steps = STEPS.filter((step) => step.id !== "quest" || quest);
  const currentStepIndex = steps.findIndex((step) => step.id === view);
  const planSnapshot = learning ? getPlanProgress(learning.bundle) : null;
  const reviewedCharacters = draft ? countDocumentCharacters(draft.pages) : 0;
  const characterLimitExceeded = reviewedCharacters > DOCUMENT_LIMITS.maxCharacters;
  const inInterview = section === "interview" || section === "task-interview";
  const interviewTask = section === "task-interview" ? taskBrief : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={24} /></div>
          <div>
            <strong>Pathwise</strong>
            <span>AI Learning Lab</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Learning workflow">
          <p className="nav-label">Learning studio</p>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const available = step.id === "upload" || Boolean(learning);
            const complete =
              step.id === "quest" ? Boolean(learning?.questProgress?.every((room) => room.solved))
                : step.id === "quiz" ? Boolean(learning?.bundle.quiz.every((question) => question.selectedIndex !== undefined))
                : index < currentStepIndex && (step.id !== "plan" || (planSnapshot?.percent ?? 0) === 100);
            return (
              <button
                aria-current={section === "learning" && view === step.id ? "step" : undefined}
                aria-label={step.label}
                className={section === "learning" && view === step.id ? "active" : ""}
                disabled={!available}
                key={step.id}
                onClick={() => {
                  switchSection("learning");
                  if (step.id === "upload") {
                    if (learning) requestNewDocument();
                    else setView("upload");
                  } else {
                    navigate(step.id);
                  }
                }}
                type="button"
              >
                <span className="nav-icon">
                  {complete ? <Check size={16} /> : <Icon size={18} />}
                </span>
                <span>{step.label}</span>
                {view === step.id ? <span className="nav-active-dot" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="future-nav">
          <p className="nav-label">Explore</p>
          <button
            aria-current={section === "fun" ? "page" : undefined}
            aria-label="Fun Practice"
            className={`future-item available ${section === "fun" ? "active" : ""}`}
            onClick={() => switchSection("fun")}
            type="button"
          >
            <Zap size={18} />
            <div><span>Fun Practice</span><small>Teach, rescue, explain</small></div>
            <ChevronRight size={14} />
          </button>
          <button
            aria-current={section === "interview" ? "page" : undefined}
            aria-label="Mock Interview"
            className={`future-item available ${section === "interview" ? "active" : ""}`}
            onClick={() => switchSection("interview")}
            type="button"
          >
            <BriefcaseBusiness size={18} />
            <div><span>Mock Interview</span><small>Practice with AI</small></div>
            <ChevronRight size={14} />
          </button>
          <button
            aria-current={section === "workspace" ? "page" : undefined}
            aria-label="Virtual Workspace"
            className={`future-item available ${section === "workspace" ? "active" : ""}`}
            onClick={() => switchSection("workspace")}
            type="button"
          >
            <Code2 size={18} />
            <div><span>Virtual Workspace</span><small>Guided coding lab</small></div>
            <ChevronRight size={14} />
          </button>
        </div>

        {learning ? (
          <div className="sidebar-document">
            <div className="document-icon"><FileText size={19} /></div>
            <div>
              <span>{learning.document.name}</span>
              <small>{learning.document.pageCount} pages</small>
            </div>
          </div>
        ) : (
          <div className="sidebar-note">
            <Sparkles size={18} />
            <p>Turn static course notes into an active learning loop.</p>
          </div>
        )}
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-context">
            <span className="mobile-brand"><GraduationCap size={20} /> Pathwise</span>
            <span className="breadcrumb">
              {section === "learning" ? "Learning Studio" : "Practice"}
            </span>
            <ChevronRight size={14} />
            <strong>
              {section === "learning" ? steps.find((step) => step.id === view)?.label
                : section === "fun" ? "Fun Practice"
                : inInterview ? interviewTask ? "Task Interview" : "Mock Interview"
                : section === "challenge" ? "Scenario Challenge" : "Virtual Workspace"}
            </strong>
          </div>
          <div className="topbar-actions">
            <LanguageSwitch />
            {account ? (
              <button className="account-status" onClick={account.open} type="button">
                <UserRound size={16} aria-hidden="true" />
                <span>{account.userId ? "Account" : "Sign in"}</span>
                {account.userId && account.status === "saving" ? <span>· Saving…</span> : null}
                {account.userId && (account.status === "offline" || account.status === "conflict")
                  ? <span className="account-sync-alert">· Sync needs attention</span> : null}
              </button>
            ) : null}
          </div>
        </header>

        <main className="main-content">
          {section === "fun" ? (
            <Suspense fallback={<div className="panel">Loading practice…</div>}>
              <FunPracticeModule
                bundle={learning?.bundle}
                canUseLive={Boolean(account?.userId)}
                onSignIn={account?.open}
              />
            </Suspense>
          ) : section === "workspace" ? (
            <WorkspaceModule onInterview={startTaskInterview} />
          ) : section === "challenge" ? (
            <ScenarioChallenge onBack={() => switchSection("learning")} onInterview={startTaskInterview} />
          ) : inInterview ? (
            <>
              {interviewTask ? (
                <button
                  className="text-button task-interview-back"
                  onClick={() => switchSection(interviewTask.kind === "workspace" ? "workspace" : "challenge")}
                  type="button"
                >Back to practice</button>
              ) : null}
              <InterviewModule
                canUseLive={!account || Boolean(account.userId)}
                key={interviewTask?.kind ?? "general"}
                onSignIn={account?.open}
                task={interviewTask ?? undefined}
              />
            </>
          ) : (
            <>
          {view === "upload" ? (
            <div className="upload-page">
              {learning ? (
                <button
                  className="back-to-learning"
                  onClick={() => setView(learning.currentStep)}
                  type="button"
                >
                  <ChevronRight size={15} />
                  Back to current learning pack
                </button>
              ) : null}
              <section className="hero-copy">
                <div className="hero-kicker">
                  <Sparkles size={16} />
                  <span>Document-driven learning</span>
                </div>
                <h1>Turn course notes into <span>active knowledge.</span></h1>
                <p>
                  Upload a PDF or PPTX to build a study plan and turn your course material
                  into a puzzle quest with feedback grounded in the original text.
                </p>
                {account ? <p>
                  {account.userId
                    ? "When you generate a study kit, your original file is saved privately to your account."
                    : "Sign in before uploading to generate study kits and save your progress."}
                </p> : null}
                <div className="feature-pills">
                  <span><Check size={14} /> AI summary</span>
                  <span><Check size={14} /> Guided plan</span>
                  <span><Check size={14} /> Knowledge Quest</span>
                </div>
                <button className="text-button" onClick={() => switchSection("challenge")} type="button">
                  Try scenario challenge
                </button>
              </section>

              <section className="upload-card panel">
                <div
                  className={`dropzone ${dragging ? "dragging" : ""}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    aria-label="Choose course file"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void processFile(file);
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                  <div className="upload-icon"><UploadCloud size={27} /></div>
                  <h2>{busy === "parse" ? "Reading your document..." : "Drop your course file here"}</h2>
                  <p>PDF or PPTX, up to 10 MB and 50 pages or slides</p>
                  <div className="upload-actions">
                    <button
                      className="button primary"
                      disabled={busy !== null}
                      onClick={() => { if (requireSignIn()) fileInputRef.current?.click(); }}
                      type="button"
                    >
                      Choose PDF or PPTX
                    </button>
                    <span>or</span>
                    <button
                      className="button ghost"
                      disabled={busy !== null}
                      onClick={() => void loadSample()}
                      type="button"
                    >
                      <BookOpen size={16} />
                      Load sample
                    </button>
                  </div>
                </div>

                {pageError ? (
                  <div className="page-error" role="alert">
                    <CircleHelp size={19} />
                    <div>
                      <strong>We couldn&apos;t prepare this document</strong>
                      <p>{pageError}</p>
                    </div>
                    {learning ? (
                      <button
                        className="text-button"
                        onClick={() => setView(learning.currentStep)}
                        type="button"
                      >
                        Return to saved pack
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {draft ? (
                  <>
                  <DocumentReview
                    busy={busy !== null}
                    onEdit={editPage}
                    onRecognize={requestRecognition}
                    pages={draft.pages}
                    recognizingPage={recognizingPage}
                  />
                  {characterLimitExceeded ? (
                    <p className="document-review-note" role="status">Trim the reviewed text to 30,000 characters before generating.</p>
                  ) : null}
                  <div className="document-ready">
                    <div className="document-ready-icon"><Check size={21} /></div>
                    <div className="document-ready-copy">
                      <span>{reviewedCharacters > 0 && !characterLimitExceeded ? "Ready to generate" : "Review required"}</span>
                      <strong>{draft.meta.name}</strong>
                      <p>
                        {draft.meta.pageCount} pages · {reviewedCharacters.toLocaleString()} characters
                      </p>
                    </div>
                    <button
                      className="button primary"
                      disabled={busy !== null || !reviewedCharacters || characterLimitExceeded}
                      onClick={requestGeneration}
                      type="button"
                    >
                      <Sparkles size={17} />
                      {busy === "generate" ? "Building your plan..." : "Generate study kit"}
                    </button>
                  </div>
                  </>
                ) : null}

                {busy === "generate" ? (
                  <div className="generation-status" role="status">
                    <span className="spinner" />
                    <div>
                      <strong>Building your study kit</strong>
                      <p>Building your plan, quiz and document-based game.</p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="how-it-works">
                <article>
                  <span>01</span>
                  <div><strong>Understand faster</strong><p>Get the key ideas without rereading every page.</p></div>
                </article>
                <article>
                  <span>02</span>
                  <div><strong>Practice with purpose</strong><p>Follow a plan built from your own material.</p></div>
                </article>
                <article>
                  <span>03</span>
                  <div><strong>Close knowledge gaps</strong><p>Use instant explanations to learn from mistakes.</p></div>
                </article>
              </section>
            </div>
          ) : null}

          {view !== "upload" && pendingCourseFile ? (
            <div className="page-error floating">
              <CircleHelp size={19} />
              <p role="status">
                {busy === "upload" ? "Uploading the original course file…" : "The original course file could not be saved. Your study kit is ready."}
              </p>
              <button className="text-button" disabled={busy !== null} onClick={() => void retryCourseUpload()} type="button">
                Retry file upload
              </button>
            </div>
          ) : null}

          {view === "plan" && learning ? (
              <StagePlan
                bundle={learning.bundle}
                onContinue={() => navigate(quest ? "quest" : "quiz")}
                onPractice={() => switchSection("fun")}
                onToggleTask={toggleTask}
              />
          ) : null}

          {view === "quest" && quest && learning ? (
            <KnowledgeQuest
              quest={quest}
              progress={learning.questProgress ?? newQuestProgress(quest)}
              onAttempt={recordQuestAttempt}
              onReplay={replayQuest}
              onFinish={() => navigate("progress")}
              onInterview={openQuestInterview}
            />
          ) : null}

          {view === "quiz" && learning ? (
            <QuizView
              bundle={learning.bundle}
              onAnswer={answerQuestion}
              onChallenge={() => switchSection("challenge")}
              onFinish={() => navigate("progress")}
              onNext={(nextIndex) => {
                setQuizIndex(nextIndex);
                if (nextIndex >= learning.bundle.quiz.length) {
                  commitLearning({ ...learning, currentStep: "quiz" });
                }
              }}
              questionIndex={quizIndex}
            />
          ) : null}

          {view === "progress" && learning ? (
            <ProgressView
              learning={learning}
              onReset={resetDemo}
              onReviewPlan={() => navigate("plan")}
              onReviewQuiz={openQuiz}
              onReviewQuest={() => navigate("quest")}
            />
          ) : null}
            </>
          )}
        </main>
      </div>

    </div>
  );
}
