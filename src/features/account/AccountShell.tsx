import type { Session } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import App from "../../App";
import { supabase } from "../../lib/supabase";
import { createCloudProgress, guestProgress, ProgressContext, type SyncStatus } from "./progress-storage";
import "./account.css";

export type AccountControls = {
  userId?: string;
  status?: SyncStatus;
  open: () => void;
};

const syncLabels: Record<SyncStatus, string> = {
  saving: "Saving progress…",
  saved: "Progress synced",
  offline: "Cloud sync unavailable. Changes are kept on this device.",
  conflict: "Progress changed on another device. Choose which version to keep.",
};

export default function AccountShell() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [cloud, setCloud] = useState<{ userId: string; storage: ReturnType<typeof createCloudProgress> } | null>(null);
  const [status, setStatus] = useState<SyncStatus>("saving");
  const [appVersion, setAppVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const userId = session?.user.id;

  useEffect(() => {
    try {
      sessionStorage.removeItem("genai-learning-demo:deepseek-key");
    } catch {
      // Older browser sessions may already be inaccessible.
    }
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !supabase) {
      setCloud(null);
      return;
    }
    const storage = createCloudProgress(supabase, userId, setStatus);
    let active = true;
    void storage.refresh().then(() => {
      if (active) setCloud({ userId, storage });
    });
    return () => {
      active = false;
      storage.dispose();
    };
  }, [userId]);

  function openAccount() {
    setRegistering(false);
    setPassword("");
    setMessage("");
    setOpen(true);
  }

  function switchAuthMode() {
    setRegistering(!registering);
    setPassword("");
    setMessage("");
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || pending) return;
    setPending(true);
    setMessage("");
    try {
      const credentials = { email: email.trim(), password };
      const { data, error } = registering
        ? await supabase.auth.signUp({
          ...credentials,
          options: { emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href },
        })
        : await supabase.auth.signInWithPassword(credentials);
      if (error) {
        switch (error.code) {
          case "signup_disabled":
            setMessage("Registration is disabled for this project. Contact your course administrator.");
            return;
          case "email_not_confirmed":
            setMessage("Confirm your email before signing in.");
            return;
          case "weak_password":
            setMessage("Choose a stronger password and try again.");
            return;
          case "over_email_send_rate_limit":
          case "over_request_rate_limit":
            setMessage("Too many attempts. Wait a moment and try again.");
            return;
          default:
            throw error;
        }
      }
      setPassword("");
      if (registering && !data.session) {
        setRegistering(false);
        setMessage("Check your inbox for a confirmation link. After confirming your email, you can sign in here.");
      } else {
        setOpen(false);
      }
    } catch {
      setMessage(registering
        ? "Could not complete registration. Check your email and password, or sign in if you already have an account."
        : "Sign-in failed. Check your email and password, then try again.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    if (!supabase || pending) return;
    setPending(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setOpen(false);
    } catch {
      setMessage("Could not sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function refresh(resolution?: "cloud" | "device") {
    if (await cloud?.storage.refresh(resolution)) setAppVersion((version) => version + 1);
  }

  function importGuest() {
    try {
      const copied = cloud?.storage.importGuest() ?? 0;
      setMessage(copied ? "Guest progress copied to this account." : "There is no new guest progress to copy.");
      if (copied) setAppVersion((version) => version + 1);
    } catch {
      setMessage("Guest progress could not be read on this device.");
    }
  }

  if (session === undefined || (userId && cloud?.userId !== userId)) {
    return <p className="account-loading" role="status">Loading your account…</p>;
  }

  return (
    <>
      <ProgressContext.Provider value={userId ? cloud!.storage : guestProgress}>
        <App key={`${userId ?? "guest"}:${appVersion}`} account={{ userId, status, open: openAccount }} />
      </ProgressContext.Provider>
      {open ? (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
            <button className="icon-button modal-close" aria-label="Close account" onClick={() => setOpen(false)} type="button"><X size={18} /></button>
            <h2 id="account-title">{session ? "Your account" : registering ? "Create your Pathwise account" : "Sign in to Pathwise"}</h2>
            {session ? (
              <>
                <p>{session.user.email}</p>
                <p role="status">{syncLabels[status]}</p>
                <div className="account-actions">
                  {status === "conflict" ? (
                    <>
                      <button className="button secondary" onClick={() => void refresh("cloud")} type="button">Use cloud version</button>
                      <button className="button secondary" onClick={() => void refresh("device")} type="button">Keep this device’s changes</button>
                    </>
                  ) : (
                    <button className="button secondary" disabled={status === "saving"} onClick={() => void refresh()} type="button">Sync progress</button>
                  )}
                  <button className="button secondary" disabled={status !== "saved"} onClick={importGuest} type="button">Copy guest progress</button>
                  <button className="button secondary" disabled={pending} onClick={() => void signOut()} type="button">Sign out</button>
                </div>
              </>
            ) : supabase ? (
              <form className="account-form" onSubmit={(event) => void submitCredentials(event)}>
                <p>{registering ? "Use an email address you can access and a password with at least 8 characters." : "Sign in with your email and password."}</p>
                <label>Email<input type="email" autoComplete="email" disabled={pending} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label>Password<input type="password" autoComplete={registering ? "new-password" : "current-password"} disabled={pending} minLength={registering ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                <button className="button primary" disabled={pending} type="submit">
                  {registering ? (pending ? "Creating account…" : "Create account") : (pending ? "Signing in…" : "Sign in")}
                </button>
                <button className="text-button" disabled={pending} onClick={switchAuthMode} type="button">
                  {registering ? "Back to sign in" : "Create an account"}
                </button>
              </form>
            ) : (
              <p>Account sign-in becomes available when the administrator configures Supabase. Guest practice is available now.</p>
            )}
            {message ? <p role="status">{message}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
