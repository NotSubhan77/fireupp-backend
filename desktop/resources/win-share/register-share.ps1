param(
  [string]$InstallDir = ''
)

$ErrorActionPreference = 'SilentlyContinue'

if (-not $InstallDir) {
  $InstallDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}
$InstallDir = $InstallDir.TrimEnd('\')

$winShareDir = Join-Path $InstallDir 'resources\win-share'
if (-not (Test-Path $winShareDir)) {
  $winShareDir = $PSScriptRoot
}

$msixPath = Join-Path $winShareDir 'ZovioShare.msix'
$cerPath = Join-Path $winShareDir 'ZovioShare.cer'
$assetsSrc = Join-Path $winShareDir 'Assets'
$assetsDst = Join-Path $InstallDir 'Assets'

# Ensure external Assets folder exists alongside Zovio.exe so sparse MSIX icons resolve everywhere
if (Test-Path $assetsSrc) {
  if (-not (Test-Path $assetsDst)) {
    New-Item -ItemType Directory -Path $assetsDst -Force | Out-Null
  }
  Copy-Item (Join-Path $assetsSrc '*') $assetsDst -Force
}

if (Test-Path $msixPath) {
  $thumb = 'E85EA7ECA358C2BFD36C91FB85AE9972E1934D0B'
  $hasTp = [bool](Get-ChildItem 'Cert:\LocalMachine\TrustedPeople' | Where-Object { $_.Thumbprint -eq $thumb })
  $hasRoot = [bool](Get-ChildItem 'Cert:\LocalMachine\Root' | Where-Object { $_.Thumbprint -eq $thumb })

  if ((-not ($hasTp -and $hasRoot)) -and (Test-Path $cerPath)) {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
      & certutil.exe -addstore -f TrustedPeople $cerPath | Out-Null
      & certutil.exe -addstore -f Root $cerPath | Out-Null
    } else {
      $cmdArgs = "/c certutil.exe -addstore -f TrustedPeople `"$cerPath`" >nul 2>&1 & certutil.exe -addstore -f Root `"$cerPath`" >nul 2>&1"
      Start-Process -FilePath 'cmd.exe' -ArgumentList $cmdArgs -Verb RunAs -WindowStyle Hidden -Wait
    }
  }

  Add-AppxPackage -Path $msixPath -ExternalLocation $InstallDir -ForceApplicationShutdown
}
