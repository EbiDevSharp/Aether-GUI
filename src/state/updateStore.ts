import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UpdateInfo } from "@/types/update";

const UPDATE_EVENT = "aether-gui://update-available";

interface UpdateStoreState {
  info: UpdateInfo | null;
  checking: boolean;
  /** Hits the network (via the Rust command, which itself hits GitHub) —
   * call from a manual "Check now" action, not on every menu open. */
  checkNow: () => Promise<void>;
  /** Marks the currently-known latest version as seen, clearing the badge
   * for it specifically. Call once the user has actually looked at the
   * release (opened the link), not merely opened the dropdown. */
  acknowledge: () => Promise<void>;
}

export const useUpdateStore = create<UpdateStoreState>((set, get) => ({
  info: null,
  checking: false,

  checkNow: async () => {
    set({ checking: true });
    try {
      const info = await invoke<UpdateInfo>("check_for_update");
      set({ info, checking: false });
    } catch {
      // Offline / GitHub unreachable / rate-limited — quietly keep
      // whatever `info` was already there rather than showing an error
      // state for what's ultimately a background nicety.
      set({ checking: false });
    }
  },

  acknowledge: async () => {
    const { info } = get();
    if (!info) return;
    await invoke("acknowledge_update", { version: info.latest_version });
    set({ info: { ...info, update_available: false } });
  },
}));

/** Call once from App's top-level effect; returns a cleanup function. Picks
 * up whatever the startup check (main.rs's setup()) already found — via
 * the cached-info command first (covers the case where the check finished
 * before this listener was attached) and the event for anything after. */
export async function initUpdateListeners(): Promise<() => void> {
  const cached = await invoke<UpdateInfo | null>("get_cached_update_info");
  if (cached) useUpdateStore.setState({ info: cached });

  const unlisten = await listen<UpdateInfo>(UPDATE_EVENT, (e) => {
    useUpdateStore.setState({ info: e.payload });
  });

  return unlisten;
}
