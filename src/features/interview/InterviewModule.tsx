import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Lightbulb,
  MessageSquareText,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useProgressStorage } from "../account/progress-storage";
import { generateInterviewFollowUp, generateInterviewReport } from "./api";
import { createDemoFollowUp, createDemoReport } from "./demo";
import { createTaskQuestions, getSessionQuestions, INTERVIEW_QUESTIONS } from "./questions";
import {
  clearInterviewSession,
  loadInterviewSession,
  saveInterviewSession,
} from "./storage";
import type {
  InterviewMode,
  InterviewReport,
  InterviewSession,
  InterviewTask,
} from "./types";
import "./interview.css";

type InterviewModuleProps = {
  canUseLive?: boolean;
  onSignIn?: () => void;
  task?: InterviewTask;
};

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The request could not be completed. Your answers are safe.";
}

function createSession(mode: InterviewMode, task?: InterviewTask): InterviewSession {
  return {
    version: 1,
    track: "general-swe",
    level: "junior",
    mode,
    currentQuestionIndex: 0,
    phase: "question",
    answers: [],
    ...(task ? { task, questions: createTaskQuestions(task) } : {}),
  };
}

function isSamePractice(previous: InterviewTask, current: InterviewTask) {
  return previous.attemptId === current.attemptId
    && previous.title === current.title
    && previous.decision === current.decision
    && previous.result === current.result
    && previous.evidence.length === current.evidence.length
    && previous.evidence.every((item, index) => item === current.evidence[index]);
}

