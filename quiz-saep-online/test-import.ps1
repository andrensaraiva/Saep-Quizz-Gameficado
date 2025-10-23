# Script para testar importação em lote localmente

Write-Host "🔐 Fazendo login como admin..." -ForegroundColor Cyan

$loginBody = @{
    email = "admin@quiz.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green

Write-Host "`n📂 Lendo arquivo de questões..." -ForegroundColor Cyan

$questionsJson = Get-Content "questoes-lote-q23-q34.json" -Raw
$questionsData = $questionsJson | ConvertFrom-Json

Write-Host "✅ $($questionsData.Count) questões encontradas no arquivo" -ForegroundColor Green

Write-Host "`n📤 Enviando importação para o curso ID 1..." -ForegroundColor Cyan

$importBody = @{
    questionsData = $questionsData
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$importResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/courses/1/questions/import" -Method POST -Headers $headers -Body $importBody

Write-Host "`n✅ IMPORTAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Questões importadas: $($importResponse.imported)" -ForegroundColor Cyan
Write-Host "Total processado: $($importResponse.total)" -ForegroundColor Cyan

if ($importResponse.errors -and $importResponse.errors.Count -gt 0) {
    Write-Host "`n⚠️  Erros encontrados: $($importResponse.errors.Count)" -ForegroundColor Yellow
    foreach ($error in $importResponse.errors) {
        Write-Host "  - Questão $($error.index): $($error.error)" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Verificando questões cadastradas..." -ForegroundColor Cyan
$questionsResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/courses/1/questions" -Method GET -Headers $headers
Write-Host "Total de questões no curso: $($questionsResponse.questions.Count)" -ForegroundColor Cyan

Write-Host "`n✅ Teste concluído com sucesso!" -ForegroundColor Green
