# 🎮 Quiz SAEP Online - Sistema Multi-Cursos de Avaliação

Sistema completo de quiz online com **múltiplos cursos**, ranking, autenticação, **painel administrativo** e correção automática.

## ✨ Funcionalidades Principais

### 🎓 Sistema Multi-Curso
- ✅ **Múltiplos cursos independentes** com rankings separados
- ✅ **Painel administrativo completo** para gerenciar tudo
- ✅ **Importação em lote** de questões via JSON
- ✅ Criação e edição de cursos com categorias e cores
- ✅ Gestão de questões por curso

### 📝 Quiz Inteligente
- ✅ Questões de múltipla escolha personalizáveis
- ✅ Questões organizadas por capacidades/competências
- ✅ Embaralhamento automático de questões e alternativas
- ✅ Timer/cronômetro durante o quiz
- ✅ Correção automática com feedback detalhado
- ✅ Explicações para respostas incorretas

### 👤 Sistema de Usuários
- ✅ Cadastro e login de usuários
- ✅ Autenticação com JWT (JSON Web Tokens)
- ✅ **Sistema de roles: usuários e administradores**
- ✅ Perfil de usuário com histórico de tentativas
- ✅ Senha criptografada com bcrypt

### 🏆 Ranking Avançado
- ✅ **Ranking por curso** (separado para cada curso)
- ✅ Filtros por período (hoje, semana, mês, todos os tempos)
- ✅ Ordenação por percentual e tempo
- ✅ Histórico completo de pontuações

### � Painel Administrativo
- ✅ **Dashboard com estatísticas gerais**
- ✅ **Gerenciamento de cursos** (CRUD completo)
- ✅ **Gerenciamento de questões** (individual ou em lote)
- ✅ **Gerenciamento de usuários** (promover admins, excluir)
- ✅ **Relatórios detalhados por curso**
- ✅ **Exportação de dados em CSV**
- ✅ Análise de desempenho por questão
- ✅ Identificação de questões mais difíceis

### 📊 Relatórios e Analytics
- ✅ Estatísticas de uso do sistema
- ✅ Top 10 melhores desempenhos por curso
- ✅ Taxa de acerto por questão
- ✅ Atividades recentes dos usuários
- ✅ Exportação em CSV (usuários, pontuações, cursos)

## 🚀 Instalação e Configuração Inicial

### Pré-requisitos
- Node.js (versão 14 ou superior)
- NPM (gerenciador de pacotes do Node.js)

### PASSO 1: Instalar Dependências

```powershell
cd backend
npm install
```

### PASSO 2: Configurar Variáveis de Ambiente

Crie o arquivo `backend/.env`:

```env
PORT=3000
JWT_SECRET=seu_jwt_secret_super_seguro_mude_isto
ADMIN_SECRET=admin_secret_super_seguro_mude_isto
```

**⚠️ IMPORTANTE:** Mude estes secrets para valores únicos e seguros!

### PASSO 3: Iniciar o Servidor

```powershell
cd backend
node server.js
```

Aguarde a mensagem: `Servidor rodando na porta 3000`

### PASSO 4: Executar Script de Inicialização

**Em um novo terminal**, execute o script que cria o primeiro curso e importa as questões:

```powershell
cd quiz-saep-online
node init-first-course.js
```

Este script automaticamente:
- ✅ Cria o usuário administrador (username: `admin`, senha: `admin123`)
- ✅ Cria o curso "Programação de Jogos Digitais"
- ✅ Importa as 22 questões originais

### PASSO 5: Acessar o Sistema

- **Para fazer quiz:** `http://localhost:3000/index.html`
- **Painel administrativo:** `http://localhost:3000/admin.html`

**Login admin:**
- Usuário: `admin`
- Senha: `admin123`

---

## 📁 Estrutura do Projeto

