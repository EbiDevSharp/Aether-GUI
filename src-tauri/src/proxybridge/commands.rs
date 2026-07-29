//! سطح IPC بین React و Rust. هر تابع اینجا با invoke() از فرانت صدا زده می‌شه.
//! این فایل تنها جایی‌ست که فرانت‌اند مستقیم بهش دسترسی داره؛ بقیه‌ی
//! ماژول‌ها (profile/state/process/elevate) از دید فرانت مخفی‌ان.

use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use super::elevate;
use super::process;
use super::process_list::{self, ProcessInfo};
use super::profile::{ProxyBridgeProfile, ProxyConfig, ProxyRule};
use super::state::{ProxyBridgeState, ProxyBridgeStatus};

pub type SharedState = Arc<ProxyBridgeState>;

#[tauri::command]
pub fn pb_is_elevated() -> bool {
    elevate::is_elevated()
}

/// لیست برنامه‌های در حال اجرا، برای پرکردن ProcessName بدون تایپ دستی.
/// این کار نیازی به دسترسی ادمین نداره (فقط خوندن لیست پروسس‌هاست).
#[tauri::command]
pub fn pb_list_running_processes() -> Vec<ProcessInfo> {
    process_list::list_running_processes()
}

#[tauri::command]
pub fn pb_relaunch_elevated() -> Result<(), String> {
    elevate::relaunch_elevated().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pb_get_profile(state: State<'_, SharedState>) -> ProxyBridgeProfile {
    state.profile.lock().unwrap().clone()
}

#[tauri::command]
pub fn pb_get_status(state: State<'_, SharedState>) -> ProxyBridgeStatus {
    state.get_status()
}

#[tauri::command]
pub fn pb_set_localhost_via_proxy(
    state: State<'_, SharedState>,
    enabled: bool,
) -> Result<(), String> {
    state.profile.lock().unwrap().localhost_via_proxy = enabled;
    state.persist().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pb_set_traffic_logging(state: State<'_, SharedState>, enabled: bool) -> Result<(), String> {
    state
        .profile
        .lock()
        .unwrap()
        .is_traffic_logging_enabled = enabled;
    state.persist().map_err(|e| e.to_string())
}

// ---------- Proxy Configs (🟢 Proxy List) ----------

#[tauri::command]
pub fn pb_add_proxy_config(
    state: State<'_, SharedState>,
    mut config: ProxyConfig,
) -> Result<ProxyConfig, String> {
    let mut profile = state.profile.lock().unwrap();
    config.id = profile.next_proxy_config_id();
    profile.proxy_configs.push(config.clone());
    drop(profile);
    state.persist().map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
pub fn pb_update_proxy_config(
    state: State<'_, SharedState>,
    config: ProxyConfig,
) -> Result<(), String> {
    let mut profile = state.profile.lock().unwrap();
    if let Some(existing) = profile.proxy_configs.iter_mut().find(|c| c.id == config.id) {
        *existing = config;
    } else {
        return Err(format!("Proxy config با id={} پیدا نشد", config.id));
    }
    drop(profile);
    state.persist().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pb_delete_proxy_config(state: State<'_, SharedState>, id: u32) -> Result<(), String> {
    let mut profile = state.profile.lock().unwrap();
    profile.proxy_configs.retain(|c| c.id != id);
    // هر Rule ای که به این config اشاره می‌کرد رو به DIRECT برمی‌گردونیم
    // تا کاربر یهو یک rule «یتیم» و گیج‌کننده نداشته باشه.
    for rule in profile.proxy_rules.iter_mut() {
        if rule.proxy_config_id == Some(id) {
            rule.proxy_config_id = None;
        }
    }
    drop(profile);
    state.persist().map_err(|e| e.to_string())
}

/// تست اتصال پراکسی، معادل «Test Proxy Connection» در GUI رسمی.
/// این بخش مستقل از ProxyBridge_CLI هست: خودمون یک TCP connect ساده
/// (برای SOCKS5) یا CONNECT (برای HTTP) به مقصد از طریق پراکسی می‌زنیم.
#[tauri::command]
pub async fn pb_test_proxy_connection(
    config: ProxyConfig,
    destination_host: String,
    destination_port: u16,
) -> Result<String, String> {
    super::test_connection::run(config, destination_host, destination_port)
        .await
        .map_err(|e| e.to_string())
}

// ---------- Rules (🔴 Bypass / 🌐 Host / 🔌 Port / 📦 Application) ----------

#[tauri::command]
pub fn pb_list_rules(state: State<'_, SharedState>) -> Vec<ProxyRule> {
    state.profile.lock().unwrap().proxy_rules.clone()
}

#[tauri::command]
pub fn pb_add_rule(state: State<'_, SharedState>, rule: ProxyRule) -> Result<(), String> {
    let mut profile = state.profile.lock().unwrap();
    profile.proxy_rules.push(rule);
    profile.reorder_bypass_first();
    drop(profile);
    state.persist().map_err(|e| e.to_string())
}

/// index بر اساس موقعیت فعلی توی آرایه (چون ProxyRule کلید یکتای رسمی نداره،
/// دقیقاً مثل فرمت خود ProxyBridge). فرانت همیشه index رو از همون لیستی
/// که با pb_list_rules گرفته پاس می‌ده.
#[tauri::command]
pub fn pb_update_rule(
    state: State<'_, SharedState>,
    index: usize,
    rule: ProxyRule,
) -> Result<(), String> {
    let mut profile = state.profile.lock().unwrap();
    if index >= profile.proxy_rules.len() {
        return Err("index خارج از محدوده".into());
    }
    profile.proxy_rules[index] = rule;
    profile.reorder_bypass_first();
    drop(profile);
    state.persist().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pb_delete_rule(state: State<'_, SharedState>, index: usize) -> Result<(), String> {
    let mut profile = state.profile.lock().unwrap();
    if index >= profile.proxy_rules.len() {
        return Err("index خارج از محدوده".into());
    }
    profile.proxy_rules.remove(index);
    drop(profile);
    state.persist().map_err(|e| e.to_string())
}

/// جابه‌جایی دستی ترتیب rule ها (drag & drop در جدول)، چون ارزیابی
/// top-down هست و ترتیب معنی داره.
#[tauri::command]
pub fn pb_reorder_rule(
    state: State<'_, SharedState>,
    from_index: usize,
    to_index: usize,
) -> Result<(), String> {
    let mut profile = state.profile.lock().unwrap();
    if from_index >= profile.proxy_rules.len() || to_index >= profile.proxy_rules.len() {
        return Err("index خارج از محدوده".into());
    }
    let rule = profile.proxy_rules.remove(from_index);
    profile.proxy_rules.insert(to_index, rule);
    drop(profile);
    state.persist().map_err(|e| e.to_string())
}

// ---------- Import / Export پروفایل (سازگار با GUI رسمی ProxyBridge) ----------

#[tauri::command]
pub fn pb_export_profile(state: State<'_, SharedState>, target_path: String) -> Result<(), String> {
    let profile = state.profile.lock().unwrap();
    profile
        .save(&std::path::PathBuf::from(target_path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pb_import_profile(
    state: State<'_, SharedState>,
    source_path: String,
) -> Result<ProxyBridgeProfile, String> {
    let loaded = ProxyBridgeProfile::load(&std::path::PathBuf::from(source_path))
        .map_err(|e| e.to_string())?;
    *state.profile.lock().unwrap() = loaded.clone();
    state.persist().map_err(|e| e.to_string())?;
    Ok(loaded)
}

// ---------- Start / Stop ----------

#[tauri::command]
pub async fn pb_start(app: AppHandle, state: State<'_, SharedState>) -> Result<(), String> {
    if !elevate::is_elevated() {
        return Err("NEEDS_ELEVATION".into()); // فرانت این رشته رو می‌شناسه و دیالوگ UAC می‌زنه
    }
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let binary_path = process::cli_binary_path(&resource_dir);
    let shared: SharedState = state.inner().clone();
    process::start(app.clone(), shared, binary_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pb_stop(state: State<'_, SharedState>) -> Result<(), String> {
    let shared: SharedState = state.inner().clone();
    process::stop(shared).map_err(|e| e.to_string())
}
