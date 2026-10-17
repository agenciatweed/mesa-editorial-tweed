param([string]$Mensagem = "Atualiza o estúdio editorial Tweed")
$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git não encontrado no PATH." }
git -C $Raiz rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { throw "Abra o projeto como um repositório Git antes de sincronizar." }
$Remoto = git -C $Raiz remote get-url origin
if ($LASTEXITCODE -ne 0 -or $Remoto -notmatch '^(https://github\.com/agenciatweed/mesa-editorial-tweed(\.git)?/?|git@github\.com:agenciatweed/mesa-editorial-tweed(\.git)?)$') { throw "Confira o remoto origin. O destino esperado é agenciatweed/mesa-editorial-tweed." }
git -C $Raiz add -- studio editorial conteudos scripts referencias README.md AGENTS.md LEIA-ME-CODEX.md Abrir-Estudio.cmd .gitignore
if ($LASTEXITCODE -ne 0) { throw "Não foi possível preparar os arquivos." }
git -C $Raiz diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
  git -C $Raiz commit -m $Mensagem
  if ($LASTEXITCODE -ne 0) { throw "Commit não concluído. Confira a identidade configurada no Git." }
} elseif ($LASTEXITCODE -ne 0) { throw "Não foi possível verificar as alterações." }
$Branch = git -C $Raiz branch --show-current
if (-not $Branch) { throw "Selecione uma branch antes do envio." }
git -C $Raiz push -u origin $Branch
if ($LASTEXITCODE -ne 0) { throw "Envio não concluído. O commit permanece local. Confira o acesso e eventuais alterações remotas; não use force push." }
Write-Host "Arquivos enviados ao GitHub."
