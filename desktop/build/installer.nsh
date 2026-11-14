!macro customInstall
  ; Register SendTo & Explorer context menu right away on install
  CreateShortCut "$SENDTO\Zovio.lnk" "$INSTDIR\Zovio.exe" "--share-file" "$INSTDIR\Zovio.exe" 0 "" "" "Share files directly with Zovio"
  WriteRegStr HKCU "Software\Classes\*\shell\ZovioShare" "" "Share with Zovio"
  WriteRegStr HKCU "Software\Classes\*\shell\ZovioShare" "Icon" "$INSTDIR\Zovio.exe,0"
  WriteRegStr HKCU "Software\Classes\*\shell\ZovioShare\command" "" '"$INSTDIR\Zovio.exe" --share-file "%1"'

  ; Automatically register Windows 11 Share Sheet MSIX + external logo Assets during setup
  nsExec::ExecToLog 'powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$INSTDIR\resources\win-share\register-share.ps1" -InstallDir "$INSTDIR"'
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    Delete "$SENDTO\Zovio.lnk"
    DeleteRegKey HKCU "Software\Classes\*\shell\ZovioShare"
    nsExec::ExecToLog 'powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Get-AppxPackage -Name Zovio.Messenger.Share -ErrorAction SilentlyContinue | Remove-AppxPackage -ErrorAction SilentlyContinue"'
  ${endIf}
!macroend
