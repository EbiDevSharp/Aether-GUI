//! ساختار داده‌ی .pbprofile مطابق فرمت رسمی ProxyBridge
//! (منبع: https://interceptsuite.com/docs/proxybridge/configuration-windows/)
//!
//! این فایل *فقط* مدل داده‌ست؛ هیچ منطق شبکه‌ای اینجا نیست.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyType {
    Socks5,
    Http,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    #[serde(rename = "Id")]
    pub id: u32,
    #[serde(rename = "Type")]
    pub proxy_type: ProxyType,
    #[serde(rename = "Host")]
    pub host: String,
    #[serde(rename = "Port")]
    pub port: String,
    #[serde(rename = "Username", default)]
    pub username: String,
    #[serde(rename = "Password", default)]
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum Protocol {
    Tcp,
    Udp,
    Both,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum RuleAction {
    Direct,
    Block,
    Proxy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyRule {
    /// مثال: "*", "chrome.exe", "firefox.exe; chrome.exe", "steam*.exe"
    #[serde(rename = "ProcessName")]
    pub process_name: String,
    /// مثال: "*", "127.0.0.1", "192.168.*.*", "10.10.1.1-10.10.255.255", "2001:db8::/32"
    #[serde(rename = "TargetHosts")]
    pub target_hosts: String,
    /// مثال: "*", "80; 8080", "80-8000"
    #[serde(rename = "TargetPorts")]
    pub target_ports: String,
    #[serde(rename = "Protocol")]
    pub protocol: Protocol,
    #[serde(rename = "Action")]
    pub action: RuleAction,
    #[serde(rename = "IsEnabled")]
    pub is_enabled: bool,
    /// فقط وقتی Action == Proxy معنی داره؛ اگه پیدا نشه، ProxyBridge خودش
    /// می‌ره سراغ اولین ProxyConfig موجود (رفتار رسمی مستندشده).
    #[serde(rename = "ProxyConfigId", skip_serializing_if = "Option::is_none")]
    pub proxy_config_id: Option<u32>,

    /// این فیلد در فرمت رسمی .pbprofile نیست؛ فقط داخل GUI ما استفاده می‌شه
    /// تا بفهمیم این Rule از کدوم تب ساخته شده (برای گروه‌بندی نمایشی).
    /// موقع export به فایل .pbprofile حذفش می‌کنیم که فرمت رسمی دست‌نخورده بمونه.
    #[serde(skip)]
    pub origin_tab: RuleOriginTab,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum RuleOriginTab {
    #[default]
    General,
    Bypass,
    Host,
    Port,
    Application,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyBridgeProfile {
    #[serde(rename = "Version")]
    pub version: String,
    #[serde(rename = "LocalhostViaProxy")]
    pub localhost_via_proxy: bool,
    #[serde(rename = "IsTrafficLoggingEnabled")]
    pub is_traffic_logging_enabled: bool,
    #[serde(rename = "ProxyConfigs")]
    pub proxy_configs: Vec<ProxyConfig>,
    #[serde(rename = "ProxyRules")]
    pub proxy_rules: Vec<ProxyRule>,
}

impl Default for ProxyBridgeProfile {
    fn default() -> Self {
        Self {
            version: "1.0".to_string(),
            localhost_via_proxy: false,
            is_traffic_logging_enabled: true,
            proxy_configs: Vec::new(),
            proxy_rules: Vec::new(),
        }
    }
}

impl ProxyBridgeProfile {
    pub fn load(path: &PathBuf) -> anyhow::Result<Self> {
        let data = std::fs::read_to_string(path)?;
        let profile: ProxyBridgeProfile = serde_json::from_str(&data)?;
        Ok(profile)
    }

    pub fn save(&self, path: &PathBuf) -> anyhow::Result<()> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let data = serde_json::to_string_pretty(self)?;
        std::fs::write(path, data)?;
        Ok(())
    }

    pub fn next_proxy_config_id(&self) -> u32 {
        self.proxy_configs.iter().map(|c| c.id).max().unwrap_or(0) + 1
    }

    /// قانون‌های Bypass (Action=DIRECT که از تب Bypass ساخته شدن) رو
    /// همیشه بالای بقیه‌ی rule ها می‌بریم، چون ProxyBridge از بالا به پایین
    /// اولین match رو اجرا می‌کنه؛ این دقیقاً معادل «Process exclusion»
    /// که در فیچرلیست رسمی ProxyBridge برای جلوگیری از proxy loop اومده.
    pub fn reorder_bypass_first(&mut self) {
        self.proxy_rules.sort_by_key(|r| match r.origin_tab {
            RuleOriginTab::Bypass => 0,
            _ => 1,
        });
    }
}