```
quiz-saep-online/
│
├── frontend/
│   ├── index.html          # Interface do quiz
│   ├── styles.css          # Estilos principais
│   ├── app.js              # Lógica do quiz
│   ├── admin.html          # 🆕 Painel administrativo
│   ├── admin-styles.css    # 🆕 Estilos do admin
│   └── admin.js            # 🆕 Lógica administrativa
│
├── backend/
│   ├── server.js           # 🆕 API completa (multi-curso)
│   ├── package.json        # Dependências
│   ├── .env.example        # Exemplo de configuração
│   └── .env                # Suas configurações
│
├── shared/
│   └── questions.json      # Questões originais (22)
│
└── init-first-course.js    # 🆕 Script de inicialização
```

---

## 🎯 Usando o Painel Administrativo

Acesse: `http://localhost:3000/admin.html`

### 1️⃣ Dashboard
- Visualize estatísticas gerais do sistema
- Monitore atividades recentes
- Acompanhe usuários ativos

### 2️⃣ Gerenciar Cursos
- **Criar curso:** Clique em "+ Novo Curso"
- **Editar:** Use o botão ✏️ de cada curso
- **Excluir:** Use o botão 🗑️ (cuidado: remove todas as questões!)

### 3️⃣ Gerenciar Questões

#### Adicionar Questão Individual:
1. Selecione o curso no dropdown
2. Clique em "+ Nova Questão"
3. Preencha os campos
4. Adicione opções (mínimo 2)
5. Marque UMA opção como correta
6. Salvar

#### 🔥 Importação em Lote (JSON):
1. Clique em "📥 Importar Questões"
2. Selecione o curso
3. Cole o JSON com array de questões
4. Clique em "Importar"

**Formato do JSON:**

**Formato do JSON:**

```json
[
  {
    "id": "Q01",
    "capacidade": "Análise",
    "context": "Contexto da questão aqui...",
    "command": "Qual é a pergunta?",
    "options": [
      {
        "text": "Resposta correta",
        "correct": true
      },
      {
        "text": "Resposta incorreta 1",
        "justification": "Explicação do erro"
      },
      {
        "text": "Resposta incorreta 2",
        "justification": "Explicação do erro"
      }
    ]
  },
  {
    "id": "Q02",
    "capacidade": "Compreensão",
    "command": "Segunda questão...",
    "options": [...]
  }
]
```

**Regras de Importação:**
- Deve ser um array JSON válido
- Cada questão precisa ter: `id`, `command`, `options`
- Cada opção precisa ter: `text`
- **Exatamente UMA** opção deve ter `"correct": true`
- `capacidade` e `context` são opcionais

### 4️⃣ Gerenciar Usuários
- Ver lista completa de usuários
- Promover usuários para administrador (👑)
- Excluir usuários
- Ver estatísticas individuais (tentativas, média)

### 5️⃣ Relatórios
- Escolha um curso para ver relatório detalhado
- Análise de desempenho geral
- Top 10 melhores pontuações
- **Estatísticas por questão** (identifica questões difíceis)
- Exportar dados em CSV:
  - 📊 Usuários
  - 📊 Pontuações
  - 📊 Cursos

---

## 📊 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/create-admin` - Criar admin (requer ADMIN_SECRET)
- `GET /api/auth/verify` - Verificar token

### Cursos (público)
- `GET /api/courses` - Listar cursos
- `GET /api/courses/:id` - Detalhes de curso
- `GET /api/courses/:id/questions` - Questões do curso

### Cursos (admin)
- `POST /api/courses` - Criar curso
- `PUT /api/courses/:id` - Atualizar curso
- `DELETE /api/courses/:id` - Excluir curso

### Questões (admin)
- `POST /api/courses/:id/questions` - Adicionar questão
- `POST /api/courses/:id/questions/import` - 🔥 Importar em lote
- `DELETE /api/courses/:id/questions/:qid` - Excluir questão

