# 🚀 Guia de Deploy no Render

## Correções Implementadas

### 1. Configuração CORS
- Servidor agora aceita requisições de múltiplas origens
- Suporte para o domínio do Render
- Headers configurados corretamente

### 2. Servir Arquivos Estáticos
- Frontend é servido pelo backend
- Rotas SPA configuradas corretamente
- Arquivos compartilhados acessíveis

### 3. Configuração do Servidor
- Servidor escuta em `0.0.0.0` (necessário para Render)
- PORT configurado dinamicamente
- Variáveis de ambiente suportadas

## 📋 Passos para Deploy no Render

### Opção 1: Deploy Automático com render.yaml

1. **Faça commit das mudanças:**
   ```bash
   git add .
   git commit -m "Configurar para deploy no Render"
   git push origin main
   ```

2. **No Dashboard do Render:**
   - Vá em "New +" → "Web Service"
   - Conecte seu repositório GitHub
   - O Render detectará automaticamente o `render.yaml`
   - Clique em "Apply"

### Opção 2: Deploy Manual

1. **No Dashboard do Render:**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório

2. **Configure as seguintes opções:**
   - **Name:** `saep-quizz-gameficado`
   - **Region:** Oregon (US West)
   - **Branch:** main
   - **Root Directory:** (deixe vazio)
   - **Runtime:** Node
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`

3. **Adicione Variáveis de Ambiente:**
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: (gere uma chave aleatória segura)
   - `PORT`: `3000`

4. **Clique em "Create Web Service"**

## 🔧 Variáveis de Ambiente Necessárias

No painel do Render, adicione:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=your_super_secret_key_here_minimum_32_characters
```

**⚠️ IMPORTANTE:** Gere um JWT_SECRET seguro. Você pode usar:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ✅ Verificar Deploy

1. Após o deploy, acesse: `https://seu-app.onrender.com/api/health`
2. Você deve ver:
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

3. Acesse a URL principal do seu app: `https://seu-app.onrender.com`

## 🐛 Solução de Problemas

### Erro: "Failed to load resource"
- Verifique se as variáveis de ambiente estão configuradas
- Confirme que o build foi concluído com sucesso
- Verifique os logs no painel do Render

### Erro: "CORS Policy"
- O servidor já está configurado para aceitar requisições
- Limpe o cache do navegador
- Use o modo anônimo para testar

### Erro: "Cannot GET /api/courses"
- Verifique se o servidor iniciou corretamente nos logs
- Confirme que o comando start está correto
- Verifique se todas as dependências foram instaladas

### Erro: "Application Error"
- Verifique os logs no painel do Render
- Confirme que a porta está configurada corretamente
- Verifique se o JWT_SECRET está definido

## 📊 Monitoramento

No painel do Render você pode:
- Ver logs em tempo real
- Monitorar uso de recursos
- Configurar alertas
- Ver histórico de deploys

## 🔄 Atualizações Futuras

Após o primeiro deploy, qualquer push para a branch `main` irá:
1. Automaticamente fazer rebuild
2. Executar os testes (se configurados)
3. Fazer redeploy da aplicação

## 💡 Dicas

1. **Plano Free do Render:**
   - Suspende após 15 minutos de inatividade
   - Leva ~30s para "acordar" na primeira requisição
   - Suficiente para testes e desenvolvimento

2. **Melhorar Performance:**
   - Considere upgrade para plano pago
   - Configure um serviço de "ping" para manter ativo
   - Use um CDN para arquivos estáticos

3. **Banco de Dados:**
   - Atualmente usa armazenamento em memória
   - Dados são perdidos a cada redeploy
   - Para produção, configure PostgreSQL ou MongoDB

## 🔗 Links Úteis

- [Documentação do Render](https://render.com/docs)
- [Render Status](https://status.render.com/)
- [Comunidade Render](https://community.render.com/)

---

## ⚡ Deploy Rápido (Resumo)

```bash
# 1. Commit e push
git add .
git commit -m "Configurar para Render"
git push origin main

# 2. No Render Dashboard:
#    - New Web Service
#    - Conectar repo
#    - Build: cd backend && npm install
#    - Start: cd backend && npm start
#    - Adicionar variáveis de ambiente

# 3. Aguardar deploy e testar
```

Pronto! Seu quiz está no ar! 🎉
