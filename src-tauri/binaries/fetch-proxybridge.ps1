# Downloads the ProxyBridge Windows installer from the official GitHub
# releases. Windows releases are usually an installer (.exe), not a raw
# zip, so this script only automates the download; after installing it,
# copy these two files manually from the install folder into
# src-tauri/binaries/:
#
#   ProxyBridge_CLI.exe
#   ProxyBridgeCore.dll     (must sit next to the exe)

$ErrorActionPreference = "Stop"

$Repo = "InterceptSuite/ProxyBridge"
$DestDir = $PSScriptRoot

Write-Host "==> Fetching latest release info from $Repo ..."
$Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
Write-Host "==> Version: $($Release.tag_name)"

$Asset = $Release.assets | Where-Object { $_.name -match "(?i)windows|setup" -and $_.name -match "(?i)\.exe$" } | Select-Object -First 1

if (-not $Asset) {
    Write-Host "!! No Windows installer found. Download manually from:"
    Write-Host "   https://github.com/$Repo/releases/tag/$($Release.tag_name)"
    exit 1
}

$OutFile = Join-Path $DestDir $Asset.name
Write-Host "==> Downloading: $($Asset.browser_download_url)"
Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $OutFile

$SumsAsset = $Release.assets | Where-Object { $_.name -match "(?i)SHA256SUMS" } | Select-Object -First 1
if ($SumsAsset) {
    $SumsContent = (Invoke-WebRequest -Uri $SumsAsset.browser_download_url).Content
    $ExpectedLine = $SumsContent -split "`n" | Where-Object { $_ -match [regex]::Escape($Asset.name) }
    if ($ExpectedLine) {
        $Expected = ($ExpectedLine -split '\s+')[0]
        $Actual = (Get-FileHash -Algorithm SHA256 -Path $OutFile).Hash.ToLower()
        if ($Expected.ToLower() -ne $Actual) {
            Write-Host "!! SHA256 mismatch! Deleting the downloaded file."
            Remove-Item $OutFile
            exit 1
        }
        Write-Host "==> SHA256 verified."
    }
} else {
    Write-Host "!! Warning: no SHA256SUMS found; checksum was not verified."
}

Write-Host ""
Write-Host "==> Download complete: $OutFile"
Write-Host "==> Run this installer (it requires admin rights), then copy these two"
Write-Host "    files from the install folder (default: %ProgramFiles%\ProxyBridge) to:"
Write-Host "    $DestDir\ProxyBridge_CLI.exe"
Write-Host "    $DestDir\ProxyBridgeCore.dll"