### Pontuações
- `POST /api/scores` - Salvar pontuação
- `GET /api/ranking` - Ranking geral
- `GET /api/ranking?courseId=X` - Ranking de curso específico

### Administração
- `GET /api/admin/dashboard` - Estatísticas gerais
- `GET /api/admin/users` - Listar usuários com stats
- `PUT /api/admin/users/:id/role` - Alterar role
- `DELETE /api/admin/users/:id` - Excluir usuário
- `GET /api/admin/reports/course/:id` - Relatório detalhado
- `GET /api/admin/export/:type` - Exportar CSV

---

## 🔧 Tecnologias Utilizadas

### Backend
- **Node.js** - Ambiente de execução JavaScript
- **Express.js** - Framework web
- **jsonwebtoken** - Autenticação JWT
- **bcryptjs** - Criptografia de senhas
- **cors** - Cross-Origin Resource Sharing
- **multer** - Upload de arquivos

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilos modernos (flexbox, grid)
- **JavaScript ES6+** - Lógica do cliente
- **Fetch API** - Comunicação com backend

---

## 🔒 Segurança

- ✅ Senhas criptografadas com bcrypt
- ✅ Tokens JWT com expiração de 24h
- ✅ Middleware de autenticação
- ✅ Proteção de rotas administrativas
- ✅ Validação de dados
- ⚠️ **Para produção:** Implemente HTTPS, rate limiting, e use banco de dados real

---

## 📈 Próximos Passos (Produção)

### Essenciais:
1. ⚡ Substituir arrays por **banco de dados** (MongoDB/PostgreSQL)
2. 🔐 Configurar **HTTPS**
3. 🛡️ Implementar **rate limiting**
4. 📝 Adicionar **logs de auditoria**
5. 💾 Implementar **backup automático**

### Melhorias Opcionais:
- 📊 Gráficos interativos (Chart.js)
- ⏱️ Timer configurável por curso
- 🎯 Modo de treino (feedback imediato)
- 🏅 Sistema de badges/conquistas
- 🌙 Modo escuro
- 📱 Progressive Web App (PWA)
- 📧 Notificações por email
- 🔍 Busca avançada de questões
- 📑 Paginação em tabelas
- 💬 Sistema de comentários

---

## 🐛 Resolução de Problemas

### "Cannot find module"
```powershell
cd backend
npm install
```

### "JWT_SECRET is not defined"
Crie o arquivo `.env` na pasta backend com os secrets

### "Port 3000 already in use"
```powershell
# Encontrar processo
netstat -ano | findstr :3000

# Matar processo
taskkill /PID [PID] /F
```

### Erro ao importar questões
- Verifique se o JSON é válido
- Cada questão deve ter exatamente UMA resposta correta
- IDs de questões devem ser únicos

---

## 📝 Estrutura de Dados
  ]
}
```

**Importante:**
- Apenas UMA opção deve ter `"correct": true`
- Opções incorretas devem ter o campo `"justification"`
- A opção correta NÃO precisa de justification (mas pode ter)
- O sistema embaralha automaticamente as questões e opções

## 🔧 API Endpoints

### Autenticação
- `POST /api/auth/register` - Cadastrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/verify` - Verificar token

### Pontuações
- `POST /api/scores` - Salvar pontuação (requer autenticação)
- `GET /api/scores/user` - Histórico do usuário (requer autenticação)
- `GET /api/ranking?period=all` - Ranking global
- `GET /api/stats` - Estatísticas gerais

### Teste
- `GET /api/health` - Verificar status do servidor

## 🎨 Personalização

### Cores e Temas
Edite as variáveis CSS em `frontend/styles.css`:

```css
:root {
    --cor-primaria: #3b82f6;
    --cor-sucesso: #10b981;
    --cor-errada: #ef4444;
    /* ... outras cores ... */
}
```

### Título e Informações
Edite `frontend/index.html` para alterar títulos, descrições e textos.

## 🌐 Deploy para Produção

