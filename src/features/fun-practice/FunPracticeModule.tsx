import {
  AtSign,
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  Hash,
  Lightbulb,
  MessageCircle,
  MessageCircleQuestion,
  MoreHorizontal,
  Paperclip,
  RotateCcw,
  Send,
  Smile,
  Sparkles,
  Users,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useProgressStorage } from "../account/progress-storage";
import type { LearningBundle } from "../../types";
import { createAiPractice, reviewAiPractice } from "./api";
import {
  funPracticeDescriptions,
  teamworkCases,
  tasksForMode,
} from "./data";
import { demoTeamworkReview, reviewDemoTask } from "./demo";
import {
  appendPracticeTurn,
  clearPracticeSession,
  createPracticeSession,
  loadPracticeSession,
  savePracticeSession,
} from "./storage";
import type {
  FunPracticeMode,
  FunPracticeTask,
  PracticeSession,
  PracticeTurn,
  TeamworkCase,
} from "./types";
import "./fun-practice.css";

type Props = {
  bundle?: LearningBundle;
  canUseLive: boolean;
  onSignIn?: () => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The practice request could not be completed.";
}

function studyPackSource(bundle: LearningBundle) {
  const questEvidence = bundle.quest?.rooms.map((room) => ({
    title: room.title,
    prompt: room.prompt,
    explanation: room.explanation,
    evidence: room.evidence,
  })) ?? [];
  return JSON.stringify({
    title: bundle.title,
    summary: bundle.summary,
    objectives: bundle.objectives,
    quiz: bundle.quiz.map(({ prompt, options, answerIndex, explanation }) => ({
      prompt,
      options,
      answerIndex,
      explanation,
    })),
    questEvidence,
  }).slice(0, 31_000);
}

function ModeIcon({ mode }: { mode: FunPracticeMode }) {
  if (mode === "intern") return <Bot size={22} />;
  if (mode === "teamwork") return <Users size={22} />;
  return <MessageCircleQuestion size={22} />;
}

function modeLabel(mode: FunPracticeMode) {
  return funPracticeDescriptions[mode].title;
}

const roomMeta: Record<FunPracticeMode, {
  name: string;
  members: string;
  online: string;
  teaser: string;
  accent: string;
}> = {
  intern: {
    name: "AI Intern On Call",
    members: "42 members",
    online: "7 online",
    teaser: "Intern P: I have optimized everything.",
    accent: "mint",
  },
  teamwork: {
    name: "COMP5241 Team 3",
    members: "8 members",
    online: "5 online",
    teaser: "Teammate: The last response must be newest.",
    accent: "blue",
  },
  roommate: {
    name: "Room 508 Survival Chat",
    members: "4 members",
    online: "2 online",
    teaser: "Roommate R: The exam is tomorrow.",
    accent: "orange",
  },
};

function GroupAvatar({ mode, small = false }: { mode: FunPracticeMode; small?: boolean }) {
  return (
    <span className={`fun-group-avatar ${roomMeta[mode].accent} ${small ? "small" : ""}`} aria-hidden="true">
      <ModeIcon mode={mode} />
    </span>
  );
}

function ReactionButton({
  emoji,
  count,
  active,
  onClick,
}: {
  emoji: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`${active ? "Remove reaction" : "React with"} ${emoji}`}
      aria-pressed={active}
      className={active ? "active" : ""}
      onClick={onClick}
      type="button"
    >
      {emoji} {count + Number(active)}
    </button>
  );
}

