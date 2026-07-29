use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

use super::profile::ProxyBridgeProfile;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProxyBridgeStatus {
    Idle,
    NeedsElevation,
    Starting,
    Running,
    Stopping,
    Stopped,
    Error,
}

pub struct ProxyBridgeState {
    pub profile: Mutex<ProxyBridgeProfile>,
    pub profile_path: PathBuf,
    pub status: Mutex<ProxyBridgeStatus>,
    /// PID پروسس CLI در حال اجرا (وقتی Running باشیم)، فقط برای نمایش/دیباگ.
    pub child_pid: Mutex<Option<u32>>,
    /// نویسنده‌ی سمت master پی‌تی‌وای؛ برای فرستادن Ctrl+C واقعی موقع Stop
    /// (دقیقاً همون چیزی که بنر خود CLI می‌گه: "Press Ctrl+C to stop").
    pub pty_writer: Mutex<Option<Box<dyn Write + Send>>>,
}

impl ProxyBridgeState {
    /// app_data_dir رو از تنظیمات Tauri می‌گیریم؛ محل نهایی چیزی شبیه
    /// %APPDATA%/com.aether-gui.app/proxybridge/profile.pbprofile
    pub fn new(app_data_dir: PathBuf) -> Self {
        let profile_path = app_data_dir.join("proxybridge").join("profile.pbprofile");
        let profile = ProxyBridgeProfile::load(&profile_path).unwrap_or_default();

        Self {
            profile: Mutex::new(profile),
            profile_path,
            status: Mutex::new(ProxyBridgeStatus::Idle),
            child_pid: Mutex::new(None),
            pty_writer: Mutex::new(None),
        }
    }

    pub fn set_status(&self, s: ProxyBridgeStatus) {
        *self.status.lock().unwrap() = s;
    }

    pub fn get_status(&self) -> ProxyBridgeStatus {
        *self.status.lock().unwrap()
    }

    pub fn persist(&self) -> anyhow::Result<()> {
        let profile = self.profile.lock().unwrap();
        profile.save(&self.profile_path)
    }
}