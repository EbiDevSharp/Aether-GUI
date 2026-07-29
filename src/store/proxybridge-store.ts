import { create } from "zustand";
import { proxyBridgeApi } from "@/lib/proxybridge-api";
import type {
  ProxyBridgeLogLine,
  ProxyBridgeProfile,
  ProxyBridgeStatus,
  ProxyConfig,
  ProxyRule,
} from "@/types/proxybridge";

interface ProxyBridgeStore {
  profile: ProxyBridgeProfile | null;
  status: ProxyBridgeStatus;
  logs: ProxyBridgeLogLine[];
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;

  addProxyConfig: (c: Omit<ProxyConfig, "Id">) => Promise<void>;
  updateProxyConfig: (c: ProxyConfig) => Promise<void>;
  deleteProxyConfig: (id: number) => Promise<void>;

  addRule: (r: ProxyRule) => Promise<void>;
  updateRule: (index: number, r: ProxyRule) => Promise<void>;
  deleteRule: (index: number) => Promise<void>;
  reorderRule: (from: number, to: number) => Promise<void>;

  setLocalhostViaProxy: (v: boolean) => Promise<void>;
  setTrafficLogging: (v: boolean) => Promise<void>;

  start: () => Promise<void>;
  stop: () => Promise<void>;
  relaunchElevated: () => Promise<void>;
}

// حداکثر تعداد خط لاگ نگه‌داشته‌شده در حافظه، که UI کند نشه در یک سشن طولانی
const MAX_LOG_LINES = 2000;

export const useProxyBridgeStore = create<ProxyBridgeStore>((set) => ({
  profile: null,
  status: "idle",
  logs: [],
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null });
    try {
      const [profile, status] = await Promise.all([
        proxyBridgeApi.getProfile(),
        proxyBridgeApi.getStatus(),
      ]);
      set({ profile, status, loading: false });

      await proxyBridgeApi.onLog((log) => {
        set((s) => ({
          logs: [...s.logs, log].slice(-MAX_LOG_LINES),
        }));
      });
      await proxyBridgeApi.onStatus((status) => set({ status }));
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  addProxyConfig: async (c) => {
    const created = await proxyBridgeApi.addProxyConfig(c);
    set((s) => ({
      profile: s.profile
        ? { ...s.profile, ProxyConfigs: [...s.profile.ProxyConfigs, created] }
        : s.profile,
    }));
  },

  updateProxyConfig: async (c) => {
    await proxyBridgeApi.updateProxyConfig(c);
    set((s) => ({
      profile: s.profile
        ? {
            ...s.profile,
            ProxyConfigs: s.profile.ProxyConfigs.map((x) => (x.Id === c.Id ? c : x)),
          }
        : s.profile,
    }));
  },

  deleteProxyConfig: async (id) => {
    await proxyBridgeApi.deleteProxyConfig(id);
    set((s) => ({
      profile: s.profile
        ? {
            ...s.profile,
            ProxyConfigs: s.profile.ProxyConfigs.filter((x) => x.Id !== id),
            ProxyRules: s.profile.ProxyRules.map((r) =>
              r.ProxyConfigId === id ? { ...r, ProxyConfigId: null } : r,
            ),
          }
        : s.profile,
    }));
  },

  addRule: async (r) => {
    await proxyBridgeApi.addRule(r);
    const rules = await proxyBridgeApi.listRules();
    set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
  },

  updateRule: async (index, r) => {
    await proxyBridgeApi.updateRule(index, r);
    const rules = await proxyBridgeApi.listRules();
    set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
  },

  deleteRule: async (index) => {
    await proxyBridgeApi.deleteRule(index);
    const rules = await proxyBridgeApi.listRules();
    set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
  },

  reorderRule: async (from, to) => {
    await proxyBridgeApi.reorderRule(from, to);
    const rules = await proxyBridgeApi.listRules();
    set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
  },

  setLocalhostViaProxy: async (v) => {
    await proxyBridgeApi.setLocalhostViaProxy(v);
    set((s) => (s.profile ? { profile: { ...s.profile, LocalhostViaProxy: v } } : {}));
  },

  setTrafficLogging: async (v) => {
    await proxyBridgeApi.setTrafficLogging(v);
    set((s) =>
      s.profile ? { profile: { ...s.profile, IsTrafficLoggingEnabled: v } } : {},
    );
  },

  start: async () => {
    set({ error: null });
    try {
      await proxyBridgeApi.start();
    } catch (e) {
      if (e === "NEEDS_ELEVATION") {
        set({ status: "needsElevation" });
      } else {
        set({ error: String(e), status: "error" });
      }
    }
  },

  stop: async () => {
    await proxyBridgeApi.stop();
  },

  relaunchElevated: async () => {
    await proxyBridgeApi.relaunchElevated();
  },
}));
