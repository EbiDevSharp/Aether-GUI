//! Spawn کردن باینری واقعی ProxyBridge_CLI از طریق یک PTY واقعی (نه پایپ ساده).
//!
//! چرا PTY؟ برنامه‌های C روی ویندوز وقتی stdout‌شون به یک پایپ معمولی وصل
//! باشه (نه یک ترمینال)، خروجی رو کامل بافر می‌کنن (fully-buffered) به‌جای
//! خط‌به‌خط (line-buffered). یعنی با Stdio::piped() ساده، ممکنه لاگ فقط با
//! تاخیر خیلی زیاد یا فقط بعد از بسته‌شدن پروسس برسه. با یک PTY واقعی،
//! CLI فکر می‌کنه به ترمینال وصله و طبیعی flush می‌کنه — دقیقاً همون
//! تجربه‌ای که موقع اجرای دستی توی PowerShell دیدیم.
//!
//! نکته‌ی مهم: این تابع فقط زمانی درست کار می‌کنه که خود پروسس فعلی
//! (Aether-GUI) از قبل elevated باشه — چک‌ش رو در commands.rs قبل از
//! صدا زدن این تابع انجام می‌دیم (ببین elevate::is_elevated).

use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::Arc;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{AppHandle, Emitter};

use super::state::{ProxyBridgeState, ProxyBridgeStatus};

#[cfg(target_os = "windows")]
const CLI_BINARY: &str = "ProxyBridge_CLI.exe";
#[cfg(not(target_os = "windows"))]
const CLI_BINARY: &str = "proxybridge-cli";

/// مسیر باینری bundle شده، شبیه دقیقاً همون کاری که Aether-GUI برای
/// src-tauri/binaries/aether(.exe) انجام می‌ده.
pub fn cli_binary_path(resource_dir: &PathBuf) -> PathBuf {
    resource_dir.join("binaries").join(CLI_BINARY)
}

#[derive(Clone, serde::Serialize)]
struct LogLine {
    line: String,
    stream: &'static str, // فعلا همیشه "stdout" چون PTY استریم‌ها رو با هم ادغام می‌کنه
}

pub fn start(
    app: AppHandle,
    state: Arc<ProxyBridgeState>,
    binary_path: PathBuf,
) -> anyhow::Result<()> {
    if !binary_path.exists() {
        anyhow::bail!(
            "باینری {} پیدا نشد. اول fetch-proxybridge اجرا کن.",
            binary_path.display()
        );
    }

    state.persist()?; // مطمئن می‌شیم آخرین rule ها/proxy config ها روی دیسک نوشته شدن
    state.set_status(ProxyBridgeStatus::Starting);

    let profile_path = state.profile_path.clone();

    let pty_system = native_pty_system();
    let pair = pty_system.openpty(PtySize {
        rows: 50,
        cols: 160,
        pixel_width: 0,
        pixel_height: 0,
    })?;

    let mut cmd = CommandBuilder::new(&binary_path);
    if let Some(dir) = binary_path.parent() {
        cmd.cwd(dir);
    }
    cmd.arg("--profile");
    cmd.arg(&profile_path);
    cmd.arg("--verbose");
    cmd.arg("3");

    let mut child = pair.slave.spawn_command(cmd)?;
    // سمت slave توی همین پروسس دیگه لازم نیست؛ نگه‌داشتنش فقط handle قفل می‌کنه.
    drop(pair.slave);

    let reader = pair.master.try_clone_reader()?;
    let writer = pair.master.take_writer()?;
    // master رو باید تا وقتی ترد خوندن زنده‌ست نگه داریم — روی ویندوز (ConPTY)
    // اگه master زودتر drop بشه، ممکنه پی‌تی‌وای زودتر از موعد بسته بشه.
    let master_keepalive = pair.master;

    *state.child_pid.lock().unwrap() = child.process_id();
    *state.pty_writer.lock().unwrap() = Some(writer);

    // ترد خوندن خروجی زنده (stdout+stderr با هم، چون PTY این‌طوریه)
    {
        let app = app.clone();
        let state = state.clone();
        std::thread::spawn(move || {
            let _keep_master_alive = master_keepalive;
            let mut buf_reader = BufReader::new(reader);
            let mut line = String::new();
            loop {
                line.clear();
                match buf_reader.read_line(&mut line) {
                    Ok(0) => break, // EOF یعنی پروسس خروجی رو بست
                    Ok(_) => {
                        if state.get_status() == ProxyBridgeStatus::Starting {
                            state.set_status(ProxyBridgeStatus::Running);
                            let _ = app.emit("proxybridge://status", ProxyBridgeStatus::Running);
                        }
                        let trimmed = line.trim_end_matches(['\r', '\n']).to_string();
                        if !trimmed.is_empty() {
                            let _ = app.emit(
                                "proxybridge://log",
                                LogLine {
                                    line: trimmed,
                                    stream: "stdout",
                                },
                            );
                        }
                    }
                    Err(_) => break,
                }
            }
        });
    }

    // ترد ناظر خروج پروسس
    {
        let app = app.clone();
        let state = state.clone();
        std::thread::spawn(move || {
            let exit = child.wait();
            *state.child_pid.lock().unwrap() = None;
            *state.pty_writer.lock().unwrap() = None;
            let next_status = match exit {
                Ok(status) if status.success() => ProxyBridgeStatus::Stopped,
                _ => {
                    // اگه از قبل خودمون داشتیم عمدا Stop می‌کردیم (Stopping)،
                    // این یک خطای واقعی نیست، صرفا خروج تمیز بعد از Ctrl+C.
                    if state.get_status() == ProxyBridgeStatus::Stopping {
                        ProxyBridgeStatus::Stopped
                    } else {
                        ProxyBridgeStatus::Error
                    }
                }
            };
            state.set_status(next_status);
            let _ = app.emit("proxybridge://status", next_status);
        });
    }

    Ok(())
}

/// همون Ctrl+C واقعی که بنر خود CLI می‌گه ("Press Ctrl+C to stop") — یک
/// توقف تمیز، نه یک kill خشن. بایت 0x03 دقیقاً همون چیزیه که ترمینال موقع
/// فشردن Ctrl+C می‌فرسته.
pub fn stop(state: Arc<ProxyBridgeState>) -> anyhow::Result<()> {
    state.set_status(ProxyBridgeStatus::Stopping);
    let mut writer_guard = state.pty_writer.lock().unwrap();
    if let Some(writer) = writer_guard.as_mut() {
        writer.write_all(&[0x03])?;
        writer.flush()?;
    } else {
        // پروسسی در حال اجرا نبود
        drop(writer_guard);
        state.set_status(ProxyBridgeStatus::Stopped);
    }
    Ok(())
}