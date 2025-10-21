# 🔧 Solução Rápida de Problemas no Render

## 🚨 Problema Atual: "Erro ao carregar cursos"

### Causa Provável
O servidor está rodando, mas há problemas de comunicação entre frontend e backend.

### ✅ Soluções Implementadas

1. **CORS Configurado** ✓
   - Servidor aceita requisições do domínio Render
   - Headers configurados corretamente

2. **Rotas Corrigidas** ✓
   - Frontend usa URL relativa quando no Render
   - Backend serve arquivos estáticos corretamente

3. **Servidor Configurado** ✓
   - Escuta em `0.0.0.0:3000`
   - Rota de health check melhorada

## 📋 Checklist de Verificação

### 1. Verificar Deploy no Render

Acesse o painel do Render e verifique:

- [ ] Status: "Live" (bolinha verde)
- [ ] Build completou com sucesso
- [ ] Não há erros nos logs
- [ ] Variáveis de ambiente configuradas

### 2. Testar Endpoints

Execute localmente:
```bash
node verificar-deploy.js
```

Ou teste manualmente:
```bash
# 1. Health Check
curl https://saep-quizz-gameficado.onrender.com/api/health

# 2. Listar Cursos
curl https://saep-quizz-gameficado.onrender.com/api/courses

# 3. Frontend
curl https://saep-quizz-gameficado.onrender.com/
```

### 3. Verificar Variáveis de Ambiente

No painel do Render, certifique-se de ter:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=sua_chave_secreta_aqui
```

### 4. Verificar Logs

No Render Dashboard:
1. Clique no seu serviço
2. Vá em "Logs"
3. Procure por:
   - ✅ "Servidor rodando na porta 3000"
   - ✅ "Admin padrão criado"
   - ✅ "Curso padrão criado"
   - ✅ "22 questões carregadas"

## 🔄 Próximos Passos

### Se o deploy ainda não foi feito:

```bash
# 1. Fazer push das mudanças
git push origin main

# 2. Criar serviço no Render:
# - New Web Service
# - Conectar repositório
# - Build: cd backend && npm install
# - Start: cd backend && npm start
# - Adicionar variáveis de ambiente
```

### Se o deploy já existe:

```bash
# 1. Fazer push das mudanças
git push origin main

# 2. Aguardar rebuild automático (2-3 minutos)

# 3. Limpar cache do navegador:
# - Chrome: Ctrl+Shift+Delete
# - Testar em aba anônima
```

## 🐛 Erros Comuns e Soluções

### Erro: "Application Error"
**Causa:** Servidor não iniciou
**Solução:**
1. Verifique os logs no Render
2. Confirme que `npm install` completou
3. Verifique se JWT_SECRET está definido

### Erro: "Failed to fetch"
**Causa:** URL da API incorreta
**Solução:**
1. Abra o console do navegador (F12)
2. Veja o log: "🌐 API URL configurada: ..."
3. Deve ser `/api` quando no Render

### Erro: "This site can't be reached"
**Causa:** Deploy ainda não completou ou falhou
**Solução:**
1. Aguarde o deploy completar (pode levar 5-10 min)
2. Verifique status no painel do Render
3. Se falhou, veja os logs de build

### Erro: "CORS policy"
**Causa:** (Já corrigido nas mudanças)
**Solução:** 
- Já implementado no código
- Faça push das mudanças se ainda não fez

## 📞 Informações de Debug

Quando pedir ajuda, inclua:

1. **URL do seu serviço Render**
2. **Resposta de `/api/health`:**
   ```bash
   curl https://seu-app.onrender.com/api/health
   ```
3. **Logs do Render** (últimas 50 linhas)
4. **Erro no console do navegador** (F12 → Console)

## 🎯 Teste Rápido

Execute estes comandos para verificar tudo:

```bash
# Windows PowerShell
curl https://saep-quizz-gameficado.onrender.com/api/health
curl https://saep-quizz-gameficado.onrender.com/api/courses
```

**Resposta esperada do health:**
```json
{
  "status": "OK",
  "message": "Servidor rodando!",
  "environment": "production",
  "users": 1,
  "courses": 1,
  "questions": 22
}
```

**Se ver isso, seu servidor está OK! 🎉**

## 💡 Dica Final

Se nada funcionar:
1. Delete o serviço no Render
2. Crie um novo seguindo o [DEPLOY-RENDER.md](DEPLOY-RENDER.md)
3. Use o `render.yaml` para configuração automática

---

**Última atualização:** Commit com todas as correções do Render
