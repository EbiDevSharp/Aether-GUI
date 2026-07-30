import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ProcessInfo,
  ProxyBridgeLogLine,
  ProxyBridgeProfile,
  ProxyBridgeStatus,
  ProxyConfig,
  ProxyRule,
} from "@/types/proxybridge";

export const proxyBridgeApi = {
  isElevated: () => invoke<boolean>("pb_is_elevated"),
  relaunchElevated: () => invoke<void>("pb_relaunch_elevated"),
  listRunningProcesses: () => invoke<ProcessInfo[]>("pb_list_running_processes"),

  getProfile: () => invoke<ProxyBridgeProfile>("pb_get_profile"),
  getStatus: () => invoke<ProxyBridgeStatus>("pb_get_status"),

  setLocalhostViaProxy: (enabled: boolean) =>
    invoke<void>("pb_set_localhost_via_proxy", { enabled }),
  setTrafficLogging: (enabled: boolean) =>
    invoke<void>("pb_set_traffic_logging", { enabled }),

  addProxyConfig: (config: Omit<ProxyConfig, "Id">) =>
    invoke<ProxyConfig>("pb_add_proxy_config", { config: { ...config, Id: 0 } }),
  updateProxyConfig: (config: ProxyConfig) =>
    invoke<void>("pb_update_proxy_config", { config }),
  deleteProxyConfig: (id: number) => invoke<void>("pb_delete_proxy_config", { id }),
  testProxyConnection: (
    config: ProxyConfig,
    destinationHost: string,
    destinationPort: number,
  ) =>
    invoke<string>("pb_test_proxy_connection", {
      config,
      destinationHost,
      destinationPort,
    }),

  listRules: () => invoke<ProxyRule[]>("pb_list_rules"),
  addRule: (rule: ProxyRule) => invoke<void>("pb_add_rule", { rule }),
  updateRule: (index: number, rule: ProxyRule) =>
    invoke<void>("pb_update_rule", { index, rule }),
  deleteRule: (index: number) => invoke<void>("pb_delete_rule", { index }),
  reorderRule: (fromIndex: number, toIndex: number) =>
    invoke<void>("pb_reorder_rule", { fromIndex, toIndex }),

  exportProfile: (targetPath: string) =>
    invoke<void>("pb_export_profile", { targetPath }),
  importProfile: (sourcePath: string) =>
    invoke<ProxyBridgeProfile>("pb_import_profile", { sourcePath }),

  start: () => invoke<void>("pb_start"),
  stop: () => invoke<void>("pb_stop"),
  // See pb_restart_if_running's doc comment in commands.rs — ProxyBridge_CLI
  // has no hot-reload, so this is what actually makes a rule/config change
  // take effect immediately instead of "next time you Start". No-ops
  // silently if Bridge isn't currently running.
  restartIfRunning: () => invoke<void>("pb_restart_if_running"),

  onLog: (cb: (log: ProxyBridgeLogLine) => void): Promise<UnlistenFn> =>
    listen<ProxyBridgeLogLine>("proxybridge://log", (e) => cb(e.payload)),
  onStatus: (cb: (status: ProxyBridgeStatus) => void): Promise<UnlistenFn> =>
    listen<ProxyBridgeStatus>("proxybridge://status", (e) => cb(e.payload)),
};
