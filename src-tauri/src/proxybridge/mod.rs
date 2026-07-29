pub mod commands;
pub mod elevate;
pub mod process;
pub mod process_list;
pub mod profile;
pub mod state;
pub mod test_connection;

pub use commands::SharedState;
pub use state::ProxyBridgeState;

// لیست کامل دستورات این ماژول (برای رجیستر در main.rs/lib.rs) داخل
// src-tauri/MAIN_RS_INTEGRATION.snippet.md آورده شده، چون generate_handler!
// یک ماکرو با pattern خاصه و نمی‌شه توش ماکروی دیگه nest کرد.
