import { z } from "zod";
import { guestProgress, type ProgressStorage } from "../account/progress-storage";

export const repository = "https://example.com/campus-events.git";
export const editableFile = "signup.js";
export const buttonLabel = "Register now";
export const starterCode = `const button = document.querySelector("#register");

button.textContent = "Coming soon";
`;
export const revisedCode = starterCode.replace("Coming soon", buttonLabel);

export const projectFiles = {
  "README.md": "# Campus Events\n\nA starter page for the campus design workshop.\n",
  "index.html": `<h1>Campus design workshop</h1>
<button id="register"></button>
<script src="signup.js"></script>
`,
  [editableFile]: starterCode,
} as const;

const activitySchema = z.object({
  action: z.enum(["clone", "hint", "apply", "save", "check", "stage", "commit", "push"]),
  message: z.string(),
});

const sessionSchema = z.object({
  attemptId: z.string().optional(),
  draft: z.string(),
  saved: z.string(),
  check: z.enum(["pending", "passed", "failed"]),
  staged: z.string().nullable(),
  commitMessage: z.string(),
  committed: z.boolean(),
  pushed: z.boolean(),
  activity: z.array(activitySchema),
});

export type WorkspaceSession = z.infer<typeof sessionSchema>;
export type WorkspaceActivity = z.infer<typeof activitySchema>;

const storageKey = "genai-workspace-demo:v1";

export function createWorkspaceSession(): WorkspaceSession {
  return {
    attemptId: crypto.randomUUID(),
    draft: starterCode,
    saved: starterCode,
    check: "pending",
    staged: null,
    commitMessage: "",
    committed: false,
    pushed: false,
    activity: [{ action: "clone", message: `$ git clone ${repository}\nLoaded the three training files.` }],
  };
}

export function loadWorkspaceSession(storage: ProgressStorage = guestProgress): WorkspaceSession | null {
  try {
    const stored = storage.getItem(storageKey);
    if (!stored) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveWorkspaceSession(session: WorkspaceSession | null, storage: ProgressStorage = guestProgress) {
  try {
    if (session) storage.setItem(storageKey, JSON.stringify(session));
    else storage.removeItem(storageKey);
  } catch {
    // The simulation can still run in memory when browser storage is unavailable.
  }
}

export function passesLabelCheck(code: string) {
  return [revisedCode, revisedCode.replace('"Register now"', "'Register now'")].some(
    (expected) => code.replace(/\r\n/g, "\n").trim() === expected.trim(),
  );
}
