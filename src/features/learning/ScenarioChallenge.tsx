import { ArrowLeft, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useProgressStorage, type ProgressStorage } from "../account/progress-storage";
import type { InterviewTask } from "../interview/types";
import { scenarioCases, scenarioIds, type ScenarioId } from "./scenario-cases";
import "./learning.css";

const sessionSchema = z.object({
  run: z.number().int().positive(),
  step: z.number().int().min(0).max(2),
  selected: z.number().int().min(0).max(2).nullable(),
  history: z.array(z.object({
    run: z.number().int().positive(),
    step: z.string(),
    choice: z.string(),
    feedback: z.string(),
  })),
});
type Session = z.infer<typeof sessionSchema>;
const storageKey = "genai-scenario-discount:v1";
const initialSession: Session = { run: 1, step: 0, selected: null, history: [] };
const progressSchema = sessionSchema.extend({
  activeCase: z.enum(scenarioIds).default("discount"),
  cases: z.partialRecord(z.enum(scenarioIds).exclude(["discount"]), sessionSchema).default({}),
});

type ScenarioProgress = {
  activeCase: ScenarioId;
  sessions: Partial<Record<ScenarioId, Session>> & { discount: Session };
};

function loadProgress(storage: ProgressStorage): ScenarioProgress {
  try {
    const parsed = progressSchema.safeParse(JSON.parse(storage.getItem(storageKey) ?? "null"));
    if (parsed.success) {
      const { activeCase, cases, ...discount } = parsed.data;
      return { activeCase, sessions: { ...cases, discount } };
    }
  } catch {
    // A missing or unreadable record starts a fresh challenge.
  }
  return { activeCase: "discount", sessions: { discount: initialSession } };
}

function caseStatus(id: ScenarioId, session?: Session) {
  if (session?.step === scenarioCases[id].steps.length) return "Complete";
  return session?.history.length ? "In progress" : "Not started";
}

export default function ScenarioChallenge({ onBack, onInterview }: {
  onBack: () => void;
  onInterview: (task: InterviewTask) => void;
}) {
  const storage = useProgressStorage();
  const [progress, setProgress] = useState(() => loadProgress(storage));
  const { activeCase, sessions } = progress;
  const scenario = scenarioCases[activeCase];
  const session = sessions[activeCase] ?? initialSession;
  const { steps } = scenario;
  const step = steps[session.step];
  const result = session.selected === null ? null : step?.choices[session.selected];
  const currentHistory = session.history.filter(({ run }) => run === session.run);
  const finalDecision = currentHistory.at(-1);

  function practiceInterview() {
    if (!finalDecision) return;
    onInterview({
      kind: "scenario",
      scenarioId: activeCase,
      attemptId: activeCase === "discount" ? String(session.run) : `${activeCase}:${session.run}`,
      title: scenario.interviewTitle,
      decision: finalDecision.choice,
      result: finalDecision.feedback,
      evidence: currentHistory.slice(-6)
        .map(({ step, choice, feedback }) => `${step}: ${choice}. ${feedback}`),
    });
  }

  function saveProgress(next: ScenarioProgress) {
    setProgress(next);
    try {
      // The original checkout fields stay at the top level for existing records.
      const { discount, ...cases } = next.sessions;
      storage.setItem(storageKey, JSON.stringify({ ...discount, activeCase: next.activeCase, cases }));
    } catch {
      // The current attempt remains available in memory.
    }
  }

  function save(next: Session) {
    saveProgress({ activeCase, sessions: { ...sessions, [activeCase]: next } });
  }

  function choose(index: number) {
    const choice = step?.choices[index];
    if (!choice || session.selected !== null) return;
    save({
      ...session,
      selected: index,
      history: [...session.history, {
        run: session.run,
        step: step.title,
        choice: choice.label,
        feedback: choice.feedback,
      }],
    });
  }

  return (
    <section className="scenario-challenge" aria-labelledby="scenario-title">
      <button className="text-button" onClick={onBack} type="button">
        <ArrowLeft size={16} aria-hidden="true" /> Back to learning
      </button>
      <header>
        <p className="eyebrow">Software engineering practice</p>
        <h1 id="scenario-title">Scenario Challenge</h1>
        <p>Choose a case, see what your decisions change, and try another approach.</p>
      </header>

      <nav className="scenario-cases" aria-label="Choose a scenario">
        {scenarioIds.map((id) => (
          <button
            aria-pressed={id === activeCase}
            className="button secondary"
            key={id}
            onClick={() => saveProgress({ ...progress, activeCase: id })}
            type="button"
          >
            <strong>{scenarioCases[id].title}</strong>
            <span>{caseStatus(id, sessions[id])}</span>
          </button>
        ))}
      </nav>

      <div className="panel scenario-panel">
        <p>{scenario.description}</p>
        {step ? (
          <>
            <p className="eyebrow">Decision {session.step + 1} of {steps.length}</p>
            <h2>{step.title}</h2>
            <p>{step.situation}</p>
            {step.code ? <pre><code>{step.code}</code></pre> : null}
            <div className="scenario-options">
              {step.choices.map((choice, index) => (
                <button
                  aria-pressed={session.selected === index}
                  className="button secondary"
                  disabled={session.selected !== null}
                  key={choice.label}
                  onClick={() => choose(index)}
                  type="button"
                >
                  {choice.label}
                </button>
              ))}
            </div>
            {result ? (
              <div className={`scenario-feedback ${result.advances ? "passes" : ""}`} role="status">
                <p>{result.feedback}</p>
                {!result.advances ? <p><Lightbulb size={16} aria-hidden="true" /> {step.hint}</p> : null}
                <button
                  className="button primary"
                  onClick={() => save({ ...session, step: session.step + Number(result.advances), selected: null })}
                  type="button"
                >
                  {result.advances ? session.step === steps.length - 1 ? "Finish challenge" : scenario.nextLabel : "Try another choice"}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2>Challenge complete</h2>
            <p>{scenario.completion}</p>
            <button className="button primary" disabled={!finalDecision} onClick={practiceInterview} type="button">
              Practice task interview
            </button>
            <button
              className="button secondary"
              onClick={() => save({ ...initialSession, run: session.run + 1, history: session.history })}
              type="button"
            >
              <RotateCcw size={16} aria-hidden="true" /> Replay challenge
            </button>
          </>
        )}
      </div>

      {session.history.length > 0 ? (
        <details className="panel scenario-history">
          <summary>Decision history ({session.history.length})</summary>
          <ol>
            {session.history.map((entry, index) => (
              <li key={index}>
                <strong>Run {entry.run} · {entry.step}</strong>
                <p>{entry.choice}</p>
                <p>{entry.feedback}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
