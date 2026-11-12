import {
  Check,
  ChevronRight,
  Compass,
  DoorOpen,
  FileSearch,
  KeyRound,
  Lightbulb,
  Link2,
  Lock,
  RotateCcw,
  Route,
  Search,
  Trophy,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Quest, QuestProgress, QuestRoom } from "./quest-data";
import "./quest.css";

type QuestProps = {
  quest: Quest;
  progress: QuestProgress;
  onAttempt: (index: number, solved: boolean) => void;
  onReplay: () => void;
  onFinish: () => void;
  onInterview: () => void;
};

const roomNames = {
  match: "Match concepts",
  order: "Restore the sequence",
  detective: "Investigate the AI draft",
  apply: "Complete the mission",
};

const roomIcons = { match: Link2, order: Route, detective: FileSearch, apply: DoorOpen };

function shuffledIndices(length: number) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[other]] = [indices[other], indices[index]];
  }
  if (indices.every((value, index) => value === index)) indices.push(indices.shift()!);
  return indices;
}

function Choice({ pressed, linked, onClick, children }: {
  pressed?: boolean;
  linked?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button aria-pressed={pressed} data-linked={linked} className="quest-choice" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function Options({ legend, values, order, selected, onSelect }: {
  legend: string;
  values: string[];
  order: number[];
  selected?: number;
  onSelect: (index: number) => void;
}) {
  return (
    <fieldset className="quest-options">
      <legend>{legend}</legend>
      {order.map((index) => (
        <Choice key={index} pressed={selected === index} onClick={() => onSelect(index)}>
          {values[index]}
        </Choice>
      ))}
    </fieldset>
  );
}

function RoomPuzzle({ room, onAttempt }: { room: QuestRoom; onAttempt: (solved: boolean) => void }) {
  const [picked, setPicked] = useState<number>();
  const [evidence, setEvidence] = useState<number>();
  const [correction, setCorrection] = useState<number>();
  const [cards, setCards] = useState<number[]>([]);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [hint, setHint] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const [order] = useState(() => shuffledIndices(
    room.kind === "match" ? room.pairs.length : room.kind === "order" ? room.steps.length : 3,
  ));
  const [evidenceOrder] = useState(() => shuffledIndices(3));
  const [correctionOrder] = useState(() => shuffledIndices(3));

  function assignMatch(meaning: number) {
    if (picked === undefined) return;
    const next = Object.fromEntries(Object.entries(matches).filter(([, value]) => value !== meaning));
    next[picked] = meaning;
    setMatches(next);
    setPicked(undefined);
  }

  let ready: boolean;
  let correct: boolean;
  let puzzle: ReactNode;
  switch (room.kind) {
    case "match":
      ready = Object.keys(matches).length === room.pairs.length;
      correct = room.pairs.every((_, index) => matches[index] === index);
      puzzle = (
        <div className="quest-match">
          <div className="quest-tray">
            <h3><Link2 size={16} aria-hidden="true" /> Concepts</h3>
            {room.pairs.map(({ term }, index) => (
              <Choice key={index} pressed={picked === index} linked={matches[index] !== undefined} onClick={() => setPicked(index)}>
                <strong>{term}</strong>
                {matches[index] !== undefined && <small>Paired with {room.pairs[matches[index]].meaning}</small>}
              </Choice>
            ))}
          </div>
          <div className="quest-tray quest-clue-tray">
            <h3><Search size={16} aria-hidden="true" /> Clue cards</h3>
            {order.map((index) => (
              <button className="quest-choice" disabled={picked === undefined} data-linked={Object.values(matches).includes(index)}
                key={index} onClick={() => assignMatch(index)} type="button">
                {room.pairs[index].meaning}
              </button>
            ))}
          </div>
        </div>
      );
      break;
    case "order":
      ready = cards.length === room.steps.length;
      correct = cards.every((index, position) => index === position);
      puzzle = (
        <div className="quest-match quest-order">
          <div className="quest-tray">
            <h3>Available steps</h3>
            {order.filter((index) => !cards.includes(index)).map((index) => (
              <Choice key={index} onClick={() => setCards([...cards, index])}>{room.steps[index]}</Choice>
            ))}
          </div>
          <div className="quest-tray quest-route">
            <h3>Your sequence</h3>
            <ol aria-label="Sequence slots">
              {room.steps.map((_, position) => {
                const index = cards[position];
                return (
                  <li key={position}>
                    {index === undefined ? <span className="quest-empty-slot">Empty slot</span> : (
                      <Choice onClick={() => setCards(cards.filter((card) => card !== index))}>
                        {room.steps[index]}
                      </Choice>
                    )}
                  </li>
                );
              })}
            </ol>
            <p>Select an added step to remove it.</p>
          </div>
        </div>
      );
      break;
    case "detective":
      ready = picked !== undefined && evidence !== undefined && correction !== undefined;
      correct = picked === room.falseIndex && evidence === 0 && correction === room.correctIndex;
      puzzle = (
        <div className="quest-detective">
          <Options legend="Flag the incorrect claim in this AI draft" values={room.claims}
            order={order} selected={picked} onSelect={setPicked} />
          <Options legend="Choose the excerpt that proves the claim is wrong" values={[room.evidence, ...room.otherExcerpts]}
            order={evidenceOrder} selected={evidence} onSelect={setEvidence} />
          <Options legend="Choose a correction supported by the excerpt" values={room.corrections}
            order={correctionOrder} selected={correction} onSelect={setCorrection} />
        </div>
      );
      break;
    case "apply":
      ready = picked !== undefined;
      correct = picked === room.correctIndex;
      puzzle = (
        <div className="quest-final">
          <Options legend="Choose your action" values={room.options} order={order} selected={picked} onSelect={setPicked} />
        </div>
      );
      break;
  }

  return (
    <>
      {puzzle}
      <div className="quest-actions quest-puzzle-actions">
        <button className="button secondary" onClick={() => setHint(!hint)} aria-expanded={hint} type="button">
          <Lightbulb size={17} /> {hint ? "Hide hint" : "Show hint"}
        </button>
        <button className="button primary" disabled={!ready} onClick={() => {
          setIncorrect(!correct);
          onAttempt(correct);
        }} type="button">Check solution <KeyRound size={17} /></button>
      </div>
      {hint && <p className="quest-hint">{room.hint}</p>}
      {incorrect && <p className="quest-feedback" role="status">Some choices need another look. Revise your solution and try again.</p>}
    </>
  );
}

export default function KnowledgeQuest({ quest, progress, onAttempt, onReplay, onFinish, onInterview }: QuestProps) {
  const [active, setActive] = useState(() => {
    const next = progress.findIndex((room) => !room.solved);
    return next < 0 ? quest.rooms.length : next;
  });
  const room = quest.rooms[active];
  const solved = progress.filter((entry) => entry.solved).length;
  const RoomIcon = room ? roomIcons[room.kind] : Trophy;

  return (
    <div className="quest-page">
      <header className="quest-banner">
        <div className="quest-banner-copy">
          <p><Compass size={18} aria-hidden="true" /> Knowledge Quest</p>
          <h1>{quest.title}</h1>
          <p>{quest.mission}</p>
        </div>
        <div className="quest-inventory">
          <div className="quest-key-slots" aria-hidden="true">
            {progress.map((entry, index) => (
              <span data-collected={entry.solved} key={index}><KeyRound size={19} /></span>
            ))}
          </div>
          <strong>{solved}/{quest.rooms.length} keys</strong>
        </div>
      </header>
      <ol className="quest-map" aria-label="Quest map">
        {quest.rooms.map((item, index) => {
          const Icon = progress[index].solved ? Check : index === active ? roomIcons[item.kind] : Lock;
          return (
            <li key={index} data-solved={progress[index].solved} aria-current={index === active ? "step" : undefined}>
              <span className="quest-map-node"><Icon size={21} aria-hidden="true" /></span>
              <span className="quest-map-label">{item.title}</span>
              <small>{progress[index].solved ? "Solved" : index === active ? "In progress" : "Locked"}</small>
            </li>
          );
        })}
      </ol>
      {room ? (
        <section className="quest-room" data-kind={room.kind} aria-labelledby="quest-room-title" key={active}>
          <header className="quest-room-heading">
            <span className="quest-room-icon"><RoomIcon size={26} aria-hidden="true" /></span>
            <div>
              <p className="eyebrow">{roomNames[room.kind]}</p>
              <h2 id="quest-room-title">{room.title}</h2>
              <p>{room.prompt}</p>
            </div>
          </header>
          {progress[active].solved ? (
            <>
              <div className="quest-solved" role="status">
                <strong><KeyRound size={17} /> Key collected</strong>
                <p>{room.explanation}</p>
                <blockquote>{room.evidence}</blockquote>
              </div>
              <button className="button primary" onClick={() => setActive(active + 1)} type="button">
                {active === quest.rooms.length - 1 ? "See quest results" : "Unlock next room"} <ChevronRight size={18} />
              </button>
            </>
          ) : <RoomPuzzle room={room} onAttempt={(correct) => onAttempt(active, correct)} />}
        </section>
      ) : (
        <section className="quest-room quest-finish" aria-labelledby="quest-results">
          <header className="quest-room-heading">
            <span className="quest-room-icon"><Trophy size={28} aria-hidden="true" /></span>
            <div>
              <h2 id="quest-results">Mission complete</h2>
              <p>{progress.some((entry) => entry.misses)
                ? "Revisit the rooms marked for review to see the evidence behind each solution."
                : "You solved every room on the first try."}</p>
            </div>
          </header>
          <div className="quest-recap">
            {quest.rooms.map((item, index) => (
              <details key={index}>
                <summary>{item.title}{progress[index].misses > 0 && <span>Review suggested</span>}</summary>
                <p>{item.explanation}</p>
                <blockquote>{item.evidence}</blockquote>
              </details>
            ))}
          </div>
          <div className="quest-actions">
            <button className="button secondary" onClick={() => { onReplay(); setActive(0); }} type="button">
              <RotateCcw size={17} /> Replay quest
            </button>
            <button className="button secondary" onClick={onFinish} type="button">View progress</button>
            <button className="button primary" onClick={onInterview} type="button">Explain your reasoning <ChevronRight size={18} /></button>
          </div>
        </section>
      )}
    </div>
  );
}
