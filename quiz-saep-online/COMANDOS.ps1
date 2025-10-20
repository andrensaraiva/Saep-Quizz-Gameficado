# ═══════════════════════════════════════════════════════════════
# 🚀 COMANDOS PARA EXECUTAR - COPIE E COLE NO TERMINAL
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# PASSO 1: NAVEGAR PARA O PROJETO
# ═══════════════════════════════════════════════════════════════

cd c:\Users\andre\Desktop\quiz-saep-online

# ═══════════════════════════════════════════════════════════════
# PASSO 2: INSTALAR DEPENDÊNCIAS
# ═══════════════════════════════════════════════════════════════

cd backend
npm install
cd ..

# ═══════════════════════════════════════════════════════════════
# PASSO 3: CRIAR ARQUIVO .ENV
# ═══════════════════════════════════════════════════════════════

# Crie manualmente o arquivo backend/.env com o seguinte conteúdo:
#
# PORT=3000
# JWT_SECRET=seu_jwt_secret_super_seguro_mude_isto
# ADMIN_SECRET=admin_secret_super_seguro_mude_isto
#

# Ou use este comando para criar automaticamente:

@"
PORT=3000
JWT_SECRET=seu_jwt_secret_super_seguro_mude_isto
ADMIN_SECRET=admin_secret_super_seguro_mude_isto
"@ | Out-File -FilePath backend/.env -Encoding utf8

# ═══════════════════════════════════════════════════════════════
# PASSO 4: INICIAR O SERVIDOR (deixe este terminal aberto!)
# ═══════════════════════════════════════════════════════════════

cd backend
node server.js

# Você deve ver: "Servidor rodando na porta 3000"
# NÃO FECHE ESTE TERMINAL!

# ═══════════════════════════════════════════════════════════════
# PASSO 5: EM UM NOVO TERMINAL, EXECUTAR INICIALIZAÇÃO
# ═══════════════════════════════════════════════════════════════

# Abra um NOVO terminal (Ctrl + Shift + `) e execute:

cd c:\Users\andre\Desktop\quiz-saep-online
node init-first-course.js

# Isso vai:
# ✓ Criar usuário admin (user: admin, senha: admin123)
# ✓ Criar curso "Programação de Jogos Digitais"
# ✓ Importar 22 questões

# ═══════════════════════════════════════════════════════════════
# PASSO 6: ACESSAR O SISTEMA
# ═══════════════════════════════════════════════════════════════

# No navegador, acesse:

# PAINEL ADMIN:
start http://localhost:3000/admin.html

# QUIZ PARA USUÁRIOS:
start http://localhost:3000/index.html

# ═══════════════════════════════════════════════════════════════
# LOGIN DO ADMINISTRADOR:
# ═══════════════════════════════════════════════════════════════
#
# Usuário: admin
# Senha: admin123
# Email: admin@quiz.com
#
# ⚠️ ALTERE A SENHA APÓS O PRIMEIRO LOGIN!
#
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# COMANDOS ÚTEIS ADICIONAIS:
# ═══════════════════════════════════════════════════════════════

# Parar o servidor (no terminal do servidor, pressione):
# Ctrl + C

# Verificar se a porta 3000 está em uso:
netstat -ano | findstr :3000

# Matar processo na porta 3000 (se necessário):
# Copie o PID do comando acima e execute:
# taskkill /PID [NÚMERO_DO_PID] /F

# Reinstalar dependências (se houver problemas):
cd backend
Remove-Item -Recurse -Force node_modules
npm install

# Ver logs do servidor em tempo real (se implementado):
# cd backend
# npm run dev

# ═══════════════════════════════════════════════════════════════
# TESTAR API MANUALMENTE (opcional):
# ═══════════════════════════════════════════════════════════════

# Listar cursos:
Invoke-RestMethod -Uri "http://localhost:3000/api/courses" -Method GET

# Verificar se servidor está rodando:
Invoke-WebRequest -Uri "http://localhost:3000/api/courses" -UseBasicParsing

# ═══════════════════════════════════════════════════════════════
# RESUMO DOS ARQUIVOS IMPORTANTES:
# ═══════════════════════════════════════════════════════════════
#
# 📖 Documentação:
# • README.md - Documentação completa
# • INICIO-RAPIDO.txt - Guia de início rápido
# • IMPLEMENTACAO-COMPLETA.md - Detalhes da implementação
# • COMANDOS.ps1 - Este arquivo
#
# 🎯 Templates e Exemplos:
# • exemplo-questoes-importacao.json - Exemplo de importação
# • TEMPLATE-QUESTOES.txt - Template para criar questões
#
# 🔧 Scripts:
# • init-first-course.js - Inicialização do sistema
#
# 💻 Backend:
# • backend/server.js - API completa
# • backend/package.json - Dependências
# • backend/.env - Configurações (você criará)
#
# 🎨 Frontend:
# • frontend/index.html - Quiz principal
# • frontend/admin.html - Painel administrativo
# • frontend/app.js - Lógica do quiz
# • frontend/admin.js - Lógica do admin
#
# 📊 Dados:
# • shared/questions.json - 22 questões originais
#
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# ✅ APÓS EXECUTAR TODOS OS PASSOS, VOCÊ TERÁ:
# ═══════════════════════════════════════════════════════════════
#
# ✓ Servidor rodando na porta 3000
# ✓ Usuário admin criado
# ✓ Primeiro curso criado
# ✓ 22 questões importadas
# ✓ Sistema pronto para uso
#
# 🎉 APROVEITE SEU SISTEMA DE QUIZ MULTI-CURSOS!
#
# ═══════════════════════════════════════════════════════════════
