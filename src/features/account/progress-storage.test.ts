import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { createCloudProgress } from "./progress-storage";

const key = "genai-learning-demo:v1";

it("keeps a local update on conflict and resolves it against the current cloud version", async () => {
  vi.useFakeTimers();
  const query = vi.fn().mockResolvedValue({ data: [], error: null });
  const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: null }).mockResolvedValue({ data: 3, error: null });
  const client = { from: () => ({ select: () => ({ eq: query }) }), rpc } as unknown as SupabaseClient;
  const status = vi.fn();
  const first = createCloudProgress(client, "first-account", status);
  try {
    await first.refresh();
    first.setItem(key, JSON.stringify({ step: "quiz" }));
    await vi.advanceTimersByTimeAsync(350);
    expect(status).toHaveBeenLastCalledWith("conflict");
    expect(first.getItem(key)).toBe('{"step":"quiz"}');
    first.dispose();

    const other = createCloudProgress(client, "other-account", vi.fn());
    expect(other.getItem(key)).toBeNull();
    other.dispose();

    query.mockResolvedValue({ data: [{ record_key: key, value: { step: "plan" }, version: 2 }], error: null });
    const reopened = createCloudProgress(client, "first-account", status);
    try {
      await reopened.refresh("device");
      await vi.runAllTimersAsync();
      expect(rpc).toHaveBeenLastCalledWith("pathwise_save_progress", {
        p_user_id: "first-account", p_key: key, p_value: { step: "quiz" }, p_version: 2,
      });
      expect(status).toHaveBeenLastCalledWith("saved");
    } finally {
      reopened.dispose();
    }
  } finally {
    first.dispose();
    vi.useRealTimers();
  }
});
