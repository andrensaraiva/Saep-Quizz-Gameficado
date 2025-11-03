const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar módulo de banco de dados (Firebase ou memória)
const db = require('./db');

// Importar APIs de IA
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_default_nao_usar_em_producao';

// Constantes de API Keys
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Configurar APIs de IA
let genAI = null;
let openai = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_MODEL_RAW = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
const GEMINI_MODEL = GEMINI_MODEL_RAW.replace(/^models\//i, '');

// Configuração CORS para permitir requisições do Render e outros domínios
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc) ou de qualquer origem em desenvolvimento
    const allowedOrigins = [
      'https://saep-quizz-gameficado.onrender.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todas as origens por enquanto
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Servir arquivos estáticos do frontend
const frontendPath = path.join(__dirname, '../frontend');
const sharedPath = path.join(__dirname, '../shared');
app.use(express.static(frontendPath));
app.use('/shared', express.static(sharedPath));

// Banco de dados gerenciado pelo módulo db.js (Firebase ou memória)
// As operações agora são assíncronas e chamam db.getUsers(), db.createUser(), etc.

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@quiz.com',
  password: 'admin123'
};

const DEFAULT_COURSE = {
  name: 'Programação de Jogos Digitais',
  abbreviation: 'JD', // Abreviação para geração de IDs
  description: 'Curso completo sobre desenvolvimento de jogos, cobrindo conceitos fundamentais de game design, programação e mecânicas de jogo.',
  category: 'Tecnologia',
  color: '#6366f1',
  capacities: [
    {
      id: 'C1',
      name: 'Lógica de Programação',
      skills: [
        'Estruturas condicionais',
        'Estruturas de repetição',
        'Funções e procedimentos',
        'Algoritmos básicos'
      ]
    },
    {
      id: 'C2',
      name: 'Programação Orientada a Objetos',
      skills: [
        'Classes e objetos',
        'Herança e polimorfismo',
        'Encapsulamento',
        'Interfaces e abstração'
      ]
    },
    {
      id: 'C3',
      name: 'Game Design',
      skills: [
        'Mecânicas de jogo',
        'Balanceamento',
        'Level design',
        'Experiência do jogador'
      ]
    }
  ]
};

// Mapeamento de abreviações de cursos para geração de IDs
const COURSE_ABBREVIATIONS = {
  'Programação de Jogos Digitais': 'JD',
  'Jogos Digitais': 'JD',
  'Desenvolvimento de Games': 'DG',
  'Tecnologia': 'TEC',
  'Programação': 'PROG'
};

// Função para obter abreviação do curso
function getCourseAbbreviation(course) {
  // Priorizar abreviação definida no próprio curso
  if (course.abbreviation) {
    return course.abbreviation;
  }
  
  // Buscar no mapeamento
  if (COURSE_ABBREVIATIONS[course.name]) {
    return COURSE_ABBREVIATIONS[course.name];
  }
  
  // Fallback: pegar iniciais das palavras
  return course.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
}

// Função para gerar próximo ID de questão para um curso
async function generateNextQuestionId(courseId) {
  const course = await db.getCourseById(courseId);
  if (!course) {
    throw new Error('Curso não encontrado');
  }
  
  const abbreviation = getCourseAbbreviation(course);
  const questions = await db.getQuestions();
  const courseQuestions = questions.filter(q => q.courseId === courseId);
  
  // Extrair números das questões existentes
  const existingNumbers = courseQuestions
    .map(q => {
      // Tentar extrair número do ID (ex: "q1-JD" -> 1, "q15-JD" -> 15)
      const match = q.id.match(/q(\d+)/i);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  
  // Próximo número é o maior + 1, ou 1 se não houver questões
  const nextNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;
  
  return `q${nextNumber}-${abbreviation}`;
}


const QUESTIONS_FILE_PATH = path.join(__dirname, '../shared/questions.json');

const POLLINATIONS_BASE_URL = 'https://image.pollinations.ai/prompt/';

function sanitizeImagePromptText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/["{}\[\]]/g, '')
    .trim();
}

function fallbackImagePrompt(text, type) {
  const base = sanitizeImagePromptText(text);
  if (!base) return '';
  return `${base}. Digital illustration, ${type}, no text overlay, educational style, high detail, 16:9 aspect ratio`;
}

function buildImageUrlFromPrompt(prompt, seed = null) {
  const sanitizedPrompt = sanitizeImagePromptText(prompt);
  if (!sanitizedPrompt) return null;

  const params = new URLSearchParams({
    width: '1024',
    height: '576',
    seed: seed ? String(seed) : String(Math.floor(Math.random() * 1_000_000))
  });

  return `${POLLINATIONS_BASE_URL}${encodeURIComponent(sanitizedPrompt)}?${params.toString()}`;
}

function attachGeneratedImagesToQuestion(
  question,
  { provider = 'pollinations', includeContext = true, includeOptions = true } = {}
) {
  if (!question) {
    return question;
  }

  if (provider !== 'pollinations') {
    throw new Error(`imageProvider "${provider}" ainda não é suportado`);
  }

  const imageMetadata = {
    provider,
    generatedAt: new Date().toISOString(),
    attribution: 'Images generated on-demand via Pollinations AI (https://image.pollinations.ai)'
  };

  let generatedSomething = false;

  if (includeContext && !question.contextImage) {
    const contextPrompt = sanitizeImagePromptText(question.contextImagePrompt) ||
      fallbackImagePrompt(question.context || question.command, 'quiz context scene');
    const contextUrl = buildImageUrlFromPrompt(contextPrompt, `${Date.now()}-context`);
    if (contextUrl) {
      question.contextImage = contextUrl;
      imageMetadata.contextPrompt = contextPrompt;
      generatedSomething = true;
    }
  }

  if (Array.isArray(question.options)) {
    const optionPrompts = {};

    question.options = question.options.map((option, index) => {
      const updatedOption = { ...option };
      const optionKey = option.letter || String.fromCharCode(65 + index);

      if (includeOptions && !updatedOption.image) {
        const optionPrompt = sanitizeImagePromptText(option.imagePrompt) ||
          fallbackImagePrompt(updatedOption.text, `multiple choice option ${optionKey}`);
        const optionUrl = buildImageUrlFromPrompt(optionPrompt, `${Date.now()}-${index}`);
        if (optionUrl) {
          updatedOption.image = optionUrl;
          optionPrompts[optionKey] = optionPrompt;
          generatedSomething = true;
        }
      }

      delete updatedOption.imagePrompt;
      return updatedOption;
    });

    if (Object.keys(optionPrompts).length > 0) {
      imageMetadata.optionPrompts = optionPrompts;
    }
  }

  delete question.contextImagePrompt;

  if (generatedSomething) {
    question.imageMetadata = imageMetadata;
  } else {
    delete question.imageMetadata;
  }

  return question;
}

function normalizeOptionsArray(options) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option, index) => {
    const normalized = { ...option };
    const defaultLetter = String.fromCharCode(65 + index);

    if (!normalized.letter && normalized.letter !== '') {
      normalized.letter = defaultLetter;
    }

    if (normalized.correct !== undefined) {
      normalized.correct = !!normalized.correct;
    }

    normalized.image = normalized.image || null;
    delete normalized.imagePrompt;

    return normalized;
  });
}

