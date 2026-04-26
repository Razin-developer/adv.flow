$ErrorActionPreference = "Stop"

$srcTauri = Split-Path -Parent $PSScriptRoot
$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargo) {
  $cargoPath = $cargo.Source
} else {
  # Fallback for common locations
  if ($IsWindows) {
    $cargoPath = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
  } else {
    $cargoPath = Join-Path $env:HOME ".cargo/bin/cargo"
  }
}

if (!(Test-Path -LiteralPath $cargoPath)) {
  throw "Cargo was not found. Install Rust from https://rustup.rs/ or add cargo to PATH."
}

# Detect triple
$triple = (& $cargoPath -vV | Select-String "host:").ToString().Split(" ")[1]
$binExt = if ($IsWindows) { ".exe" } else { "" }

$targetDir = Join-Path $srcTauri "binaries"
if (!(Test-Path -LiteralPath $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

$target = Join-Path $targetDir "advflow-cli-$triple$binExt"

# Build the binary
Write-Host "Building AdvFlow CLI for $triple..."
& $cargoPath build --manifest-path (Join-Path $srcTauri "Cargo.toml") --release --bin advflow-cli
if ($LASTEXITCODE -ne 0) {
  throw "AdvFlow CLI build failed."
}

$source = Join-Path $srcTauri "target/release/advflow-cli$binExt"

if (!(Test-Path -LiteralPath $source)) {
  throw "CLI binary was not built: $source"
}

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "Staged AdvFlow CLI sidecar at $target"