### Backend (Opções)

1. **Heroku**
   - Crie um app no Heroku
   - Configure as variáveis de ambiente
   - Faça deploy do código

2. **Railway.app**
   - Conecte seu repositório GitHub
   - Configure variáveis de ambiente
   - Deploy automático

3. **VPS (DigitalOcean, AWS, etc.)**
   - Instale Node.js no servidor
   - Use PM2 para gerenciar o processo
   - Configure nginx como proxy reverso

### Frontend (Opções)

1. **GitHub Pages**
   - Faça upload dos arquivos da pasta `frontend`
   - Configure no repositório

2. **Netlify / Vercel**
   - Conecte seu repositório
   - Configure a pasta de build como `frontend`

3. **Mesmo servidor do backend**
   - Sirva arquivos estáticos com Express

**Importante:** Atualize a URL da API em `frontend/app.js`:
```javascript
const API_URL = 'https://seu-backend.herokuapp.com/api';
```

## 💾 Persistência de Dados

⚠️ **Atenção:** O backend atual usa armazenamento **em memória** (arrays). Todos os dados são perdidos quando o servidor reinicia.

### Para Produção - Integrar Banco de Dados:

**MongoDB (Recomendado)**
```javascript
// Instalar: npm install mongoose
const mongoose = require('mongoose');

// Criar schemas para User e Score
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  createdAt: Date
});
```

**PostgreSQL**
```javascript
// Instalar: npm install pg
// Use um ORM como Sequelize ou Prisma
```

**SQLite (Desenvolvimento)**
```javascript
// Instalar: npm install better-sqlite3
// Ideal para testes e desenvolvimento local
```

## 🔒 Segurança

### Recomendações:

1. ✅ Sempre use HTTPS em produção
2. ✅ Mude o `JWT_SECRET` para um valor forte e único
3. ✅ Configure CORS adequadamente para sua URL de produção
4. ✅ Implemente rate limiting para evitar spam
5. ✅ Adicione validação adicional de dados no backend
6. ✅ Use banco de dados real em produção
7. ✅ Implemente recuperação de senha por email

## 📚 Tecnologias Utilizadas

### Frontend
- HTML5
- CSS3 (Design responsivo)
- JavaScript (ES6+)
- Fetch API

### Backend
- Node.js
- Express.js
- bcryptjs (criptografia de senhas)
- jsonwebtoken (autenticação JWT)
- cors (Cross-Origin Resource Sharing)

## 🐛 Resolução de Problemas

### Erro: "Erro ao conectar com o servidor"
- Verifique se o backend está rodando (`http://localhost:3000/api/health`)
- Confirme que a porta 3000 não está sendo usada por outro processo
- Verifique o console do navegador para erros de CORS

### Erro: "Erro ao carregar questões"
- Verifique se o arquivo `shared/questions.json` existe
- Confirme que o JSON está formatado corretamente
- Verifique o caminho relativo no `app.js`

### Servidor não inicia
- Execute `npm install` novamente
- Verifique se todas as dependências foram instaladas
- Confirme que o arquivo `.env` existe

## 📝 Licença

MIT License - Sinta-se livre para usar e modificar este projeto.

## 👨‍💻 Contribuindo

Sugestões e melhorias são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 🎯 Próximas Melhorias Sugeridas

- [ ] Implementar banco de dados real (MongoDB/PostgreSQL)
- [ ] Sistema de recuperação de senha
- [ ] Modo offline com Service Workers
- [ ] Exportar resultados em PDF
- [ ] Dashboard administrativo
- [ ] Sistema de conquistas/badges
- [ ] Modo competitivo em tempo real
- [ ] Suporte a múltiplos idiomas
- [ ] Análise de questões mais difíceis
- [ ] Modo de estudo com explicações expandidas

---

**Desenvolvido para o SAEP - Sistema de Avaliação da Educação Profissional** 🎮📚
