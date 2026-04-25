$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"

if (Test-Path -LiteralPath $cargoBin) {
  $env:Path = "$cargoBin;$env:Path"
}

Set-Location (Join-Path $repo "tauri")
npm run tauri build
