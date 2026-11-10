import { ArrowLeft, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useProgressStorage, type ProgressStorage } from "../account/progress-storage";
import type { InterviewTask } from "../interview/types";
import "./learning.css";

const steps = [
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
] as const;

const sessionSchema = z.object({
  run: z.number().int().positive(),
  step: z.number().int().min(0).max(steps.length),
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

function loadSession(storage: ProgressStorage): Session {
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(storage.getItem(storageKey) ?? "null"));
    return parsed.success ? parsed.data : initialSession;
  } catch {
    return initialSession;
  }
}

export default function ScenarioChallenge({ onBack, onInterview }: {
  onBack: () => void;
  onInterview: (task: InterviewTask) => void;
}) {
  const storage = useProgressStorage();
  const [session, setSession] = useState(() => loadSession(storage));
  const step = steps[session.step];
  const result = session.selected === null ? null : step?.choices[session.selected];
  const finalDecision = session.history.at(-1);

  function practiceInterview() {
    if (!finalDecision) return;
    onInterview({
      kind: "scenario",
      attemptId: String(session.run),
      title: "the checkout discount challenge",
      decision: finalDecision.choice,
      result: finalDecision.feedback,
      evidence: session.history.filter(({ run }) => run === session.run).slice(-6)
        .map(({ step, choice, feedback }) => `${step}: ${choice}. ${feedback}`),
    });
  }

  function save(next: Session) {
    setSession(next);
    try {
      storage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The current attempt remains available in memory.
    }
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
        <p>Investigate a checkout bug and decide whether to accept the AI’s fix.</p>
      </header>

      <div className="panel scenario-panel">
        {step ? (
          <>
            <p className="eyebrow">Decision {session.step + 1} of {steps.length}</p>
            <h2>{step.title}</h2>
            <p>{step.situation}</p>
            {"code" in step ? <pre><code>{step.code}</code></pre> : null}
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
                  {result.advances ? session.step === steps.length - 1 ? "Finish challenge" : "Continue to code review" : "Try another choice"}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2>Challenge complete</h2>
            <p>You isolated the boundary case and verified the proposed fix against the requirement.</p>
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
