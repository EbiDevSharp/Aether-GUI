export type ProxyType = "socks5" | "http";

export interface ProxyConfig {
  Id: number;
  Type: ProxyType;
  Host: string;
  Port: string;
  Username: string;
  Password: string;
}

export type Protocol = "TCP" | "UDP" | "BOTH";
export type RuleAction = "DIRECT" | "BLOCK" | "PROXY";

export interface ProxyRule {
  ProcessName: string;
  TargetHosts: string;
  TargetPorts: string;
  Protocol: Protocol;
  Action: RuleAction;
  IsEnabled: boolean;
  ProxyConfigId?: number | null;
}

export interface ProxyBridgeProfile {
  Version: string;
  LocalhostViaProxy: boolean;
  IsTrafficLoggingEnabled: boolean;
  ProxyConfigs: ProxyConfig[];
  ProxyRules: ProxyRule[];
}

export type ProxyBridgeStatus =
  | "idle"
  | "needsElevation"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "error";

export interface ProxyBridgeLogLine {
  line: string;
  stream: "stdout" | "stderr";
}

/** تب فعلی UI؛ فقط برای فیلتر/گروه‌بندی نمایشیه، بخشی از دیتای رسمی نیست. */
export type RuleOriginTab = "general" | "bypass" | "host" | "port" | "application";

/** یک برنامه‌ی در حال اجرا روی سیستم، برای پرکردن ProcessName بدون تایپ دستی. */
export interface ProcessInfo {
  name: string;
  exe_path: string | null;
  instance_count: number;
}
