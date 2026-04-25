$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $env:USERPROFILE "bin"
$cmdPath = Join-Path $binDir "advflow.cmd"
$nativeTarget = Join-Path $repo "tauri\src-tauri\target\release\advflow-cli.exe"
$nodeTarget = Join-Path $repo "bin\advflow.js"

if (Test-Path -LiteralPath $nativeTarget) {
  $target = $nativeTarget
  $runner = "`"$target`" %*"
} else {
  $target = $nodeTarget
  $runner = "node `"$target`" %*"
}

if (!(Test-Path $binDir)) {
  New-Item -ItemType Directory -Path $binDir | Out-Null
}

Set-Content -Path $cmdPath -Value "@echo off`r`n$runner`r`n" -Encoding ASCII

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($userPath -split ";") -notcontains $binDir) {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User")
}

Write-Host "advflow CLI installed at $cmdPath"
Write-Host "Open a new terminal, then run: advflow ls"
