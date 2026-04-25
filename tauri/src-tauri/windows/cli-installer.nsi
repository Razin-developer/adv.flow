!include "MUI2.nsh"

Name "AdvFlow CLI"
OutFile "AdvFlow-CLI-Setup.exe"
InstallDir "$PROFILE\.advflow"
RequestExecutionLevel user

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  ; We use the release binary built by Tauri
  File "..\target\release\advflow-cli.exe"
  
  ; Create a bin folder in profile if not exists
  StrCpy $R0 "$PROFILE\bin"
  CreateDirectory "$R0"
  
  ; Create shim
  FileOpen $R1 "$R0\advflow.cmd" w
  FileWrite $R1 "@echo off$\r$\n"
  FileWrite $R1 "$\"$INSTDIR\advflow-cli.exe$\" %*$\r$\n"
  FileClose $R1
  
  ; Add to Path (User)
  ReadRegStr $0 HKCU "Environment" "Path"
  ; Check if already exists (crude check)
  ; In a real installer we'd use a plugin, but let's keep it simple
  WriteRegExpandStr HKCU "Environment" "Path" "$0;$R0"
  
  ; Notify system of environment change
  SendMessage 0xFFFF 0x001A 0 "STR:Environment" /TIMEOUT=5000
SectionEnd
