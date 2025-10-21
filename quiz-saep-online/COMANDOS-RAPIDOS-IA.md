# ⚡ COMANDOS RÁPIDOS - Retomada do Projeto IA

## 🚀 INÍCIO RÁPIDO (Copy & Paste)

### 1. Instalar Dependências
```powershell
# Se PowerShell der erro, use CMD
cmd /c "cd backend && npm install"
```

### 2. Criar e Configurar .env
```powershell
cd backend
copy .env.example .env
notepad .env
```

**Cole no arquivo .env:**
```env
PORT=3000
JWT_SECRET=seu_secret_muito_seguro_aqui_mude_isto
NODE_ENV=development
GEMINI_API_KEY=COLE_SUA_CHAVE_AQUI
```

### 3. Obter API Key Gemini
1. Abra: https://makersuite.google.com/app/apikey
2. Login com Google
3. Create API Key
4. Copie e cole no .env

### 4. Iniciar Servidor
```powershell
cd backend
npm start
```

### 5. Testar Sistema
1. Abrir: http://localhost:3000
2. Login: admin@quiz.com / admin123
3. Menu: Questões → 🤖 Gerar com IA
4. Preencher e testar

### 6. Fazer Commit e Push
```powershell
cd ..
git add .
git commit -m "🤖 Adicionar geração de questões com IA"
git push origin main
```

### 7. Configurar Render
1. https://dashboard.render.com/
2. Seu serviço → Environment
3. Add: GEMINI_API_KEY = sua_chave
4. Save

---

## 🔍 VERIFICAÇÕES RÁPIDAS

### Checar se dependências foram instaladas:
```powershell
cd backend
npm list @google/generative-ai openai
```

### Checar se .env existe:
```powershell
cd backend
dir .env
```

### Checar se servidor está rodando:
```powershell
curl http://localhost:3000/api/health
```

### Checar status da IA:
```powershell
# Primeiro faça login e pegue o token
# Depois:
curl http://localhost:3000/api/ai/status -H "Authorization: Bearer SEU_TOKEN"
```

---

## 🐛 SOLUÇÃO RÁPIDA DE PROBLEMAS

### PowerShell não executa npm:
```powershell
cmd /c "cd backend && npm install"
```

### Servidor não inicia:
```powershell
cd backend
npm install
node server.js
```

### .env não é lido:
```powershell
# Verificar se está no lugar certo
cd backend
dir .env

# Deve estar em: backend/.env
# NÃO em: quiz-saep-online/.env
```

### API Key não funciona:
1. Verificar se começa com "AIzaSy"
2. Sem espaços antes/depois
3. Entre aspas no .env: `GEMINI_API_KEY="sua_chave"`

---

## 📊 STATUS DO PROJETO

```
✅ Backend - Rotas de IA implementadas
✅ Frontend - Interface completa
✅ Estilos - CSS adicionado
✅ Documentação - GUIA-IA.md criado
⏳ Dependências - Precisam ser instaladas
⏳ API Key - Precisa ser configurada
⏳ Testes - Precisam ser executados
⏳ Deploy - Precisa ser atualizado
```

---

## 📞 AJUDA RÁPIDA

**Problema:** "npm não encontrado"
**Solução:** Instale Node.js de https://nodejs.org/

**Problema:** "Cannot find module '@google/generative-ai'"
**Solução:** Execute `npm install` no diretório backend

**Problema:** "API not configured"
**Solução:** Adicione GEMINI_API_KEY no arquivo .env

**Problema:** "Invalid API key"
**Solução:** Gere nova chave em https://makersuite.google.com/app/apikey

---

## 🎯 TESTE RÁPIDO

**Dados para testar:**
- Provedor: Gemini
- Curso: Programação de Jogos Digitais
- Capacidade: C1
- Conteúdo: "Estruturas de repetição for em JavaScript"
- Dificuldade: Médio

**Resultado esperado:**
Questão gerada em 10-30 segundos com 4 alternativas

---

## 📂 ARQUIVOS IMPORTANTES

```
backend/server.js ............ Rotas de IA (linha ~960)
backend/package.json ......... Dependências adicionadas
backend/.env ................. Configuração (CRIAR)
backend/.env.example ......... Template
frontend/admin.html .......... Modal de IA (linha ~200)
frontend/admin.js ............ Funções (linha ~780)
frontend/admin-styles.css .... Estilos (linha ~585)
GUIA-IA.md ................... Documentação completa
CONTINUACAO-IA.md ............ Ponto de retomada
```

---

**💡 DICA:** Salve este arquivo! Ele tem tudo que você precisa para continuar.

**⏱️ Tempo total estimado: 10 minutos**

**🎉 Sucesso!**