function TaskBrief({ task }: { task: InterviewTask }) {
  return (
    <details className="task-interview-brief">
      <summary>Recorded practice from {task.title}</summary>
      <p><strong>Decision</strong> {task.decision}</p>
      <p><strong>Outcome</strong> {task.result}</p>
      <ul>{task.evidence.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
    </details>
  );
}

function modeLabel(mode: InterviewMode) {
  return mode === "live" ? "Live AI" : "Demo mode";
}

type MessageProps = {
  speaker: "interviewer" | "candidate";
  label: string;
  children: React.ReactNode;
  followUp?: boolean;
};

function ChatMessage({ speaker, label, children, followUp = false }: MessageProps) {
  return (
    <article className={`chat-message ${speaker} ${followUp ? "follow-up" : ""}`}>
      <div className="chat-avatar" aria-hidden="true">
        {speaker === "interviewer" ? <Bot size={18} /> : <UserRound size={18} />}
      </div>
      <div className="chat-bubble">
        <div className="chat-label-row">
          <strong>{label}</strong>
          {followUp ? <span>Follow-up</span> : null}
        </div>
        <div className="chat-copy">{children}</div>
      </div>
    </article>
  );
}

type SetupProps = {
  canUseLive?: boolean;
  onSignIn?: () => void;
  onStart: (mode: InterviewMode) => void;
  task?: InterviewTask;
};

function InterviewSetup({ canUseLive, onSignIn, onStart, task }: SetupProps) {
  const questions = task ? createTaskQuestions(task) : INTERVIEW_QUESTIONS;
  function startLive() {
    if (!canUseLive) {
      onSignIn?.();
      return;
    }
    onStart("live");
  }

  return (
    <div className="interview-setup">
      <section className="interview-hero">
        <div className="interview-hero-copy">
          <div className="interview-kicker">
            <BriefcaseBusiness size={16} />
            {task ? "Task interview" : "AI mock interview"}
          </div>
          {task ? <h1>Explain your <span>practice decisions.</span></h1>
            : <h1>Practice the thinking, <span>not just the answer.</span></h1>}
          <p>
            {task
              ? `Discuss your choices in ${task.title}. Each question uses your recorded practice.`
              : "Work through a realistic entry-level software engineering interview with one targeted follow-up per question and a practical learning report."}
          </p>
          <div className="interview-facts">
            <span><Clock3 size={15} /> {task ? "4–5" : "8–10"} minutes</span>
            <span><MessageSquareText size={15} /> {questions.length} questions + {questions.length} follow-ups</span>
            <span><Target size={15} /> Learning feedback</span>
          </div>
        </div>
        <div className="interview-hero-art" aria-hidden="true">
          <div className="hero-art-grid">
            <span><Code2 size={18} /></span>
            <span><Bot size={21} /></span>
            <span><Lightbulb size={18} /></span>
            <span><Check size={18} /></span>
          </div>
          <div className="hero-art-card">
            <span>INTERVIEW BRIEF</span>
            <strong>{task ? "Practice review" : "Entry-level SWE"}</strong>
            <p>{task ? "Decision · evidence · verification" : "Reasoning · debugging · design · collaboration"}</p>
          </div>
        </div>
      </section>
      {task ? <TaskBrief task={task} /> : null}

      <section className="interview-mode-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Choose your session</p>
            <h2>How would you like to practice?</h2>
          </div>
          <span className="interview-format-pill">
            <ShieldCheck size={14} />
            No hire/no-hire decision
          </span>
        </div>

        <div className="mode-grid">
          <article className="mode-card live">
            <div className="mode-card-top">
              <div className="mode-icon"><Sparkles size={22} /></div>
              <span className="mode-badge">Real-time</span>
            </div>
            <h3>Live AI interview</h3>
            <p>
              The interviewer uses each answer to ask a relevant follow-up and
              writes a personalized feedback report.
            </p>
            <ul>
              <li><Check size={14} /> Adaptive, specific follow-up questions</li>
              <li><Check size={14} /> AI report grounded in your transcript</li>
              <li><UserRound size={14} /> Available to signed-in learners</li>
            </ul>
            <button className="button primary mode-start" onClick={startLive} type="button">
              {canUseLive ? "Start live interview" : "Sign in to start"}
              <ArrowRight size={17} />
            </button>
          </article>

          <article className="mode-card demo">
            <div className="mode-card-top">
              <div className="mode-icon"><Play size={22} /></div>
              <span className="mode-badge demo-badge">Demo mode</span>
            </div>
            <h3>Try the complete flow</h3>
            <p>
              Run the same interview structure without a key or network. Questions,
              follow-ups, and scoring use an explicit local simulation.
            </p>
            <ul>
              <li><Check size={14} /> {questions.length} complete question rounds</li>
              <li><Check size={14} /> Instant local learning report</li>
              <li><Check size={14} /> Clearly labeled simulated results</li>
            </ul>
            <button className="button secondary mode-start" onClick={() => onStart("demo")} type="button">
              Start demo interview
              <ArrowRight size={17} />
            </button>
            <p className="mode-footnote">
              No API calls are made. Results are for interface demonstration and reflection.
            </p>
          </article>
        </div>
      </section>

      <section className="interview-topic-strip">
        {questions.map((question, index) => (
          <div key={question.id}>
            <span>0{index + 1}</span>
            <strong>{question.topic}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}

type ChatProps = {
  session: InterviewSession;
  busy: boolean;
  error: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onRetryReport: () => void;
  onSwitchToDemo: () => void;
  onExit: () => void;
};

function InterviewChat({
  session,
  busy,
  error,
  draft,
  onDraftChange,
  onSubmit,
  onRetryReport,
  onSwitchToDemo,
  onExit,
}: ChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const activeIndex = session.currentQuestionIndex;
  const currentAnswer = session.answers[activeIndex];
  const questions = getSessionQuestions(session);
  const currentQuestion = questions[activeIndex];

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [session.phase, session.answers.length, busy, error]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy && draft.trim()) onSubmit();
    }
  }

  return (
    <div className="interview-workspace">
      <aside className="interview-progress-panel">
        <div className="progress-panel-heading">
          <p className="eyebrow">Session progress</p>
          <span className={`session-mode ${session.mode}`}>
            {session.mode === "demo" ? <Play size={12} /> : <Sparkles size={12} />}
            {modeLabel(session.mode)}
          </span>
        </div>
        <h2>{session.task ? "Task interview" : "Entry-level SWE"}</h2>
        <p className="progress-panel-copy">
          Answer naturally. One follow-up will explore a missing detail before the next topic.
        </p>
        {session.task ? <TaskBrief task={session.task} /> : null}

        <ol className="interview-stepper">
          {questions.map((question, index) => {
            const complete = index < activeIndex || session.phase === "report";
            const current = index === activeIndex && session.phase !== "report";
            return (
              <li className={complete ? "complete" : current ? "current" : ""} key={question.id}>
                <span>{complete ? <Check size={14} /> : index + 1}</span>
                <div>
                  <strong>{question.topic}</strong>
                  <small>{complete ? "Complete" : current ? "In progress" : "Up next"}</small>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="progress-panel-footer">
          <div>
            <span>Question</span>
            <strong>{session.phase === "report" ? "Complete" : `${activeIndex + 1} of ${questions.length}`}</strong>
          </div>
          <button className="text-button" disabled={busy} onClick={onExit} type="button">
            <RotateCcw size={14} />
            Restart
          </button>
        </div>
      </aside>

      <section className="interview-chat-panel">
        <header className="interview-chat-header">
          <div className="interviewer-identity">
            <span><Bot size={20} /></span>
            <div>
              <strong>Pathwise Interviewer</strong>
              <small>
                {session.mode === "live" ? "Live AI interviewer" : "Local simulated interviewer"}
              </small>
            </div>
          </div>
          <div className="chat-header-meta">
            <span><Clock3 size={14} /> {session.task ? "4–5" : "8–10"} min</span>
            <span className={session.mode === "demo" ? "demo-indicator" : "live-indicator"}>
              {modeLabel(session.mode)}
            </span>
          </div>
        </header>

        {session.mode === "demo" ? (
          <div className="demo-notice" role="status">
            <ShieldCheck size={16} />
            <p>
              <strong>Demo mode.</strong> Follow-ups and scores are simulated locally, not generated
              by a live model.
            </p>
          </div>
        ) : null}

        <div className="chat-log" role="log" aria-live="polite">
          {questions.slice(0, session.phase === "report" ? questions.length : activeIndex).map((question, index) => {
            const answer = session.answers[index];
            if (!answer) return null;
            return (
              <div className="chat-round" key={question.id}>
                <ChatMessage speaker="interviewer" label="Interviewer">
                  <p>{question.prompt}</p>
                </ChatMessage>
                <ChatMessage speaker="candidate" label="You">
                  <p>{answer.initialAnswer}</p>
                </ChatMessage>
                <ChatMessage followUp speaker="interviewer" label="Interviewer">
                  <p>{answer.followUp}</p>
                </ChatMessage>
                <ChatMessage speaker="candidate" label="You">
                  <p>{answer.followUpAnswer}</p>
                </ChatMessage>
              </div>
            );
          })}

          {session.phase !== "report" ? (
            <div className="chat-round active">
              <ChatMessage speaker="interviewer" label="Interviewer">
                <p>{currentQuestion.prompt}</p>
              </ChatMessage>
              {currentAnswer ? (
                <>
                  <ChatMessage speaker="candidate" label="You">
                    <p>{currentAnswer.initialAnswer}</p>
                  </ChatMessage>
                  <ChatMessage followUp speaker="interviewer" label="Interviewer">
                    <p>{currentAnswer.followUp}</p>
                  </ChatMessage>
                </>
              ) : null}
            </div>
          ) : null}

          {busy ? (
            <div className="interview-typing" role="status">
              <span className="typing-dots"><i /><i /><i /></span>
              <span>
                {busy && session.phase === "report"
                  ? "Building your learning report..."
                  : "Interviewer is thinking..."}
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="interview-error" role="alert">
              <CircleAlert size={18} />
              <div>
                <strong>We couldn&apos;t continue the interview</strong>
                <p>{error}</p>
                <div className="error-actions">
                  {session.phase === "report" ? (
                    <button className="text-button" onClick={onRetryReport} type="button">
                      Retry report
                    </button>
                  ) : null}
                  <button className="text-button" onClick={onSwitchToDemo} type="button">
                    Continue in Demo mode
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {session.phase === "report" && !busy ? (
            <div className="report-pending">
              <CircleAlert size={24} />
              <strong>Your transcript is saved.</strong>
              <p>Retry the report or continue this session in Demo mode.</p>
              {!error ? (
                <div className="error-actions">
                  <button className="text-button" onClick={onRetryReport} type="button">Retry report</button>
                  <button className="text-button" onClick={onSwitchToDemo} type="button">Continue in Demo mode</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {session.phase !== "report" ? (
          <div className="interview-composer">
            <label htmlFor="interview-answer">
              {session.phase === "follow-up" ? "Answer the follow-up" : "Your answer"}
            </label>
            <textarea
              disabled={busy}
              id="interview-answer"
              maxLength={4000}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                session.phase === "follow-up"
                  ? "Address the tradeoff or missing detail..."
                  : "Talk through your approach, assumptions, and next steps..."
              }
              rows={4}
              value={draft}
            />
            <div className="composer-footer">
              <span>Enter to send · Shift+Enter for a new line</span>
              <button
                className="button primary"
                disabled={busy || draft.trim().length < 10}
                onClick={onSubmit}
                type="button"
              >
                <Send size={16} />
                {busy ? "Sending..." : session.phase === "follow-up" ? "Continue" : "Send answer"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type ReportProps = {
  session: InterviewSession;
  report: InterviewReport;
  onRestart: () => void;
  onRevision: (questionId: string, answer: string) => void;
};

function InterviewReportView({ session, report, onRestart, onRevision }: ReportProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [revisionDraft, setRevisionDraft] = useState("");
  const questions = getSessionQuestions(session);
  const average =
    report.dimensions.reduce((total, dimension) => total + dimension.score, 0) /
    report.dimensions.length;

  return (
    <div className="interview-report">
      <section className="report-hero">
        <div>
          <span className={`session-mode ${session.mode}`}>
            {session.mode === "demo" ? <Play size={12} /> : <Sparkles size={12} />}
            {modeLabel(session.mode)}
          </span>
          <p className="eyebrow">Interview feedback</p>
          <h1>Your learning report is ready.</h1>
          <p>{report.summary}</p>
        </div>
        <div
          className="interview-score-ring"
          style={{ "--score-progress": `${(average / 5) * 360}deg` } as React.CSSProperties}
          aria-label={`Average dimension score ${average.toFixed(1)} out of 5`}
        >
          <div>
            <strong>{average.toFixed(1)}</strong>
            <span>out of 5</span>
          </div>
        </div>
      </section>
      {session.task ? <TaskBrief task={session.task} /> : null}

      <div className="report-disclaimer">
        <ShieldCheck size={17} />
        <p>
          This is formative practice feedback, not a hiring decision. Scores are most useful
          as prompts for another practice attempt.
        </p>
      </div>

      <section className="dimension-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Five dimensions</p>
            <h2>What the interview revealed</h2>
          </div>
          <span className="interview-format-pill">
            <Target size={14} />
            Evidence-based
          </span>
        </div>
        <div className="dimension-grid">
          {report.dimensions.map((dimension) => (
            <article className="dimension-card" key={dimension.id}>
              <div className="dimension-heading">
                <strong>{dimension.label}</strong>
                <span>{dimension.score}/5</span>
              </div>
              <div className="score-track" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((point) => (
                  <i className={point <= dimension.score ? "filled" : ""} key={point} />
                ))}
              </div>
              <p className="dimension-evidence">“{dimension.evidence}”</p>
              <div className="dimension-improvement">
                <Lightbulb size={15} />
                <p>{dimension.improvement}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="feedback-columns">
        <section className="feedback-card strengths">
          <div className="feedback-card-heading">
            <Check size={18} />
            <h2>What worked</h2>
          </div>
          <ul>
            {report.strengths.map((strength) => <li key={strength}>{strength}</li>)}
          </ul>
        </section>
        <section className="feedback-card improvements">
          <div className="feedback-card-heading">
            <Target size={18} />
            <h2>What to sharpen</h2>
          </div>
          <ul>
            {report.improvements.map((improvement) => <li key={improvement}>{improvement}</li>)}
          </ul>
        </section>
        <section className="feedback-card practice">
          <div className="feedback-card-heading">
            <Sparkles size={18} />
            <h2>Next practice</h2>
          </div>
          <ol>
            {report.nextPractice.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>
      </div>

      <div className="report-actions">
        <button
          className="button secondary"
          aria-expanded={showTranscript}
          onClick={() => setShowTranscript((current) => !current)}
          type="button"
        >
          <MessageSquareText size={16} />
          {showTranscript ? "Hide transcript" : "Review transcript"}
        </button>
        <button className="button primary" onClick={onRestart} type="button">
          <RotateCcw size={16} />
          Practice again
        </button>
      </div>

      {showTranscript ? (
        <section className="transcript-review">
          <div className="section-heading">
            <div><p className="eyebrow">Full transcript</p><h2>Review and retry your answers</h2></div>
          </div>
          {session.answers.map((answer, index) => {
            const question = questions[index];
            const revisions = session.revisions?.filter(({ questionId }) => questionId === answer.questionId) ?? [];
            const latest = revisions.at(-1);
            return (
              <article key={answer.questionId}>
                <span>Question {index + 1}</span>
                <h3>{question.prompt}</h3>
                <div className={latest ? "interview-answer-comparison" : undefined}>
                  <div><strong>Original answer</strong><p>{answer.initialAnswer}</p></div>
                  {latest ? <div><strong>Latest revision</strong><p>{latest.answer}</p></div> : null}
                </div>
                <p><strong>Follow-up:</strong> {answer.followUp}</p>
                <p><strong>Your response:</strong> {answer.followUpAnswer}</p>
                {revisions.length > 1 ? (
                  <details>
                    <summary>Earlier revisions ({revisions.length - 1})</summary>
                    <ol>{revisions.slice(0, -1).map((revision, revisionIndex) =>
                      <li key={revisionIndex}>{revision.answer}</li>,
                    )}</ol>
                  </details>
                ) : null}
                {retryQuestion === answer.questionId ? (
                  <form className="interview-revision-form" onSubmit={(event) => {
                    event.preventDefault();
                    if (revisionDraft.trim().length < 10) return;
                    onRevision(answer.questionId, revisionDraft.trim());
                    setRetryQuestion(null);
                  }}>
                    <p><strong>Practice focus</strong> {question.improvement}</p>
                    <label htmlFor="interview-revision">Revised answer</label>
                    <textarea
                      autoFocus
                      id="interview-revision"
                      maxLength={4000}
                      onChange={(event) => setRevisionDraft(event.target.value)}
                      rows={4}
                      value={revisionDraft}
                    />
                    <button className="button primary" disabled={revisionDraft.trim().length < 10} type="submit">Save revision</button>
                    <button className="button secondary" onClick={() => setRetryQuestion(null)} type="button">Cancel</button>
                  </form>
                ) : (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setRetryQuestion(answer.questionId);
                      setRevisionDraft(latest?.answer ?? answer.initialAnswer);
                    }}
                    type="button"
                  >Retry question {index + 1}</button>
                )}
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

export default function InterviewModule({
  canUseLive = true,
  onSignIn,
  task,
}: InterviewModuleProps) {
  const storage = useProgressStorage();
  const [session, setSession] = useState<InterviewSession | null>(() =>
    loadInterviewSession(task?.kind, storage),
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [continuePrevious, setContinuePrevious] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function commit(next: InterviewSession) {
    if (!mounted.current) return;
    setSession(next);
    saveInterviewSession(next, storage);
  }

  function startInterview(mode: InterviewMode) {
    setError("");
    setDraft("");
    commit(createSession(mode, task));
  }

  function restart() {
    if (busy || !window.confirm("Clear this interview transcript, revisions and report?")) return;
    clearInterviewSession(task?.kind, storage);
    setSession(null);
    setDraft("");
    setError("");
    setBusy(false);
  }

  async function completeLiveReport(base: InterviewSession) {
    setBusy(true);
    setError("");
    try {
      const report = await generateInterviewReport(base);
      commit({ ...base, report });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestionAnswer(current: InterviewSession, answerText: string) {
    const questions = getSessionQuestions(current);
    const currentQuestion = questions[current.currentQuestionIndex];
    if (current.mode === "demo") {
      const answer = {
        questionId: currentQuestion.id,
        initialAnswer: answerText,
        followUp: createDemoFollowUp(current.currentQuestionIndex, questions),
        followUpAnswer: "",
      };
      commit({ ...current, phase: "follow-up", answers: [...current.answers, answer] });
      setDraft("");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const followUp = await generateInterviewFollowUp(current, answerText);
      const answer = {
        questionId: currentQuestion.id,
        initialAnswer: answerText,
        followUp,
        followUpAnswer: "",
      };
      commit({ ...current, phase: "follow-up", answers: [...current.answers, answer] });
      setDraft("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submitFollowUpAnswer(current: InterviewSession, answerText: string) {
    const updatedAnswers = current.answers.map((answer, index) =>
      index === current.currentQuestionIndex
        ? { ...answer, followUpAnswer: answerText }
        : answer,
    );

    if (current.currentQuestionIndex === getSessionQuestions(current).length - 1) {
      const reportBase = { ...current, phase: "report" as const, answers: updatedAnswers };
      commit(reportBase);
      setDraft("");
      if (reportBase.mode === "demo") {
        commit({ ...reportBase, report: createDemoReport(reportBase) });
      } else {
        await completeLiveReport(reportBase);
      }
      return;
    }

    commit({
      ...current,
      currentQuestionIndex: current.currentQuestionIndex + 1,
      phase: "question",
      answers: updatedAnswers,
    });
    setDraft("");
  }

  function submitAnswer() {
    const answerText = draft.trim();
    if (!session || answerText.length < 10 || busy) return;
    setError("");
    if (session.phase === "question") {
      void submitQuestionAnswer(session, answerText);
    } else if (session.phase === "follow-up") {
      void submitFollowUpAnswer(session, answerText);
    }
  }

  function retryReport() {
    if (!session || session.phase !== "report") return;
    if (session.mode === "demo") {
      commit({ ...session, report: createDemoReport(session) });
    } else {
      void completeLiveReport({ ...session, report: undefined });
    }
  }

  function switchToDemo() {
    if (!session) return;
    const next = { ...session, mode: "demo" as const };
    setError("");
    if (next.phase === "report") {
      commit({ ...next, report: createDemoReport(next) });
    } else {
      commit(next);
    }
  }

  if (task && session?.task && !continuePrevious && !isSamePractice(session.task, task)) {
    return (
      <section className="panel scenario-panel">
        <h2>Choose a task interview</h2>
        <p>A saved interview uses evidence from an earlier practice. You can resume it or start with your latest practice.</p>
        <button className="button secondary" onClick={() => setContinuePrevious(true)} type="button">
          Continue saved interview
        </button>
        <button className="button primary" onClick={() => setSession(null)} type="button">
          Use latest practice
        </button>
        <p>The saved interview is replaced when you start a new one.</p>
      </section>
    );
  }

  if (!session) {
    return (
      <InterviewSetup
        canUseLive={canUseLive}
        onSignIn={onSignIn}
        onStart={startInterview}
        task={task}
      />
    );
  }

  if (session.phase === "report" && session.report) {
    return (
      <InterviewReportView
        onRevision={(questionId, answer) => commit({
          ...session, revisions: [...(session.revisions ?? []), { questionId, answer }],
        })}
        onRestart={restart}
        report={session.report}
        session={session}
      />
    );
  }

  return (
    <InterviewChat
      busy={busy}
      draft={draft}
      error={error}
      onDraftChange={setDraft}
      onExit={restart}
      onRetryReport={retryReport}
      onSubmit={submitAnswer}
      onSwitchToDemo={switchToDemo}
      session={session}
    />
  );
}
