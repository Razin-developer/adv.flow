$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"

if (Test-Path -LiteralPath $cargoBin) {
  $env:Path = "$cargoBin;$env:Path"
}

Set-Location (Join-Path $repo "tauri")
npm run tauri build

# Find the built App installer
$appInstaller = Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" | Select-Object -First 1

# Build the CLI installer
$makensis = "$env:LOCALAPPDATA\tauri\NSIS\makensis.exe"
if (Test-Path $makensis) {
    Write-Host "Building CLI installer..."
    Set-Location "src-tauri\windows"
    & $makensis cli-installer.nsi
    $cliInstaller = Get-Item "AdvFlow-CLI-Setup.exe"
    Set-Location $repo
}

# Organize artifacts
$distDir = Join-Path $repo "dist-installer"
if (!(Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir }

if ($appInstaller) {
    Copy-Item $appInstaller.FullName (Join-Path $distDir "AdvFlow-App-Setup.exe") -Force
    Write-Host "App installer staged at $distDir\AdvFlow-App-Setup.exe"
}

if ($cliInstaller) {
    Copy-Item $cliInstaller.FullName (Join-Path $distDir "AdvFlow-CLI-Setup.exe") -Force
    Write-Host "CLI installer staged at $distDir\AdvFlow-CLI-Setup.exe"
}
