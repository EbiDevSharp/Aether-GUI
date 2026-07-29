//! لیست‌کردن برنامه‌های در حال اجرا روی سیستم، تا کاربر به‌جای تایپ اسم
//! exe، مستقیم از یک لیست انتخاب کنه (شبیه Task Manager).
//!
//! از crate «sysinfo» استفاده می‌کنیم چون کراس‌پلتفرمه (ویندوز/لینوکس/مک)
//! و نیازی به Win32 API دستی نداره.

use serde::Serialize;
use std::collections::HashMap;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    /// اسم فایل اجرایی، دقیقاً همون چیزی که ProxyBridge برای match کردن
    /// ProcessName استفاده می‌کنه (مثلاً "chrome.exe").
    pub name: String,
    /// مسیر کامل exe روی دیسک، فقط برای نمایش به کاربر (تا بفهمه کدوم
    /// نصب رو داره انتخاب می‌کنه، مثلاً چند نسخه‌ی Chrome).
    pub exe_path: Option<String>,
    /// چند نمونه از این اسم در حال اجراست (مثلاً chrome.exe همیشه چندتاست).
    pub instance_count: u32,
}

pub fn list_running_processes() -> Vec<ProcessInfo> {
    let mut system = System::new_all();
    system.refresh_all();

    // بر اساس اسم گروه‌بندی می‌کنیم چون یک برنامه (مثل مرورگر) معمولاً
    // چندین پروسس همزمان داره؛ کاربر فقط یک بار "chrome.exe" رو می‌بینه.
    let mut grouped: HashMap<String, ProcessInfo> = HashMap::new();

    for (_pid, proc_) in system.processes() {
        let name = proc_.name().to_string_lossy().to_string();
        if name.is_empty() {
            continue;
        }
        let exe_path = proc_
            .exe()
            .map(|p| p.to_string_lossy().to_string())
            .filter(|s| !s.is_empty());

        grouped
            .entry(name.clone())
            .and_modify(|info| {
                info.instance_count += 1;
                if info.exe_path.is_none() {
                    info.exe_path = exe_path.clone();
                }
            })
            .or_insert(ProcessInfo {
                name,
                exe_path,
                instance_count: 1,
            });
    }

    let mut result: Vec<ProcessInfo> = grouped.into_values().collect();
    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    result
}
