import {
  Bot, Check, ChevronRight, Code2, FileCode2, FolderOpen, GitBranch,
  GitCommitHorizontal, RotateCcw, Terminal, Upload,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useProgressStorage } from "../account/progress-storage";
import type { InterviewTask } from "../interview/types";
import {
  buttonLabel, createWorkspaceSession, editableFile, loadWorkspaceSession,
  passesLabelCheck, projectFiles, repository, revisedCode, saveWorkspaceSession,
  starterCode, type WorkspaceActivity, type WorkspaceSession,
} from "./simulation";
import "./workspace.css";

const steps = ["Import", "Edit & save", "Check", "Stage", "Commit", "Push"];

const hints = [
  "Open signup.js. It sets the text on the workshop’s registration button.",
  `Change only the label assigned to button.textContent to "${buttonLabel}". Save the file before checking.`,
];

type ProjectFile = keyof typeof projectFiles;

function CodeDiff({ after, title }: { after: string; title: string }) {
  const beforeLines = starterCode.trimEnd().split("\n");
  const afterLines = after.trimEnd().split("\n");

  return (
    <details className="lab-diff">
      <summary>{title}</summary>
      <div className="lab-diff-grid">
        <div>
          <span>Original</span>
          <pre>{beforeLines.map((line, index) => (
            <code className={line === afterLines[index] ? undefined : "removed"} key={index}>{line}{"\n"}</code>
          ))}</pre>
        </div>
        <div>
          <span>Changed</span>
          <pre>{afterLines.map((line, index) => (
            <code className={line === beforeLines[index] ? undefined : "added"} key={index}>{line}{"\n"}</code>
          ))}</pre>
        </div>
      </div>
    </details>
  );
}

