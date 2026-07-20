use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::settings;

/// The upstream tunnel *engine* this whole app drives — not Aether-GUI's
/// own repo. Deliberately a constant, not a setting: pointing this at a
/// different repo would mean pointing it at a different tunnel engine
/// entirely (a fork with different flags/behavior), not a user preference
/// like "which mirror to download from".
const UPSTREAM_REPO: &str = "CluvexStudio/Aether";

/// Fired from the startup check (see `check_on_startup`) so the frontend
/// can light up the tray-adjacent icon without polling. The on-demand
/// `check_for_update` command returns the same `UpdateInfo` directly for a
/// manual re-check, so the frontend only needs to *also* listen for this
/// to catch the automatic one.
pub const UPDATE_EVENT: &str = "aether-gui://update-available";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateInfo {
    pub latest_version: String,
    pub release_url: String,
    pub published_at: String,
    /// True only once `latest_version` differs from the version the user
    /// has already acknowledged (see `acknowledge`) — NOT simply "a release
    /// exists". Aether has no `--version` flag to check what's actually
    /// bundled (see the doc comment on `check` below for why this is
    /// last-acknowledged-based rather than actual-binary-based), so this
    /// is deliberately a *delta* signal, not an absolute one.
    pub update_available: bool,
}

#[derive(Deserialize)]
struct GhRelease {
    tag_name: String,
    html_url: String,
    published_at: String,
    #[serde(default)]
    draft: bool,
}

fn normalize_version(tag: &str) -> &str {
    tag.trim_start_matches('v')
}

fn fetch_latest_release() -> Result<GhRelease, String> {
    let url = format!("https://api.github.com/repos/{UPSTREAM_REPO}/releases/latest");
    ureq::get(&url)
        .set("User-Agent", "Aether-GUI-update-check")
        .set("Accept", "application/vnd.github+json")
        .timeout(Duration::from_secs(10))
        .call()
        .map_err(|e| e.to_string())?
        .into_json::<GhRelease>()
        .map_err(|e| e.to_string())
}

/// The actual check, shared by the on-demand command and the startup call.
///
/// Note on what "current version" means here: Aether's CLI has no
/// `--version` flag (confirmed against cli.rs upstream), and nothing bundles
/// version metadata alongside the sidecar binary today, so there is no
/// reliable way to ask "what version is actually sitting in
/// resources/binaries/ right now". Rather than guess, this compares the
/// latest release tag against `last_seen_aether_version` in settings — a
/// version the user has already been shown, not necessarily the one
/// bundled. First-ever check (no stored value) seeds the baseline silently
/// (`update_available: false`) instead of nagging on a fresh install before
/// the user has any basis to compare against.
fn check(app: &AppHandle) -> Result<UpdateInfo, String> {
    let release = fetch_latest_release()?;
    let latest_version = normalize_version(&release.tag_name).to_string();

    let stored = settings::load(app);
    let update_available = match &stored.last_seen_aether_version {
        Some(seen) => seen != &latest_version,
        None => {
            // First check ever: record the baseline, don't alarm.
            let mut s = stored.clone();
            s.last_seen_aether_version = Some(latest_version.clone());
            settings::save(app, &s);
            false
        }
    };

    Ok(UpdateInfo {
        latest_version,
        release_url: release.html_url,
        published_at: release.published_at,
        update_available,
    })
}

/// In-memory copy of the last check's result, so reopening the update menu
/// doesn't need to re-hit the network — only `check_for_update`'s explicit
/// "Check now" and the one startup check actually call GitHub.
static LAST: Mutex<Option<UpdateInfo>> = Mutex::new(None);

#[tauri::command]
pub fn check_for_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let info = check(&app)?;
    *LAST.lock().unwrap() = Some(info.clone());
    Ok(info)
}

#[tauri::command]
pub fn get_cached_update_info() -> Option<UpdateInfo> {
    LAST.lock().unwrap().clone()
}

/// Marks `version` as seen, so `update_available` goes back to false for it
/// specifically — called once the user has actually looked at the release
/// (opened the release page), not merely opened the dropdown. A brand new
/// release later still flips it back on.
#[tauri::command]
pub fn acknowledge_update(app: AppHandle, version: String) {
    let mut s = settings::load(&app);
    s.last_seen_aether_version = Some(version);
    settings::save(&app, &s);
}

/// Called once from `main.rs`'s `setup()`, off the startup path (spawned,
/// not awaited) — a slow or failed GitHub call should never delay the
/// window appearing. Silent on failure (offline, rate-limited, GitHub
/// down): there is no user-facing error state for "couldn't check for
/// updates on launch", it just quietly tries again next time something
/// calls `check_for_update`.
pub fn check_on_startup(app: AppHandle) {
    std::thread::spawn(move || {
        if let Ok(info) = check(&app) {
            let available = info.update_available;
            *LAST.lock().unwrap() = Some(info.clone());
            if available {
                let _ = app.emit(UPDATE_EVENT, info);
            }
        }
    });
}
