$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $env:USERPROFILE "bin"
$cmdPath = Join-Path $binDir "advflow.cmd"
$installedNative = Join-Path $binDir "advflow-cli.exe"
$nativeTarget = Join-Path $repo "tauri\src-tauri\target\release\advflow-cli.exe"
$nodeTarget = Join-Path $repo "bin\advflow.js"

if (!(Test-Path $binDir)) {
  New-Item -ItemType Directory -Path $binDir | Out-Null
}

if (Test-Path -LiteralPath $nativeTarget) {
  Copy-Item -LiteralPath $nativeTarget -Destination $installedNative -Force
  $runner = "`"$installedNative`" %*"
} else {
  if (!(Test-Path -LiteralPath $nodeTarget)) {
    throw "No CLI target found. Build the Tauri app first or keep bin\advflow.js in the repo."
  }
  $runner = "node `"$nodeTarget`" %*"
}

Set-Content -Path $cmdPath -Value "@echo off`r`n$runner`r`n" -Encoding ASCII

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($userPath -split ";") -notcontains $binDir) {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User")
}

Write-Host "advflow CLI installed at $cmdPath"
Write-Host "Open a new terminal, then run: advflow ls"
