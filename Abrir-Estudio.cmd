@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale Node.js 18 ou superior para abrir o painel.
 pause
 exit /b 1
)
powershell -NoProfile -Command "try { Invoke-RestMethod 'http://127.0.0.1:4173/api/project' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 powershell -NoProfile -Command "Start-Process -FilePath (Get-Command node).Source -ArgumentList 'scripts/serve.mjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden"
powershell -NoProfile -Command "for ($attempt=0; $attempt -lt 25; $attempt++) { try { Invoke-RestMethod 'http://127.0.0.1:4173/api/project' -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 200 } }; exit 1"
if errorlevel 1 (
 echo Nao foi possivel iniciar. Execute node scripts/serve.mjs para ver o erro.
 pause
 exit /b 1
)
start "" "http://127.0.0.1:4173"
