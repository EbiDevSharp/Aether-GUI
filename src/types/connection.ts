// Mirrors src-tauri/src/state.rs::ConnectionState (serde adjacently-tagged
// via `#[serde(tag = "state")]`) and src-tauri/src/aether/profiles.rs.

export type ConnectionStatus =
  | { state: "Idle" }
  | { state: "Launching" }
  | { state: "Connecting" }
  | { state: "Connected"; socks_addr: string; connected_at_ms: number; profile_summary: string }
  | { state: "Reconnecting"; attempt: number; max_attempts: number }
  | { state: "Disconnecting" }
  | { state: "Error"; message: string; phase: string };

export type Protocol = "auto" | "masque" | "wireguard" | "gool";
export type ScanMode = "turbo" | "balanced" | "thorough" | "stealth" | "ironclad";
export type IpVersion = "v4" | "v6" | "both";
export type NoizeProfile = "off" | "light" | "balanced" | "aggressive";
export type EchMode = "off" | "auto" | "custom";
export type ZeroTrustAuthMethod = "email" | "servicetoken" | "accesstoken";

export interface ConnectionProfile {
  protocol: Protocol;
  scan_mode: ScanMode;
  ip_version: IpVersion;
  /** Local SOCKS5 listen port. Defaults to Aether's own default, 1819. */
  local_port: number;
  /** Aether ≥1.1.1: reuse the last known-working gateway with a quick
   * recheck instead of a full scan. */
  quick_reconnect: boolean;
  /** Aether ≥1.2.0: run MASQUE over HTTP/2 (TCP) instead of the default
   * HTTP/3 (QUIC) — for networks that block or throttle UDP. */
  masque_http2: boolean;
  /** Traffic obfuscation profile (`--noize`). Aether's own default is
   * "balanced". */
  noize_profile: NoizeProfile;
  /** Fragments the TLS ClientHello on the HTTP/2 transport (`--fragment`).
   * Only has an effect together with `masque_http2`. */
  fragment_enabled: boolean;
  /** Binds the SOCKS5 listener to `0.0.0.0` instead of loopback-only, so
   * other devices on the LAN can use it too (`--bind 0.0.0.0:<port>`). */
  lan_access_enabled: boolean;
  /** Port to bind when `lan_access_enabled` is set. `null` means "use
   * `local_port`". */
  lan_port: number | null;
  /** Encrypted Client Hello (`--ech <auto|base64>`). "custom" sends
   * `ech_config` verbatim; "off" never passes `--ech`. */
  ech_mode: EchMode;
  /** Base64 ECH config, only used when `ech_mode` is "custom". */
  ech_config: string;
  /** Forces a specific gateway (`--peer <ip:port>`), skipping the scan
   * phase. Empty string means "let Aether scan" (the default). */
  forced_peer: string;
  /** Aether ≥1.3.0: `--verbose`, detailed per-stage debug logs — the most
   * useful thing to turn on when diagnosing a mysterious drop. */
  verbose_logs: boolean;
  /** Aether ≥1.5.0: enrol as a managed device on a Cloudflare Zero Trust
   * organization (`--team <name>`) instead of an anonymous consumer WARP
   * device. Off means the `zero_trust_*`/`gateway_enabled` fields below are
   * never sent, whatever they're set to. */
  zero_trust_enabled: boolean;
  /** The organization's team name, e.g. "acme" for acme.cloudflareaccess.com. */
  zero_trust_team: string;
  zero_trust_auth_method: ZeroTrustAuthMethod;
  /** `--access-email`: a one-time code is sent here; Aether then prompts
   * for it. */
  zero_trust_email: string;
  /** `--access-id` — paired with `zero_trust_access_secret`
   * (`--access-secret`), an Access service token for headless sign-in. */
  zero_trust_access_id: string;
  zero_trust_access_secret: string;
  /** `--access-token`: a JWT already obtained by signing in at
   * `<team>.cloudflareaccess.com/warp`. */
  zero_trust_access_token: string;
  /** `--gateway`: routes HTTP/HTTPS through the organization's Gateway
   * proxy. Off by default even when Zero Trust is enabled. */
  gateway_enabled: boolean;
}

export interface LogLine {
  line: string;
  timestamp: number;
}

/** One parsed "[+] selected/using ..." line — see the four regexes in
 * connectionStore.ts's flushLogs. Aggregated for GatewayInfoPanel instead
 * of making the user dig through the raw Logs accordion for them. */
export interface GatewayInfoEntry {
  t: number;
  kind: "masque" | "wireguard" | "cloudflare" | "forced" | "masque_cached" | "wireguard_cached";
  address: string;
  rtt?: string;
}

// Mirrors src-tauri/src/commands.rs::WarpIdentity — deliberately only the
// safe fields (no keys/tokens); see that struct's doc-comment.
export interface WarpIdentity {
  ipv4: string;
  ipv6: string;
  wg_peer_public_key: string;
}

// Mirrors src-tauri/src/commands.rs::FullAppSettings.
export interface AppSettings {
  start_minimized: boolean;
  auto_connect: boolean;
  launch_on_startup: boolean;
  language: string;
  compact_window: boolean;
}