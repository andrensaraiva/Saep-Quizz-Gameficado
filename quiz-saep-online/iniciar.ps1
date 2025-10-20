# Script de Inicialização do Quiz SAEP
# Execute este script para iniciar o servidor backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quiz SAEP - Iniciando Servidor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o Node.js está instalado
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale o Node.js de https://nodejs.org" -ForegroundColor Red
    pause
    exit
}

# Navegar para a pasta do backend
Set-Location -Path "$PSScriptRoot\backend"

# Verificar se as dependências estão instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Instalando dependências pela primeira vez..." -ForegroundColor Yellow
    npm install
    Write-Host "✓ Dependências instaladas com sucesso!" -ForegroundColor Green
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "⚠ Arquivo .env não encontrado!" -ForegroundColor Yellow
    Write-Host "Criando .env a partir do exemplo..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Arquivo .env criado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE: Edite o arquivo backend\.env e altere o JWT_SECRET!" -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando servidor backend..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "O servidor estará disponível em: http://localhost:3000" -ForegroundColor Green
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "Depois de iniciar o servidor, abra:" -ForegroundColor Cyan
Write-Host "  frontend\index.html" -ForegroundColor White
Write-Host ""

# Iniciar o servidor
npm start
