use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::time::Duration;

pub fn socks_addr(port: u16) -> SocketAddr {
    SocketAddr::from(([127, 0, 0, 1], port))
}

/// Ground-truth "are we connected" signal: try to open a TCP connection to
/// Aether's local SOCKS5 port. This is immune to Aether changing its log
/// wording across releases, which is the actual fragility PTY-automation
/// accepts (see the approved plan) — log-line matching is only ever used to
/// fail fast / show a nicer message, never as the sole source of truth.
///
/// NOTE: this only proves Aether's local listener is up, not that the
/// tunnel behind it is actually forwarding traffic — the listener stays
/// open and keeps accepting new TCP connections even after the upstream
/// MASQUE/WireGuard session has silently died (confirmed in practice: a
/// large upload killed the session, the local port kept accepting
/// connections regardless). It's the right check for "did Aether finish
/// starting up" (used by `monitor_connect`, where nothing has forwarded any
/// real traffic yet), but `tunnel_is_live` below is what `monitor_connected`
/// uses once actually Connected, precisely because this one can't tell.
pub fn port_is_live(port: u16) -> bool {
    TcpStream::connect_timeout(&socks_addr(port), Duration::from_millis(300)).is_ok()
}

/// A minimal, dependency-free SOCKS5 client handshake used purely as a
/// liveness probe for an *already-Connected* tunnel: performs the real
/// no-auth greeting + CONNECT flow Aether's SOCKS5 listener expects, and
/// checks that the reply actually says "succeeded" — proof traffic is being
/// forwarded end-to-end, not just that the local listener answers TCP
/// handshakes (see `port_is_live`'s doc comment for why that's not enough
/// here). Targets Cloudflare's 1.1.1.1:443: infrastructure Aether/WARP
/// already depends on, effectively always reachable, and a bare TCP CONNECT
/// is enough — no need to actually speak TLS to it, only the SOCKS5 CONNECT
/// reply code matters.
///
/// Returns `Err(reason)` instead of a bare `false` — a censored network is
/// exactly the environment this app runs in, and 1.1.1.1 specifically is a
/// plausible thing for such a network (or even an upstream policy) to treat
/// differently from arbitrary traffic. Without knowing *which* step failed,
/// a probe failure and an actually-dead tunnel look identical from the
/// caller's side; this makes that visible in the logs instead of guessing.
pub fn tunnel_is_live(port: u16, timeout: Duration) -> Result<(), String> {
    let mut stream = TcpStream::connect_timeout(&socks_addr(port), timeout)
        .map_err(|e| format!("connect to local SOCKS5 port failed: {e}"))?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|e| format!("set_read_timeout failed: {e}"))?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|e| format!("set_write_timeout failed: {e}"))?;

    // Greeting: SOCKS version 5, one offered auth method, no-auth (0x00).
    // Aether's listener doesn't require credentials for local connections.
    stream.write_all(&[0x05, 0x01, 0x00]).map_err(|e| format!("greeting write failed: {e}"))?;
    let mut method_reply = [0u8; 2];
    stream.read_exact(&mut method_reply).map_err(|e| format!("greeting read failed (likely timeout): {e}"))?;
    if method_reply != [0x05, 0x00] {
        return Err(format!("greeting rejected: got {method_reply:02x?}, expected [05, 00]"));
    }

    // CONNECT request: VER CMD RSV ATYP(IPv4) DST.ADDR DST.PORT.
    let target_ip: Ipv4Addr = "1.1.1.1".parse().expect("valid literal IPv4 address");
    let mut request = vec![0x05, 0x01, 0x00, 0x01];
    request.extend_from_slice(&target_ip.octets());
    request.extend_from_slice(&443u16.to_be_bytes());
    stream.write_all(&request).map_err(|e| format!("CONNECT request write failed: {e}"))?;

    // Reply: VER REP RSV ATYP [BND.ADDR BND.PORT] — only REP (byte 1)
    // matters here, and 0x00 means "succeeded". No need to read the
    // variable-length address that follows; the socket is dropped
    // immediately after, closing the probe connection either way.
    let mut reply_header = [0u8; 4];
    stream
        .read_exact(&mut reply_header)
        .map_err(|e| format!("CONNECT reply read failed (likely timeout reaching 1.1.1.1:443 through the tunnel): {e}"))?;
    if reply_header[0] != 0x05 || reply_header[1] != 0x00 {
        return Err(format!(
            "CONNECT to 1.1.1.1:443 rejected: SOCKS5 reply code 0x{:02x} (0x00 = succeeded)",
            reply_header[1]
        ));
    }
    Ok(())
}

/// Empirically (manually running v1.0.1 to completion), Aether's own route-
/// discovery budget goes up to 120s for MASQUE and 80s for WireGuard (its
/// own "budget=..." log line). The GUI's connect timeout must exceed both,
/// or it would fire while Aether is still legitimately scanning for a route.
pub const CONNECT_TIMEOUT: Duration = Duration::from_secs(150);

/// How long to wait after sending Ctrl-C before force-killing. Manually
/// testing shutdown against the real binary showed it does NOT exit quickly
/// on SIGINT (still alive 10+ seconds later) — but since v1 never elevates
/// or opens a TUN device, there is nothing at the OS level a hard kill would
/// leave dangling, so a short grace period followed by SIGKILL is the
/// expected common path here, not a rare fallback.
pub const GRACEFUL_SHUTDOWN_GRACE: Duration = Duration::from_secs(3);

/// Auto-retry policy for unexpected drops/timeouts (never for a
/// user-requested disconnect) — applies uniformly to every protocol, since
/// a sudden mid-session drop (observed in practice with gool, the most
/// fragile of the three: two nested WireGuard tunnels) is exactly as
/// disruptive on MASQUE or plain WireGuard. Backoff increases per attempt
/// rather than retrying immediately, on the theory that whatever caused the
/// drop (a flaky relay, a momentary network hiccup) is more likely to have
/// cleared given a moment, and to avoid hammering the same dead endpoint.
pub const MAX_AUTO_RETRIES: u32 = 3;
pub const RETRY_BACKOFF: [Duration; MAX_AUTO_RETRIES as usize] =
    [Duration::from_secs(2), Duration::from_secs(5), Duration::from_secs(10)];

/// How often `monitor_connected` runs `tunnel_is_live` against an
/// already-Connected session. Not every 500ms-loop tick — that would mean
/// firing a SOCKS5 CONNECT through the user's own tunnel roughly twice a
/// second for as long as they're connected, which is wasteful and, worse,
/// adds probe traffic that could itself be part of what a censor
/// fingerprints. Every 12s is frequent enough to notice a real drop quickly
/// without meaningfully adding to the traffic pattern.
pub const HEALTH_PROBE_INTERVAL: Duration = Duration::from_secs(12);

/// Consecutive failed probes required before treating the tunnel as
/// actually dead, rather than one after `HEALTH_PROBE_INTERVAL`. A single
/// failure is exactly what a brief, self-recovering hiccup looks like —
/// including the kind that motivated adding this check at all (a large
/// upload saturating the tunnel is a plausible reason one probe times out
/// without the tunnel actually being gone). Two consecutive failures
/// (~`HEALTH_PROBE_INTERVAL` apart) is a real, sustained drop.
pub const HEALTH_PROBE_FAILURE_THRESHOLD: u32 = 2;

/// Timeout for each individual health probe — generous enough that a
/// congested-but-alive tunnel usually still gets through under it.
pub const HEALTH_PROBE_TIMEOUT: Duration = Duration::from_secs(5);