# 🔧 Changelog - Sistema de ID Automático de Questões

**Data:** 23 de Outubro de 2025

## 📋 Resumo das Mudanças

Implementado sistema de geração automática de IDs para questões, com identificação por curso usando abreviações personalizadas.

---

## ✨ Funcionalidades Implementadas

### 1. **Geração Automática de IDs**
   - IDs agora são gerados automaticamente no formato: `q{número}-{abreviação_curso}`
   - Exemplo: `q1-JD`, `q2-JD`, `q3-JD` (Jogos Digitais)
   - O sistema verifica automaticamente o próximo número disponível para cada curso

### 2. **Mapeamento de Abreviações de Cursos**
   - Adicionado sistema de abreviações configurável
   - Mapeamento padrão:
     ```javascript
     'Programação de Jogos Digitais': 'JD'
     'Jogos Digitais': 'JD'
     'Desenvolvimento de Games': 'DG'
     'Tecnologia': 'TEC'
     'Programação': 'PROG'
     ```
   - Fallback automático para iniciais do nome do curso se não mapeado

### 3. **API Endpoint para Próximo ID**
   - Nova rota: `GET /api/courses/:courseId/next-question-id`
   - Retorna o próximo ID disponível para um curso específico
   - Útil para preview antes de salvar a questão

### 4. **Interface de Administração Atualizada**
   - Campo de ID agora é **somente leitura** e preenchido automaticamente
   - Mostra preview do próximo ID ao selecionar um curso
   - Mantém compatibilidade retroativa (ainda aceita ID manual se fornecido)

---

## 🔧 Mudanças Técnicas

### Backend (`server.js`)

#### Novas Funções:
```javascript
getCourseAbbreviation(course)
// Retorna a abreviação do curso

generateNextQuestionId(courseId)
// Gera o próximo ID disponível para um curso
```

#### Rotas Modificadas:
- `POST /api/courses/:courseId/questions` - Agora aceita questões sem ID
- `POST /api/courses/:courseId/questions/import` - Importação com ID automático

#### Novas Rotas:
- `GET /api/courses/:courseId/next-question-id` - Obter próximo ID
- `GET /api/debug/courses` - Debug para verificar status dos cursos

#### Melhorias no Seed:
- Logs mais detalhados durante inicialização
- Melhor tratamento de erros
- Validação da existência do arquivo de questões

### Frontend (`admin.js`)

#### Funções Modificadas:
```javascript
showAddQuestionModal()
// Agora prepara o campo de ID para ser automático

updateNextQuestionId()
// Busca e exibe o próximo ID disponível

handleAddQuestion()
// Envia questão sem ID se vazio (backend gera)
```

---

## 🎯 Benefícios

1. **Eliminação de Erros Humanos**
   - Não é mais necessário lembrar qual foi o último ID usado
   - Impossível criar IDs duplicados acidentalmente

2. **Organização por Curso**
   - IDs claramente identificam a qual curso pertencem
   - Facilita filtragem e busca de questões

3. **Facilidade de Uso**
   - Interface mais simples para administradores
   - Menos campos para preencher manualmente

4. **Escalabilidade**
   - Sistema funciona com qualquer número de cursos
   - Fácil adicionar novos cursos com suas próprias abreviações

---

## 📝 Como Usar

### Adicionar uma Nova Questão:

1. Acesse o painel administrativo
2. Vá em "Questões" > "Adicionar Nova Questão"
3. Selecione o curso
4. O campo "ID da Questão" será preenchido automaticamente (ex: `q1-JD`)
5. Preencha os demais campos normalmente
6. Clique em "Salvar"
7. O sistema confirmará com uma mensagem mostrando o ID gerado

### Importar Questões:

Ao importar questões via JSON, o campo `id` agora é **opcional**:

```json
[
  {
    "context": "Contexto da questão...",
    "command": "Pergunta...",
    "capacidade": "C1",
    "options": [...]
  }
]
```

Se não fornecer o `id`, o sistema gerará automaticamente!

---

## 🔄 Compatibilidade Retroativa

O sistema mantém compatibilidade com questões existentes:
- IDs antigos (ex: `q1`, `q2`) continuam funcionando
- Se fornecer um ID manualmente, ele será usado
- A geração automática só ocorre se o ID estiver vazio

---

## 🐛 Resolução de Problemas no Render

### Problema: Cursos não carregavam no Render

**Solução implementada:**
- Melhorado o processo de seed inicial
- Adicionados logs detalhados para diagnóstico
- Criada rota `/api/debug/courses` para verificação
- Garantido que o curso padrão sempre seja criado

### Como Verificar se Está Funcionando:

1. Acesse: `https://seu-dominio.onrender.com/api/debug/courses`
2. Verifique se retorna cursos
3. Verifique os logs do Render para mensagens de seed

---

## 📌 Notas Importantes

- O ID é gerado **no backend** para garantir consistência
- IDs são únicos **por curso** (pode haver `q1-JD` e `q1-TEC`)
- A abreviação do curso pode ser personalizada no `DEFAULT_COURSE` ou no mapeamento `COURSE_ABBREVIATIONS`

---

## 🚀 Próximos Passos Sugeridos

1. Adicionar edição de questões (atualmente só criação/exclusão)
2. Permitir configurar abreviação de curso via interface admin
3. Adicionar migração para renomear IDs antigos para novo formato
4. Implementar busca de questões por ID

---

## 📞 Suporte

Se encontrar algum problema:
1. Verifique os logs do console do navegador
2. Verifique os logs do servidor (Render)
3. Use a rota `/api/debug/courses` para diagnóstico

---

**Desenvolvido por:** GitHub Copilot  
**Versão:** 2.0.0  
**Data:** 23/10/2025
