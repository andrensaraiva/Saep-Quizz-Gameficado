# 🤖 Guia de Configuração da IA

## Visão Geral

O sistema agora permite gerar questões automaticamente usando Inteligência Artificial! O instrutor pode:

✅ Escolher a capacidade/competência  
✅ Definir o conteúdo/tema da questão  
✅ Selecionar o nível de dificuldade  
✅ Gerar questão completa com 4 alternativas  
✅ Revisar e aprovar antes de salvar  
✅ Editar manualmente se necessário  

## 📋 Provedores Disponíveis

### 1. Google Gemini (RECOMENDADO - Gratuito)

**Vantagens:**
- ✅ Totalmente gratuito
- ✅ Limite generoso (60 requisições/minuto)
- ✅ Qualidade excelente
- ✅ Não requer cartão de crédito

**Como obter sua API Key:**

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

### 2. OpenAI ChatGPT (Pago)

**Vantagens:**
- ✅ Qualidade de ponta
- ✅ Mais opções de modelos

**Desvantagens:**
- ❌ Requer créditos pagos
- ❌ Precisa cadastrar cartão de crédito

**Como obter:**

1. Acesse: https://platform.openai.com/api-keys
2. Crie uma conta
3. Adicione créditos ($5 mínimo)
4. Gere uma API Key

## 🔧 Configuração no Servidor

### Desenvolvimento Local:

1. **Copie o arquivo .env.example:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edite o arquivo `.env` e adicione suas chaves:**
   ```env
   # Para usar Gemini (Recomendado)
   GEMINI_API_KEY=AIzaSyC...suachaveaqui
   GEMINI_MODEL=gemini-2.5-flash  # Aceita também models/gemini-2.5-flash
   
   # OU para usar ChatGPT
   OPENAI_API_KEY=sk-proj-...suachaveaqui
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Reinicie o servidor:**
   ```bash
   npm start
   ```

### Produção (Render):

1. **Acesse o Dashboard do Render**
2. **Vá no seu serviço → Environment**
3. **Adicione as variáveis:**
   - `GEMINI_API_KEY` = sua chave do Gemini
   - `GEMINI_MODEL` = `gemini-2.5-flash` (aceita também `models/gemini-2.5-flash`)
   - OU `OPENAI_API_KEY` = sua chave da OpenAI

4. **Salve e aguarde o redeploy automático**

## 🎯 Como Usar no Sistema

### Passo 1: Acessar o Painel Admin

1. Faça login como administrador
2. Vá em **Questões** no menu lateral
3. Clique no botão **🤖 Gerar com IA**

### Passo 2: Preencher o Formulário

```
┌─────────────────────────────────────┐
│ Provedor: Google Gemini (Gratuito)  │
│ Curso: Programação de Jogos         │
│ Capacidade: C1 - Lógica             │
│ Conteúdo: Estruturas de repetição   │
│           em JavaScript             │
│ Dificuldade: Médio                  │
└─────────────────────────────────────┘
```

### Passo 3: Gerar e Revisar

1. Clique em **"Gerar Questão"**
2. Aguarde 10-30 segundos
3. Revise a questão gerada
4. Escolha uma opção:
   - ✅ **Aprovar e Salvar** - Salva a questão no banco
   - ❌ **Rejeitar e Gerar Outra** - Tenta novamente
   - ✏️ **Editar Manualmente** - Abre editor para ajustes

## 📊 Exemplo de Questão Gerada

**Entrada:**
- Capacidade: C1 - Lógica de Programação
- Conteúdo: Loop for em JavaScript
- Dificuldade: Médio

**Saída da IA:**

```
Contexto: Em JavaScript, o loop for é usado para repetir um bloco 
de código um número específico de vezes.

Pergunta: Qual será a saída do seguinte código?

for(let i = 0; i < 3; i++) {
  console.log(i);
}

A) 0 1 2 3 ✗
B) 0 1 2 ✓ (CORRETA)
C) 1 2 3 ✗
D) 0 0 0 ✗

Explicação: O loop começa em 0 e incrementa até que i seja menor 
que 3, portanto imprime 0, 1 e 2.
```

## 🐛 Solução de Problemas

### Erro: "API não configurada"

**Causa:** Chave da API não está no .env  
**Solução:**
1. Verifique se o arquivo `.env` existe em `/backend`
2. Confirme que a chave está correta
3. Reinicie o servidor

### Erro: "Quota exceeded"

**Causa:** Limite de requisições atingido  
**Solução:**
- **Gemini:** Aguarde 1 minuto (limite: 60/min)
- **ChatGPT:** Adicione mais créditos na conta

### Erro: "Invalid API key"

**Causa:** Chave incorreta ou inválida  
**Solução:**
1. Gere uma nova chave no painel
2. Atualize o arquivo `.env`
3. Reinicie o servidor

### Questão gerada está mal formatada

**Solução:**
1. Clique em "Rejeitar e Gerar Outra"
2. Ou clique em "Editar Manualmente" para corrigir
3. Tente ser mais específico no campo "Conteúdo"

## 💡 Dicas para Melhores Resultados

### ✅ Seja Específico
```
❌ Ruim: "programação"
✅ Bom: "laços de repetição while em Python"
```

### ✅ Use Exemplos
```
❌ Ruim: "variáveis"
✅ Bom: "declaração de variáveis let, const e var em JavaScript"
```

### ✅ Contextualize
```
❌ Ruim: "arrays"
✅ Bom: "manipulação de arrays com métodos map, filter e reduce"
```

## 📈 Limites e Custos

| Provedor | Custo | Limite Gratuito | Velocidade |
|----------|-------|-----------------|------------|
| Gemini | 🆓 Grátis | 60 req/min | ~15s |
| ChatGPT 3.5 | 💰 $0.002/1k tokens | $5 crédito inicial | ~10s |
| ChatGPT 4 | 💰 $0.03/1k tokens | - | ~20s |

**Recomendação:** Use Gemini para uso ilimitado gratuito!

## 🔒 Segurança

⚠️ **IMPORTANTE:**

1. **Nunca** compartilhe suas API keys
2. **Nunca** faça commit de arquivos `.env`
3. Use variáveis de ambiente no Render
4. Regenere as chaves se suspeitar de vazamento

## 📚 Recursos Adicionais

- [Documentação Gemini](https://ai.google.dev/docs)
- [Documentação OpenAI](https://platform.openai.com/docs)
- [Melhores práticas com IA](https://ai.google.dev/docs/prompt_best_practices)

## 🆘 Suporte

Se tiver problemas:

1. Verifique os logs do servidor
2. Teste a API key manualmente
3. Consulte a documentação oficial
4. Abra uma issue no GitHub

---

**Desenvolvido com ❤️ - Sistema Quiz SAEP Online**
