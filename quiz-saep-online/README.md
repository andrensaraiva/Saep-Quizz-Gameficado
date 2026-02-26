# 🎮 Quiz SAEP Online — Plataforma Gamificada de Avaliação

<div align="center">

[![Status](https://img.shields.io/badge/status-em%20produção-brightgreen)]()
[![Node](https://img.shields.io/badge/Node.js-18+-green)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-orange)]()
[![Roles](https://img.shields.io/badge/roles-admin%20│%20professor%20│%20aluno-purple)]()

**Plataforma completa de quiz educacional gamificado com IA, geração de simulados em lote, turmas, painel de professor e admin, ranking competitivo e deploy Render.**

[Demo](https://saep-quizz-gameficado.onrender.com) · [Instalação](#-instalação) · [API](#-api-endpoints) · [Deploy](#-deploy)

</div>

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

Plataforma web gamificada para avaliações no padrão **SAEP** (Sistema de Avaliação da Educação Profissional), com **três papéis de usuário** (admin, professor, aluno), sistema de XP, conquistas, ranking competitivo por turma, geração de **simulados com IA** em lote, e painel de professor com gráficos.

### Papéis do Sistema

| Papel | Acesso | Principais Ações |
|-------|--------|-------------------|
| **Admin** | `admin.html` | CRUD total, gerenciar usuários/roles, turmas, simulados IA, relatórios, exportação |
| **Professor** | `professor.html` | Criar quizzes/questões, gerenciar turmas, gerar simulados IA, dashboard com gráficos |
| **Aluno** | `index.html` | Responder quizzes, perfil com avatar e turma, ranking, revisão com IA |

### Fluxo do Aluno

```
1. Cadastro/Login → Perfil com avatar, turma e gamificação
2. Seleção de Curso → Filtro por tema
3. Escolha do Quiz → Card com detalhes
4. Respondendo → Barra de progresso + combo
5. Resultado → Nota + XP + conquistas + confetti
6. Revisão → Questões erradas com justificativas
7. IA Auxiliar → Gerar questão similar para praticar
8. Ranking → Competir com colegas da turma
```

### Fluxo do Professor

```
1. Login (role: professor) → Dashboard com gráficos Chart.js
2. Ranking da Turma → Top 3 com 🥇🥈🥉
3. Gerenciar Turmas → Criar e excluir turmas
4. Criar Quizzes → Montar a partir de questões do curso
5. Adicionar Questões → CRUD + importação JSON
6. Gerar Simulado IA → Wizard 3 etapas (configurar → gerar → revisar/editar)
```

### Fluxo do Admin

```
1. Login (role: admin) → Dashboard com 8 cards + gráfico Chart.js
2. Gerenciar Tudo → Cursos, quizzes, questões, turmas, usuários
3. Atribuir Roles → Promover aluno ↔ professor ↔ admin
4. Gerar Simulado IA → Wizard 3 etapas com revisão completa
5. Relatórios → Taxa de acerto por questão
6. Exportar → CSV de usuários, pontuações, turmas, questões
7. Feedbacks → Visualizar e responder
```

---

## 🏗 Arquitetura

```
┌──────────────────────────────────────────────────┐
│                FRONTEND (SPA)                    │
│  HTML + CSS + JS Vanilla + Chart.js 4.4          │
│  index.html │ admin.html │ professor.html        │
├──────────────────────────────────────────────────┤
│            REST API (Express.js)                 │
│  Auth │ Courses │ Quizzes │ Scores │ Turmas │ AI │
├──────────────────────────────────────────────────┤
│                DATABASE                          │
│  Firebase Realtime DB │ In-Memory fallback       │
├──────────────────────────────────────────────────┤
│              AI PROVIDERS                        │
│  Google Gemini │ OpenAI │ Pollinations           │
└──────────────────────────────────────────────────┘
```

**Comunicação:** Frontend ↔ Backend via `fetch()` com JWT Bearer token (7 dias). Firebase admin SDK no backend.

### Estrutura de Pastas

```
quiz-saep-online/
├── backend/
│   ├── server.js          # Servidor Express (~3.700 linhas)
│   ├── db.js              # Abstração de banco (Firebase/memória)
│   ├── package.json       # Dependências Node.js
│   └── .env               # Variáveis de ambiente (criar manualmente)
│
├── frontend/
│   ├── index.html         # Página do aluno (quiz + perfil + gamificação)
│   ├── admin.html         # Painel administrativo completo
│   ├── professor.html     # Painel do professor (dashboard + CRUD + simulado)
│   ├── app.js             # JavaScript do quiz do aluno
│   ├── admin.js           # JavaScript do admin (~3.100 linhas)
│   ├── professor.js       # JavaScript do professor (~700 linhas)
│   ├── styles.css         # Estilos do quiz
│   ├── admin-styles.css   # Estilos do admin e professor
│   ├── gamification.css   # Estilos de gamificação
│   └── gamification.js    # Lógica de gamificação
│
├── shared/
│   └── questions.json     # Backup de questões
│
├── render.yaml            # Config de deploy Render
├── init-first-course.js   # Script de seed inicial
├── editor-questoes.html   # Editor visual de questões
└── README.md              # Este arquivo
```

---

## ✨ Funcionalidades

### 👥 Sistema de Papéis (Roles)

| Recurso | Descrição |
|---------|-----------|
| **3 papéis** | `admin`, `professor`, `user` (aluno) |
| **Atribuição de role** | Admin pode alterar o papel de qualquer usuário |
| **Middleware de acesso** | Rotas protegidas por `requireAdmin`, `requireProfessorOrAdmin`, `requireAuth` |
| **Seed automático** | Sistema cria automaticamente admin, professor e aluno de exemplo |
| **Detecção de painel** | Alunos veem botão para painel do professor (se role adequado) |

### 🏫 Sistema de Turmas

| Recurso | Descrição |
|---------|-----------|
| **CRUD de turmas** | Criar, listar, editar, excluir turmas |
| **Alunos por turma** | Cada aluno pode ser associado a uma turma no perfil |
| **Turmas do professor** | Professores veem apenas suas turmas |
| **Gestão admin** | Admin gerencia todas as turmas do sistema |
| **Ranking por turma** | Classificação competitiva dentro de cada turma |
| **Exportação** | Exportar turmas em CSV |

### 🎮 Gamificação Completa

| Recurso | Descrição |
|---------|-----------|
| **Sistema de XP** | Ganhe XP ao completar quizzes (base + combo + velocidade) |
| **Níveis 1-50** | Progressão com XP crescente (100 × nível × 1.5) |
| **Combo System** | Multiplicador por respostas consecutivas corretas (max 5x) |
| **Conquistas** | 10+ conquistas desbloqueáveis (Primeira Vitória, Combo Master, etc) |
| **Confetti** | Animação especial ao subir de nível |
| **XP Summary** | Card detalhado com breakdown do XP ganho |
| **Bônus Perfeição** | XP extra por 100% de acertos |
| **Bônus Velocidade** | XP extra por completar rápido |

### 📝 Sistema de Quiz

| Recurso | Descrição |
|---------|-----------|
| **Múltiplos cursos** | Organização por curso/disciplina |
| **Embaralhamento** | Questões e alternativas randomizadas (Fisher-Yates) |
| **Cronômetro** | Tempo de conclusão registrado |
| **Barra de progresso** | Visual de questões respondidas |
| **Confirmação** | Modal antes de finalizar (avisa não respondidas) |
| **Revisão detalhada** | Mostra erros com justificativas por alternativa |
| **Imagens** | Suporte a imagens no contexto e alternativas |
| **Tags** | Categorização por capacidade e competência |

### 👤 Autenticação e Perfil

| Recurso | Descrição |
|---------|-----------|
| **Registro/Login** | Sistema completo com validações |
| **JWT** | Token de 7 dias com verificação automática |
| **Perfil** | Avatar URL, turma, histórico de tentativas, XP, nível |
| **Seletor de turma** | Aluno escolhe sua turma no perfil |
| **Papéis (roles)** | `admin`, `professor`, `user` com permissões distintas |
| **Acesso condicional** | Botão para painel do professor visível apenas para roles adequados |

### 🏆 Ranking Avançado

| Recurso | Descrição |
|---------|-----------|
| **Ranking geral** | Filtro por curso e período |
| **Ranking por turma** | Competição entre alunos da mesma turma |
| **Top 3** | Medalhas 🥇🥈🥉 para os primeiros |
| **Leaderboard XP** | Ranking separado por experiência |
| **Múltiplos filtros** | Geral, semanal, mensal |

### 🛡️ Painel Administrativo (`admin.html`)

| Recurso | Descrição |
|---------|-----------|
| **Dashboard** | 8 cards estatísticos + gráfico Chart.js com visão geral |
| **CRUD Cursos** | Criar, editar, excluir cursos |
| **CRUD Questões** | Criar, editar, excluir + importação JSON em lote |
| **CRUD Quizzes** | Criar, editar, excluir + busca de questões |
| **Gerenciar Turmas** | CRUD completo de turmas |
| **Gerenciar Usuários** | Listar, alterar role (dropdown admin/professor/user), excluir |
| **Gerar Simulado IA** | Wizard 3 etapas com revisão e edição por questão |
| **Relatórios** | Taxa de acerto por questão em cada curso |
| **Feedbacks** | Visualizar, responder, excluir feedbacks |
| **Exportação** | CSV de usuários, pontuações, turmas e questões |

### 👨‍🏫 Painel do Professor (`professor.html`)

| Recurso | Descrição |
|---------|-----------|
| **Dashboard** | Gráfico Chart.js com desempenho dos alunos |
| **Ranking da Turma** | Top 3 com medalhas 🥇🥈🥉, tabela completa |
| **Criar Quizzes** | Montar quizzes selecionando questões do curso |
| **Adicionar Questões** | CRUD de questões nos cursos do professor |
| **Gerenciar Turmas** | Criar e excluir turmas associadas ao professor |
| **Gerar Simulado IA** | Mesmo wizard 3 etapas com vínculo à turma |

### 🤖 Inteligência Artificial

| Recurso | Descrição |
|---------|-----------|
| **Gerar questão similar** | Aluno gera questão parecida com a que errou |
| **Gerar questão (admin/professor)** | Gerar questão individual com IA + imagens |
| **🆕 Gerar Simulado completo** | Gerar de 1 a 20 questões em lote com IA |
| **Wizard 3 etapas** | 1) Configurar (curso, provider, qtd) → 2) Gerar (barra de progresso) → 3) Revisar |
| **Tema por questão** | Escolher capacidade, competência, dificuldade e conteúdo para cada questão |
| **Aplicar tema padrão** | Definir tema e aplicar para todas as questões de uma vez |
| **Editar questão gerada** | Editar enunciado, alternativas, justificativas e imagens |
| **Regenerar individual** | Regenerar uma questão específica mantendo as outras |
| **Excluir individual** | Remover questão do simulado antes de salvar |
| **Salvar simulado** | Salva todas as questões no curso + cria quiz automaticamente |
| **Múltiplos providers** | Google Gemini (gratuito), OpenAI |
| **Imagens IA** | Pollinations.ai para imagens de contexto e alternativas |

### 🔔 Sistema de Notificações (Toast)

| Recurso | Descrição |
|---------|-----------|
| **4 tipos** | Sucesso, erro, aviso, info |
| **Auto-dismiss** | Desaparecem após 5 segundos |
| **Stack** | Múltiplas notificações empilhadas |
| **Animações** | Slide-in e fade-out |

### ♿ Acessibilidade

| Recurso | Descrição |
|---------|-----------|
| **ARIA Labels** | Em todos os elementos interativos |
| **Teclado** | Navegação por Tab + Enter/Space |
| **Contraste** | Cores acessíveis (WCAG AA) |
| **Focus visible** | Indicadores de foco visíveis |
| **Screen readers** | Textos alternativos em imagens |
| **Semântico** | Tags HTML5 semânticas |
| **Responsivo** | Mobile-first com media queries |

### 📊 Feedback e Analytics

| Recurso | Descrição |
|---------|-----------|
| **Enviar feedback** | Formulário com tipo e mensagem |
| **Taxa de acerto** | Por questão, curso e período |
| **Analytics** | Desempenho por capacidade e competência |

---

## 🛠 Tecnologias

### Backend

| Tecnologia | Uso |
|-----------|-----|
| **Node.js 18+** | Runtime JavaScript |
| **Express.js 4** | Framework HTTP/REST |
| **Firebase Admin SDK** | Banco de dados Realtime Database |
| **jsonwebtoken** | Autenticação JWT (tokens de 7 dias) |
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
| **Chart.js 4.4** | Gráficos no dashboard do admin e professor |
| **Vanilla (sem frameworks)** | Zero dependências pesadas no navegador |

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
🌱 Seed: Admin criado — admin@quiz.com / admin123
🌱 Seed: Professor criado — professor@quiz.com / prof123
🌱 Seed: Aluno criado — aluno@quiz.com / aluno123
🌱 Seed: Turma "Turma A - Jogos Digitais" criada
🌱 Seed: Curso e questões inicializados
```

### Passo 4 — Acessar

| URL | Descrição |
|-----|-----------|
| `http://localhost:3000` | Interface do quiz (alunos) |
| `http://localhost:3000/admin.html` | Painel administrativo |
| `http://localhost:3000/professor.html` | Painel do professor |

### Credenciais de Seed

| Papel | Email | Senha |
|-------|-------|-------|
| **Admin** | `admin@quiz.com` | `admin123` |
| **Professor** | `professor@quiz.com` | `prof123` |
| **Aluno** | `aluno@quiz.com` | `aluno123` |

> O seed é executado automaticamente ao iniciar o servidor. Se os usuários já existem, não duplica.

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

Ambas expõem a mesma API: `getUsers()`, `createUser()`, `getCourses()`, `getQuestions()`, `getTurmas()`, `createTurma()`, etc.

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
7. Exibe botão de painel do professor (se role professor/admin)

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

- **Ranking geral**: filtrável por curso e período. Top 3 com medalhas.
- **Ranking por turma**: competição entre alunos da mesma turma.
- **Perfil**: avatar, turma, histórico de todas as tentativas com nota, tempo e curso.
- **Leaderboard XP**: ranking separado ordenado por XP e nível.

### 7. Geração de Simulado (IA)

O wizard de simulado está disponível para **admin** e **professor**:

1. **Etapa 1 — Configuração:**
   - Selecionar curso e provider de IA (Gemini/OpenAI)
   - Escolher quantidade de questões (1-20)
   - Configurar tema padrão (capacidade, competência, dificuldade, conteúdo)
   - Aplicar tema padrão ou personalizar cada questão individualmente
   - Opcionalmente incluir imagens de contexto e alternativas

2. **Etapa 2 — Geração:**
   - Barra de progresso mostra geração em tempo real
   - Cada questão é gerada sequencialmente com 1s de intervalo
   - Erros são contabilizados sem interromper o processo

3. **Etapa 3 — Revisão:**
   - Listar todas as questões geradas com enunciado e alternativas
   - **Editar** qualquer questão (enunciado, alternativas, justificativas, imagens)
   - **Regenerar** uma questão específica com as mesmas especificações
   - **Excluir** questões indesejadas
   - Definir nome e descrição do simulado
   - **Salvar** — adiciona questões ao curso e cria quiz automaticamente

### 8. Painel do Professor

Acessível em `/professor.html` (requer role `professor` ou `admin`):
- **Dashboard** com gráfico Chart.js
- **Ranking da turma** com medalhas 🥇🥈🥉
- **CRUD de cursos/quizzes/questões** com escopo do professor
- **Gerenciamento de turmas** — criar e excluir
- **Gerar simulado IA** com mesmo wizard do admin + vínculo à turma

### 9. Painel Admin

Acessível em `/admin.html` (requer role `admin`):
- **Dashboard** com 8 cards estatísticos + gráfico Chart.js visão geral
- **CRUD completo** de cursos, quizzes, questões e turmas
- **Gerenciar usuários** — listar, alterar role (dropdown), excluir
- **Gerar simulado IA** — wizard 3 etapas
- **Importação em lote** de questões via JSON
- **Relatórios** — taxa de acerto por questão em cada curso
- **Feedbacks** — visualizar, responder e excluir
- **Exportação CSV** — usuários, pontuações, turmas e questões

---

## 📡 API Endpoints

### Autenticação

| Método | Rota | Auth | Rate Limit | Descrição |
|--------|------|:----:|:----------:|-----------|
| POST | `/api/auth/register` | — | 20/15min | Cadastrar usuário |
| POST | `/api/auth/login` | — | 20/15min | Login (retorna JWT 7 dias) |
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

### Turmas

| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/turmas` | JWT | Listar turmas |
| POST | `/api/turmas` | Prof/Admin | Criar turma |
| PUT | `/api/turmas/:id` | Prof/Admin | Editar turma |
| DELETE | `/api/turmas/:id` | Prof/Admin | Excluir turma |

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

### Perfil

| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/profile` | JWT | Obter perfil completo |
| PUT | `/api/profile` | JWT | Atualizar perfil (avatar, turma) |

### IA

| Método | Rota | Auth | Rate Limit | Descrição |
|--------|------|:----:|:----------:|-----------|
| POST | `/api/ai/generate-similar-question` | — | 10/min | Gerar questão similar (aluno) |
| POST | `/api/ai/generate-question` | Prof/Admin | — | Gerar questão individual |
| POST | `/api/ai/generate-simulado` | Prof/Admin | — | **Gerar simulado em lote (1-20 questões)** |
| GET | `/api/ai/status` | Prof/Admin | — | Status das APIs de IA |

### Professor

| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/professor/dashboard` | Prof/Admin | Dashboard com estatísticas |
| GET | `/api/professor/turmas` | Prof/Admin | Turmas do professor |
| POST | `/api/professor/turmas` | Prof/Admin | Criar turma |
| DELETE | `/api/professor/turmas/:id` | Prof/Admin | Excluir turma |
| GET | `/api/professor/courses/:id/questions` | Prof/Admin | Questões do curso |
| POST | `/api/professor/courses/:id/questions` | Prof/Admin | Adicionar questão |
| PUT | `/api/professor/courses/:cid/questions/:qid` | Prof/Admin | Editar questão |
| DELETE | `/api/professor/courses/:cid/questions/:qid` | Prof/Admin | Excluir questão |
| POST | `/api/professor/quizzes` | Prof/Admin | Criar quiz |

### Administração

| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| GET | `/api/admin/dashboard` | Admin | Estatísticas gerais |
| GET | `/api/admin/users` | Admin | Listar usuários |
| PUT | `/api/admin/users/:id/role` | Admin | Alterar role (admin/professor/user) |
| DELETE | `/api/admin/users/:id` | Admin | Excluir usuário |
| GET | `/api/admin/reports/course/:id` | Admin | Relatório do curso |
| GET | `/api/admin/export/:type` | Admin | Exportar CSV (users/scores/turmas/questions) |
| GET | `/api/admin/anonymous-results` | Admin | Resultados anônimos |
| GET | `/api/admin/turmas` | Admin | Listar todas as turmas |
| DELETE | `/api/admin/turmas/:id` | Admin | Excluir turma |
| POST | `/api/admin/reset-all` | Admin | Resetar todos os dados |

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
| POST | `/api/seed` | Executar seed manual |

---

## 📦 Estrutura de Dados

### Questão (JSON)

```json
{
  "id": "Q25",
  "capacidade": "C3 - Aplicação",
  "habilidade": "Implementar lógica de programação",
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
- `capacidade`, `habilidade`, `context`, `contextImage`, `image`, `justification`, `explanation`, `tags` são opcionais
- O sistema embaralha automaticamente as alternativas

### Importação em Lote

Envie um array JSON para `POST /api/courses/:id/questions/import`:

```json
[
  { "id": "Q01", "command": "...", "options": [...] },
  { "id": "Q02", "command": "...", "options": [...] }
]
```

### Simulado (Especificação de Geração)

Envie para `POST /api/ai/generate-simulado`:

```json
{
  "courseId": "curso-1",
  "provider": "gemini",
  "includeContextImages": true,
  "includeOptionImages": false,
  "questions": [
    {
      "capacity": "C3 - Aplicação",
      "skill": "Implementar lógica de programação",
      "difficulty": "média",
      "content": "Variáveis e tipos de dados"
    },
    {
      "capacity": "C2 - Compreensão",
      "skill": "Entender conceitos de POO",
      "difficulty": "fácil",
      "content": "Classes e objetos"
    }
  ]
}
```

Retorna array de questões geradas no formato padrão, prontas para revisão e salvamento.

---

## 🔒 Segurança

### Implementado

| Medida | Detalhes |
|--------|---------|
| **JWT Authentication** | Tokens de 7 dias, verificação em todas as rotas protegidas |
| **Bcrypt** | Hash de senhas com 10 salt rounds |
| **Rate Limiting** | Auth: 20 req/15min · IA: 10 req/min · Geral: 100 req/min |
| **CORS** | Whitelist de origens (Render, localhost). Origens não autorizadas são bloqueadas |
| **Role-based Access** | Middleware `requireAdmin`, `requireProfessorOrAdmin`, `requireAuth` |
| **Request Body Limit** | Máximo 1MB por requisição JSON |
| **JWT Secret Warning** | Log de erro se secret padrão usado em produção |
| **XSS Sanitization** | Função `sanitizeHtml()` para limpar inputs no frontend |
| **Firebase Transactions** | `getNextId()` usa transactions para evitar IDs duplicados |
| **Debug Route Protection** | `/api/debug/courses` requer autenticação de admin |
| **Simulado Limit** | Máximo 20 questões por geração de simulado |

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

Verifique `GEMINI_API_KEY` no `.env`. Teste com `GET /api/ai/status` (requer role professor ou admin).

### Erro ao importar questões

- JSON deve ser um **array** válido
- Cada questão precisa de `id`, `command`, `options`
- Exatamente **UMA** opção com `"correct": true`

### Simulado não gera

- Verifique se a API de IA (Gemini/OpenAI) está configurada
- Máximo 20 questões por simulado
- Cada questão é gerada sequencialmente com 1s de intervalo
- Erros individuais são reportados sem parar o processo

---

## 📝 Licença

MIT License — use, modifique e distribua livremente.

---

**Desenvolvido para o SAEP — Sistema de Avaliação da Educação Profissional** 🎮📚
