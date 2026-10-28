param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) { $nodePath = 'C:\Program Files\nodejs\node.exe' }
try { $response = Invoke-WebRequest 'http://127.0.0.1:43881/api/status' -UseBasicParsing -TimeoutSec 2 } catch { $response = $null }
if (-not $response) {
  Start-Process -FilePath $nodePath -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(8)
  do { try { $response = Invoke-WebRequest 'http://127.0.0.1:43881/api/status' -UseBasicParsing -TimeoutSec 1 } catch { $response = $null }; if (-not $response) { Start-Sleep -Milliseconds 100 } } while (-not $response -and (Get-Date) -lt $deadline)
  if (-not $response) { throw 'Map importer did not start.' }
}
Write-Host 'Ridgeline map importer: http://127.0.0.1:43881/'
if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:43881/' }
