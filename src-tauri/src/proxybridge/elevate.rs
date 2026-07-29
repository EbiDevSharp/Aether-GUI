//! چک‌کردن و درخواست دسترسی Administrator/root.
//!
//! چرا این فایل لازمه (به‌فارسی توی docs/PROXYBRIDGE_INTEGRATION.md کامل توضیح دادم):
//! ProxyBridge_CLI برای دسترسی به WinDivert (ویندوز) / NFQUEUE (لینوکس) /
//! Network Extension (مک) نیاز به دسترسی مدیر سیستم داره. یک پروسس معمولی
//! نمی‌تونه stdout یک پروسس elevated دیگه رو بخونه (محدودیت امنیتی خود OS)،
//! پس برای اینکه لاگ زنده‌ی CLI رو ببینیم، باید خود Aether-GUI هم موقع
//! اجرای این فیچر elevated باشه.

use std::env;
use std::process::Command;

#[cfg(target_os = "windows")]
pub fn is_elevated() -> bool {
    // از ویندوز API واقعی استفاده می‌کنیم (crate: windows-sys، باید در
    // Cargo.toml با فیچر "Win32_UI_Shell" و "Win32_Security" اضافه بشه).
    use windows_sys::Win32::Foundation::HANDLE;
    use windows_sys::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION};
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};
    use windows_sys::Win32::Security::TOKEN_QUERY;

    unsafe {
        let mut token: HANDLE = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut ret_len = 0u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret_len,
        );
        ok != 0 && elevation.TokenIsElevated != 0
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_elevated() -> bool {
    // روی لینوکس/مک: uid صفر یعنی root.
    unsafe { libc::geteuid() == 0 }
}

/// خود اپلیکیشن رو با دسترسی بالا دوباره اجرا می‌کنه و نمونه‌ی فعلی رو می‌بندیم.
/// این تابع برنمی‌گرده (process::exit صدا زده می‌شه) مگر در صورت خطا.
pub fn relaunch_elevated() -> anyhow::Result<()> {
    let exe = env::current_exe()?;

    #[cfg(target_os = "windows")]
    {
        // با PowerShell + Start-Process -Verb RunAs یک UAC prompt واقعی
        // نشون داده می‌شه؛ این استاندارترین و پایدارترین روش روی ویندوزه
        // (به‌جای فراخوانی مستقیم ShellExecuteW که نیاز به crate اضافه داره).
        let exe_str = exe.to_string_lossy().replace('\'', "''");
        let status = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                &format!("Start-Process -FilePath '{exe_str}' -Verb RunAs"),
            ])
            .status()?;
        if !status.success() {
            anyhow::bail!("کاربر درخواست UAC رو رد کرد یا اجرا ناموفق بود");
        }
    }

    #[cfg(target_os = "macos")]
    {
        let exe_str = exe.to_string_lossy();
        let script = format!(
            "do shell script \"'{}' &\" with administrator privileges",
            exe_str.replace('\'', "'\\''")
        );
        let status = Command::new("osascript").args(["-e", &script]).status()?;
        if !status.success() {
            anyhow::bail!("درخواست دسترسی ادمین رد شد");
        }
    }

    #[cfg(target_os = "linux")]
    {
        let status = Command::new("pkexec").arg(&exe).status()?;
        if !status.success() {
            anyhow::bail!("pkexec ناموفق بود (باید نصب باشه: polkit)");
        }
    }

    std::process::exit(0);
}
