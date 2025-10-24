# 🔥 Guia de Configuração do Firebase Realtime Database

Este guia vai te ajudar a configurar o Firebase para o Quiz SAEP.

## 📋 Passo a Passo

### 1️⃣ Criar Projeto no Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Clique em **"Adicionar projeto"** ou **"Create a project"**
3. Nome do projeto: `quiz-saep` (ou o nome que preferir)
4. **Desabilite** o Google Analytics (não precisamos)
5. Clique em **"Criar projeto"**
6. Aguarde a criação (leva ~30 segundos)

---

### 2️⃣ Ativar o Realtime Database

1. No menu lateral, clique em **"Realtime Database"**
2. Clique em **"Criar banco de dados"**
3. **Localização**: escolha `United States (us-central1)` (mais próximo do Render)
4. **Regras de segurança**: escolha **"Modo bloqueado"** (vamos configurar depois)
5. Clique em **"Ativar"**

#### Configurar Regras de Segurança

Após criar o banco, vá em **"Regras"** (aba Rules) e cole isto:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      ".indexOn": ["email", "username"]
    },
    "questions": {
      ".indexOn": ["courseId"]
    },
    "quizzes": {
      ".indexOn": ["courseId"]
    },
    "scores": {
      ".indexOn": ["userId", "courseId"]
    },
    "feedbacks": {
      ".indexOn": ["status"]
    }
  }
}
```

Clique em **"Publicar"**.

> ⚠️ **Importante**: Estas regras bloqueiam acesso direto. Somente o servidor (com credenciais admin) pode acessar o banco.

---

### 3️⃣ Obter Credenciais de Serviço (Service Account)

1. No Firebase Console, clique no **ícone de engrenagem ⚙️** (ao lado de "Visão geral do projeto")
2. Clique em **"Configurações do projeto"** ou **"Project settings"**
3. Vá na aba **"Contas de serviço"** ou **"Service accounts"**
4. Clique em **"Gerar nova chave privada"** ou **"Generate new private key"**
5. Confirme clicando em **"Gerar chave"**
6. Um arquivo `.json` será baixado automaticamente
   - **GUARDE ESTE ARQUIVO COM SEGURANÇA!**
   - Ele contém credenciais que dão acesso total ao seu banco

---

### 4️⃣ Obter URL do Database

Na mesma página de **Contas de serviço**, procure por:

```
databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com"
```

Copie esta URL (você vai precisar dela).

---

### 5️⃣ Configurar Localmente (Desenvolvimento)

#### Opção A: Usar arquivo JSON (mais fácil)

1. Renomeie o arquivo baixado para `firebase-credentials.json`
2. Mova para a pasta `backend/`
3. **IMPORTANTE**: Adicione ao `.gitignore` (já está configurado)
4. No arquivo `.env` local, adicione:

```bash
FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
```

5. O código vai detectar automaticamente o arquivo `firebase-credentials.json`

#### Opção B: Variáveis de ambiente

1. Abra o arquivo `.json` baixado
2. Copie o conteúdo TODO em uma linha só
3. No `.env`, adicione:

```bash
FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...COLE_AQUI_TODO_O_JSON..."}
```

---

### 6️⃣ Configurar no Render (Produção)

1. Acesse o painel do Render: https://dashboard.render.com
2. Selecione seu serviço **saep-quizz-gameficado**
3. Vá em **"Environment"** (menu lateral)
4. Clique em **"Add Environment Variable"**

Adicione estas variáveis:

**FIREBASE_DATABASE_URL**
```
https://seu-projeto-default-rtdb.firebaseio.com
```

**FIREBASE_CREDENTIALS**
```json
{"type":"service_account","project_id":"quiz-saep-xxxxx","private_key_id":"xxxxx","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@quiz-saep-xxxxx.iam.gserviceaccount.com","client_id":"xxxxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/service_accounts/v1/metadata/x509/firebase-adminsdk-xxxxx%40quiz-saep-xxxxx.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

> 💡 **Dica**: Para colar o JSON em uma linha no Render:
> 1. Abra o arquivo `.json` no VS Code
> 2. Selecione todo o conteúdo (Ctrl+A)
> 3. Cole direto no campo (o Render aceita JSON formatado)
> 
> **OU**
> 
> Use este comando PowerShell para converter em uma linha:
> ```powershell
> (Get-Content firebase-credentials.json -Raw) -replace '[\r\n\s]+', ' '
> ```

5. Clique em **"Save Changes"**
6. O serviço vai reiniciar automaticamente

---

### 7️⃣ Testar a Conexão

Após configurar, reinicie o servidor:

```bash
cd backend
npm start
```

Você deve ver:

```
✅ Firebase inicializado com credenciais do ambiente
🚀 Iniciando seed de dados...
✅ Admin padrão criado automaticamente
...
```

Se aparecer:
```
⚠️ Firebase não configurado - usando memória local
```

Revise os passos acima e verifique se as variáveis estão corretas.

---

## 🔍 Verificar Dados no Firebase Console

1. Vá em **Realtime Database** no Firebase Console
2. Você verá a estrutura:
   ```
   quiz-saep-xxxxx-default-rtdb
   ├── users
   ├── courses
   ├── questions
   ├── quizzes
   ├── scores
   └── feedbacks
   ```

3. Clique para expandir e ver os dados

---

## 📦 Backup Manual (Opcional)

Para fazer backup dos dados:

1. No Firebase Console -> Realtime Database
2. Clique nos **3 pontinhos** (⋮) ao lado do nome do banco
3. Escolha **"Exportar JSON"**
4. Salve o arquivo em local seguro

Para restaurar:
1. Clique nos **3 pontinhos** novamente
2. Escolha **"Importar JSON"**
3. Selecione o arquivo de backup

---

## 🆓 Limites do Plano Gratuito (Spark)

- ✅ **Armazenamento**: 1 GB
- ✅ **Downloads**: 10 GB/mês
- ✅ **Conexões simultâneas**: 100

Para o Quiz SAEP, isso é mais que suficiente! 

Se precisar de mais:
- Plano **Blaze** (pague conforme usa)
- Primeiros recursos gratuitos são os mesmos
- Só paga se ultrapassar

---

## ❓ Problemas Comuns

### Erro: "Permission denied"
- Verifique se as regras de segurança foram configuradas
- Certifique-se de estar usando as credenciais admin corretas

### Erro: "FIREBASE_DATABASE_URL is undefined"
- Verifique se a variável está no `.env` (local) ou no Render (produção)
- Confira se a URL está correta (termina com `.firebaseio.com`)

### Dados não aparecem no Firebase Console
- Aguarde alguns segundos e atualize a página
- Verifique se o servidor está rodando sem erros
- Confira os logs para ver se há mensagens de erro

### Erro: "Invalid service account"
- O JSON das credenciais está correto?
- No Render, certifique-se de colar o JSON completo (pode ser multi-linha)
- Verifique se não há espaços extras antes/depois do JSON

---

## ✅ Checklist Final

- [ ] Projeto criado no Firebase Console
- [ ] Realtime Database ativado
- [ ] Regras de segurança configuradas
- [ ] Credenciais baixadas e guardadas
- [ ] URL do database copiada
- [ ] Variáveis configuradas localmente (`.env`)
- [ ] Variáveis configuradas no Render
- [ ] Servidor reiniciado e testado
- [ ] Dados aparecendo no Firebase Console

---

## 🎉 Pronto!

Agora seu Quiz SAEP está usando Firebase e seus dados estão seguros e persistidos! 

Qualquer dúvida, consulte a documentação oficial:
- https://firebase.google.com/docs/database
- https://firebase.google.com/docs/admin/setup