export default function FunPracticeModule({ bundle, canUseLive, onSignIn }: Props) {
  const storage = useProgressStorage();
  const [mode, setMode] = useState<FunPracticeMode>("intern");
  const [session, setSession] = useState<PracticeSession | null>(() => loadPracticeSession(storage));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [humor, setHumor] = useState(true);
  const [concept, setConcept] = useState(() => bundle?.objectives[0] ?? "");
  const [selectedTeam, setSelectedTeam] = useState(() => {
    const restored = loadPracticeSession(storage);
    return teamworkCases.find((item) => item.id === restored?.teamworkProgress?.caseId) ?? teamworkCases[0];
  });
  const [teamSelection, setTeamSelection] = useState<string | null>(null);
  const [nudged, setNudged] = useState(false);
  const [reactions, setReactions] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const currentReview = session?.turns.at(-1)?.review;
  const complete = session?.status === "complete";
  const sampleTasks = useMemo(() => tasksForMode(mode), [mode]);

  function persist(next: PracticeSession | null) {
    setSession(next);
    if (next) savePracticeSession(storage, next);
    else clearPracticeSession(storage);
  }

  function start(task: FunPracticeTask, teamworkCase?: TeamworkCase) {
    const next = createPracticeSession(task);
    if (teamworkCase) {
      setSelectedTeam(teamworkCase);
      next.teamworkProgress = {
        caseId: teamworkCase.id,
        step: 0,
        advancedStepIds: [],
      };
    }
    persist(next);
    setDraft("");
    setError("");
    setTeamSelection(null);
    setNudged(false);
    setReactions({});
    setReplyTo(null);
  }

  function updateTeamProgress(update: (current: NonNullable<PracticeSession["teamworkProgress"]>) => NonNullable<PracticeSession["teamworkProgress"]>) {
    if (!session?.teamworkProgress) return;
    persist({
      ...session,
      teamworkProgress: update(session.teamworkProgress),
      updatedAt: Date.now(),
    });
  }

  async function generateStudyPackTask() {
    if (!bundle || !concept) return;
    if (!canUseLive) {
      onSignIn?.();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const task = await createAiPractice(mode, concept, studyPackSource(bundle));
      start(task);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    if (!session || !draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      let review;
      let source: PracticeTurn["source"] = "demo";
      if (canUseLive) {
        review = await reviewAiPractice(session.task, draft.trim(), session.turns.length + 1);
        source = "ai";
      } else {
        review = session.task.mode === "teamwork"
          ? demoTeamworkReview(
              selectedTeam,
              draft.trim(),
              session.teamworkProgress?.advancedStepIds.length === 2,
            )
          : reviewDemoTask(session.task, draft.trim());
      }

      const turn: PracticeTurn = {
        id: crypto.randomUUID(),
        answer: draft.trim(),
        review,
        source,
        createdAt: Date.now(),
      };
      const next = appendPracticeTurn(session, turn);
      persist(next);
      setDraft("");
      setReplyTo(null);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function answerTransfer(index: number) {
    if (!session || session.transfer) return;
    persist({
      ...session,
      transfer: {
        selectedIndex: index,
        correct: index === session.task.transferQuestion.correctIndex,
      },
      updatedAt: Date.now(),
    });
  }

  function exit() {
    persist(null);
    setDraft("");
    setError("");
    setTeamSelection(null);
    setNudged(false);
    setReactions({});
    setReplyTo(null);
  }

  function toggleReaction(key: string) {
    setReactions((current) => ({ ...current, [key]: !current[key] }));
  }

  function quoteMessage(message: string) {
    setReplyTo(message);
    setDraft(`“${message}” — `);
  }

  if (!session) {
    const featuredTask = sampleTasks[0];
    const room = roomMeta[mode];
    return (
      <section className="fun-practice fun-chat-home" aria-labelledby="fun-practice-title">
        <header className="fun-chat-home-header">
          <div className="fun-chat-brand">
            <span className="fun-chat-brand-mark"><MessageCircle size={23} /></span>
            <div>
              <p className="eyebrow">Learning by correcting, deciding, explaining</p>
              <h1 id="fun-practice-title">Group Chat <span>Rescue</span></h1>
            </div>
          </div>
          <div className="fun-chat-home-status">
            <span className="fun-online-dot" />
            <strong>3 study groups need you</strong>
            <small>Can you save the conversation before someone ships it?</small>
          </div>
        </header>

        <div className="fun-chat-shell">
          <aside className="fun-chat-list-panel">
            <div className="fun-chat-list-title">
              <div><strong>Chats</strong><span>3 unread groups</span></div>
              <MoreHorizontal size={18} />
            </div>
            <div className="fun-mode-tabs" role="tablist" aria-label="Practice mode">
              {(Object.keys(funPracticeDescriptions) as FunPracticeMode[]).map((id) => (
                <button
                  aria-label={funPracticeDescriptions[id].title}
                  aria-selected={mode === id}
                  className={mode === id ? "active" : ""}
                  key={id}
                  onClick={() => setMode(id)}
                  role="tab"
                  type="button"
                >
                  <GroupAvatar mode={id} small />
                  <span className="fun-chat-list-copy">
                    <span>
                      <strong>{roomMeta[id].name}</strong>
                      <small>{id === "intern" ? "2m" : id === "teamwork" ? "8m" : "now"}</small>
                    </span>
                    <small>{roomMeta[id].teaser}</small>
                  </span>
                  <span className="fun-unread-badge">{id === "teamwork" ? "9+" : id === "intern" ? "3" : "1"}</span>
                </button>
              ))}
            </div>
            <div className="fun-chat-list-foot">
              <Bell size={15} />
              <span>New replies can change your feedback path.</span>
            </div>
          </aside>

          <section className="fun-chat-preview">
            <header className="fun-chat-window-header">
              <GroupAvatar mode={mode} />
              <div>
                <h2>{room.name}</h2>
                <p><span className="fun-online-dot" /> {room.online} · {room.members}</p>
              </div>
              <div className="fun-chat-window-actions" aria-hidden="true">
                <Volume2 size={17} />
                <Hash size={17} />
                <MoreHorizontal size={17} />
              </div>
            </header>

            <div className="fun-chat-preview-feed">
              <div className="fun-chat-date"><span>Today 20:14</span></div>
              <article className="fun-qq-message incoming">
                <GroupAvatar mode={mode} small />
                <div>
                  <div className="fun-qq-message-name">
                    <strong>{featuredTask.roleName}</strong>
                    <span>{funPracticeDescriptions[mode].badge}</span>
                  </div>
                  <div className="fun-qq-bubble">
                    <p>{featuredTask.opening}</p>
                    {featuredTask.badLine ? <mark>{featuredTask.badLine}</mark> : null}
                  </div>
                  <div className="fun-qq-reactions">
                    <ReactionButton
                      active={Boolean(reactions.previewLaugh)}
                      count={12}
                      emoji="😂"
                      onClick={() => toggleReaction("previewLaugh")}
                    />
                    <ReactionButton
                      active={Boolean(reactions.previewEyes)}
                      count={8}
                      emoji="👀"
                      onClick={() => toggleReaction("previewEyes")}
                    />
                    <ReactionButton
                      active={Boolean(reactions.previewSweat)}
                      count={5}
                      emoji="😬"
                      onClick={() => toggleReaction("previewSweat")}
                    />
                  </div>
                </div>
              </article>
              <article className="fun-qq-message outgoing">
                <div className="fun-qq-bubble">
                  <p>{funPracticeDescriptions[mode].description}</p>
                </div>
                <span className="fun-me-avatar">Me</span>
              </article>
              <div className="fun-chat-system">
                <AtSign size={14} />
                <span>You were mentioned. Someone needs a reality check.</span>
              </div>
            </div>

            <div className="fun-chat-preview-action">
              <div>
                <p className="eyebrow">Pinned challenge</p>
                <strong>{featuredTask.title}</strong>
              </div>
              <button
                aria-label={mode === "teamwork"
                  ? `Enter the incident: ${teamworkCases[0].title}`
                  : `Take the challenge: ${featuredTask.title}`}
                className="fun-chat-join-button"
                onClick={() => mode === "teamwork"
                  ? start(featuredTask, teamworkCases[0])
                  : start(featuredTask)}
                type="button"
              >
                {mode === "teamwork" ? "Enter the incident" : "Take the challenge"}
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="fun-chat-task-strip">
              <span>{mode === "teamwork" ? "More incidents" : "More chats"}</span>
              {mode === "teamwork" ? teamworkCases.slice(1).map((item) => (
                <button
                  aria-label={`Enter the incident: ${item.title}`}
                  key={item.id}
                  onClick={() => start(item.task, item)}
                  type="button"
                >
                  <Hash size={14} /> {item.title}
                </button>
              )) : sampleTasks.slice(1).map((task) => (
                <button
                  aria-label={`Take the challenge: ${task.title}`}
                  key={task.id}
                  onClick={() => start(task)}
                  type="button"
                >
                  <Hash size={14} /> {task.title}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="fun-chat-console">
          <label className="humor-toggle">
            <input checked={humor} onChange={(event) => setHumor(event.target.checked)} type="checkbox" />
            <span>Keep the jokes</span>
            <small>{humor ? "On" : "Off"}</small>
          </label>
          {bundle && mode !== "teamwork" ? (
            <div className="fun-study-pack">
              <span>Generate a group from your study pack</span>
              <select aria-label="Choose study pack concept" onChange={(event) => setConcept(event.target.value)} value={concept}>
                {bundle.objectives.map((objective) => <option key={objective}>{objective}</option>)}
              </select>
              <button className="button primary" disabled={busy} onClick={() => void generateStudyPackTask()} type="button">
                <Sparkles size={16} />
                {busy ? "Building practice..." : canUseLive ? "Generate a live chat" : "Sign in for a live chat"}
              </button>
            </div>
          ) : null}
          {error ? <p className="fun-error" role="alert">{error}</p> : null}
        </section>
      </section>
    );
  }

  if (session.task.mode === "teamwork" && session.teamworkProgress) {
    const teamworkCase = teamworkCases.find((item) => item.id === session.teamworkProgress?.caseId) ?? selectedTeam;
    const stepIndex = session.teamworkProgress.step;
    const step = teamworkCase.steps[stepIndex];
    const selected = step?.options.find((option) => option.id === teamSelection);
    const reflectionOpen = stepIndex >= teamworkCase.steps.length;

    return (
      <section className="fun-practice fun-session fun-messenger-page" aria-labelledby="fun-session-title">
        <div className="fun-messenger">
          <header className="fun-chat-window-header session">
            <button className="fun-chat-back" aria-label="Leave practice" onClick={exit} type="button">
              <ArrowLeft size={18} />
            </button>
            <GroupAvatar mode="teamwork" />
            <div>
              <h1 id="fun-session-title">{teamworkCase.title}</h1>
              <p><span className="fun-online-dot" /> Team Lead, Teammates, You</p>
            </div>
            <label className="humor-toggle compact">
              <input checked={humor} onChange={(event) => setHumor(event.target.checked)} type="checkbox" />
              <span>Jokes</span>
              <small>{humor ? "On" : "Off"}</small>
            </label>
            <button className="fun-chat-icon-button" onClick={exit} type="button" aria-label="Close chat">
              <MoreHorizontal size={18} />
            </button>
          </header>

          <div className="fun-chat-feed">
            <div className="fun-chat-date"><span>Today · incident channel</span></div>
            <div className="fun-chat-system pinned">
              <Bell size={14} />
              <span>{`Pinned incident: ${teamworkCase.opening}`}</span>
            </div>
            <article className="fun-qq-message incoming team">
              <span className="fun-member-avatar lead">TL</span>
              <div>
                <div className="fun-qq-message-name">
                  <strong>Team Lead</strong>
                  <span>group admin</span>
                </div>
                <div className="fun-qq-bubble">
                  <p>{teamworkCase.opening}</p>
                </div>
              </div>
            </article>

            {!reflectionOpen && step ? (
              <article className="fun-chat-poll">
                <header>
                  <span className="fun-poll-icon"><Users size={18} /></span>
                  <div>
                    <p>GROUP POLL · {stepIndex + 1}/2</p>
                    <h2>{step.title}</h2>
                  </div>
                </header>
                <p>{step.situation}</p>
                <div className="fun-chat-poll-options">
                  {step.options.map((option, index) => (
                    <button
                      aria-label={option.label}
                      aria-pressed={teamSelection === option.id}
                      className={teamSelection === option.id ? "selected" : ""}
                      disabled={Boolean(selected)}
                      key={option.id}
                      onClick={() => setTeamSelection(option.id)}
                      type="button"
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      <span>{option.label}</span>
                      {selected ? (
                        <small>{[6, 2, 1][index]} votes</small>
                      ) : null}
                    </button>
                  ))}
                </div>
                {selected ? (
                  <div className={`fun-chat-poll-result ${selected.advances ? "success" : ""}`} role="status">
                    <strong>{selected.advances ? "The group agrees with you" : "The bug has joined the group"}</strong>
                    <p>{selected.outcome}</p>
                    <button
                      className="fun-chat-join-button"
                      onClick={() => {
                        if (!selected.advances) {
                          setTeamSelection(null);
                          return;
                        }
                        updateTeamProgress((progress) => ({
                          ...progress,
                          step: progress.step + 1,
                          advancedStepIds: [...progress.advancedStepIds, `${progress.caseId}:${progress.step}`],
                        }));
                        setTeamSelection(null);
                      }}
                      type="button"
                    >
                      {selected.advances ? stepIndex === 1 ? "Explain the trade-off" : "Next decision" : "Try another choice"}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ) : null}
              </article>
            ) : null}

            {reflectionOpen ? (
              <article className="fun-qq-message incoming team">
                <span className="fun-member-avatar lead">TL</span>
                <div>
                  <div className="fun-qq-message-name"><strong>Team Lead</strong><span>@you</span></div>
                  <div className="fun-qq-bubble">
                    <p>{teamworkCase.reflectionPrompt}</p>
                  </div>
                </div>
              </article>
            ) : null}
          </div>

          {reflectionOpen ? (
            <div className="fun-qq-composer">
              <div className="fun-qq-composer-tools" aria-hidden="true">
                <Smile size={18} /><Paperclip size={18} /><AtSign size={18} />
              </div>
              <textarea
                aria-label="Explain your team decision"
                disabled={busy || Boolean(currentReview)}
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your reply to the group…"
                rows={2}
                value={draft}
              />
              <button
                className="fun-qq-send"
                disabled={busy || draft.trim().length === 0 || Boolean(currentReview)}
                onClick={() => void submitAnswer()}
                type="button"
              >
                <Send size={17} /> {busy ? "Checking..." : "Submit explanation"}
              </button>
            </div>
          ) : null}
          {error ? <p className="fun-error chat" role="alert">{error}</p> : null}
          {currentReview ? <ReviewResult session={session} /> : null}
          {session.status !== "in-progress" ? <PracticeResult session={session} onTransfer={answerTransfer} /> : null}
        </div>
      </section>
    );
  }

  const canContinue = session.status === "in-progress" && !complete;
  const latestTurn = session.turns.at(-1);

  return (
    <section className="fun-practice fun-session fun-messenger-page" aria-labelledby="fun-session-title">
      <div className="fun-messenger">
        <header className="fun-chat-window-header session">
          <button className="fun-chat-back" aria-label="Leave practice" onClick={exit} type="button">
            <ArrowLeft size={18} />
          </button>
          <GroupAvatar mode={session.task.mode} />
          <div>
            <h1 id="fun-session-title">{roomMeta[session.task.mode].name}</h1>
            <p>
              <span className="fun-online-dot" />
              {roomMeta[session.task.mode].online} · {session.task.concept}
            </p>
          </div>
          <label className="humor-toggle compact">
            <input checked={humor} onChange={(event) => setHumor(event.target.checked)} type="checkbox" />
            <span>Jokes</span>
            <small>{humor ? "On" : "Off"}</small>
          </label>
          <button className="fun-chat-icon-button" onClick={exit} type="button" aria-label="Close chat">
            <MoreHorizontal size={18} />
          </button>
        </header>

        <div className="fun-chat-feed">
          <div className="fun-chat-date">
            <span>{`Today 20:14 · attempt ${session.turns.length + 1} of 3`}</span>
          </div>
          <div className="fun-chat-system pinned">
            <Bell size={14} />
            <span>{session.task.title}</span>
          </div>

          <article className="fun-qq-message incoming">
            <GroupAvatar mode={session.task.mode} small />
            <div>
              <div className="fun-qq-message-name">
                <strong>{session.task.roleName}</strong>
                {humor ? <span>very confident</span> : null}
              </div>
              <div className="fun-qq-bubble">
                <p>{session.task.opening}</p>
                {session.task.badLine ? (
                  <button
                    className="fun-quoted-claim"
                    onClick={() => quoteMessage(session.task.badLine!)}
                    title="Quote this message"
                    type="button"
                  >
                    <mark>{session.task.badLine}</mark>
                    <span>Quote</span>
                  </button>
                ) : null}
              </div>
              <div className="fun-qq-reactions">
                <ReactionButton
                  active={Boolean(reactions.openingLaugh)}
                  count={12}
                  emoji="😂"
                  onClick={() => toggleReaction("openingLaugh")}
                />
                <ReactionButton
                  active={Boolean(reactions.openingEyes)}
                  count={8}
                  emoji="👀"
                  onClick={() => toggleReaction("openingEyes")}
                />
                <ReactionButton
                  active={Boolean(reactions.openingSkull)}
                  count={4}
                  emoji="💀"
                  onClick={() => toggleReaction("openingSkull")}
                />
              </div>
            </div>
          </article>

          {nudged ? (
            <div className="fun-chat-nudge" role="status">
              <Zap size={14} />
              <span>{`You nudged ${session.task.roleName}'s keyboard. It is reconsidering its life choices.`}</span>
            </div>
          ) : null}

          {session.turns.map((turn, index) => (
            <div className="fun-qq-turn" key={turn.id}>
              <article className="fun-qq-message outgoing">
                <div>
                  <div className="fun-qq-message-name"><strong>You</strong><span>attempt {index + 1}</span></div>
                  <div className="fun-qq-bubble"><p>{turn.answer}</p></div>
                  <div className="fun-qq-delivery">✓ Delivered to the study group</div>
                </div>
                <span className="fun-me-avatar">Me</span>
              </article>
              <article className={`fun-qq-message incoming ${turn.review.status === "complete" ? "resolved" : ""}`}>
                <GroupAvatar mode={session.task.mode} small />
                <div>
                  <div className="fun-qq-message-name">
                    <strong>{session.task.roleName}</strong>
                    <span>{turn.source === "ai" ? "AI reply" : "typing… checked"}</span>
                  </div>
                  <div className="fun-qq-bubble">
                    <p>{turn.review.feedback}</p>
                    <small>{turn.review.revisedMessage}</small>
                  </div>
                  <div className="fun-qq-reactions">
                    <ReactionButton
                      active={Boolean(reactions[`${turn.id}-brain`])}
                      count={turn.review.status === "complete" ? 18 : 6}
                      emoji={turn.review.status === "complete" ? "🧠" : "👀"}
                      onClick={() => toggleReaction(`${turn.id}-brain`)}
                    />
                    <ReactionButton
                      active={Boolean(reactions[`${turn.id}-team`])}
                      count={turn.review.status === "complete" ? 12 : 4}
                      emoji={turn.review.status === "complete" ? "🙌" : "🤔"}
                      onClick={() => toggleReaction(`${turn.id}-team`)}
                    />
                  </div>
                </div>
              </article>
            </div>
          ))}

          {busy ? (
            <div className="fun-chat-typing" role="status">
              <GroupAvatar mode={session.task.mode} small />
              <span>{session.task.roleName} is typing</span>
              <i /><i /><i />
            </div>
          ) : null}

          {latestTurn?.review.followUp && session.status === "in-progress" ? (
            <article className="fun-qq-message incoming mentor">
              <span className="fun-member-avatar">TA</span>
              <div>
                <div className="fun-qq-message-name"><strong>Study Buddy</strong><span>group assistant</span></div>
                <div className="fun-qq-bubble">
                  <h2><Lightbulb size={15} /> {latestTurn.review.followUp}</h2>
                </div>
              </div>
            </article>
          ) : null}
        </div>

        {session.status === "in-progress" ? (
          <div className="fun-qq-composer">
            <div className="fun-qq-quick-actions">
              <button
                onClick={() => {
                  setNudged(true);
                  window.setTimeout(() => setNudged(false), 2800);
                }}
                type="button"
              >
                <Zap size={14} /> Nudge AI
              </button>
              <button
                onClick={() => setDraft(`About ${session.task.concept}: `)}
                type="button"
              >
                <Lightbulb size={14} /> Draft reply
              </button>
              {session.task.badLine ? (
                <button onClick={() => quoteMessage(session.task.badLine!)} type="button">
                  <AtSign size={14} /> @{session.task.roleName}
                </button>
              ) : null}
            </div>
            {replyTo ? (
              <div className="fun-reply-preview">
                <div>
                  <span>Replying to {session.task.roleName}</span>
                  <p>{replyTo}</p>
                </div>
                <button
                  aria-label="Cancel reply"
                  onClick={() => {
                    setReplyTo(null);
                    setDraft((current) => current === `“${replyTo}” — ` ? "" : current);
                  }}
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}
            <div className="fun-qq-composer-tools" aria-hidden="true">
              <Smile size={18} /><Paperclip size={18} /><AtSign size={18} />
            </div>
            <textarea
              aria-label="Your explanation"
              disabled={busy}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void submitAnswer();
                }
              }}
              placeholder={latestTurn?.review.followUp || "Correct the claim, then make the reason concrete..."}
              rows={3}
              value={draft}
            />
            <div className="fun-qq-composer-footer">
              <span>{`${draft.length}/2000 · Ctrl+Enter sends the reply`}</span>
              <button
                className="fun-qq-send"
                disabled={busy || !canContinue || !draft.trim()}
                onClick={() => void submitAnswer()}
                type="button"
              >
                <Send size={16} /> {busy ? "Checking..." : "Send to AI"}
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="fun-error chat" role="alert">{error}</p> : null}
        {currentReview ? <ReviewResult session={session} /> : null}
        {session.status !== "in-progress" ? <PracticeResult session={session} onTransfer={answerTransfer} /> : null}
      </div>
    </section>
  );
}

function ReviewResult({ session }: { session: PracticeSession }) {
  const review = session.turns.at(-1)?.review;
  if (!review) return null;
  return (
    <section className="fun-review-card" aria-live="polite">
      <div className={`fun-review-icon ${review.status === "complete" ? "complete" : ""}`}>
        {review.status === "complete" ? <CheckCircle2 size={22} /> : <CircleAlert size={22} />}
      </div>
      <div>
        <strong>{review.status === "complete" ? "Concept repaired" : "One more round"}</strong>
        <p>{review.status === "complete" ? "The intern can now explain the idea from the evidence." : "The conclusion is only half the job. Connect it to the behavior."}</p>
        <ul className="fun-criteria-list">
          {session.task.criteria.map((criterion) => {
            const satisfied = review.satisfiedCriterionIds.includes(criterion.id);
            return <li className={satisfied ? "satisfied" : ""} key={criterion.id}>{satisfied ? <Check size={14} /> : <span />}{criterion.label}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

function PracticeResult({ session, onTransfer }: {
  session: PracticeSession;
  onTransfer: (index: number) => void;
}) {
  return (
    <section className="panel fun-result">
      <div className="fun-result-heading">
        <div className="fun-result-medal"><GraduationCap size={28} /></div>
        <div>
          <p className="eyebrow">{session.status === "complete" ? "Teaching complete" : "Keep this concept on your list"}</p>
          <h2>{session.status === "complete" ? "The student has surpassed the teacher." : "You found the topic. Now sharpen the reasoning."}</h2>
        </div>
      </div>
      <div className="fun-result-evidence">
        <strong>Keep this explanation</strong>
        <p>{session.task.correctExplanation}</p>
        <small>Evidence card · {session.task.evidence}</small>
      </div>
      <div className="fun-transfer">
        <p className="eyebrow">Transfer check</p>
        <h3>{session.task.transferQuestion.question}</h3>
        <div className="fun-choice-grid">
          {session.task.transferQuestion.options.map((option, index) => {
            const selected = session.transfer?.selectedIndex === index;
            const correct = session.transfer && index === session.task.transferQuestion.correctIndex;
            return (
              <button
                className={correct ? "correct" : selected ? "incorrect" : ""}
                disabled={Boolean(session.transfer)}
                key={option}
                onClick={() => onTransfer(index)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
        {session.transfer ? (
          <div className={`fun-outcome ${session.transfer.correct ? "success" : ""}`} role="status">
            <strong>{session.transfer.correct ? "Applied in a new situation" : "Same idea, different disguise"}</strong>
            <p>{session.task.transferQuestion.explanation}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
