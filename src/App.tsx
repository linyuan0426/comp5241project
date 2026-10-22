import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Code2,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  KeyRound,
  ListChecks,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Target,
  TestTube2,
  Trophy,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { generateLearningBundle, testDeepSeekConnection } from "./lib/deepseek";
import {
  getNextQuestionIndex,
  getOverallProgress,
  getPlanProgress,
  getQuizStats,
} from "./lib/learning";
import { extractPdf, PdfValidationError } from "./lib/pdf";
import {
  clearApiKey,
  clearLearningState,
  getApiKey,
  loadLearningState,
  saveLearningState,
  setApiKey,
} from "./lib/storage";
import type {
  ExtractedDocument,
  LearningBundle,
  LearningState,
  Step,
} from "./types";

const STEPS: Array<{ id: Step; label: string; icon: typeof UploadCloud }> = [
  { id: "upload", label: "Upload", icon: UploadCloud },
  { id: "plan", label: "Learning plan", icon: ListChecks },
  { id: "quiz", label: "Quiz", icon: CircleHelp },
  { id: "progress", label: "Progress", icon: Target },
];

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

type KeyDialogProps = {
  apiKey: string;
  error: string;
  success: string;
  testing: boolean;
  pendingGeneration: boolean;
  onClose: () => void;
  onClear: () => void;
  onSave: (key: string) => void;
  onTest: (key: string) => void;
};

function KeyDialog({
  apiKey,
  error,
  success,
  testing,
  pendingGeneration,
  onClose,
  onClear,
  onSave,
  onTest,
}: KeyDialogProps) {
  const [draft, setDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setDraft(apiKey);
  }, [apiKey]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="key-dialog-title"
        aria-modal="true"
        className="key-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Close API key settings" className="icon-button modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="dialog-icon">
          <KeyRound size={24} />
        </div>
        <p className="eyebrow">DeepSeek connection</p>
        <h2 id="key-dialog-title">Bring your own API key</h2>
        <p className="dialog-copy">
          Your key stays in this browser tab&apos;s session storage and is sent only to
          DeepSeek. It is never saved with your learning progress.
        </p>

        <label className="field-label" htmlFor="deepseek-key">
          API key
        </label>
        <div className="key-input-wrap">
          <input
            autoComplete="off"
            autoFocus
            id="deepseek-key"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="sk-..."
            type={showKey ? "text" : "password"}
            value={draft}
          />
          <button
            aria-label={showKey ? "Hide API key" : "Show API key"}
            className="key-visibility"
            onClick={() => setShowKey((current) => !current)}
            type="button"
          >
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error ? <p className="inline-message error-message">{error}</p> : null}
        {success ? <p className="inline-message success-message">{success}</p> : null}

        <div className="dialog-actions">
          <button
            className="button secondary"
            disabled={testing || !draft.trim()}
            onClick={() => onTest(draft)}
            type="button"
          >
            <TestTube2 size={17} />
            {testing ? "Testing..." : "Test connection"}
          </button>
          <button
            className="button primary"
            disabled={!draft.trim()}
            onClick={() => onSave(draft)}
            type="button"
          >
            {pendingGeneration ? "Save & generate" : "Save key"}
            <ChevronRight size={17} />
          </button>
        </div>

        {apiKey ? (
          <button className="text-button danger-text" onClick={onClear} type="button">
            Clear saved key
          </button>
        ) : null}
      </section>
    </div>
  );
}

type StagePlanProps = {
  bundle: LearningBundle;
  onToggleTask: (stageId: string, taskId: string) => void;
  onContinue: () => void;
};

function StagePlan({ bundle, onToggleTask, onContinue }: StagePlanProps) {
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
          <button className="button primary" onClick={onContinue} type="button">
            Continue to quiz
            <ChevronRight size={18} />
          </button>
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
};

