import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  KeyRound,
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
import { generateInterviewFollowUp, generateInterviewReport } from "./api";
import { createDemoFollowUp, createDemoReport } from "./demo";
import { INTERVIEW_QUESTIONS } from "./questions";
import {
  clearInterviewSession,
  loadInterviewSession,
  saveInterviewSession,
} from "./storage";
import type {
  InterviewMode,
  InterviewReport,
  InterviewSession,
} from "./types";
import "./interview.css";

type InterviewModuleProps = {
  apiKey: string;
  onRequestApiKey: () => void;
};

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The request could not be completed. Your answers are safe.";
}

function createSession(mode: InterviewMode): InterviewSession {
  return {
    version: 1,
    track: "general-swe",
    level: "junior",
    mode,
    currentQuestionIndex: 0,
    phase: "question",
    answers: [],
  };
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
  apiKey: string;
  onRequestApiKey: () => void;
  onStart: (mode: InterviewMode) => void;
};

function InterviewSetup({ apiKey, onRequestApiKey, onStart }: SetupProps) {
  function startLive() {
    if (!apiKey) {
      onRequestApiKey();
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
            AI mock interview
          </div>
          <h1>Practice the thinking, <span>not just the answer.</span></h1>
          <p>
            Work through a realistic entry-level software engineering interview with
            one targeted follow-up per question and a practical learning report.
          </p>
          <div className="interview-facts">
            <span><Clock3 size={15} /> 8-10 minutes</span>
            <span><MessageSquareText size={15} /> 4 questions + 4 follow-ups</span>
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
            <strong>Entry-level SWE</strong>
            <p>Reasoning · debugging · design · collaboration</p>
          </div>
        </div>
      </section>

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
              DeepSeek listens to each answer, asks one relevant follow-up, and
              writes a personalized feedback report.
            </p>
            <ul>
              <li><Check size={14} /> Adaptive, specific follow-up questions</li>
              <li><Check size={14} /> AI report grounded in your transcript</li>
              <li><KeyRound size={14} /> Requires your DeepSeek API key</li>
            </ul>
            <button className="button primary mode-start" onClick={startLive} type="button">
              {apiKey ? "Start live interview" : "Connect key & start"}
              <ArrowRight size={17} />
            </button>
            {!apiKey ? (
              <p className="mode-footnote">
                Your key stays in this browser tab and is never saved with the interview.
              </p>
            ) : null}
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
              <li><Check size={14} /> Four complete question rounds</li>
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
        {INTERVIEW_QUESTIONS.map((question, index) => (
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
  const currentQuestion = INTERVIEW_QUESTIONS[activeIndex];

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
        <h2>Entry-level SWE</h2>
        <p className="progress-panel-copy">
          Answer naturally. One follow-up will explore a missing detail before the next topic.
        </p>

        <ol className="interview-stepper">
          {INTERVIEW_QUESTIONS.map((question, index) => {
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
            <strong>{session.phase === "report" ? "Complete" : `${activeIndex + 1} of 4`}</strong>
          </div>
          <button className="text-button" onClick={onExit} type="button">
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
                {session.mode === "live" ? "Powered by DeepSeek" : "Local simulated interviewer"}
              </small>
            </div>
          </div>
          <div className="chat-header-meta">
            <span><Clock3 size={14} /> 8-10 min</span>
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
          {INTERVIEW_QUESTIONS.slice(0, activeIndex).map((question, index) => {
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
};

function InterviewReportView({ session, report, onRestart }: ReportProps) {
  const [showTranscript, setShowTranscript] = useState(false);
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
            <div><p className="eyebrow">Full transcript</p><h2>Review your answers</h2></div>
          </div>
          {session.answers.map((answer, index) => (
            <article key={answer.questionId}>
              <span>Question {index + 1}</span>
              <h3>{INTERVIEW_QUESTIONS[index].prompt}</h3>
              <p><strong>You:</strong> {answer.initialAnswer}</p>
              <p><strong>Follow-up:</strong> {answer.followUp}</p>
              <p><strong>Your response:</strong> {answer.followUpAnswer}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default function InterviewModule({
  apiKey,
  onRequestApiKey,
}: InterviewModuleProps) {
  const [session, setSession] = useState<InterviewSession | null>(() =>
    loadInterviewSession(),
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function commit(next: InterviewSession) {
    setSession(next);
    saveInterviewSession(next);
  }

  function startInterview(mode: InterviewMode) {
    setError("");
    setDraft("");
    commit(createSession(mode));
  }

  function restart() {
    if (!window.confirm("Clear this interview transcript and report?")) return;
    clearInterviewSession();
    setSession(null);
    setDraft("");
    setError("");
    setBusy(false);
  }

  async function completeLiveReport(base: InterviewSession) {
    setBusy(true);
    setError("");
    try {
      const report = await generateInterviewReport(apiKey, base);
      commit({ ...base, report });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestionAnswer(current: InterviewSession, answerText: string) {
    const currentQuestion = INTERVIEW_QUESTIONS[current.currentQuestionIndex];
    if (current.mode === "demo") {
      const answer = {
        questionId: currentQuestion.id,
        initialAnswer: answerText,
        followUp: createDemoFollowUp(current.currentQuestionIndex),
        followUpAnswer: "",
      };
      commit({ ...current, phase: "follow-up", answers: [...current.answers, answer] });
      setDraft("");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const followUp = await generateInterviewFollowUp(apiKey, current, answerText);
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

    if (current.currentQuestionIndex === 3) {
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

    const nextIndex = (current.currentQuestionIndex + 1) as 1 | 2 | 3;
    commit({
      ...current,
      currentQuestionIndex: nextIndex,
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

  if (!session) {
    return (
      <InterviewSetup
        apiKey={apiKey}
        onRequestApiKey={onRequestApiKey}
        onStart={startInterview}
      />
    );
  }

  if (session.phase === "report" && session.report) {
    return (
      <InterviewReportView
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
