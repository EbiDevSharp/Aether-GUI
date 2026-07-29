#!/usr/bin/env bash
# Downloads the real ProxyBridge_CLI binary (Linux/macOS) from the official
# GitHub releases and verifies its SHA256 checksum when available.
#
# WARNING: only download from these two official sources:
#   https://github.com/InterceptSuite/ProxyBridge/releases
#   https://interceptsuite.com/download/proxybridge
# Other sources (forks, third-party mirrors) may distribute tampered binaries.

set -euo pipefail

REPO="InterceptSuite/ProxyBridge"
DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"

echo "==> Fetching latest ProxyBridge release info from ${REPO} ..."

LATEST_JSON="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")"
TAG="$(echo "$LATEST_JSON" | grep -oE '"tag_name": *"[^"]+"' | head -n1 | cut -d'"' -f4)"

if [ -z "$TAG" ]; then
  echo "!! Could not resolve the latest release tag. Download manually from:"
  echo "   https://github.com/${REPO}/releases"
  exit 1
fi

echo "==> Found version: ${TAG}"

case "$OS" in
  Linux)
    ASSET_PATTERN="proxybridge.*linux.*\.tar\.gz"
    ;;
  Darwin)
    ASSET_PATTERN="proxybridge.*mac(os)?.*\.(pkg|tar\.gz|zip)"
    ;;
  *)
    echo "!! This script only covers Linux/macOS. Use fetch-proxybridge.ps1 on Windows."
    exit 1
    ;;
esac

ASSET_URL="$(echo "$LATEST_JSON" \
  | grep -oE '"browser_download_url": *"[^"]+"' \
  | cut -d'"' -f4 \
  | grep -iE "$ASSET_PATTERN" \
  | head -n1)"

if [ -z "$ASSET_URL" ]; then
  echo "!! No matching asset found for this platform. Download manually from:"
  echo "   https://github.com/${REPO}/releases/tag/${TAG}"
  exit 1
fi

TMP_ARCHIVE="$(mktemp)"
echo "==> Downloading: ${ASSET_URL}"
curl -fsSL "$ASSET_URL" -o "$TMP_ARCHIVE"

SUMS_URL="$(echo "$LATEST_JSON" \
  | grep -oE '"browser_download_url": *"[^"]+SHA256SUMS[^"]*"' \
  | cut -d'"' -f4 | head -n1)"

if [ -n "$SUMS_URL" ]; then
  echo "==> Verifying SHA256 against ${SUMS_URL}"
  EXPECTED_SUM="$(curl -fsSL "$SUMS_URL" | grep "$(basename "$ASSET_URL")" | awk '{print $1}')"
  ACTUAL_SUM="$(sha256sum "$TMP_ARCHIVE" | awk '{print $1}')"
  if [ -n "$EXPECTED_SUM" ] && [ "$EXPECTED_SUM" != "$ACTUAL_SUM" ]; then
    echo "!! SHA256 mismatch! Downloaded file is not trusted. Aborting."
    rm -f "$TMP_ARCHIVE"
    exit 1
  fi
else
  echo "!! Warning: no SHA256SUMS found in this release; checksum was not verified."
fi

echo "==> Extracting to ${DEST_DIR}"
case "$ASSET_URL" in
  *.tar.gz) tar -xzf "$TMP_ARCHIVE" -C "$DEST_DIR" ;;
  *.zip) unzip -o "$TMP_ARCHIVE" -d "$DEST_DIR" ;;
  *.pkg)
    echo "!! This is a .pkg installer, not a raw binary. Install it manually and copy"
    echo "   the CLI binary from the install location (usually /usr/local/bin or"
    echo "   /Applications/ProxyBridge.app) to:"
    echo "   ${DEST_DIR}/proxybridge-cli"
    ;;
esac

rm -f "$TMP_ARCHIVE"

BIN_PATH="${DEST_DIR}/proxybridge-cli"
if [ -f "$BIN_PATH" ]; then
  chmod +x "$BIN_PATH"
  echo "==> Ready: ${BIN_PATH}"
else
  echo "!! The extracted binary is not named proxybridge-cli. Check the files inside"
  echo "   ${DEST_DIR} and rename it manually to proxybridge-cli (that is the exact"
  echo "   name process.rs expects)."
fi