@echo off
setlocal

set "CLI_DIR=%USERPROFILE%\bin"
set "CLI_CMD=%CLI_DIR%\advflow.cmd"
set "CLI_EXE=%~dp0advflow-cli.exe"

if not exist "%CLI_EXE%" (
  echo advflow-cli.exe was not found next to this installer.
  exit /b 1
)

if not exist "%CLI_DIR%" mkdir "%CLI_DIR%"

> "%CLI_CMD%" echo @echo off
>> "%CLI_CMD%" echo "%CLI_EXE%" %%*

powershell -NoProfile -ExecutionPolicy Bypass -Command "$bin = Join-Path $env:USERPROFILE 'bin'; $path = [Environment]::GetEnvironmentVariable('Path', 'User'); if (($path -split ';') -notcontains $bin) { [Environment]::SetEnvironmentVariable('Path', (($path.TrimEnd(';')) + ';' + $bin), 'User') }"

echo AdvFlow CLI installed.
echo Open a new terminal, then run: advflow ls
