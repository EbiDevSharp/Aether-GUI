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

// init() قبلاً فقط از ProxyBridgePage.tsx صدا زده می‌شد (یک‌بار در طول عمر
// اون پنجره‌ی جدا). حالا که Rules یه تب معمولیه و با هر بار رفتن به اون تب
// mount/unmount می‌شه (Radix TabsContent)، و از طرفی BridgeToggle.tsx هم تو
// تب Connect به همین store وصله و init() رو زودتر (موقع بالا اومدن کل اپ)
// صدا می‌زنه — این گارد جلوی ثبت چندباره‌ی onLog/onStatus رو می‌گیره؛ بدونش
// هر ورود به تب Rules یه listener تکراری اضافه می‌کرد و لاگ‌ها تکراری
// می‌شدن.
let listenersRegistered = false;

// ProxyBridge_CLI فقط یک‌بار موقع اجرا پروفایل رو می‌خونه (بدون hot-reload)،
// پس بدون این، تغییر یک Rule/Proxy Config وقتی Bridge از قبل Running هست
// فقط روی دیسک می‌شینه و تا Stop/Start دستی بعدی اعمال نمی‌شه — دقیقاً همون
// چیزی که کاربر گزارش داد. هر متد جهش‌دهنده‌ی زیر بعد از موفقیت این رو صدا
// می‌زنه؛ اگه Bridge روشن نباشه، سمت Rust بی‌سروصدا هیچ کاری نمی‌کنه.
//
// debounce به این خاطر: اگه کاربر پشت سر هم چند Rule رو toggle/ویرایش کنه
// (مثلاً ۳ تا سوییچ رو سریع بزنه)، نمی‌خوایم Bridge رو ۳ بار پشت سر هم
// Stop/Start کنیم (هر بار یعنی یک قطعی واقعی کوتاه) — یک ری‌استارت تک با
// آخرین state کافیه.
let restartTimer: ReturnType<typeof setTimeout> | null = null;
const RESTART_DEBOUNCE_MS = 400;

export const useProxyBridgeStore = create<ProxyBridgeStore>((set) => {
  function applyIfRunning() {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      restartTimer = null;
      void proxyBridgeApi.restartIfRunning().catch((e) => set({ error: String(e) }));
    }, RESTART_DEBOUNCE_MS);
  }

  return {
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

        if (!listenersRegistered) {
          listenersRegistered = true;
          await proxyBridgeApi.onLog((log) => {
            set((s) => ({
              logs: [...s.logs, log].slice(-MAX_LOG_LINES),
            }));
          });
          await proxyBridgeApi.onStatus((status) => set({ status }));
        }
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
      applyIfRunning();
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
      applyIfRunning();
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
      applyIfRunning();
    },

    addRule: async (r) => {
      await proxyBridgeApi.addRule(r);
      const rules = await proxyBridgeApi.listRules();
      set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
      applyIfRunning();
    },

    updateRule: async (index, r) => {
      await proxyBridgeApi.updateRule(index, r);
      const rules = await proxyBridgeApi.listRules();
      set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
      applyIfRunning();
    },

    deleteRule: async (index) => {
      await proxyBridgeApi.deleteRule(index);
      const rules = await proxyBridgeApi.listRules();
      set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
      applyIfRunning();
    },

    reorderRule: async (from, to) => {
      await proxyBridgeApi.reorderRule(from, to);
      const rules = await proxyBridgeApi.listRules();
      set((s) => (s.profile ? { profile: { ...s.profile, ProxyRules: rules } } : {}));
      applyIfRunning();
    },

    setLocalhostViaProxy: async (v) => {
      await proxyBridgeApi.setLocalhostViaProxy(v);
      set((s) => (s.profile ? { profile: { ...s.profile, LocalhostViaProxy: v } } : {}));
      applyIfRunning();
    },

    setTrafficLogging: async (v) => {
      await proxyBridgeApi.setTrafficLogging(v);
      set((s) =>
        s.profile ? { profile: { ...s.profile, IsTrafficLoggingEnabled: v } } : {},
      );
      applyIfRunning();
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
  };
});
