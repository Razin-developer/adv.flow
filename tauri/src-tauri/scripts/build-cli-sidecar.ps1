$ErrorActionPreference = "Stop"

$srcTauri = Split-Path -Parent $PSScriptRoot
Write-Host "Project root: $srcTauri"

$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if ($cargo) {
  $cargoPath = $cargo.Source
} else {
  if ($IsWindows) {
    $cargoPath = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
  } else {
    $cargoPath = Join-Path $env:HOME ".cargo/bin/cargo"
  }
}
Write-Host "Using cargo at: $cargoPath"

if (!(Test-Path -LiteralPath $cargoPath)) {
  throw "Cargo was not found. Please install Rust."
}

# Detect triple
$vV = & $cargoPath -vV
$triple = ($vV | Select-String "host:").ToString().Split(" ")[1]
$binExt = if ($IsWindows) { ".exe" } else { "" }
Write-Host "Detected triple: $triple"

$targetDir = Join-Path $srcTauri "binaries"
if (!(Test-Path -LiteralPath $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

$target = Join-Path $targetDir "advflow-cli-$triple$binExt"
Write-Host "Target sidecar path: $target"

# Build the binary
Write-Host "Running: cargo build --release --bin advflow-cli"
& $cargoPath build --manifest-path (Join-Path $srcTauri "Cargo.toml") --release --bin advflow-cli
if ($LASTEXITCODE -ne 0) {
  throw "AdvFlow CLI build failed."
}

$source = Join-Path $srcTauri "target/release/advflow-cli$binExt"
Write-Host "Source binary path: $source"

if (!(Test-Path -LiteralPath $source)) {
  throw "CLI binary was not found at $source"
}

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "Successfully staged sidecar at $target"


