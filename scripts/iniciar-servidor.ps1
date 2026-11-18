$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = (Get-Command python -ErrorAction Stop).Source
$pythonwPath = Join-Path (Split-Path -Parent $pythonPath) 'pythonw.exe'
if (-not (Test-Path -LiteralPath $pythonwPath)) { throw 'pythonw.exe nao encontrado ao lado do Python instalado.' }
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $pythonwPath
$startInfo.Arguments = '"' + (Join-Path $projectRoot 'scripts/iniciar-servidor.pyw') + '"'
$startInfo.WorkingDirectory = $projectRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$process = [System.Diagnostics.Process]::Start($startInfo)
if (-not $process) { throw 'Nao foi possivel iniciar a Mesa.' }
