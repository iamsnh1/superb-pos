; Custom NSIS script — runs after installation
; Adds Windows Defender exclusion automatically so the server can start

!macro customInstall
  ; Add the install directory to Windows Defender exclusions silently
  ; This prevents "Server failed to start" on first launch
  nsExec::ExecToLog 'powershell.exe -NonInteractive -WindowStyle Hidden -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
!macroend
