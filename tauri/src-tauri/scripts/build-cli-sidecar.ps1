$ErrorActionPreference = "Stop"

$srcTauri = Split-Path -Parent $PSScriptRoot
$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargo) {
  $cargoPath = $cargo.Source
} else {
  $cargoPath = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
}

if (!(Test-Path -LiteralPath $cargoPath)) {
  throw "Cargo was not found. Install Rust from https://rustup.rs/ or add cargo to PATH."
}

$targetDir = Join-Path $srcTauri "binaries"
$target = Join-Path $targetDir "advflow-cli-x86_64-pc-windows-msvc.exe"
if (!(Test-Path -LiteralPath $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}
if (!(Test-Path -LiteralPath $target)) {
  [System.IO.File]::WriteAllBytes($target, [byte[]]@())
}

& $cargoPath build --manifest-path (Join-Path $srcTauri "Cargo.toml") --release --bin advflow-cli
if ($LASTEXITCODE -ne 0) {
  throw "AdvFlow CLI build failed."
}

$source = Join-Path $srcTauri "target\release\advflow-cli.exe"

if (!(Test-Path -LiteralPath $source)) {
  throw "CLI binary was not built: $source"
}

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "Staged AdvFlow CLI sidecar at $target"
