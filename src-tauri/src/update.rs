use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

use crate::settings;

/// What this module can check updates for. Adding a third target later
/// (e.g. a separate CLI companion tool) means one more variant here plus
/// one more arm in each of the three `match`es below — nothing else in
/// this file, `main.rs`, or the frontend needs to change shape.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Product {
    /// The upstream tunnel engine this whole app drives.
    Engine,
    /// Aether-GUI itself.
    Gui,
}

impl Product {
    fn from_key(key: &str) -> Option<Self> {
        match key {
            "engine" => Some(Product::Engine),
            "gui" => Some(Product::Gui),
            _ => None,
        }
    }
    fn key(self) -> &'static str {
        match self {
            Product::Engine => "engine",
            Product::Gui => "gui",
        }
    }
    fn repo(self) -> &'static str {
        match self {
            Product::Engine => "CluvexStudio/Aether",
            Product::Gui => "EbiDevSharp/Aether-GUI",
        }
    }
}

/// Fired from the startup check (see `check_on_startup`) so the frontend
/// can light up the update icon without polling. The on-demand
/// `check_for_update` command returns the same `UpdateInfo` directly for a
/// manual re-check, so the frontend only needs to *also* listen for this
/// to catch the automatic one. `product` is in the payload itself (see
/// `UpdateInfo`), so one event/listener covers every product.
pub const UPDATE_EVENT: &str = "aether-gui://update-available";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateInfo {
    pub product: String,
    /// Known exactly for Gui (this app's own Cargo.toml version, via
    /// `package_info()`). `None` for Engine — Aether has no `--version`
    /// flag, so there is no reliable way to ask what's actually sitting in
    /// resources/binaries/ right now (see `check`'s doc comment).
    pub current_version: Option<String>,
    pub latest_version: String,
    pub release_url: String,
    pub published_at: String,
    pub update_available: bool,
    /// True when the repo has no published GitHub Release yet (a 404 from
    /// `/releases/latest` — Aether-GUI's own repo has only a stray git tag
    /// and no formal release as of this writing). Distinguished from a
    /// network/API failure so the UI can say "not released yet" instead of
    /// "couldn't check".
    pub no_releases: bool,
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

/// `Ok(None)` specifically means "no releases published" (404) — every
/// other failure (offline, rate-limited, GitHub down) is `Err`.
fn fetch_latest_release(repo: &str) -> Result<Option<GhRelease>, String> {
    let url = format!("https://api.github.com/repos/{repo}/releases/latest");
    match ureq::get(&url)
        .set("User-Agent", "Aether-GUI-update-check")
        .set("Accept", "application/vnd.github+json")
        .timeout(Duration::from_secs(10))
        .call()
    {
        Ok(resp) => resp.into_json::<GhRelease>().map(Some).map_err(|e| e.to_string()),
        Err(ureq::Error::Status(404, _)) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Best-effort major.minor.patch parse for comparing two version strings
/// numerically rather than lexicographically — plain string comparison
/// would wrongly call "1.9.0" newer than "1.10.0". Missing components
/// default to 0 (so "1.4" parses like "1.4.0"); anything that doesn't
/// start with a number returns `None`, and callers fall back to a simple
/// inequality check in that case (still correct, just less precise about
/// *which* one is newer — good enough for a non-numeric tag scheme).
fn parse_semver(v: &str) -> Option<(u64, u64, u64)> {
    let mut parts = v.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next().and_then(|p| p.parse().ok()).unwrap_or(0);
    let patch = parts.next().and_then(|p| p.parse().ok()).unwrap_or(0);
    Some((major, minor, patch))
}

fn is_newer(latest: &str, current: &str) -> bool {
    match (parse_semver(latest), parse_semver(current)) {
        (Some(l), Some(c)) => l > c,
        _ => latest != current,
    }
}

fn current_gui_version(app: &AppHandle) -> String {
    app.package_info().version.to_string()
}

/// The actual check, shared by the on-demand command and the startup call.
///
/// Engine and Gui use genuinely different notions of "current version",
/// which is why `update_available` is computed differently for each:
///
/// - **Gui**: we know our own version exactly (this app's Cargo.toml, via
///   `package_info()`), so this directly numerically-compares it against
///   the latest release tag. No stored state needed — the moment the app
///   is actually updated, `current_version` changes on its own and this
///   naturally goes back to `false`.
/// - **Engine**: Aether's CLI has no `--version` flag (confirmed against
///   cli.rs upstream) and nothing bundles version metadata alongside the
///   sidecar binary today, so there is no reliable way to ask what's
///   actually sitting in resources/binaries/ right now. Rather than guess,
///   this compares the latest release tag against
///   `last_seen_aether_version` in settings — a version the user has
///   already been *shown*, not necessarily the one bundled. First-ever
///   check (no stored value) seeds the baseline silently
///   (`update_available: false`) instead of nagging on a fresh install
///   before the user has any basis to compare against.
fn check(app: &AppHandle, product: Product) -> Result<UpdateInfo, String> {
    let release = match fetch_latest_release(product.repo())? {
        Some(r) => r,
        None => {
            return Ok(UpdateInfo {
                product: product.key().into(),
                current_version: (product == Product::Gui).then(|| current_gui_version(app)),
                latest_version: String::new(),
                release_url: format!("https://github.com/{}/releases", product.repo()),
                published_at: String::new(),
                update_available: false,
                no_releases: true,
            });
        }
    };
    let latest_version = normalize_version(&release.tag_name).to_string();

    let (current_version, update_available) = match product {
        Product::Gui => {
            let current = current_gui_version(app);
            let available = is_newer(&latest_version, &current);
            (Some(current), available)
        }
        Product::Engine => {
            let stored = settings::load(app);
            let available = match &stored.last_seen_aether_version {
                Some(seen) => seen != &latest_version,
                None => {
                    // First check ever: record the baseline, don't alarm.
                    let mut s = stored.clone();
                    s.last_seen_aether_version = Some(latest_version.clone());
                    settings::save(app, &s);
                    false
                }
            };
            (None, available)
        }
    };

    Ok(UpdateInfo {
        product: product.key().into(),
        current_version,
        latest_version,
        release_url: release.html_url,
        published_at: release.published_at,
        update_available,
        no_releases: false,
    })
}

/// In-memory copy of each product's last check, so reopening the update
/// menu doesn't need to re-hit the network — only `check_for_update`'s
/// explicit "Check now" and the one startup check actually call GitHub.
static LAST: Mutex<Option<HashMap<&'static str, UpdateInfo>>> = Mutex::new(None);

fn store_last(info: &UpdateInfo, key: &'static str) {
    let mut guard = LAST.lock().unwrap();
    guard.get_or_insert_with(HashMap::new).insert(key, info.clone());
}

#[tauri::command]
pub fn check_for_update(app: AppHandle, product: String) -> Result<UpdateInfo, String> {
    let p = Product::from_key(&product).ok_or_else(|| format!("unknown product: {product}"))?;
    let info = check(&app, p)?;
    store_last(&info, p.key());
    Ok(info)
}

#[tauri::command]
pub fn get_cached_update_info(product: String) -> Option<UpdateInfo> {
    let p = Product::from_key(&product)?;
    LAST.lock().unwrap().as_ref()?.get(p.key()).cloned()
}

/// Marks `version` as seen for Engine, so `update_available` goes back to
/// false for it specifically until a newer release appears — see `check`'s
/// doc comment for why Engine needs this and Gui doesn't. A no-op for Gui:
/// there's nothing to persist, since Gui's `update_available` only ever
/// reflects the app's own real, current version.
#[tauri::command]
pub fn acknowledge_update(app: AppHandle, product: String, version: String) {
    if Product::from_key(&product) != Some(Product::Engine) {
        return;
    }
    let mut s = settings::load(&app);
    s.last_seen_aether_version = Some(version);
    settings::save(&app, &s);
}

/// Called once from `main.rs`'s `setup()`, off the startup path (spawned,
/// not awaited) — a slow or failed GitHub call should never delay the
/// window appearing. Checks every product; silent per-product on failure
/// (offline, rate-limited, GitHub down) — there is no user-facing error
/// state for "couldn't check for updates on launch", it just quietly tries
/// again next time something calls `check_for_update`.
pub fn check_on_startup(app: AppHandle) {
    std::thread::spawn(move || {
        for product in [Product::Engine, Product::Gui] {
            if let Ok(info) = check(&app, product) {
                let available = info.update_available;
                store_last(&info, product.key());
                if available {
                    let _ = app.emit(UPDATE_EVENT, info);
                }
            }
        }
    });
}
