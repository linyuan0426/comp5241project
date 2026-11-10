import { createContext, useContext } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type ProgressStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const guestProgress: ProgressStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

export const ProgressContext = createContext<ProgressStorage>(guestProgress);
export const useProgressStorage = () => useContext(ProgressContext);

const progressKeys = [
  "genai-learning-demo:v1",
  "genai-interview-demo:v1",
  "genai-interview-task-workspace:v1",
  "genai-interview-task-scenario:v1",
  "genai-interview-task-brief:v1",
  "genai-workspace-demo:v1",
  "genai-scenario-discount:v1",
] as const;

const entrySchema = z.object({
  value: z.string().nullable(),
  version: z.number().int().nonnegative(),
  dirty: z.boolean(),
});
type Entry = z.infer<typeof entrySchema>;
export type SyncStatus = "saving" | "saved" | "offline" | "conflict";

function readCache(key: string): Partial<Record<string, Entry>> {
  try {
    const json = localStorage.getItem(key);
    const parsed = z.partialRecord(z.enum(progressKeys), entrySchema).safeParse(JSON.parse(json ?? "{}"));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function createCloudProgress(client: SupabaseClient, userId: string, onStatus: (status: SyncStatus) => void) {
  const cacheKey = `pathwise-account:${userId}:v1`;
  const entries = readCache(cacheKey);
  const conflicts = new Set<string>();
  let running = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cache() {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(entries));
    } catch {
      // Cloud saving still works if the browser cache is full.
    }
  }

  function schedule() {
    if (disposed || running) return;
    clearTimeout(timer);
    onStatus(conflicts.size ? "conflict" : "saving");
    timer = setTimeout(() => void flush(), 350);
  }

  function write(key: string, value: string | null) {
    if (disposed || entries[key]?.value === value) return;
    entries[key] = { value, version: entries[key]?.version ?? 0, dirty: true };
    cache();
    schedule();
  }

  async function flush() {
    if (running || disposed) return;
    running = true;
    onStatus("saving");
    try {
      for (const key of progressKeys) {
        let entry = entries[key];
        while (entry?.dirty && !disposed && !conflicts.has(key)) {
          const value = entry.value;
          const { data, error } = await client.rpc("pathwise_save_progress", {
            p_user_id: userId, p_key: key, p_value: value === null ? null : JSON.parse(value),
            p_version: entry.version,
          });
          if (disposed) return;
          if (error) throw error;
          if (typeof data !== "number") {
            conflicts.add(key);
            break;
          }
          const latest = entries[key]!;
          entry = { value: latest.value, version: data, dirty: latest.value !== value };
          entries[key] = entry;
          cache();
        }
      }
      if (!disposed) onStatus(conflicts.size ? "conflict" : "saved");
    } catch {
      if (!disposed) onStatus(conflicts.size ? "conflict" : "offline");
      return;
    } finally {
      running = false;
    }
    if (progressKeys.some((key) => entries[key]?.dirty && !conflicts.has(key))) schedule();
  }

  async function refresh(resolution?: "cloud" | "device") {
    if (running || disposed) return false;
    clearTimeout(timer);
    running = true;
    let changed = false;
    onStatus("saving");
    try {
      const { data, error } = await client.from("pathwise_progress")
        .select("record_key,value,version").eq("user_id", userId);
      if (disposed) return false;
      if (error) throw error;
      const remote = new Map(data.map((row) => [row.record_key, row]));
      conflicts.clear();
      for (const key of progressKeys) {
        const local = entries[key];
        const row = remote.get(key);
        const version = row?.version ?? 0;
        const value = row?.value == null ? null : JSON.stringify(row.value);
        if (!local?.dirty || local.value === value || (resolution === "cloud" && local.version !== version)) {
          if ((local?.value ?? null) !== value) changed = true;
          entries[key] = { value, version, dirty: false };
        } else if (local.version !== version) {
          if (resolution === "device") local.version = version;
          else conflicts.add(key);
        }
      }
      cache();
    } catch {
      if (!disposed) onStatus("offline");
      return false;
    } finally {
      running = false;
    }
    void flush();
    return changed;
  }

  function importGuest() {
    let copied = 0;
    for (const key of progressKeys) {
      if (entries[key]?.version || entries[key]?.value != null || entries[key]?.dirty) continue;
      const value = guestProgress.getItem(key);
      if (value === null) continue;
      write(key, value);
      copied += 1;
    }
    return copied;
  }

  return {
    getItem: (key: string) => entries[key]?.value ?? null,
    setItem: write,
    removeItem: (key: string) => write(key, null),
    refresh,
    importGuest,
    dispose() {
      disposed = true;
      clearTimeout(timer);
    },
  };
}