async function seedInitialData() {
  try {
    console.log('🚀 Verificando dados iniciais...');
    console.log(`💾 Modo de armazenamento: ${db.isFirebaseEnabled() ? 'Firebase Realtime Database' : 'Memória Local (temporário)'}`);
    
    // Inicializar array global para resultados anônimos
    if (!global.anonymousResults) {
      global.anonymousResults = [];
      console.log('📊 Inicializado array global de resultados anônimos');
    }
    
    // Buscar dados existentes
    const existingUsers = await db.getUsers();
    const existingCourses = await db.getCourses();
    const existingQuestions = await db.getQuestions();
    const existingQuizzes = await db.getQuizzes();
    
    // Se já existe dados no Firebase, não fazer seed
    if (db.isFirebaseEnabled() && (existingUsers.length > 0 || existingCourses.length > 0 || existingQuestions.length > 0)) {
      console.log('✅ Dados já existem no Firebase - pulando seed');
      console.log(`   👥 Usuários: ${existingUsers.length}`);
      console.log(`   📚 Cursos: ${existingCourses.length}`);
      console.log(`   ❓ Questões: ${existingQuestions.length}`);
      console.log(`   📝 Quizzes: ${existingQuizzes.length}`);
      return;
    }
    
    console.log('🌱 Iniciando seed de dados iniciais...');
    
    // Buscar admin existente
    let admin = existingUsers.find(u => u.role === 'admin');
    
    if (!admin) {
      const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN.password, 10);
      const nextId = await db.getNextId('users');
      admin = {
        id: nextId,
        username: DEFAULT_ADMIN.username,
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      await db.createUser(admin);
      console.log('✅ Admin padrão criado automaticamente');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Senha: ${DEFAULT_ADMIN.password}`);
    } else {
      console.log('ℹ️  Admin já existe');
    }

    // Buscar curso existente
    const courses = await db.getCourses();
    let course = courses.find(c => c.name === DEFAULT_COURSE.name);
    
    if (!course) {
      const nextId = await db.getNextId('courses');
      course = {
        id: nextId,
        ...DEFAULT_COURSE,
        createdBy: admin.id,
        createdAt: new Date().toISOString()
      };
      await db.createCourse(course);
      console.log(`✅ Curso padrão criado automaticamente: "${course.name}"`);
      console.log(`   📚 ID: ${course.id}`);
      console.log(`   🏷️  Abreviação: ${course.abbreviation}`);
    } else {
      console.log(`ℹ️  Curso "${course.name}" já existe (ID: ${course.id})`);
    }

    // Carregar questões do arquivo se não existirem
    const questions = await db.getQuestions();
    
    if (questions.length === 0 && fs.existsSync(QUESTIONS_FILE_PATH)) {
      console.log(`📂 Carregando questões de: ${QUESTIONS_FILE_PATH}`);
      const fileContent = fs.readFileSync(QUESTIONS_FILE_PATH, 'utf8');
      const questionsData = JSON.parse(fileContent);
      console.log(`📝 ${questionsData.length} questões encontradas no arquivo`);

      for (const q of questionsData) {
        const alreadyExists = questions.some(existing => existing.id === q.id && existing.courseId === course.id);
        if (alreadyExists) {
          continue;
        }

        const question = {
          id: q.id || `Q${questions.length + 1}`,
          courseId: course.id,
          capacidade: q.capacidade || q.capacity || 'Geral',
          difficulty: q.dificuldade || q.difficulty || 'Médio',
          context: q.context || '',
          contextImage: q.contextImage || null,
          command: q.command || '',
          options: normalizeOptionsArray(q.options),
          createdBy: admin.id,
          createdAt: new Date().toISOString()
        };
        
        await db.createQuestion(question);
        questions.push(question); // Para contagem local
      }

      console.log(`✅ ${questions.length} questões carregadas automaticamente`);
    } else if (questions.length > 0) {
      console.log(`ℹ️  ${questions.length} questões já existem no banco`);
    } else {
      console.log(`⚠️  Arquivo de questões não encontrado: ${QUESTIONS_FILE_PATH}`);
    }

    // Criar quizzes padrão se não existirem
    const quizzes = await db.getQuizzes();
    
    if (quizzes.length === 0 && questions.length > 0) {
      const courseQuestions = questions.filter(q => q.courseId === course.id);
      
      if (courseQuestions.length > 0) {
        // Quiz 1: SAEP 2024/2 - Questões 1 a 8
        const quiz1Questions = courseQuestions.filter(q => {
          const match = q.id.match(/q(\d+)/i);
          if (match) {
            const num = parseInt(match[1]);
            return num >= 1 && num <= 8;
          }
          return false;
        });

        if (quiz1Questions.length > 0) {
          const quiz1 = {
            id: await db.getNextId('quizzes'),
            name: 'SAEP 2024/2 - Parte 1',
            description: 'Questões 1 a 8 do SAEP 2024/2',
            courseId: course.id,
            questionIds: quiz1Questions.map(q => q.id),
            createdBy: admin.id,
            createdAt: new Date().toISOString()
          };
          await db.createQuiz(quiz1);
          console.log(`✅ Quiz 1 criado: SAEP 2024/2 - Parte 1 (${quiz1Questions.length} questões)`);
        }

        // Quiz 2: SAEP 2024/2 - Questões 9 a 16
        const quiz2Questions = courseQuestions.filter(q => {
          const match = q.id.match(/q(\d+)/i);
          if (match) {
            const num = parseInt(match[1]);
            return num >= 9 && num <= 16;
          }
          return false;
        });

        if (quiz2Questions.length > 0) {
          const quiz2 = {
            id: await db.getNextId('quizzes'),
            name: 'SAEP 2024/2 - Parte 2',
            description: 'Questões 9 a 16 do SAEP 2024/2',
            courseId: course.id,
            questionIds: quiz2Questions.map(q => q.id),
            createdBy: admin.id,
            createdAt: new Date().toISOString()
          };
          await db.createQuiz(quiz2);
          console.log(`✅ Quiz 2 criado: SAEP 2024/2 - Parte 2 (${quiz2Questions.length} questões)`);
        }

        // Quiz 3: SAEP 2024/2 - Completo (todas as questões)
        const quiz3 = {
          id: await db.getNextId('quizzes'),
          name: 'SAEP 2024/2 - Simulado Completo',
          description: 'Todas as questões do SAEP 2024/2 - Programação de Jogos Digitais',
          courseId: course.id,
          questionIds: courseQuestions.map(q => q.id),
          createdBy: admin.id,
          createdAt: new Date().toISOString()
        };
        await db.createQuiz(quiz3);
        console.log(`✅ Quiz 3 criado: SAEP 2024/2 - Simulado Completo (${courseQuestions.length} questões)`);
      }
    } else if (quizzes.length > 0) {
      console.log(`ℹ️  ${quizzes.length} quizzes já existem`);
    }
    
    // Contadores finais
    const finalUsers = await db.getUsers();
    const finalCourses = await db.getCourses();
    const finalQuestions = await db.getQuestions();
    const finalQuizzes = await db.getQuizzes();
    
    console.log('📊 Resumo do seed:');
    console.log(`   👥 Usuários: ${finalUsers.length} (Admin: ${finalUsers.filter(u => u.role === 'admin').length})`);
    console.log(`   📚 Cursos: ${finalCourses.length}`);
    console.log(`   ❓ Questões: ${finalQuestions.length}`);
    console.log(`   📝 Quizzes: ${finalQuizzes.length}`);
    console.log('✅ Seed concluído com sucesso!\n');
  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao carregar dados iniciais:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Executar seed de forma assíncrona
seedInitialData().catch(error => {
  console.error('❌ Falha fatal no seed:', error);
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Registrar novo usuário
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validações básicas
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se usuário já existe
    const emailExists = await db.getUserByEmail(email);
    const usernameExists = await db.getUserByUsername(username);
    
    if (emailExists || usernameExists) {
      return res.status(400).json({ error: 'Usuário ou email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const nextId = await db.getNextId('users');
    const user = {
      id: nextId,
      username,
      email,
      password: hashedPassword,
      role: 'user', // 'user' ou 'admin'
      createdAt: new Date().toISOString()
    };

    await db.createUser(user);

    // Gerar token
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validações
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Criar primeiro admin (executar apenas uma vez)
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { username, email, password, adminSecret } = req.body;
    
    // Verificar segredo admin (definir no .env)
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Segredo admin inválido' });
    }

    // Verificar se já existe admin
    const users = await db.getUsers();
    const adminExists = users.find(u => u.role === 'admin');
    if (adminExists) {
      return res.status(400).json({ error: 'Admin já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const nextId = await db.getNextId('users');
    const admin = {
      id: nextId,
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    await db.createUser(admin);

    const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Admin criado com sucesso',
      token,
      user: { id: admin.id, username: admin.username, email: admin.email, role: admin.role }
    });
  } catch (error) {
    console.error('Erro ao criar admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE CURSOS ====================

// Rota de debug para verificar status dos cursos (pode remover após deploy)
app.get('/api/debug/courses', async (req, res) => {
  try {
    const courses = await db.getCourses();
    const questions = await db.getQuestions();
    const users = await db.getUsers();
    
    res.json({
      totalCourses: courses.length,
      courses: courses.map(c => ({ id: c.id, name: c.name, abbreviation: c.abbreviation })),
      totalQuestions: questions.length,
      totalUsers: users.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os cursos
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await db.getCourses();
    const questions = await db.getQuestions();
    const scores = await db.getScores();
    
    console.log(`📚 GET /api/courses - Retornando ${courses.length} cursos`);
    
    const coursesWithStats = courses.map(course => {
      const courseQuestions = questions.filter(q => q.courseId === course.id);
      const courseScores = scores.filter(s => s.courseId === course.id);
      
      return {
        ...course,
        questionsCount: courseQuestions.length,
        attemptsCount: courseScores.length
      };
    });
    
    res.json({ courses: coursesWithStats });
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo curso (apenas admin)
app.post('/api/courses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, category, color, capacities } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do curso é obrigatório' });
    }

    const nextId = await db.getNextId('courses');
    const course = {
      id: nextId,
      name,
      description: description || '',
      category: category || 'Geral',
      color: color || '#3b82f6',
      capacities: capacities || [],
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    await db.createCourse(course);

    res.status(201).json({ message: 'Curso criado com sucesso', course });
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar curso (apenas admin)
app.put('/api/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { name, description, category, color, capacities } = req.body;

    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    const updates = {
      name: name || course.name,
      description: description !== undefined ? description : course.description,
      category: category || course.category,
      color: color || course.color,
      capacities: capacities !== undefined ? capacities : course.capacities,
      updatedAt: new Date().toISOString()
    };

    const updatedCourse = await db.updateCourse(courseId, updates);

    res.json({ message: 'Curso atualizado com sucesso', course: updatedCourse });
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar curso (apenas admin)
app.delete('/api/courses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Remover questões e pontuações do curso
    const questions = await db.getQuestions();
    const questionIds = questions.filter(q => q.courseId === courseId).map(q => q.id);
    
    for (const qId of questionIds) {
      await db.deleteQuestion(courseId, qId);
    }
    
    const scores = await db.getScores();
    const scoreIds = scores.filter(s => s.courseId === courseId).map(s => s.id);
    
    for (const sId of scoreIds) {
      await db.deleteScore(sId);
    }

    await db.deleteCourse(courseId);

    res.json({ message: 'Curso deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE QUESTÕES ====================

// Listar questões de um curso
app.get('/api/courses/:courseId/questions', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const questions = await db.getQuestions();
    const courseQuestions = questions.filter(q => q.courseId === courseId);
    
    res.json({ questions: courseQuestions, total: courseQuestions.length });
  } catch (error) {
    console.error('Erro ao listar questões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar questão (apenas admin)
app.post('/api/courses/:courseId/questions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    let { id, capacidade, capacity, dificuldade, difficulty, context, contexto, contextImage, command, comando, options } = req.body;

    // Aceitar campos em português ou inglês
    const finalCapacity = capacidade || capacity || 'Geral';
    const finalDifficulty = dificuldade || difficulty || 'Médio';
    const finalContext = contexto || context || '';
    const finalCommand = comando || command;

    if (!finalContext || !finalCommand || !options || options.length === 0) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Verificar se curso existe
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Se ID não foi fornecido, gerar automaticamente
    if (!id) {
      id = await generateNextQuestionId(courseId);
    }

    // Verificar se ID já existe
    const questions = await db.getQuestions();
    if (questions.find(q => q.id === id && q.courseId === courseId)) {
      return res.status(400).json({ error: 'ID de questão já existe neste curso' });
    }

    const question = {
      id,
      courseId,
      capacity: finalCapacity,
      difficulty: finalDifficulty,
      context: finalContext,
      contextImage: contextImage || null,
      command: finalCommand,
      options: normalizeOptionsArray(options),
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    await db.createQuestion(question);

    res.status(201).json({ message: 'Questão criada com sucesso', question });
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter próximo ID disponível para um curso
app.get('/api/courses/:courseId/next-question-id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    
    // Verificar se curso existe
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    const nextId = await generateNextQuestionId(courseId);
    
    res.json({ 
      nextId,
      courseAbbreviation: getCourseAbbreviation(course),
      courseName: course.name
    });
  } catch (error) {
    console.error('Erro ao gerar próximo ID:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Importar questões em lote (JSON ou CSV) (apenas admin)
app.post('/api/courses/:courseId/questions/import', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { questionsData, format } = req.body;

    if (!questionsData || !Array.isArray(questionsData)) {
      return res.status(400).json({ error: 'Dados de questões inválidos' });
    }

    // Verificar se curso existe
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    let imported = 0;
    let errors = [];

    const existingQuestions = await db.getQuestions();

    for (let index = 0; index < questionsData.length; index++) {
      const q = questionsData[index];
      try {
        // Validar questão - aceitar campos em português ou inglês
        const hasContext = (q.contexto && String(q.contexto).trim() !== '') || (q.context && String(q.context).trim() !== '');
        const hasCommand = (q.comando && String(q.comando).trim() !== '') || (q.command && String(q.command).trim() !== '');
        const hasOptions = Array.isArray(q.options) && q.options.length > 0;

        if (!hasContext || !hasCommand || !hasOptions) {
          const missing = [];
          if (!hasContext) missing.push('context/contexto');
          if (!hasCommand) missing.push('command/comando');
          if (!hasOptions) missing.push('options');

          errors.push({ index: index + 1, error: 'Dados incompletos - campos faltando: ' + missing.join(', '), question: q });
          continue;
        }

        // Se ID não foi fornecido, gerar automaticamente
        let questionId = q.id;
        if (!questionId) {
          questionId = await generateNextQuestionId(courseId);
        }

        // Verificar se ID já existe
        if (existingQuestions.find(existingQ => existingQ.id === questionId && existingQ.courseId === courseId)) {
          errors.push({ index: index + 1, error: 'ID já existe', id: questionId });
          continue;
        }

        const question = {
          id: questionId,
          courseId,
          capacity: q.capacidade || q.capacity || 'Geral',
          difficulty: q.dificuldade || q.difficulty || 'Médio',
          context: q.contexto || q.context || '',
          contextImage: q.contextImage || null,
          command: q.comando || q.command,
          options: normalizeOptionsArray(q.options),
          createdBy: req.user.id,
          createdAt: new Date().toISOString()
        };

        await db.createQuestion(question);
        existingQuestions.push(question); // Adicionar ao array local para verificação de duplicatas
        imported++;
      } catch (err) {
        errors.push({ index: index + 1, error: err.message });
      }
    }

    res.json({
      message: `Importação concluída`,
      imported,
      total: questionsData.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erro ao importar questões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar questão (apenas admin)
app.delete('/api/courses/:courseId/questions/:questionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const questionId = req.params.questionId;

    const questions = await db.getQuestions();
    const question = questions.find(q => q.id === questionId && q.courseId === courseId);
    if (!question) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }

    await db.deleteQuestion(courseId, questionId);

    res.json({ message: 'Questão deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar questão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE PONTUAÇÃO ====================

// Salvar pontuação
app.post('/api/scores', authenticateToken, async (req, res) => {
  try {
    const { courseId, score, totalQuestions, timeSpent, answersDetail } = req.body;

    // Validações
    if (score === undefined || !totalQuestions || !courseId) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Verificar se curso existe
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    const nextId = await db.getNextId('scores');
    const scoreEntry = {
      id: nextId,
      userId: req.user.id,
      username: req.user.username,
      courseId,
      courseName: course.name,
      score,
      totalQuestions,
      percentage: ((score / totalQuestions) * 100).toFixed(2),
      timeSpent: timeSpent || 0,
      answersDetail: answersDetail || [],
      createdAt: new Date().toISOString()
    };

    await db.createScore(scoreEntry);

    res.status(201).json({
      message: 'Pontuação salva com sucesso',
      scoreEntry
    });
  } catch (error) {
    console.error('Erro ao salvar pontuação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Salvar resultado anônimo (sem autenticação) - apenas para admin
app.post('/api/results/anonymous', async (req, res) => {
  try {
    console.log('📥 [ANONYMOUS] Recebendo resultado anônimo...');
    console.log('📦 [ANONYMOUS] Body:', JSON.stringify(req.body, null, 2));
    
    const { courseId, quizId, score, totalQuestions, timeSpent, answersDetail, capacityStats, userInfo } = req.body;

    // Validações
    if (score === undefined || !totalQuestions || !courseId) {
      console.error('❌ [ANONYMOUS] Dados incompletos:', { score, totalQuestions, courseId });
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Verificar se curso existe
    const course = await db.getCourseById(courseId);
    if (!course) {
      console.error('❌ [ANONYMOUS] Curso não encontrado:', courseId);
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    console.log('✅ [ANONYMOUS] Curso encontrado:', course.name);

    // Verificar se quiz existe (opcional)
    let quizName = null;
    if (quizId) {
      const quiz = await db.getQuizById(quizId);
      if (quiz) {
        quizName = quiz.name;
      }
    }

    // Analisar respostas detalhadas
    const questionsCorrect = [];
    const questionsWrong = [];
    const capacityPerformance = {};

    if (answersDetail && Array.isArray(answersDetail)) {
      answersDetail.forEach(answer => {
        const questionData = {
          questionId: answer.questionId,
          capacity: answer.capacity,
          selectedOption: answer.selectedOption,
          correctOption: answer.correctOption,
          selectedText: answer.selectedOptionText,
          correctText: answer.correctOptionText
        };

        if (answer.correct) {
          questionsCorrect.push(questionData);
        } else {
          questionsWrong.push(questionData);
        }

        // Estatísticas por capacidade
        if (!capacityPerformance[answer.capacity]) {
          capacityPerformance[answer.capacity] = {
            correct: 0,
            wrong: 0,
            total: 0,
            percentage: 0
          };
        }
        capacityPerformance[answer.capacity].total++;
        if (answer.correct) {
          capacityPerformance[answer.capacity].correct++;
        } else {
          capacityPerformance[answer.capacity].wrong++;
        }
      });

      // Calcular percentuais por capacidade
      Object.keys(capacityPerformance).forEach(capacity => {
        const stats = capacityPerformance[capacity];
        stats.percentage = ((stats.correct / stats.total) * 100).toFixed(2);
      });
    }

    const resultEntry = {
      id: Date.now(), // ID único baseado em timestamp
      type: 'anonymous',
      userInfo: userInfo || 'Usuário Anônimo',
      courseId,
      courseName: course.name,
      quizId: quizId || null,
      quizName: quizName,
      score,
      totalQuestions,
      percentage: ((score / totalQuestions) * 100).toFixed(2),
      timeSpent: timeSpent || 0,
      answersDetail: answersDetail || [],
      questionsCorrect,
      questionsWrong,
      capacityPerformance,
      createdAt: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    };

    // Adicionar à lista de resultados anônimos (ou usar array separado)
    if (!global.anonymousResults) {
      console.log('🆕 [ANONYMOUS] Criando array global.anonymousResults');
      global.anonymousResults = [];
    }
    
    console.log('📊 [ANONYMOUS] Total de resultados antes de adicionar:', global.anonymousResults.length);
    global.anonymousResults.push(resultEntry);
    console.log('📊 [ANONYMOUS] Total de resultados após adicionar:', global.anonymousResults.length);

    console.log('✅ [ANONYMOUS] Resultado anônimo salvo:', {
      id: resultEntry.id,
      user: resultEntry.userInfo,
      course: resultEntry.courseName,
      quiz: resultEntry.quizName,
      score: `${resultEntry.score}/${resultEntry.totalQuestions}`,
      percentage: `${resultEntry.percentage}%`,
      timeSpent: `${Math.floor(resultEntry.timeSpent / 60)}:${String(resultEntry.timeSpent % 60).padStart(2, '0')}`,
      correctQuestions: questionsCorrect.length,
      wrongQuestions: questionsWrong.length,
      capacities: Object.keys(capacityPerformance).length
    });

    res.status(201).json({
      message: 'Resultado salvo com sucesso',
      id: resultEntry.id,
      success: true
    });
  } catch (error) {
    console.error('❌ [ANONYMOUS] Erro ao salvar resultado anônimo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter histórico de pontuações do usuário
app.get('/api/scores/user', authenticateToken, async (req, res) => {
  try {
    const scores = await db.getScores();
    const userScores = scores
      .filter(s => s.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ scores: userScores });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter ranking global
app.get('/api/ranking', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const period = req.query.period || 'all'; // all, today, week, month
    const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;

    const scores = await db.getScores();
    let filteredScores = [...scores];

    // Filtrar por curso
    if (courseId) {
      filteredScores = filteredScores.filter(s => s.courseId === courseId);
    }

    // Filtrar por período
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      filteredScores = filteredScores.filter(s => new Date(s.createdAt) >= startDate);
    }

    // Pegar apenas a melhor pontuação de cada usuário
    const bestScores = {};
    filteredScores.forEach(score => {
      if (!bestScores[score.userId] || parseFloat(score.percentage) > parseFloat(bestScores[score.userId].percentage)) {
        bestScores[score.userId] = score;
      }
    });

    // Ordenar por percentual (decrescente) e depois por tempo (crescente)
    const ranking = Object.values(bestScores)
      .sort((a, b) => {
        const percentageDiff = parseFloat(b.percentage) - parseFloat(a.percentage);
        if (percentageDiff !== 0) return percentageDiff;
        return a.timeSpent - b.timeSpent;
      })
      .slice(0, limit)
      .map((score, index) => ({
        rank: index + 1,
        username: score.username,
        score: score.score,
        totalQuestions: score.totalQuestions,
        percentage: score.percentage,
        timeSpent: score.timeSpent,
        date: score.createdAt
      }));

    res.json({ ranking, total: ranking.length });
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas gerais
app.get('/api/stats', async (req, res) => {
  try {
    const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;
    
    const scores = await db.getScores();
    const users = await db.getUsers();
    const courses = await db.getCourses();
    const questions = await db.getQuestions();
    
    let relevantScores = courseId ? scores.filter(s => s.courseId === courseId) : scores;
    
    const totalAttempts = relevantScores.length;
    const totalUsers = users.length;
    const averageScore = relevantScores.length > 0
      ? (relevantScores.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / relevantScores.length).toFixed(2)
      : 0;

    // Estatísticas por capacidade
    const capacityStats = {};
    relevantScores.forEach(score => {
      if (score.answersDetail) {
        score.answersDetail.forEach(answer => {
          if (!capacityStats[answer.capacity]) {
            capacityStats[answer.capacity] = { correct: 0, total: 0 };
          }
          capacityStats[answer.capacity].total++;
          if (answer.correct) {
            capacityStats[answer.capacity].correct++;
          }
        });
      }
    });

    Object.keys(capacityStats).forEach(cap => {
      capacityStats[cap].percentage = ((capacityStats[cap].correct / capacityStats[cap].total) * 100).toFixed(2);
    });

    res.json({
      totalAttempts,
      totalUsers,
      averageScore: parseFloat(averageScore),
      capacityStats,
      totalCourses: courses.length,
      totalQuestions: courseId ? questions.filter(q => q.courseId === courseId).length : questions.length
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS ADMINISTRATIVAS ====================

// Dashboard admin - estatísticas gerais
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.getUsers();
    const courses = await db.getCourses();
    const questions = await db.getQuestions();
    const scores = await db.getScores();
    
    // Inicializar array de resultados anônimos se não existir
    if (!global.anonymousResults) {
      global.anonymousResults = [];
    }
    
    const anonymousResults = global.anonymousResults || [];
    
    const totalUsers = users.length;
    const totalCourses = courses.length;
    const totalQuestions = questions.length;
    const totalAttempts = scores.length + anonymousResults.length; // Incluir anônimos
    
    // Usuários ativos (com pelo menos uma tentativa)
    const activeUsers = new Set(scores.map(s => s.userId)).size;
    
    // Curso mais popular (incluindo resultados anônimos)
    const coursePopularity = {};
    scores.forEach(s => {
      coursePopularity[s.courseId] = (coursePopularity[s.courseId] || 0) + 1;
    });
    anonymousResults.forEach(r => {
      coursePopularity[r.courseId] = (coursePopularity[r.courseId] || 0) + 1;
    });
    
    const mostPopularCourseId = Object.keys(coursePopularity).length > 0
      ? parseInt(Object.keys(coursePopularity).reduce((a, b) => coursePopularity[a] > coursePopularity[b] ? a : b))
      : null;
    
    const mostPopularCourse = mostPopularCourseId ? courses.find(c => c.id === mostPopularCourseId) : null;
    
    // Média geral de acertos (incluindo anônimos)
    const allScores = [
      ...scores.map(s => parseFloat(s.percentage)),
      ...anonymousResults.map(r => parseFloat(r.percentage))
    ];
    const averageScore = allScores.length > 0
      ? (allScores.reduce((sum, p) => sum + p, 0) / allScores.length).toFixed(2)
      : 0;
    
    // Últimas atividades (incluindo anônimos)
    const userActivities = scores.map(s => ({
      username: s.username,
      courseName: s.courseName,
      percentage: s.percentage,
      date: s.createdAt,
      type: 'registered'
    }));
    
    const anonymousActivities = anonymousResults.map(r => ({
      username: r.userInfo,
      courseName: r.courseName,
      percentage: r.percentage,
      date: r.createdAt,
      type: 'anonymous'
    }));
    
    const recentActivities = [...userActivities, ...anonymousActivities]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    
    console.log('📊 [DASHBOARD] Estatísticas:', {
      totalUsers,
      totalCourses,
      totalQuestions,
      totalAttempts,
      anonymousCount: anonymousResults.length,
      registeredCount: scores.length
    });
    
    res.json({
      totalUsers,
      totalCourses,
      totalQuestions,
      totalAttempts,
      activeUsers,
      averageScore: parseFloat(averageScore),
      mostPopularCourse,
      recentActivities
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter resultados anônimos (admin)
app.get('/api/admin/anonymous-results', authenticateToken, requireAdmin, (req, res) => {
  try {
    console.log('🔍 [ADMIN] Requisição para listar resultados anônimos');
    
    const limit = parseInt(req.query.limit) || 50;
    const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;

    if (!global.anonymousResults) {
      global.anonymousResults = [];
      console.log('⚠️ [ADMIN] Array de resultados anônimos não existe, criando vazio');
    }

    console.log(`📊 [ADMIN] Total de resultados armazenados: ${global.anonymousResults.length}`);

    let results = [...global.anonymousResults];

    // Filtrar por curso se especificado
    if (courseId) {
      results = results.filter(r => r.courseId === courseId);
      console.log(`🔎 [ADMIN] Filtrando por curso ${courseId}: ${results.length} resultados`);
    }

    // Ordenar por data (mais recente primeiro) e limitar
    results = results
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    // Estatísticas resumidas
    const stats = {
      total: global.anonymousResults.length,
      filtered: results.length,
      avgScore: results.length > 0 
        ? (results.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / results.length).toFixed(2)
        : 0,
      totalTimeSpent: results.reduce((sum, r) => sum + (r.timeSpent || 0), 0)
    };

    console.log('✅ [ADMIN] Enviando resposta:', { totalResults: results.length, stats });

    res.json({
      results,
      stats,
      success: true
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erro ao buscar resultados anônimos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os usuários (admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.getUsers();
    const scores = await db.getScores();
    
    const usersWithStats = users.map(user => {
      const userScores = scores.filter(s => s.userId === user.id);
      const avgScore = userScores.length > 0
        ? (userScores.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / userScores.length).toFixed(2)
        : 0;
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        attemptsCount: userScores.length,
        averageScore: parseFloat(avgScore)
      };
    });
    
    res.json({ users: usersWithStats, total: usersWithStats.length });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar role de usuário (admin)
app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role inválida' });
    }
    
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const updatedUser = await db.updateUser(userId, { role });
    
    res.json({ message: 'Role atualizada com sucesso', user: updatedUser });
  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar usuário (admin)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }
    
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Remover pontuações do usuário
    const scores = await db.getScores();
    const userScoreIds = scores.filter(s => s.userId === userId).map(s => s.id);
    for (const scoreId of userScoreIds) {
      await db.deleteScore(scoreId);
    }
    
    await db.deleteUser(userId);
    
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório detalhado por curso (admin)
app.get('/api/admin/reports/course/:courseId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    const questions = await db.getQuestions();
    const scores = await db.getScores();
    
    const courseQuestions = questions.filter(q => q.courseId === courseId);
    const courseScores = scores.filter(s => s.courseId === courseId);
    
    // Estatísticas por questão
    const questionStats = {};
    courseScores.forEach(score => {
      if (score.answersDetail) {
        score.answersDetail.forEach(answer => {
          if (!questionStats[answer.questionId]) {
            questionStats[answer.questionId] = {
              questionId: answer.questionId,
              correct: 0,
              total: 0
            };
          }
          questionStats[answer.questionId].total++;
          if (answer.correct) {
            questionStats[answer.questionId].correct++;
          }
        });
      }
    });
    
    Object.keys(questionStats).forEach(qId => {
      questionStats[qId].percentage = ((questionStats[qId].correct / questionStats[qId].total) * 100).toFixed(2);
    });
    
    // Top performers
    const topPerformers = courseScores
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage) || a.timeSpent - b.timeSpent)
      .slice(0, 10)
      .map(s => ({
        username: s.username,
        percentage: s.percentage,
        timeSpent: s.timeSpent,
        date: s.createdAt
      }));
    
    const avgScore = courseScores.length > 0
      ? (courseScores.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / courseScores.length).toFixed(2)
      : 0;
    
    res.json({
      course,
      totalQuestions: courseQuestions.length,
      totalAttempts: courseScores.length,
      averageScore: parseFloat(avgScore),
      questionStats: Object.values(questionStats),
      topPerformers
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar dados (CSV simplificado)
app.get('/api/admin/export/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const type = req.params.type; // 'users', 'scores', 'courses'
    
    const users = await db.getUsers();
    const scores = await db.getScores();
    const courses = await db.getCourses();
    const questions = await db.getQuestions();
    
    let data = [];
    let headers = [];
    
    switch (type) {
      case 'users':
        headers = ['ID', 'Username', 'Email', 'Role', 'Created At'];
        data = users.map(u => [u.id, u.username, u.email, u.role, u.createdAt]);
        break;
      case 'scores':
        headers = ['ID', 'User', 'Course', 'Score', 'Percentage', 'Time', 'Date'];
        data = scores.map(s => [s.id, s.username, s.courseName, `${s.score}/${s.totalQuestions}`, s.percentage, s.timeSpent, s.createdAt]);
        break;
      case 'courses':
        headers = ['ID', 'Name', 'Category', 'Questions', 'Attempts', 'Created At'];
        data = courses.map(c => {
          const qCount = questions.filter(q => q.courseId === c.id).length;
          const aCount = scores.filter(s => s.courseId === c.id).length;
          return [c.id, c.name, c.category, qCount, aCount, c.createdAt];
        });
        break;
      default:
        return res.status(400).json({ error: 'Tipo de exportação inválido' });
    }
    
    // Gerar CSV
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
      csv += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE IA ====================

// Gerar questão similar para prática (sem autenticação)
app.post('/api/ai/generate-similar-question', async (req, res) => {
    try {
        const { capacity, originalCommand, courseId } = req.body;

        console.log('📝 Recebendo requisição para gerar questão similar');
        console.log('   Capacidade:', capacity);
        console.log('   Comando original:', originalCommand);
        console.log('   Course ID:', courseId);
        console.log('   GEMINI_API_KEY disponível:', !!GEMINI_API_KEY);
        console.log('   OPENAI_API_KEY disponível:', !!OPENAI_API_KEY);

        if (!capacity || !originalCommand) {
            return res.status(400).json({ 
                error: 'Capacidade e comando original são obrigatórios' 
            });
        }

        // Buscar informações do curso se disponível
        let courseName = 'programação';
        if (courseId) {
            const courses = await db.getCourses();
            const course = courses.find(c => c.id === parseInt(courseId));
            if (course) {
                courseName = course.name;
            }
        }

        const prompt = `# Atenção: Sua tarefa é criar UM item de avaliação (uma questão de múltipla escolha) para o Sistema de Avaliação da Educação Profissional (SAEP). Siga rigorosamente todas as instruções e a estrutura definidas abaixo.

## 1. Definição dos Metadados da Questão:

**Curso Técnico:** ${courseName}

**Capacidade Alvo:** ${capacity}

**Tema de Referência:** ${originalCommand}

**Nível de Dificuldade:** Fácil a Médio (adequado para prática)

## 2. Diretrizes de Construção do Item:

**Princípio Fundamental:** O item deve simular um cenário de trabalho realista e plausível para um técnico da área. O estudante deve se sentir como um profissional resolvendo um problema real.

**Vínculo Contexto-Comando:** O Contexto deve apresentar um problema com detalhes e restrições específicas. O Comando deve ser formulado de tal maneira que a sua resolução dependa diretamente da análise das informações e restrições apresentadas no Contexto. Não deve ser possível responder ao comando apenas com conhecimento teórico isolado.

**Qualidade das Alternativas:**
- **Gabarito (Resposta Correta):** Deve ser a solução tecnicamente mais correta, eficiente e adequada para o problema específico apresentado no contexto.
- **Distratores (Alternativas Incorretas):** Cada distrator deve representar um erro de raciocínio comum ou uma solução parcialmente correta, mas inadequada para o cenário. Eles devem ser plausíveis o suficiente para que um estudante com conhecimento incompleto ou que interpretou mal o contexto possa escolhê-los. NÃO use "pegadinhas", alternativas absurdas ou que testem apenas memorização de termos.

## 3. Estrutura de Geração:

### A. Contexto:
Crie um parágrafo descrevendo uma situação-problema detalhada e realista. Inclua:
- Tipo de jogo ou projeto
- Mecânica ou funcionalidade envolvida
- Desafio técnico específico
- Restrições ou requisitos

### B. Comando:
Crie uma pergunta clara e objetiva que conecte o problema do contexto à solução técnica necessária. A pergunta deve forçar o estudante a analisar o cenário apresentado.

### C. Alternativas (4 opções - A, B, C, D):
1. **Alternativa Correta:** A solução ideal para o problema
2. **Distrator 1 (Erro Comum):** Solução que parece correta, mas tem uma falha sutil ou é menos eficiente
3. **Distrator 2 (Conceito Relacionado):** Termo/conceito correto da área, mas que não se aplica ao problema específico
4. **Distrator 3 (Solução Simplista):** Abordagem que um iniciante poderia pensar, mas que não resolve adequadamente o problema

### D. Justificativas:
- **Para a alternativa CORRETA:** Explique tecnicamente por que esta é a melhor solução
- **Para cada DISTRATOR:** Explique o erro de raciocínio que levaria um estudante a escolhê-la. Seja específico sobre qual conceito ou aspecto do contexto foi mal interpretado.

## 4. Formato de Saída:

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`):

{
  "context": "Contexto detalhado da situação-problema",
  "command": "Pergunta objetiva conectada ao contexto?",
  "options": [
    {
      "text": "Texto da alternativa correta",
      "correct": true,
      "explanation": "Explicação técnica de por que está correta"
    },
    {
      "text": "Distrator 1 - Erro Comum",
      "correct": false,
      "justification": "Incorreta. O estudante provavelmente escolheu esta porque..."
    },
    {
      "text": "Distrator 2 - Conceito Relacionado",
      "correct": false,
      "justification": "Incorreta. Este conceito é válido mas não se aplica porque..."
    },
    {
      "text": "Distrator 3 - Solução Simplista",
      "correct": false,
      "justification": "Incorreta. Esta abordagem não funciona adequadamente porque..."
    }
  ]
}

**IMPORTANTE:** Gere uma questão completa e bem fundamentada seguindo RIGOROSAMENTE todas as diretrizes acima. A questão deve ser educativa, realista e ajudar o aluno a praticar o conceito no contexto profissional.`;

        console.log('🤖 Gerando questão similar com IA...');

        // Verificar se pelo menos uma API está configurada
        if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
            console.error('❌ Nenhuma API de IA configurada!');
            return res.status(500).json({ 
                error: 'Serviço de IA não está configurado. Entre em contato com o administrador.' 
            });
        }

        let generatedQuestion;

        // Tentar primeiro com Gemini
        if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
            try {
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: prompt }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 1024,
                            }
                        })
                    }
                );

                if (!geminiResponse.ok) {
                    throw new Error(`Gemini API error: ${geminiResponse.status}`);
                }

                const geminiData = await geminiResponse.json();
                let textContent = geminiData.candidates[0].content.parts[0].text;

                // Limpar markdown se houver
                textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                generatedQuestion = JSON.parse(textContent);
                console.log('✅ Questão gerada com Gemini');

            } catch (geminiError) {
                console.log('⚠️ Gemini falhou, tentando OpenAI...', geminiError.message);

                // Fallback para OpenAI
                if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
                    throw new Error('Nenhuma API de IA configurada corretamente');
                }

                const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: 'Você é um professor especialista. Responda APENAS com JSON válido, sem markdown.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });

                if (!openaiResponse.ok) {
                    const errorData = await openaiResponse.json();
                    throw new Error(errorData.error?.message || 'OpenAI API error');
                }

                const openaiData = await openaiResponse.json();
                let textContent = openaiData.choices[0].message.content.trim();

                // Limpar markdown
                textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                generatedQuestion = JSON.parse(textContent);
                console.log('✅ Questão gerada com OpenAI');
            }
        } else {
            // Apenas OpenAI disponível
            if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
                return res.status(500).json({ 
                    error: 'Nenhuma API de IA configurada. Configure GEMINI_API_KEY ou OPENAI_API_KEY.' 
                });
            }

            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um professor especialista. Responda APENAS com JSON válido, sem markdown.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!openaiResponse.ok) {
                const errorData = await openaiResponse.json();
                throw new Error(errorData.error?.message || 'OpenAI API error');
            }

            const openaiData = await openaiResponse.json();
            let textContent = openaiData.choices[0].message.content.trim();

            // Limpar markdown
            textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            generatedQuestion = JSON.parse(textContent);
            console.log('✅ Questão gerada com OpenAI');
        }

        // Validar estrutura da questão
        if (!generatedQuestion.command || !Array.isArray(generatedQuestion.options) || generatedQuestion.options.length !== 4) {
            throw new Error('Questão gerada com formato inválido');
        }

        const hasCorrectAnswer = generatedQuestion.options.some(opt => opt.correct === true);
        if (!hasCorrectAnswer) {
            throw new Error('Questão não possui resposta correta marcada');
        }

        res.json({
            success: true,
            question: generatedQuestion
        });

    } catch (error) {
        console.error('❌ Erro ao gerar questão:', error);
        console.error('Stack:', error.stack);
        
        // Mensagem de erro mais específica
        let errorMessage = 'Não foi possível gerar a questão. Tente novamente.';
        
        if (error.message.includes('API') || error.message.includes('fetch')) {
            errorMessage = 'Erro ao conectar com o serviço de IA. Verifique sua conexão.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'A IA retornou uma resposta em formato inválido.';
        } else if (error.message.includes('configurada')) {
            errorMessage = error.message;
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Gerar questão com IA (admin)
app.post('/api/ai/generate-question', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      capacity,
      content,
      difficulty,
      provider,
      includeImages = true,
      imageProvider
    } = req.body;

    // Validações
    if (!capacity || !content || !difficulty) {
      return res.status(400).json({ error: 'Capacidade, conteúdo e dificuldade são obrigatórios' });
    }

    const aiProvider = provider || 'gemini'; // Default: Gemini

    // Montar o prompt detalhado padrão SAEP
    const prompt = `# Atenção: Sua tarefa é criar UM item de avaliação (uma questão de múltipla escolha) para o Sistema de Avaliação da Educação Profissional (SAEP). Siga rigorosamente todas as instruções e a estrutura definidas abaixo.

## 1. Definição dos Metadados da Questão:

**Curso Técnico:** Técnico em Programação de Jogos Digitais.

**Capacidade Alvo:** ${capacity}

**Conhecimento Avaliado:** ${content}

**Nível de Dificuldade:** ${difficulty}

## 2. Diretrizes de Construção do Item:

**Princípio Fundamental:** O item deve simular um cenário de trabalho realista e plausível para um técnico da área. O estudante deve se sentir como um profissional resolvendo um problema real.

**Vínculo Contexto-Comando:** O Contexto deve apresentar um problema com detalhes e restrições específicas. O Comando deve ser formulado de tal maneira que a sua resolução dependa diretamente da análise das informações e restrições apresentadas no Contexto. Não deve ser possível responder ao comando apenas com conhecimento teórico isolado.

**Qualidade das Alternativas:**
- **Gabarito (Resposta Correta):** Deve ser a solução tecnicamente mais correta, eficiente e adequada para o problema específico apresentado no contexto.
- **Distratores (Alternativas Incorretas):** Cada distrator deve representar um erro de raciocínio comum ou uma solução parcialmente correta, mas inadequada para o cenário. Eles devem ser plausíveis o suficiente para que um estudante com conhecimento incompleto ou que interpretou mal o contexto possa escolhê-los. NÃO use "pegadinhas", alternativas absurdas ou que testem apenas memorização de termos.

## 3. Estrutura de Geração:

### A. Contexto:
Crie um parágrafo descrevendo uma situação-problema detalhada. Inclua o tipo de jogo, a mecânica envolvida e o desafio técnico específico. O contexto deve ser rico em detalhes que justifiquem a escolha da resposta correta.

### B. Comando:
Crie uma pergunta clara e objetiva que conecte o problema do contexto à solução técnica necessária. A pergunta deve forçar o estudante a analisar o cenário apresentado.

### C. Alternativas (5 opções - A, B, C, D, E):
1. **Alternativa Correta:** A solução ideal para o problema
2. **Distrator 1 (Erro Comum):** Solução que parece correta, mas tem uma falha sutil ou é menos eficiente
3. **Distrator 2 (Conceito Relacionado):** Termo/conceito correto da área, mas que não se aplica ao problema específico
4. **Distrator 3 (Solução Simplista):** Abordagem que um iniciante poderia pensar, mas que não escala ou ignora complexidades
5. **Distrator 4 (Conceito de Outra Área):** Padrão/técnica válida em outro domínio, mas não é a prática padrão em jogos para este cenário

### D. Justificativas:
- **Para a alternativa CORRETA:** Explique tecnicamente por que esta é a melhor solução
- **Para cada DISTRATOR:** Explique o erro de raciocínio que levaria um estudante a escolhê-la. Seja específico sobre qual conceito ou aspecto do contexto foi mal interpretado.

### E. Sugestões de Imagens (opcional):
- **contextImagePrompt:** Prompt em inglês (máx 20 palavras) para ilustrar o contexto, se aplicável
- **imagePrompt** para cada opção: Prompt em inglês (máx 15 palavras) para ilustrar a alternativa, se aplicável

## 4. Formato de Saída:

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`):

{
  "id": "Q_GERADO_${Date.now()}",
  "capacidade": "${capacity}",
  "context": "Contexto detalhado da situação-problema",
  "contextImagePrompt": "Brief english prompt for context illustration or null",
  "command": "Pergunta objetiva conectada ao contexto?",
  "options": [
    { 
      "letter": "A", 
      "text": "Texto da alternativa", 
      "correct": true, 
      "explanation": "Explicação técnica de por que está correta",
      "justification": "Justificativa detalhada (para distratores: explique o erro de raciocínio)",
      "imagePrompt": "Short english prompt or null" 
    },
    { 
      "letter": "B", 
      "text": "Distrator 1 - Erro Comum", 
      "correct": false, 
      "justification": "Incorreta. O estudante provavelmente escolheu esta porque...",
      "imagePrompt": null 
    },
    { 
      "letter": "C", 
      "text": "Distrator 2 - Conceito Relacionado", 
      "correct": false, 
      "justification": "Incorreta. Este conceito é válido mas não se aplica porque...",
      "imagePrompt": null 
    },
    { 
      "letter": "D", 
      "text": "Distrator 3 - Solução Simplista", 
      "correct": false, 
      "justification": "Incorreta. Esta abordagem não funciona porque...",
      "imagePrompt": null 
    },
    { 
      "letter": "E", 
      "text": "Distrator 4 - Conceito de Outra Área", 
      "correct": false, 
      "justification": "Incorreta. Embora seja usado em [área], não é adequado aqui porque...",
      "imagePrompt": null 
    }
  ]
}

**IMPORTANTE:** Gere uma questão completa e bem fundamentada seguindo RIGOROSAMENTE todas as diretrizes acima. A qualidade dos distratores é tão importante quanto a resposta correta.`;

    let generatedQuestion = null;

    // Gerar com Gemini
    if (aiProvider === 'gemini') {
      if (!genAI) {
        return res.status(503).json({ 
          error: 'API do Gemini não configurada. Adicione GEMINI_API_KEY no .env',
          instructions: 'Obtenha sua chave gratuita em: https://makersuite.google.com/app/apikey'
        });
      }

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Tentar extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedQuestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Resposta da IA não contém JSON válido');
      }
    }
    // Gerar com ChatGPT
    else if (aiProvider === 'chatgpt') {
      if (!openai) {
        return res.status(503).json({ 
          error: 'API do ChatGPT não configurada. Adicione OPENAI_API_KEY no .env',
          instructions: 'Obtenha sua chave em: https://platform.openai.com/api-keys'
        });
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const text = completion.choices[0].message.content;
      
      // Tentar extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedQuestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Resposta da IA não contém JSON válido');
      }
    }
    else {
      return res.status(400).json({ error: 'Provider inválido. Use "gemini" ou "chatgpt"' });
    }

    if (generatedQuestion) {
      let imageError = null;

      if (includeImages !== false) {
        try {
          attachGeneratedImagesToQuestion(generatedQuestion, {
            provider: imageProvider || 'pollinations',
            includeContext: true,
            includeOptions: true
          });
        } catch (imgErr) {
          console.error('Erro ao gerar imagens para a questão:', imgErr);
          imageError = imgErr.message;
        }
      } else {
        delete generatedQuestion.contextImagePrompt;
        if (Array.isArray(generatedQuestion.options)) {
          generatedQuestion.options = generatedQuestion.options.map(option => {
            const cleaned = { ...option };
            delete cleaned.imagePrompt;
            return cleaned;
          });
        }
      }

      generatedQuestion.contextImage = generatedQuestion.contextImage || null;
      generatedQuestion.options = normalizeOptionsArray(generatedQuestion.options);

      if (imageError) {
        generatedQuestion.imageGenerationError = imageError;
      }
    }

    // Validar estrutura da questão gerada
    if (!generatedQuestion || !generatedQuestion.command || !generatedQuestion.options || generatedQuestion.options.length < 4) {
      throw new Error('Questão gerada com formato inválido - deve ter pelo menos 4 opções');
    }

    // Adicionar metadados
    generatedQuestion.generatedBy = aiProvider;
    generatedQuestion.generatedAt = new Date().toISOString();
    generatedQuestion.difficulty = difficulty;

    res.json({
      message: 'Questão gerada com sucesso',
      question: generatedQuestion,
      provider: aiProvider,
      model: aiProvider === 'gemini' ? GEMINI_MODEL : 'gpt-3.5-turbo'
    });

  } catch (error) {
    console.error('Erro ao gerar questão com IA:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar questão',
      details: error.message,
      tip: 'Verifique se a API key está configurada corretamente'
    });
  }
});

// Verificar status das APIs de IA
app.get('/api/ai/status', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    gemini: {
      available: !!genAI,
      configured: !!process.env.GEMINI_API_KEY,
      model: GEMINI_MODEL,
      configuredValue: GEMINI_MODEL_RAW,
      apiModelPath: `models/${GEMINI_MODEL}`,
      defaultModel: DEFAULT_GEMINI_MODEL,
      info: 'Google Gemini - Gratuito com limites'
    },
    chatgpt: {
      available: !!openai,
      configured: !!process.env.OPENAI_API_KEY,
      info: 'OpenAI ChatGPT - Requer créditos'
    },
    images: {
      available: true,
      defaultProvider: 'pollinations',
      providers: ['pollinations'],
      info: 'Image generation via Pollinations AI (gratuito, sem necessidade de chave)'
    }
  });
});

// ==================== ROTAS DE QUIZZES ====================

// Listar todos os quizzes
app.get('/api/quizzes', async (req, res) => {
  try {
    const quizzes = await db.getQuizzes();
    res.json(quizzes);
  } catch (error) {
    console.error('Erro ao listar quizzes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo quiz (apenas admin)
app.post('/api/quizzes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, courseId, questionIds } = req.body;

    if (!name || !courseId) {
      return res.status(400).json({ error: 'Nome e curso são obrigatórios' });
    }

    // Validar se o curso existe
    const course = await db.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Validar se as questões existem e pertencem ao curso
    const validQuestionIds = questionIds || [];
    const questions = await db.getQuestions();
    const invalidQuestions = validQuestionIds.filter(qId => {
      const question = questions.find(q => String(q.id) === String(qId));
      return !question || question.courseId !== courseId;
    });

    if (invalidQuestions.length > 0) {
      console.log('Questões inválidas:', invalidQuestions);
      console.log('Questões do curso:', questions.filter(q => q.courseId === courseId).map(q => q.id));
      return res.status(400).json({ 
        error: 'Algumas questões são inválidas ou não pertencem ao curso selecionado',
        invalidQuestions
      });
    }

    const nextId = await db.getNextId('quizzes');
    const quiz = {
      id: nextId,
      name,
      description: description || '',
      courseId,
      questionIds: validQuestionIds,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    await db.createQuiz(quiz);

    res.status(201).json({ message: 'Quiz criado com sucesso', quiz });
  } catch (error) {
    console.error('Erro ao criar quiz:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de um quiz específico
app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    const quiz = await db.getQuizById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    // Incluir detalhes das questões
    const questions = await db.getQuestions();
    const quizQuestions = quiz.questionIds.map(qId => 
      questions.find(q => q.id === qId)
    ).filter(q => q !== undefined);

    const course = await db.getCourseById(quiz.courseId);

    res.json({
      ...quiz,
      questions: quizQuestions,
      course
    });
  } catch (error) {
    console.error('Erro ao obter quiz:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar quiz (apenas admin)
app.put('/api/quizzes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    const { name, description, questionIds } = req.body;

    const quiz = await db.getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    // Validar questões se fornecidas
    if (questionIds !== undefined) {
      const questions = await db.getQuestions();
      const invalidQuestions = questionIds.filter(qId => {
        const question = questions.find(q => q.id === qId);
        return !question || question.courseId !== quiz.courseId;
      });

      if (invalidQuestions.length > 0) {
        return res.status(400).json({ 
          error: 'Algumas questões são inválidas ou não pertencem ao curso do quiz',
          invalidQuestions
        });
      }
    }

    const updates = {
      name: name || quiz.name,
      description: description !== undefined ? description : quiz.description,
      questionIds: questionIds !== undefined ? questionIds : quiz.questionIds,
      updatedAt: new Date().toISOString()
    };

    const updatedQuiz = await db.updateQuiz(quizId, updates);

    res.json({ message: 'Quiz atualizado com sucesso', quiz: updatedQuiz });
  } catch (error) {
    console.error('Erro ao atualizar quiz:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar quiz (apenas admin)
app.delete('/api/quizzes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const quizId = parseInt(req.params.id);
    
    const quiz = await db.getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    await db.deleteQuiz(quizId);

    res.json({ message: 'Quiz deletado com sucesso', quiz });
  } catch (error) {
    console.error('Erro ao deletar quiz:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar quizzes de um curso específico
app.get('/api/courses/:courseId/quizzes', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const quizzes = await db.getQuizzes();
    const courseQuizzes = quizzes.filter(q => q.courseId === courseId);

    res.json(courseQuizzes);
  } catch (error) {
    console.error('Erro ao listar quizzes do curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE FEEDBACK ====================

// Enviar feedback (qualquer usuário, autenticado ou não)
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, message, type } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    const nextId = await db.getNextId('feedbacks');
    const feedback = {
      id: nextId,
      name: name || 'Anônimo',
      email: email || null,
      message: message.trim(),
      type: type || 'sugestao', // 'sugestao', 'bug', 'elogio', 'reclamacao'
      status: 'novo', // 'novo', 'lido', 'respondido'
      createdAt: new Date().toISOString()
    };

    await db.createFeedback(feedback);

    res.status(201).json({ 
      message: 'Feedback enviado com sucesso! Obrigado pela contribuição.',
      feedback 
    });
  } catch (error) {
    console.error('Erro ao enviar feedback:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os feedbacks (apenas admin)
app.get('/api/admin/feedbacks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status; // Filtrar por status (opcional)
    
    const feedbacks = await db.getFeedbacks();
    let filteredFeedbacks = [...feedbacks];
    
    if (status) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.status === status);
    }
    
    // Ordenar por data (mais recente primeiro)
    filteredFeedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ 
      feedbacks: filteredFeedbacks, 
      total: filteredFeedbacks.length,
      novo: feedbacks.filter(f => f.status === 'novo').length,
      lido: feedbacks.filter(f => f.status === 'lido').length,
      respondido: feedbacks.filter(f => f.status === 'respondido').length
    });
  } catch (error) {
    console.error('Erro ao listar feedbacks:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status do feedback (apenas admin)
app.put('/api/admin/feedbacks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!['novo', 'lido', 'respondido'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    const feedback = await db.getFeedbackById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback não encontrado' });
    }
    
    const updates = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    const updatedFeedback = await db.updateFeedback(feedbackId, updates);
    
    res.json({ message: 'Status atualizado com sucesso', feedback: updatedFeedback });
  } catch (error) {
    console.error('Erro ao atualizar feedback:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar feedback (apenas admin)
app.delete('/api/admin/feedbacks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    
    const feedback = await db.getFeedbackById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback não encontrado' });
    }
    
    await db.deleteFeedback(feedbackId);
    
    res.json({ message: 'Feedback deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar feedback:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTA DE TESTE ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor rodando!',
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    users: users.length,
    courses: courses.length,
    questions: questions.length
  });
});

// Servir o index.html para qualquer rota não reconhecida (SPA routing)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Rota não encontrada' });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Available at your primary URL`);
  console.log(`==>`);
  console.log(`==> Your service is live 🎉`);
  console.log(`==>`);
});
