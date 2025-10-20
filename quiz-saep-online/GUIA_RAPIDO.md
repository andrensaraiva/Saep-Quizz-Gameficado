# GUIA RÁPIDO - Quiz SAEP Online

## 🚀 Iniciar o Sistema (3 passos)

### 1️⃣ Instalar dependências (primeira vez apenas)
```powershell
cd c:\Users\andre\Desktop\quiz-saep-online\backend
npm install
```

### 2️⃣ Configurar ambiente (primeira vez apenas)
```powershell
# Criar arquivo .env
Copy-Item .env.example .env

# Editar .env e mudar JWT_SECRET para algo único
```

### 3️⃣ Iniciar o servidor
```powershell
# Terminal 1 - Backend
cd c:\Users\andre\Desktop\quiz-saep-online\backend
npm start

# Terminal 2 - Frontend (abrir em navegador)
start c:\Users\andre\Desktop\quiz-saep-online\frontend\index.html
```

## ➕ Como Adicionar Questões

Edite: `shared/questions.json`

Copie e cole este template no final do array:

```json
{
  "id": "q23",
  "capacidade": "C1",
  "context": "Descreva o cenário/contexto da questão aqui...",
  "command": "Qual é a pergunta?",
  "options": [
    {
      "text": "Primeira opção (incorreta)",
      "justification": "Explicação de por que está errada"
    },
    {
      "text": "Segunda opção (CORRETA)",
      "correct": true
    },
    {
      "text": "Terceira opção (incorreta)",
      "justification": "Explicação de por que está errada"
    },
    {
      "text": "Quarta opção (incorreta)",
      "justification": "Explicação de por que está errada"
    }
  ]
}
```

**Lembre-se:**
- Adicione uma vírgula antes se não for a primeira questão
- Apenas UMA opção deve ter `"correct": true`
- Incremente o número do ID (q23, q24, q25...)
- Escolha a capacidade correta (C1 a C8)

## 🔍 Verificar se está funcionando

Acesse no navegador:
- Backend: http://localhost:3000/api/health
- Frontend: http://localhost:8080 (ou arquivo aberto)

## 🆘 Problemas Comuns

**Erro: "Cannot find module"**
→ Execute `npm install` novamente

**Erro: "Port already in use"**
→ Feche outros servidores ou mude a porta no .env

**Questões não aparecem**
→ Verifique se o JSON está correto (sem vírgulas extras)

---

📖 Para documentação completa: veja README.md
