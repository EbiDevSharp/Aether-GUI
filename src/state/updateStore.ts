import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UpdateInfo, UpdateProduct } from "@/types/update";

const UPDATE_EVENT = "aether-gui://update-available";
const PRODUCTS: UpdateProduct[] = ["engine", "gui"];

interface UpdateStoreState {
  info: Record<UpdateProduct, UpdateInfo | null>;
  checking: Record<UpdateProduct, boolean>;
  /** Hits the network (via the Rust command, which itself hits GitHub) —
   * call from a manual "Check now" action, not on every menu open. */
  checkNow: (product: UpdateProduct) => Promise<void>;
  /** Marks the currently-known latest version as seen, clearing the badge
   * for it specifically. Only meaningful for "engine" — see update.rs's
   * doc comment on why "gui" doesn't need this (its own current version is
   * always known exactly, so the badge clears itself once actually
   * updated). Still safe to call for "gui": the backend just no-ops. */
  acknowledge: (product: UpdateProduct) => Promise<void>;
}

export const useUpdateStore = create<UpdateStoreState>((set, get) => ({
  info: { engine: null, gui: null },
  checking: { engine: false, gui: false },

  checkNow: async (product) => {
    set((s) => ({ checking: { ...s.checking, [product]: true } }));
    try {
      const info = await invoke<UpdateInfo>("check_for_update", { product });
      set((s) => ({ info: { ...s.info, [product]: info }, checking: { ...s.checking, [product]: false } }));
    } catch {
      // Offline / GitHub unreachable / rate-limited — quietly keep
      // whatever `info` was already there rather than showing an error
      // state for what's ultimately a background nicety.
      set((s) => ({ checking: { ...s.checking, [product]: false } }));
    }
  },

  acknowledge: async (product) => {
    const current = get().info[product];
    if (!current) return;
    await invoke("acknowledge_update", { product, version: current.latest_version });
    set((s) => ({ info: { ...s.info, [product]: { ...current, update_available: false } } }));
  },
}));

/** Call once from App's top-level effect; returns a cleanup function. Picks
 * up whatever the startup check (main.rs's setup()) already found for each
 * product — via the cached-info command first (covers the case where the
 * check finished before this listener was attached) and the event for
 * anything after. */
export async function initUpdateListeners(): Promise<() => void> {
  await Promise.all(
    PRODUCTS.map(async (product) => {
      const cached = await invoke<UpdateInfo | null>("get_cached_update_info", { product });
      if (cached) useUpdateStore.setState((s) => ({ info: { ...s.info, [product]: cached } }));
    })
  );

  const unlisten = await listen<UpdateInfo>(UPDATE_EVENT, (e) => {
    const info = e.payload;
    useUpdateStore.setState((s) => ({ info: { ...s.info, [info.product]: info } }));
  });

  return unlisten;
}