function QuizView({
  bundle,
  questionIndex,
  onAnswer,
  onNext,
  onFinish,
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

type ProgressViewProps = {
  learning: LearningState;
  onReviewPlan: () => void;
  onReviewQuiz: () => void;
  onReset: () => void;
};

function ProgressView({
  learning,
  onReviewPlan,
  onReviewQuiz,
  onReset,
}: ProgressViewProps) {
  const plan = getPlanProgress(learning.bundle);
  const quiz = getQuizStats(learning.bundle.quiz);
  const overall = getOverallProgress(learning);
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
            Your progress combines completed study tasks and quiz participation. Every
            answer is another chance to sharpen your understanding.
          </p>
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
        <article className="stat-card teal">
          <Zap size={22} />
          <span>Knowledge checks</span>
          <strong>{quiz.answered}/{quiz.total}</strong>
          <p>Questions answered</p>
        </article>
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

export default function App() {
  const [learning, setLearning] = useState<LearningState | null>(() => loadLearningState());
  const [view, setView] = useState<Step>(() => learning?.currentStep ?? "upload");
  const [draft, setDraft] = useState<ExtractedDocument | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState(() => getApiKey());
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState("");
  const [testingKey, setTestingKey] = useState(false);
  const [busy, setBusy] = useState<"parse" | "generate" | null>(null);
  const [pageError, setPageError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [quizIndex, setQuizIndex] = useState(() => {
    if (!learning) return 0;
    const next = getNextQuestionIndex(learning.bundle.quiz);
    return next === -1 ? learning.bundle.quiz.length : next;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!keyDialogOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setKeyDialogOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [keyDialogOpen]);

  function commitLearning(next: LearningState) {
    setLearning(next);
    saveLearningState(next);
  }

  function navigate(step: Step) {
    if (step === "upload") {
      if (!learning) setView("upload");
      return;
    }

    if (!learning) return;
    if (step === "quiz") {
      const next = getNextQuestionIndex(learning.bundle.quiz);
      setQuizIndex(next === -1 ? learning.bundle.quiz.length : next);
    }
    const nextState = { ...learning, currentStep: step };
    commitLearning(nextState);
    setView(step);
  }

  async function processFile(file: File) {
    setBusy("parse");
    setPageError("");
    try {
      const extracted = await extractPdf(file);
      setDraft(extracted);
    } catch (error) {
      if (error instanceof PdfValidationError) {
        setPageError(error.message);
      } else {
        setPageError(
          `This PDF could not be read. ${errorMessage(error)} Please try another text-based PDF.`,
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function loadSample() {
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

  function openKeyDialog(forGeneration = false) {
    setPendingGeneration(forGeneration);
    setKeyError("");
    setKeySuccess("");
    setKeyDialogOpen(true);
  }

  function saveKey(key: string) {
    const trimmed = key.trim();
    setApiKey(trimmed);
    setApiKeyValue(trimmed);
    setKeyDialogOpen(false);
    setPageError("");

    if (pendingGeneration) {
      void generateKit(trimmed);
    }
    setPendingGeneration(false);
  }

  async function testKey(key: string) {
    setTestingKey(true);
    setKeyError("");
    setKeySuccess("");
    try {
      await testDeepSeekConnection(key);
      setKeySuccess("Connection successful. Your key is ready.");
    } catch (error) {
      setKeyError(errorMessage(error));
    } finally {
      setTestingKey(false);
    }
  }

  function handleClearKey() {
    clearApiKey();
    setApiKeyValue("");
    setKeyError("");
    setKeySuccess("Saved key cleared from this browser session.");
  }

  function requestGeneration() {
    if (!draft) return;
    if (!apiKeyValue) {
      openKeyDialog(true);
      return;
    }
    void generateKit(apiKeyValue);
  }

  async function generateKit(key: string) {
    if (!draft) return;
    setBusy("generate");
    setPageError("");
    try {
      const bundle = await generateLearningBundle(key, draft.text);
      const next: LearningState = {
        version: 1,
        document: draft.meta,
        bundle,
        currentStep: "plan",
      };
      commitLearning(next);
      setDraft(null);
      setQuizIndex(0);
      setView("plan");
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setBusy(null);
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
    if (!window.confirm("Reset the demo and clear all saved learning progress?")) return;
    clearLearningState();
    setLearning(null);
    setDraft(null);
    setPageError("");
    setQuizIndex(0);
    setView("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function requestNewDocument() {
    if (!window.confirm("Uploading a new PDF will replace the current learning progress. Continue?")) {
      return;
    }
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

  const currentStepIndex = STEPS.findIndex((step) => step.id === view);
  const planSnapshot = learning ? getPlanProgress(learning.bundle) : null;

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
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const available = step.id === "upload" || Boolean(learning);
            const complete =
              index < currentStepIndex && (step.id !== "plan" || (planSnapshot?.percent ?? 0) === 100);
            return (
              <button
                aria-current={view === step.id ? "step" : undefined}
                className={view === step.id ? "active" : ""}
                disabled={!available}
                key={step.id}
                onClick={() => {
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
          <p className="nav-label">Coming next</p>
          <div className="future-item">
            <Code2 size={18} />
            <div><span>Virtual Workspace</span><small>AI coding lab</small></div>
            <LockKeyhole size={14} />
          </div>
          <div className="future-item">
            <BriefcaseBusiness size={18} />
            <div><span>Mock Interview</span><small>Practice with AI</small></div>
            <LockKeyhole size={14} />
          </div>
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
            <span className="breadcrumb">Learning Studio</span>
            <ChevronRight size={14} />
            <strong>{STEPS.find((step) => step.id === view)?.label}</strong>
          </div>
          <button className="key-status" onClick={() => openKeyDialog(false)} type="button">
            <span className={apiKeyValue ? "key-dot connected" : "key-dot"} />
            <KeyRound size={16} />
            <span>{apiKeyValue ? "DeepSeek connected" : "Add DeepSeek key"}</span>
          </button>
        </header>

        <main className="main-content">
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
                  Upload a PDF and let AI build a focused study plan, then test your
                  understanding with instant, source-grounded feedback.
                </p>
                <div className="feature-pills">
                  <span><Check size={14} /> AI summary</span>
                  <span><Check size={14} /> Guided plan</span>
                  <span><Check size={14} /> Instant quiz</span>
                </div>
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
                    accept=".pdf,application/pdf"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void processFile(file);
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                  <div className="upload-icon"><UploadCloud size={27} /></div>
                  <h2>{busy === "parse" ? "Reading your document..." : "Drop your course PDF here"}</h2>
                  <p>Text-based PDF, up to 10 MB and 50 pages</p>
                  <div className="upload-actions">
                    <button
                      className="button primary"
                      disabled={busy !== null}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      Choose PDF
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
                  <div className="document-ready">
                    <div className="document-ready-icon"><Check size={21} /></div>
                    <div className="document-ready-copy">
                      <span>Ready to generate</span>
                      <strong>{draft.meta.name}</strong>
                      <p>
                        {draft.meta.pageCount} pages · {draft.meta.characterCount.toLocaleString()} characters
                        · {formatBytes(new Blob([draft.text]).size)} text
                      </p>
                    </div>
                    <button
                      className="button primary"
                      disabled={busy !== null}
                      onClick={requestGeneration}
                      type="button"
                    >
                      <Sparkles size={17} />
                      {busy === "generate" ? "Building your plan..." : "Generate study kit"}
                    </button>
                  </div>
                ) : null}

                {busy === "generate" ? (
                  <div className="generation-status" role="status">
                    <span className="spinner" />
                    <div>
                      <strong>DeepSeek is mapping your learning path</strong>
                      <p>Summarizing concepts, sequencing practice, and writing quiz questions.</p>
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

          {view === "plan" && learning ? (
            <>
              {pageError ? (
                <div className="page-error floating" role="alert">
                  <CircleHelp size={19} />
                  <div><strong>Generation failed</strong><p>{pageError}</p></div>
                  <button className="text-button" onClick={() => setPageError("")} type="button">Dismiss</button>
                </div>
              ) : null}
              <StagePlan
                bundle={learning.bundle}
                onContinue={openQuiz}
                onToggleTask={toggleTask}
              />
            </>
          ) : null}

          {view === "quiz" && learning ? (
            <QuizView
              bundle={learning.bundle}
              onAnswer={answerQuestion}
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
            />
          ) : null}
        </main>
      </div>

      {keyDialogOpen ? (
        <KeyDialog
          apiKey={apiKeyValue}
          error={keyError}
          onClear={handleClearKey}
          onClose={() => {
            setKeyDialogOpen(false);
            setPendingGeneration(false);
          }}
          onSave={saveKey}
          onTest={(key) => void testKey(key)}
          pendingGeneration={pendingGeneration}
          success={keySuccess}
          testing={testingKey}
        />
      ) : null}
    </div>
  );
}
