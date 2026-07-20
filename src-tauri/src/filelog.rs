use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// Persistent, append-only copy of every raw line Aether prints, one file
/// per UTC calendar day (re-opened/appended across however many connect/
/// disconnect cycles happen that day). Kept independent of the in-memory
/// Logs panel in the UI (connectionStore.ts caps that at 500 lines and
/// wipes it on every app restart) — this is what to open after the fact
/// when a drop happened hours ago and the in-app panel has long since
/// scrolled past it. See aether/mod.rs's log-forwarding thread for the one
/// call site: every line that reaches the UI also reaches here, so the
/// file is never missing something the panel shows (or vice versa).
static CURRENT: Mutex<Option<(String, File)>> = Mutex::new(None);

fn logs_dir(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_data_dir().ok()?.join("logs");
    fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

/// UTC Y-M-D for a UNIX-epoch millisecond timestamp, computed without a
/// date/time dependency via the standard days-since-epoch civil calendar
/// algorithm (Howard Hinnant's `civil_from_days`, public domain). Good
/// enough for a log filename — this doesn't need timezone-exact day
/// boundaries, just a reasonably stable "which day was this" grouping.
fn ymd_utc(unix_ms: u64) -> (i64, u32, u32) {
    let days = (unix_ms / 86_400_000) as i64;
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

fn date_key(unix_ms: u64) -> String {
    let (y, m, d) = ymd_utc(unix_ms);
    format!("{y:04}-{m:02}-{d:02}")
}

fn open_for(app: &AppHandle, key: &str) -> Option<File> {
    let dir = logs_dir(app)?;
    OpenOptions::new().create(true).append(true).open(dir.join(format!("aether-{key}.log"))).ok()
}

/// Appends one line, transparently rolling to a new day's file if the date
/// changed since the last call (a session spanning a UTC midnight). Silent
/// no-op on any I/O failure (disk full, permissions, app_data_dir
/// unavailable) — this is a best-effort diagnostic aid, not something that
/// should ever be able to take down a connection over a write error.
pub fn append(app: &AppHandle, line: &str, unix_ms: u64) {
    let key = date_key(unix_ms);
    let mut guard = CURRENT.lock().unwrap();
    let needs_reopen = !matches!(guard.as_ref(), Some((k, _)) if k == &key);
    if needs_reopen {
        match open_for(app, &key) {
            Some(f) => *guard = Some((key, f)),
            None => return,
        }
    }
    if let Some((_, f)) = guard.as_mut() {
        let _ = writeln!(f, "[{unix_ms}] {line}");
    }
}

/// Absolute path of the log directory, for the "Open Logs Folder" button.
pub fn dir_path(app: &AppHandle) -> Option<PathBuf> {
    logs_dir(app)
}
