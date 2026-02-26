# 🎮 Quiz SAEP Online — Plataforma Gamificada de Avaliação

Sistema completo de quiz online gamificado com **XP, níveis, conquistas**, múltiplos cursos, ranking, IA generativa, painel administrativo e correção automática.

**🌐 Produção:** [saep-quizz-gameficado.onrender.com](https://saep-quizz-gameficado.onrender.com)

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Funciona](#-como-funciona)
- [API Endpoints](#-api-endpoints)
- [Estrutura de Dados](#-estrutura-de-dados)
- [Segurança](#-segurança)
- [Deploy](#-deploy)
- [Resolução de Problemas](#-resolução-de-problemas)

---

## 🔭 Visão Geral

O **Quiz SAEP Online** é uma plataforma educacional gamificada desenvolvida para o **SAEP (Sistema de Avaliação da Educação Profissional)**. Os alunos respondem quizzes, ganham XP, sobem de nível, desbloqueiam conquistas e competem no ranking — tudo com feedback detalhado e questões geradas por IA.

### Fluxo do Usuário

```
Aluno acessa → Escolhe curso/quiz → Responde questões → Recebe nota + XP + conquistas
                                                         ↓
                                              Revisão detalhada das erradas
                                                         ↓
                                              IA gera questões similares para treino
```

### Fluxo do Admin

```
Admin acessa painel → Gerencia cursos/quizzes/questões → Gera questões com IA
                    → Visualiza relatórios e rankings  → Exporta dados CSV
                    → Gerencia usuários e feedbacks    → Responde feedbacks
```

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  index.html + styles.css + app.js + gamification.*   │
│  admin.html + admin-styles.css + admin.js            │
│  (Vanilla HTML/CSS/JS — sem frameworks)              │
└──────────────────────┬──────────────────────────────┘
                       │ Fetch API (REST JSON)
                       ▼
┌─────────────────────────────────────────────────────┐
│                  BACKEND (Express.js)                 │
│  server.js (~2980 linhas) + db.js (abstração DB)     │
│                                                       │
│  Middlewares: CORS, JWT Auth, Rate Limiting, Admin    │
│  Integração: Google Gemini + OpenAI + Pollinations   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              BANCO DE DADOS                           │
│  Firebase Realtime Database (produção)                │
│  ou In-Memory Arrays (desenvolvimento/fallback)       │
└─────────────────────────────────────────────────────┘
```

### Estrutura de Pastas

```
quiz-saep-online/
├── frontend/
│   ├── index.html            # SPA principal do quiz
│   ├── styles.css            # Estilos gerais (~1700 linhas)
│   ├── app.js                # Lógica do quiz (~1711 linhas)
│   ├── gamification.js       # Módulo de gamificação (~508 linhas)
│   ├── gamification.css      # Estilos de gamificação
│   ├── admin.html            # Painel administrativo
│   ├── admin-styles.css      # Estilos do admin
│   └── admin.js              # Lógica administrativa
│
├── backend/
│   ├── server.js             # API Express completa (~2980 linhas)
│   ├── db.js                 # Abstração Firebase/Memória (~535 linhas)
│   ├── package.json          # Dependências Node.js
│   └── .env                  # Variáveis de ambiente (não versionado)
│
├── shared/
│   └── questions.json        # Questões originais (22 questões)
│
├── init-first-course.js      # Script de inicialização
├── render.yaml               # Configuração de deploy no Render
├── editor-questoes.html      # Editor visual de questões
└── README.md                 # Este arquivo
```

---

## ✨ Funcionalidades

### 🎮 Gamificação Completa

| Recurso | Descrição |
|---------|-----------|
| **XP (Experiência)** | Ganha XP por resposta correta. Bônus por combo, velocidade e nota alta |
| **Níveis** | Sistema de 50 níveis com progressão exponencial (Calouro → Lendário) |
| **Conquistas** | 15+ conquistas desbloqueáveis (Primeiro Quiz, Combo x5, Perfeição, etc.) |
| **Combos** | Respostas consecutivas corretas multiplicam XP (2x, 3x, 4x, 5x) |
| **Leaderboard XP** | Ranking separado por XP total e nível |
| **Animações** | Confetti ao subir de nível, toasts animados para conquistas |
| **Painel de XP** | Barra de progresso ao vivo durante e após o quiz |

### 📝 Sistema de Quiz

- **Múltiplos cursos** independentes com rankings separados
- **Quizzes configuráveis** com seleção de questões por quiz
- **Embaralhamento** automático de questões e alternativas
- **Timer/cronômetro** durante a prova
- **Correção automática** com feedback detalhado por questão
- **Revisão de erradas** com explicações e justificativas
- **IA gera questões similares** para praticar erros (Google Gemini)
- **Imagens** opcionais no contexto e nas alternativas (Pollinations)
- **Aviso de questões não respondidas** antes de finalizar
- **Modal de confirmação** customizado (não usa `confirm()` nativo)

### 👤 Autenticação e Perfil

- Cadastro e login com **JWT** (tokens de 24h)
- Senhas criptografadas com **bcrypt** (10 rounds)
- Sistema de **roles**: `user` e `admin`
- Perfil com **histórico completo** de tentativas
- Verificação automática de token ao carregar a página

### 🏆 Ranking Avançado

- Ranking **por curso** (filtro por dropdown)
- Filtros por **período**: hoje, semana, mês, todos
- Ordenado por **percentual** (empate: menor tempo vence)
- Medalhas visuais: 🥇 🥈 🥉 para top 3
- Leaderboard separado de **XP e nível** (gamificação)

### 🛡️ Painel Administrativo

- **Dashboard** com estatísticas gerais (cursos, questões, usuários, tentativas)
- **CRUD de cursos** (criar, editar, excluir)
- **CRUD de quizzes** (criar com seleção de questões, editar, excluir)
- **CRUD de questões** — individual ou **importação em lote via JSON**
- **Edição de questões** existentes (PUT endpoint)
- **Geração de questões com IA** (Gemini/OpenAI) com preview antes de salvar
- **Gerenciamento de usuários** (promover admin, excluir)
- **Relatórios por curso** (taxa de acerto por questão, top 10, análise)
- **Exportação CSV** (usuários, pontuações, cursos)
- **Sistema de feedback** — alunos enviam, admin visualiza e responde
- Resultados anônimos (alunos sem login)

### 🤖 Inteligência Artificial

- **Geração de questões** completas via Google Gemini ou OpenAI
- **Questões similares** para treino — aluno clica após errar e IA gera nova questão
- **Pollinations** integrado para gerar imagens automaticamente (sem API key)
- Configurável via variáveis de ambiente (`GEMINI_API_KEY`, `OPENAI_API_KEY`)
- Rate limiting específico para IA: 10 req/min

### 🔔 Sistema de Notificações (Toast)

- Substituiu todos os `alert()` nativos do navegador
- 4 tipos visuais: **success** (verde), **error** (vermelho), **warning** (amarelo), **info** (azul)
- Animações de entrada/saída com barra de progresso
- Auto-dismiss configurável (3-5 segundos)
- Posicionado no canto superior direito, responsivo

### ♿ Acessibilidade

- **Skip navigation** (link "Pular para conteúdo")
- **ARIA landmarks** em todas as seções (`role="banner"`, `role="main"`, etc.)
- Modais com `role="dialog"` e `aria-modal="true"`
- Todos os inputs de formulário com `<label>` associado
- `focus-visible` com outline personalizado para navegação por teclado
- `autocomplete` nos campos de login/cadastro
- Barra de progresso do quiz com `role="progressbar"` e `aria-valuenow`
- Fechamento de modais por **Escape** e **clique no backdrop**

### 📊 Feedback e Analytics

- Formulário de feedback (sugestão, bug, elogio, outro)
- Admin pode **responder** feedbacks (status atualizado automaticamente)
- Relatórios detalhados por curso com identificação de questões difíceis

---

## 🛠 Tecnologias

### Backend
| Tecnologia | Uso |
|-----------|-----|
| **Node.js 18+** | Runtime JavaScript |
| **Express.js 4** | Framework HTTP/REST |
| **Firebase Admin SDK** | Banco de dados Realtime Database |
| **jsonwebtoken** | Autenticação JWT |
| **bcryptjs** | Hash de senhas |
| **express-rate-limit** | Limitação de requisições |
| **cors** | Controle de origens permitidas |
| **@google/generative-ai** | API do Google Gemini |
| **openai** | API da OpenAI |
| **multer** | Upload de arquivos |
| **dotenv** | Variáveis de ambiente |

### Frontend
| Tecnologia | Uso |
|-----------|-----|
| **HTML5 Semântico** | Estrutura com ARIA labels |
| **CSS3** | Flexbox, Grid, variáveis custom, animações |
| **JavaScript ES6+** | Módulos, async/await, Fetch API |
| **Vanilla (sem frameworks)** | Zero dependências no navegador |

---

## 🚀 Instalação

### Pré-requisitos
- **Node.js** 18 ou superior
- **NPM** (incluso no Node.js)
- **Git** (para clonar)

### Passo 1 — Clonar e instalar

```powershell
git clone https://github.com/seu-usuario/quiz-saep-online.git
cd quiz-saep-online/backend
npm install
```

### Passo 2 — Configurar variáveis de ambiente

Crie `backend/.env`:

```env
PORT=3000
JWT_SECRET=mude_para_um_valor_longo_e_aleatorio
ADMIN_SECRET=segredo_para_criar_admin

# Firebase (opcional — sem isso, usa memória)
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com

# IA (opcional)
GEMINI_API_KEY=sua_chave_gemini
OPENAI_API_KEY=sua_chave_openai
GEMINI_MODEL=gemini-2.5-flash
```

### Passo 3 — Iniciar o servidor

```powershell
cd backend
node server.js
```

Saída esperada:
```
🚀 Servidor rodando na porta 3000
📁 Frontend servido de: .../frontend
🔥 Firebase conectado com sucesso!
```

### Passo 4 — Inicializar dados

Em outro terminal:

```powershell
node init-first-course.js
```

Isso cria:
- Usuário admin (`admin` / `admin123`)
- Curso "Programação de Jogos Digitais"
- 22 questões iniciais

### Passo 5 — Acessar

| URL | Descrição |
|-----|-----------|
| `http://localhost:3000` | Interface do quiz (alunos) |
| `http://localhost:3000/admin.html` | Painel administrativo |

**Login admin:** `admin` / `admin123`

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `PORT` | Não | Porta do servidor (padrão: 3000) |
| `JWT_SECRET` | **Sim** | Segredo para assinar tokens JWT |
| `ADMIN_SECRET` | **Sim** | Segredo para criar admins via API |
| `NODE_ENV` | Não | `production` ou `development` |
| `FIREBASE_PROJECT_ID` | Não* | ID do projeto Firebase |
| `FIREBASE_CLIENT_EMAIL` | Não* | Email da service account |
| `FIREBASE_PRIVATE_KEY` | Não* | Chave privada da service account |
| `FIREBASE_DATABASE_URL` | Não* | URL do Realtime Database |
| `GEMINI_API_KEY` | Não | Chave da API Google Gemini |
| `OPENAI_API_KEY` | Não | Chave da API OpenAI |
| `GEMINI_MODEL` | Não | Modelo Gemini (padrão: `gemini-2.5-flash`) |

> *Sem Firebase configurado, o sistema usa armazenamento **em memória** (dados perdidos ao reiniciar).

### Banco de Dados

O módulo `db.js` abstrai o banco de dados com duas implementações:

- **Firebase Realtime Database** — usado quando as variáveis `FIREBASE_*` estão configuradas. Dados persistentes. IDs gerados com Firebase transactions para evitar race conditions.
- **In-Memory** — fallback automático. Perfeito para desenvolvimento local. Dados vivem apenas na memória do processo.

Ambas expõem a mesma API: `getUsers()`, `createUser()`, `getCourses()`, `getQuestions()`, etc.

---

## 🔄 Como Funciona

### 1. Inicialização (DOMContentLoaded)

Quando a página carrega:
1. `Toast.init()` — inicializa sistema de notificações
2. `initBackToTop()` — configura botão voltar ao topo
3. `initModalCloseHandlers()` — Escape key + backdrop click para todos os modais
4. Verifica token JWT no `localStorage` → se válido, restaura sessão
5. Carrega cursos e quizzes via API
6. Carrega perfil de gamificação (se logado)

### 2. Seleção e Início do Quiz

1. Aluno filtra quizzes por curso/ordem
2. Clica em um quiz card → questões são carregadas da API
3. Questões e alternativas são **embaralhadas** (Fisher-Yates)
4. Timer inicia (cronômetro ascendente)
5. Barra de progresso do quiz é exibida

### 3. Respondendo Questões

1. Aluno seleciona alternativa em cada questão
2. Sistema de **combo** rastreia respostas consecutivas corretas
3. Ao clicar "Finalizar":
   - Modal de confirmação customizado aparece
   - Se há questões não respondidas, avisa a quantidade
   - Após confirmar, calcula nota

### 4. Resultado e Gamificação

1. **Nota** é calculada (acertos/total × 100%)
2. **Tempo** é registrado
3. Se logado, envia para `/api/gamification/submit-quiz`:
   - Servidor calcula **XP ganho** (base + combo + velocidade + bônus perfeição)
   - Verifica **level up** e novas **conquistas**
   - Retorna dados atualizados
4. Frontend exibe:
   - Nota, acertos, tempo
   - **XP Summary Card** (XP ganho, nível, barra de progresso)
   - **Conquistas** desbloqueadas com animação
   - **Confetti** se subiu de nível
   - Estatísticas por capacidade/competência

### 5. Revisão de Erradas

1. Lista clicável de questões erradas (scroll suave)
2. Para cada errada, mostra:
   - Enunciado e contexto
   - **Sua resposta** (marcada em vermelho) com justificativa do erro
   - **Resposta correta** (marcada em verde) com explicação
   - Capacidade/competência da questão
3. Botão **"Gerar Nova Questão"** → IA (Gemini) cria questão similar
4. Aluno responde a questão gerada e recebe feedback instantâneo

### 6. Ranking e Perfil

- **Ranking**: filtrável por curso e período. Top 3 com medalhas.
- **Perfil**: histórico de todas as tentativas com nota, tempo e curso.
- **Leaderboard XP**: ranking separado ordenado por XP e nível.

### 7. Painel Admin

Acessível em `/admin.html` (requer role `admin`):
- Dashboard com contadores e atividades recentes
- CRUD completo de cursos, quizzes e questões
- Importação em lote de questões via JSON
- Geração de questões com IA (Gemini/OpenAI)
- Gerenciamento de usuários (promover, excluir)
- Relatórios por curso com taxa de acerto por questão
- Visualização e resposta de feedbacks
- Exportação de dados em CSV

---

## 📡 API Endpoints

### Autenticação
| Método | Rota | Auth | Rate Limit | Descrição |
|--------|------|:----:|:----------:|-----------|
| POST | `/api/auth/register` | — | 20/15min | Cadastrar usuário |
| POST | `/api/auth/login` | — | 20/15min | Login (retorna JWT) |
| GET | `/api/auth/verify` | JWT | — | Verificar token |
| POST | `/api/auth/create-admin` | ADMIN_SECRET | — | Criar admin |

### Cursos
| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/courses` | — | Listar todos os cursos |
| POST | `/api/courses` | Admin | Criar curso |
| PUT | `/api/courses/:id` | Admin | Editar curso |
| DELETE | `/api/courses/:id` | Admin | Excluir curso + questões |

### Questões
| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/courses/:id/questions` | — | Listar questões do curso |
| POST | `/api/courses/:id/questions` | Admin | Adicionar questão |
| PUT | `/api/courses/:cid/questions/:qid` | Admin | Editar questão |
| DELETE | `/api/courses/:cid/questions/:qid` | Admin | Excluir questão |
| POST | `/api/courses/:id/questions/import` | Admin | Importar lote JSON |
| GET | `/api/courses/:id/next-question-id` | Admin | Próximo ID disponível |

### Quizzes
| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/quizzes` | — | Listar quizzes |
| GET | `/api/quizzes/:id` | — | Detalhes do quiz |
| POST | `/api/quizzes` | Admin | Criar quiz |
| PUT | `/api/quizzes/:id` | Admin | Editar quiz |
| DELETE | `/api/quizzes/:id` | Admin | Excluir quiz |
| GET | `/api/courses/:id/quizzes` | — | Quizzes de um curso |

### Pontuações e Ranking
| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| POST | `/api/scores` | JWT | Salvar pontuação |
| GET | `/api/scores/user` | JWT | Histórico do usuário |
| GET | `/api/ranking?courseId=X&period=Y` | — | Ranking filtrado |
| POST | `/api/results/anonymous` | — | Resultado sem login |
| GET | `/api/stats` | — | Estatísticas gerais |

### Gamificação
| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/gamification/profile` | JWT | Perfil XP/nível/conquistas |
| POST | `/api/gamification/submit-quiz` | JWT | Processar resultado + XP |
| GET | `/api/gamification/leaderboard` | — | Ranking XP |
| GET | `/api/gamification/achievements` | — | Lista de conquistas |

### IA
| Método | Rota | Auth | Rate Limit | Descrição |
|--------|------|:----:|:----------:|-----------|
| POST | `/api/ai/generate-similar-question` | — | 10/min | Gerar questão similar |
| POST | `/api/ai/generate-question` | Admin | — | Gerar questão (admin) |
| GET | `/api/ai/status` | Admin | — | Status das APIs de IA |

### Administração
| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/admin/dashboard` | Admin | Estatísticas gerais |
| GET | `/api/admin/users` | Admin | Listar usuários |
| PUT | `/api/admin/users/:id/role` | Admin | Alterar role |
| DELETE | `/api/admin/users/:id` | Admin | Excluir usuário |
| GET | `/api/admin/reports/course/:id` | Admin | Relatório do curso |
| GET | `/api/admin/export/:type` | Admin | Exportar CSV |
| GET | `/api/admin/anonymous-results` | Admin | Resultados anônimos |

### Feedback
| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| POST | `/api/feedback` | — | Enviar feedback |
| GET | `/api/admin/feedbacks` | Admin | Listar feedbacks |
| PUT | `/api/admin/feedbacks/:id` | Admin | Responder feedback |
| DELETE | `/api/admin/feedbacks/:id` | Admin | Excluir feedback |

### Utilitários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check (status do servidor e DB) |
| GET | `/api/debug/courses` | Debug de cursos (admin only) |

---

## 📦 Estrutura de Dados

### Questão (JSON)

```json
{
  "id": "Q25",
  "capacidade": "C3 - Aplicação",
  "context": "Contextualização antes da pergunta (opcional).",
  "contextImage": "https://image.pollinations.ai/prompt/contexto",
  "command": "Qual instrução JavaScript exibe uma mensagem no console?",
  "options": [
    {
      "text": "console.log('Olá mundo');",
      "correct": true,
      "image": "https://image.pollinations.ai/prompt/opcao",
      "justification": "Explicação de por que é correta ou incorreta."
    },
    {
      "text": "print('Olá mundo');",
      "justification": "`print` não existe no JavaScript do navegador."
    }
  ],
  "explanation": "Explicação geral da resposta correta.",
  "tags": ["javascript", "console"]
}
```

**Regras:**
- `id`, `command`, `options` são obrigatórios
- Exatamente **UMA** opção deve ter `"correct": true`
- `capacidade`, `context`, `contextImage`, `image`, `justification`, `explanation`, `tags` são opcionais
- O sistema embaralha automaticamente as alternativas

### Importação em Lote

Envie um array JSON para `POST /api/courses/:id/questions/import`:

```json
[
  { "id": "Q01", "command": "...", "options": [...] },
  { "id": "Q02", "command": "...", "options": [...] }
]
```

---

## 🔒 Segurança

### Implementado

| Medida | Detalhes |
|--------|---------|
| **JWT Authentication** | Tokens de 24h, verificação em todas as rotas protegidas |
| **Bcrypt** | Hash de senhas com 10 salt rounds |
| **Rate Limiting** | Auth: 20 req/15min · IA: 10 req/min · Geral: 100 req/min |
| **CORS** | Whitelist de origens (Render, localhost). Origens não autorizadas são bloqueadas |
| **Role-based Access** | Middleware `requireAdmin` para rotas administrativas |
| **Request Body Limit** | Máximo 1MB por requisição JSON |
| **JWT Secret Warning** | Log de erro se secret padrão usado em produção |
| **XSS Sanitization** | Função `sanitizeHtml()` para limpar inputs no frontend |
| **Firebase Transactions** | `getNextId()` usa transactions para evitar IDs duplicados |
| **Debug Route Protection** | `/api/debug/courses` requer autenticação de admin |

### Recomendações para Produção

- Use **HTTPS** (Render já fornece)
- Defina `JWT_SECRET` com valor longo e aleatório
- Ative `NODE_ENV=production`
- Configure backups do Firebase
- Monitore logs de CORS bloqueado

---

## 🚢 Deploy

### Render (Recomendado)

O projeto inclui `render.yaml` para deploy automático:

1. Conecte o repositório GitHub ao Render
2. O Render detecta `render.yaml` automaticamente
3. Configure as variáveis de ambiente no dashboard
4. Deploy automático a cada push

**URL de produção:** `https://saep-quizz-gameficado.onrender.com`

### Variáveis no Render

```
NODE_ENV=production
JWT_SECRET=<gerar automaticamente>
ADMIN_SECRET=<seu segredo>
PORT=3000
FIREBASE_PROJECT_ID=<seu projeto>
FIREBASE_CLIENT_EMAIL=<sua service account>
FIREBASE_PRIVATE_KEY=<sua chave>
FIREBASE_DATABASE_URL=<sua URL>
GEMINI_API_KEY=<opcional>
GEMINI_MODEL=gemini-2.5-flash
```

### Outras Opções

| Plataforma | Backend | Frontend |
|-----------|---------|----------|
| **Render** | Web service | Servido pelo Express |
| **Railway** | Deploy via GitHub | Servido pelo Express |
| **GitHub Pages** | ❌ | Apenas frontend (API_URL aponta para backend) |
| **VPS** | PM2 + Nginx | Nginx serve estáticos |

---

## 🐛 Resolução de Problemas

### "Cannot find module"
```powershell
cd backend
npm install
```

### "JWT_SECRET is not defined"
Crie `backend/.env` com `JWT_SECRET=seu_valor`

### "Port 3000 already in use"
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### "Origem não permitida pelo CORS"
Adicione seu domínio à lista `allowedOrigins` em `server.js`

### Dados perdidos ao reiniciar
Configure Firebase. Sem ele, o sistema usa memória (dados voláteis).

### IA não gera questões
Verifique `GEMINI_API_KEY` no `.env`. Teste com `GET /api/ai/status` (admin).

### Erro ao importar questões
- JSON deve ser um **array** válido
- Cada questão precisa de `id`, `command`, `options`
- Exatamente **UMA** opção com `"correct": true`

---

## 📝 Licença

MIT License — use, modifique e distribua livremente.

---

**Desenvolvido para o SAEP — Sistema de Avaliação da Educação Profissional** 🎮📚