function ProjectWorkspace({ session, onChange, onInterview }: {
  session: WorkspaceSession;
  onChange: (session: WorkspaceSession) => void;
  onInterview: (task: InterviewTask) => void;
}) {
  const [file, setFile] = useState<ProjectFile>(editableFile);
  const dirty = session.draft !== session.saved;
  const changed = session.saved !== starterCode;
  const checked = session.check === "passed";
  const staged = session.staged === session.saved;
  const hintCount = session.activity.filter(({ action }) => action === "hint").length;

  function update(patch: Partial<WorkspaceSession>, activity: WorkspaceActivity) {
    onChange({ ...session, ...patch, activity: [...session.activity, activity] });
  }

  function saveFile() {
    update({ saved: session.draft, check: "pending" }, {
      action: "save", message: `Saved ${editableFile}.`,
    });
  }

  function checkChange() {
    const passed = passesLabelCheck(session.saved);
    update({ check: passed ? "passed" : "failed" }, {
      action: "check",
      message: passed
        ? `Simulated check passed. The registration button reads "${buttonLabel}".`
        : `Simulated check failed. Keep the starter code and change only the button label to "${buttonLabel}".`,
    });
  }

  function commitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = session.commitMessage.trim();
    if (!message || !staged || dirty || !checked || session.committed) return;
    update({ committed: true, commitMessage: message }, {
      action: "commit", message: `$ git commit\nCreated local commit: ${message}`,
    });
  }

  return (
    <div className="lab-workbench">
      <div className="lab-titlebar">
        <Code2 size={17} aria-hidden="true" />
        <strong>campus-events</strong>
        <span><GitBranch size={14} aria-hidden="true" /> main</span>
      </div>
      <div className="lab-columns">
        <nav className="lab-explorer" aria-label="Project files">
          <h2>Explorer</h2>
          {(Object.keys(projectFiles) as ProjectFile[]).map((name) => (
            <button
              aria-pressed={file === name}
              key={name}
              onClick={() => setFile(name)}
              type="button"
            >
              <FileCode2 size={15} aria-hidden="true" />
              {name}
              {name === editableFile && (dirty || (changed && !session.committed))
                ? <span aria-label={dirty ? "Unsaved" : "Modified"}>{dirty ? "●" : "M"}</span>
                : null}
            </button>
          ))}
        </nav>

        <section className="lab-editor" aria-label="Code editor">
          <div className="lab-editor-bar">
            <label htmlFor="lab-source">{file}</label>
            <span>{file !== editableFile || session.committed ? "Read only" : dirty ? "Unsaved" : "Saved"}</span>
          </div>
          <textarea
            autoCapitalize="off"
            id="lab-source"
            onChange={(event) => onChange({ ...session, draft: event.target.value })}
            readOnly={file !== editableFile || session.committed}
            spellCheck={false}
            value={file === editableFile ? session.draft : projectFiles[file]}
            wrap="off"
          />
          <div className="lab-editor-actions">
            <button className="button secondary" disabled={!dirty || file !== editableFile} onClick={saveFile} type="button">Save file</button>
            <button className="button secondary" disabled={!changed || dirty || session.committed} onClick={checkChange} type="button">Check change</button>
          </div>
          {dirty ? <p className="lab-help">Save your edit before checking or staging it.</p> : null}
          {!dirty && session.check === "failed"
            ? <p className="lab-help lab-error" role="status">Change only the button label, then save and check again.</p>
            : null}
          {!dirty && checked
            ? <div className="lab-preview"><span>Simulated preview</span><strong>{buttonLabel}</strong></div>
            : null}
        </section>

        <aside className="lab-coach" aria-label="AI assistant">
          <h2><Bot size={17} aria-hidden="true" /> AI assistant</h2>
          <p className="lab-coach-label">Guided demo · preset responses</p>
          <p>The workshop’s signup button still shows a placeholder. Update it so students know they can register.</p>
          {hints.slice(0, hintCount).map((hint) => <p className="lab-hint" key={hint}>{hint}</p>)}
          <button
            className="button secondary"
            disabled={hintCount >= hints.length || session.committed}
            onClick={() => update({}, { action: "hint", message: `Asked the demo assistant for hint ${hintCount + 1}.` })}
            type="button"
          >{hintCount ? "Ask for next hint" : "Ask for a hint"}</button>
          {hintCount === hints.length && !session.committed ? (
            <button
              className="button ghost"
              disabled={passesLabelCheck(session.draft)}
              onClick={() => {
                setFile(editableFile);
                update({ draft: revisedCode }, { action: "apply", message: "Applied the assistant’s proposed edit to the editor." });
              }}
              type="button"
            >Apply suggested edit</button>
          ) : null}
        </aside>
      </div>

      <section className="lab-git" aria-labelledby="lab-git-title">
        <div className="lab-section-title">
          <GitBranch size={18} aria-hidden="true" />
          <h2 id="lab-git-title">Source Control</h2>
          <span>{session.pushed ? "Pushed" : session.committed ? "Local commit" : staged ? "Staged" : changed ? "Changes" : "Clean"}</span>
        </div>
        {changed ? <CodeDiff after={session.saved} title={session.committed ? "View committed diff" : "Review saved changes"} /> : null}
        {session.staged !== null && !staged
          ? <p className="lab-help">The saved file changed after staging. Check it and stage the new version.</p>
          : null}
        {!checked && !session.committed ? <p className="lab-help">Save and pass the simulated check to stage the file.</p> : null}
        <form className="lab-git-actions" onSubmit={commitChange}>
          <button
            className="button secondary"
            disabled={dirty || !checked || staged || session.committed}
            onClick={() => update({ staged: session.saved }, { action: "stage", message: `$ git add ${editableFile}\nStaged the saved change.` })}
            type="button"
          >Stage changes</button>
          <input
            aria-label="Commit message"
            disabled={!staged || dirty || !checked || session.committed}
            maxLength={120}
            onChange={(event) => onChange({ ...session, commitMessage: event.target.value })}
            placeholder="Describe the change"
            value={session.commitMessage}
          />
          <button className="button secondary" disabled={!staged || dirty || !checked || !session.commitMessage.trim() || session.committed} type="submit">
            <GitCommitHorizontal size={16} aria-hidden="true" /> Commit
          </button>
          <button
            className="button primary"
            disabled={!session.committed || session.pushed}
            onClick={() => update({ pushed: true }, { action: "push", message: "$ git push origin main\nPublished the local commit to the simulated remote." })}
            type="button"
          ><Upload size={16} aria-hidden="true" /> Push</button>
        </form>
      </section>

      <section className="lab-terminal" aria-labelledby="lab-terminal-title">
        <h2 id="lab-terminal-title"><Terminal size={16} aria-hidden="true" /> Simulated terminal</h2>
        <div role="log" aria-labelledby="lab-terminal-title" tabIndex={0}>
          {session.activity.map(({ message }, index) => <pre key={index}>{message}</pre>)}
        </div>
      </section>
      {session.pushed ? (
        <div className="lab-complete">
          <div role="status">
            <strong>Workflow complete</strong>
            <p>You created a local commit and pushed it to the simulated remote.</p>
          </div>
          <button
            className="button secondary"
            onClick={() => onInterview({
              kind: "workspace",
              attemptId: session.attemptId,
              title: "the Campus Events workspace",
              decision: `Change the signup button to ${buttonLabel} in ${editableFile}.`,
              result: session.activity.filter(({ action }) => action === "check").at(-1)?.message
                ?? "The change passed the simulated check and was pushed.",
              evidence: [
                `Commit message: ${session.commitMessage}`,
                ...session.activity.filter(({ action }) => action !== "hint").slice(-5).map(({ message }) => message),
              ],
            })}
            type="button"
          >Practice task interview</button>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkspaceModule({ onInterview }: { onInterview: (task: InterviewTask) => void }) {
  const storage = useProgressStorage();
  const [session, setSession] = useState(() => loadWorkspaceSession(storage));
  const completed = session
    ? [true, session.saved !== starterCode, session.check === "passed",
       session.staged === session.saved, session.committed, session.pushed]
    : steps.map(() => false);
  const nextStep = completed.indexOf(false);

  function commit(next: WorkspaceSession | null) {
    setSession(next);
    saveWorkspaceSession(next, storage);
  }

  return (
    <section className="lab" aria-labelledby="lab-title">
      <header className="lab-header">
        <div>
          <p className="eyebrow">Guided simulation</p>
          <h1 id="lab-title">Virtual Workspace</h1>
          <p>Update a campus event page and take the change from import to push.</p>
        </div>
        {session ? (
          <button className="button secondary" onClick={() => {
            if (window.confirm("Restart this workspace and clear its practice history?")) commit(null);
          }} type="button"><RotateCcw size={16} aria-hidden="true" /> Restart lab</button>
        ) : null}
      </header>
      <ol className="lab-steps" aria-label="Workflow progress">
        {steps.map((step, index) => (
          <li aria-current={index === nextStep ? "step" : undefined} className={completed[index] ? "done" : undefined} key={step}>
            <span aria-hidden="true">{completed[index] ? <Check size={14} /> : index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      {session ? <ProjectWorkspace session={session} onChange={commit} onInterview={onInterview} /> : (
        <div className="panel lab-import">
          <FolderOpen size={24} aria-hidden="true" />
          <h2>Import the starter project</h2>
          <p>Clone the provided repository into this simulated workspace.</p>
          <label htmlFor="lab-repository">Demo repository URL</label>
          <div>
            <input id="lab-repository" readOnly value={repository} />
            <button className="button primary" onClick={() => commit(createWorkspaceSession())} type="button">
              Clone project <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
