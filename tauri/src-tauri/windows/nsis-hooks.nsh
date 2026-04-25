!macro NSIS_HOOK_POSTINSTALL
  StrCpy $R0 "$PROFILE\bin"
  CreateDirectory "$R0"

  StrCpy $R1 "$INSTDIR\advflow-cli.exe"
  IfFileExists "$R1" 0 +2
    Goto advflowCliFound

  StrCpy $R1 "$INSTDIR\resources\advflow-cli.exe"
  IfFileExists "$R1" 0 +2
    Goto advflowCliFound

  StrCpy $R1 "$INSTDIR\resources\binaries\advflow-cli.exe"
  IfFileExists "$R1" 0 +2
    Goto advflowCliFound

  Goto advflowCliPathDone

  advflowCliFound:
    FileOpen $R2 "$R0\advflow.cmd" w
    FileWrite $R2 "@echo off$\r$\n"
    FileWrite $R2 "$\"$R1$\" %*$\r$\n"
    FileClose $R2

    ReadRegStr $R3 HKCU "Environment" "Path"
    IfErrors 0 +2
      StrCpy $R3 ""
    StrCpy $R4 "$R3;$R0"
    WriteRegExpandStr HKCU "Environment" "Path" "$R4"

  advflowCliPathDone:
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$PROFILE\bin\advflow.cmd"
!macroend
