#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod aether;
mod commands;
mod error;
mod events;
mod filelog;
mod focus;
mod i18n;
mod settings;
mod state;
mod sysproxy;
mod tray;
mod update;
mod proxybridge;


use state::AppState;
use tauri::{Manager, WindowEvent};
use std::sync::Arc;
use proxybridge::ProxyBridgeState;

/// Must match tauri.conf.json's window `"width"/"height"` — that's the
/// size the window is actually created at, this is just what we resize
/// back to when leaving compact mode (see commands.rs::set_compact_window).
pub const NORMAL_SIZE: (f64, f64) = (420.0, 640.0);
/// Small fixed size for `compact_window` — still tall enough for the core
/// group (Connect button, status line, System Proxy chip) plus the three
/// collapsed accordion headers (Advanced/Expert/Connection Info) without
/// needing to scroll in the common case; opening any of those accordions
/// in compact mode falls back to the normal scrollable behavior
/// (App.tsx's `justify-[safe_center]`), same as it does at normal size.
pub const COMPACT_SIZE: (f64, f64) = (300.0, 480.0);

fn main() {
    tauri::Builder::default()
        
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            
            Some(vec!["--minimized".into()]),
        ))
        .manage(AppState::default())
        .setup(|app| {
            let data_dir = app.handle().path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            
            
            aether::orphan::reap_orphan(&data_dir);
            focus::spawn_watcher(app.handle().clone());

            i18n::init(app.handle());

            tray::build(app.handle())?;

            // ProxyBridge state: پروفایل .pbprofile رو از app_data_dir/proxybridge
            // می‌خونه (یا اگه وجود نداشته باشه، پروفایل خالی پیش‌فرض می‌سازه).
            let pb_state: proxybridge::commands::SharedState =
                Arc::new(ProxyBridgeState::new(data_dir.clone()));
            app.manage(pb_state);

            let app_settings = settings::load(app.handle());
            let launched_minimized = std::env::args().any(|a| a == "--minimized");
            if let Some(window) = app.get_webview_window("main") {
                if app_settings.compact_window {
                    let _ = window.set_size(tauri::LogicalSize::new(COMPACT_SIZE.0, COMPACT_SIZE.1));
                }
                if !(app_settings.start_minimized || launched_minimized) {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            if app_settings.auto_connect {
                let app_handle = app.handle().clone();
                let manager = app.state::<AppState>().manager.clone();
                // Give orphan-reap and the tray a moment to settle before
                // spawning Aether, rather than racing app startup.
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    let _ = aether::start_connect(app_handle, manager, None);
                });
            }

            update::check_on_startup(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect,
            commands::disconnect,
            commands::get_status,
            commands::get_default_profile,
            commands::set_default_profile,
            commands::get_lan_ip,
            commands::get_app_settings,
            commands::set_start_minimized,
            commands::set_compact_window,
            commands::set_auto_connect,
            commands::set_launch_on_startup,
            commands::get_system_proxy_enabled,
            commands::set_system_proxy_enabled,
            commands::set_language,
            commands::open_log_folder,
            commands::get_warp_identity,
            commands::open_external_url,
            update::check_for_update,
            update::get_cached_update_info,
            update::acknowledge_update,

            // --- ProxyBridge ---
            proxybridge::commands::pb_is_elevated,
            proxybridge::commands::pb_relaunch_elevated,
            proxybridge::commands::pb_list_running_processes,
            proxybridge::commands::pb_get_profile,
            proxybridge::commands::pb_get_status,
            proxybridge::commands::pb_set_localhost_via_proxy,
            proxybridge::commands::pb_set_traffic_logging,
            proxybridge::commands::pb_add_proxy_config,
            proxybridge::commands::pb_update_proxy_config,
            proxybridge::commands::pb_delete_proxy_config,
            proxybridge::commands::pb_test_proxy_connection,
            proxybridge::commands::pb_list_rules,
            proxybridge::commands::pb_add_rule,
            proxybridge::commands::pb_update_rule,
            proxybridge::commands::pb_delete_rule,
            proxybridge::commands::pb_reorder_rule,
            proxybridge::commands::pb_export_profile,
            proxybridge::commands::pb_import_profile,
            proxybridge::commands::pb_start,
            proxybridge::commands::pb_stop,
        ])
        .build(tauri::generate_context!())
        .expect("error building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                sysproxy::restore_if_active();
                let state = app_handle.state::<AppState>();
                let data_dir = app_handle
                    .path()
                    .app_data_dir()
                    .unwrap_or_else(|_| std::env::temp_dir());
                aether::shutdown_blocking(&state.manager, &data_dir);
            }
        });
}