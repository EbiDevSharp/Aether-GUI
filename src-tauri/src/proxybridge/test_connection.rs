//! پیاده‌سازی سبک «Test Proxy Connection» که در GUI رسمی ProxyBridge هست.
//! این ماژول مستقل از ProxyBridge_CLI کار می‌کنه چون فقط یک اتصال آزمایشی
//! از طریق پراکسی به مقصد می‌زنه؛ نیازی به دسترسی ادمین یا اجرای CLI نداره.

use super::profile::{ProxyConfig, ProxyType};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(8);

pub async fn run(
    config: ProxyConfig,
    destination_host: String,
    destination_port: u16,
) -> anyhow::Result<String> {
    let started = std::time::Instant::now();
    let result = timeout(CONNECT_TIMEOUT, async {
        match config.proxy_type {
            ProxyType::Socks5 => {
                connect_via_socks5(&config, &destination_host, destination_port).await
            }
            ProxyType::Http => connect_via_http(&config, &destination_host, destination_port).await,
        }
    })
    .await??;

    Ok(format!(
        "{} (زمان اتصال: {}ms)",
        result,
        started.elapsed().as_millis()
    ))
}

async fn connect_via_socks5(
    config: &ProxyConfig,
    dest_host: &str,
    dest_port: u16,
) -> anyhow::Result<String> {
    let proxy_addr = format!("{}:{}", config.host, config.port);
    let mut stream = TcpStream::connect(&proxy_addr).await?;

    // Greeting: نسخه ۵، یک متد پیشنهادی — no-auth (۰۰). اگه یوزر/پس ست شده
    // بود متد ۰۲ (username/password) رو هم پیشنهاد می‌دیم.
    let has_auth = !config.username.is_empty();
    if has_auth {
        stream.write_all(&[0x05, 0x02, 0x00, 0x02]).await?;
    } else {
        stream.write_all(&[0x05, 0x01, 0x00]).await?;
    }
    let mut resp = [0u8; 2];
    stream.read_exact(&mut resp).await?;
    if resp[0] != 0x05 {
        anyhow::bail!("پاسخ SOCKS5 نامعتبر بود");
    }

    match resp[1] {
        0x00 => {} // no-auth انتخاب شد
        0x02 if has_auth => {
            let mut auth = vec![0x01u8, config.username.len() as u8];
            auth.extend_from_slice(config.username.as_bytes());
            auth.push(config.password.len() as u8);
            auth.extend_from_slice(config.password.as_bytes());
            stream.write_all(&auth).await?;
            let mut auth_resp = [0u8; 2];
            stream.read_exact(&mut auth_resp).await?;
            if auth_resp[1] != 0x00 {
                anyhow::bail!("احراز هویت SOCKS5 رد شد");
            }
        }
        0xFF => anyhow::bail!("سرور پراکسی هیچ متد Authentication مشترکی نپذیرفت"),
        other => anyhow::bail!("متد Authentication پیش‌بینی‌نشده: {other:#x}"),
    }

    // CONNECT request با آدرس از نوع دامنه (0x03) تا هم IP و هم hostname کار کنه
    let mut req = vec![0x05, 0x01, 0x00, 0x03];
    req.push(dest_host.len() as u8);
    req.extend_from_slice(dest_host.as_bytes());
    req.extend_from_slice(&dest_port.to_be_bytes());
    stream.write_all(&req).await?;

    let mut head = [0u8; 4];
    stream.read_exact(&mut head).await?;
    if head[1] != 0x00 {
        anyhow::bail!("سرور SOCKS5 اتصال به مقصد رو رد کرد (کد {})", head[1]);
    }

    Ok(format!(
        "اتصال SOCKS5 به {}:{} از طریق {} موفق بود",
        dest_host, dest_port, proxy_addr
    ))
}

async fn connect_via_http(
    config: &ProxyConfig,
    dest_host: &str,
    dest_port: u16,
) -> anyhow::Result<String> {
    let proxy_addr = format!("{}:{}", config.host, config.port);
    let mut stream = TcpStream::connect(&proxy_addr).await?;

    let auth_header = if !config.username.is_empty() {
        use base64::Engine;
        let creds = format!("{}:{}", config.username, config.password);
        let encoded = base64::engine::general_purpose::STANDARD.encode(creds);
        format!("Proxy-Authorization: Basic {encoded}\r\n")
    } else {
        String::new()
    };

    let request = format!(
        "CONNECT {dest_host}:{dest_port} HTTP/1.1\r\nHost: {dest_host}:{dest_port}\r\n{auth_header}\r\n"
    );
    stream.write_all(request.as_bytes()).await?;

    let mut buf = vec![0u8; 512];
    let n = stream.read(&mut buf).await?;
    let response = String::from_utf8_lossy(&buf[..n]);
    if response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200") {
        Ok(format!(
            "اتصال HTTP CONNECT به {dest_host}:{dest_port} از طریق {proxy_addr} موفق بود"
        ))
    } else {
        let first_line = response.lines().next().unwrap_or("پاسخ نامعتبر");
        anyhow::bail!("پراکسی HTTP رد کرد: {first_line}")
    }
}
