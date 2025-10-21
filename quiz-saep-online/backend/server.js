const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_default_nao_usar_em_producao';

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static('../frontend'));

// "Banco de dados" em memória (para produção, usar MongoDB, PostgreSQL, etc.)
const users = [];
const scores = [];
const courses = [];
const questions = [];

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@quiz.com',
  password: 'admin123'
};

const DEFAULT_COURSE = {
  name: 'Programação de Jogos Digitais',
  description: 'Curso completo sobre desenvolvimento de jogos, cobrindo conceitos fundamentais de game design, programação e mecânicas de jogo.',
  category: 'Tecnologia',
  color: '#6366f1'
};

const QUESTIONS_FILE_PATH = path.join(__dirname, '../shared/questions.json');

function seedInitialData() {
  try {
    let admin = users.find(u => u.role === 'admin');
    if (!admin) {
      const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN.password, 10);
      admin = {
        id: users.length + 1,
        username: DEFAULT_ADMIN.username,
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      users.push(admin);
      console.log('✅ Admin padrão criado automaticamente');
    }

    let course = courses.find(c => c.name === DEFAULT_COURSE.name);
    if (!course) {
      course = {
        id: courses.length + 1,
        ...DEFAULT_COURSE,
        createdBy: admin.id,
        createdAt: new Date().toISOString()
      };
      courses.push(course);
      console.log('✅ Curso padrão criado automaticamente');
    }

    if (questions.length === 0 && fs.existsSync(QUESTIONS_FILE_PATH)) {
      const fileContent = fs.readFileSync(QUESTIONS_FILE_PATH, 'utf8');
      const questionsData = JSON.parse(fileContent);

      questionsData.forEach((q, index) => {
        const alreadyExists = questions.some(existing => existing.id === q.id && existing.courseId === course.id);
        if (alreadyExists) {
          return;
        }

        questions.push({
          id: q.id || `Q${index + 1}`,
          courseId: course.id,
          capacidade: q.capacidade || 'Geral',
          context: q.context || '',
          command: q.command || '',
          options: q.options || [],
          createdBy: admin.id,
          createdAt: new Date().toISOString()
        });
      });

      console.log(`✅ ${questions.length} questões carregadas automaticamente`);
    }
  } catch (error) {
    console.error('⚠️  Falha ao carregar dados iniciais:', error.message);
  }
}

seedInitialData();

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
    const userExists = users.find(u => u.email === email || u.username === username);
    if (userExists) {
      return res.status(400).json({ error: 'Usuário ou email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      role: 'user', // 'user' ou 'admin'
      createdAt: new Date().toISOString()
    };

    users.push(user);

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
    const user = users.find(u => u.email === email);
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
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
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
    const adminExists = users.find(u => u.role === 'admin');
    if (adminExists) {
      return res.status(400).json({ error: 'Admin já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    users.push(admin);

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

// Listar todos os cursos
app.get('/api/courses', (req, res) => {
  try {
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
app.post('/api/courses', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, description, category, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do curso é obrigatório' });
    }

    const course = {
      id: courses.length + 1,
      name,
      description: description || '',
      category: category || 'Geral',
      color: color || '#3b82f6',
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    courses.push(course);

    res.status(201).json({ message: 'Curso criado com sucesso', course });
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar curso (apenas admin)
app.put('/api/courses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { name, description, category, color } = req.body;

    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    courses[courseIndex] = {
      ...courses[courseIndex],
      name: name || courses[courseIndex].name,
      description: description !== undefined ? description : courses[courseIndex].description,
      category: category || courses[courseIndex].category,
      color: color || courses[courseIndex].color,
      updatedAt: new Date().toISOString()
    };

    res.json({ message: 'Curso atualizado com sucesso', course: courses[courseIndex] });
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar curso (apenas admin)
app.delete('/api/courses/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    
    const courseIndex = courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Remover questões e pontuações do curso
    const questionIds = questions.filter(q => q.courseId === courseId).map(q => q.id);
    questions.splice(0, questions.length, ...questions.filter(q => q.courseId !== courseId));
    scores.splice(0, scores.length, ...scores.filter(s => s.courseId !== courseId));

    courses.splice(courseIndex, 1);

    res.json({ message: 'Curso deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar curso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE QUESTÕES ====================

// Listar questões de um curso
app.get('/api/courses/:courseId/questions', (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const courseQuestions = questions.filter(q => q.courseId === courseId);
    
    res.json({ questions: courseQuestions, total: courseQuestions.length });
  } catch (error) {
    console.error('Erro ao listar questões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar questão (apenas admin)
app.post('/api/courses/:courseId/questions', authenticateToken, requireAdmin, (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { id, capacidade, context, command, options } = req.body;

    if (!id || !context || !command || !options || options.length === 0) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Verificar se curso existe
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Verificar se ID já existe
    if (questions.find(q => q.id === id && q.courseId === courseId)) {
      return res.status(400).json({ error: 'ID de questão já existe neste curso' });
    }

    const question = {
      id,
      courseId,
      capacidade: capacidade || 'Geral',
      context,
      command,
      options,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    questions.push(question);

    res.status(201).json({ message: 'Questão criada com sucesso', question });
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Importar questões em lote (JSON ou CSV) (apenas admin)
app.post('/api/courses/:courseId/questions/import', authenticateToken, requireAdmin, (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { questionsData, format } = req.body;

    if (!questionsData || !Array.isArray(questionsData)) {
      return res.status(400).json({ error: 'Dados de questões inválidos' });
    }

    // Verificar se curso existe
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    let imported = 0;
    let errors = [];

    questionsData.forEach((q, index) => {
      try {
        // Validar questão
        if (!q.id || !q.context || !q.command || !q.options) {
          errors.push({ index: index + 1, error: 'Dados incompletos', question: q });
          return;
        }

        // Verificar se ID já existe
        if (questions.find(existingQ => existingQ.id === q.id && existingQ.courseId === courseId)) {
          errors.push({ index: index + 1, error: 'ID já existe', id: q.id });
          return;
        }

        const question = {
          id: q.id,
          courseId,
          capacidade: q.capacidade || 'Geral',
          context: q.context,
          command: q.command,
          options: q.options,
          createdBy: req.user.id,
          createdAt: new Date().toISOString()
        };

        questions.push(question);
        imported++;
      } catch (err) {
        errors.push({ index: index + 1, error: err.message });
      }
    });

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
app.delete('/api/courses/:courseId/questions/:questionId', authenticateToken, requireAdmin, (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const questionId = req.params.questionId;

    const questionIndex = questions.findIndex(q => q.id === questionId && q.courseId === courseId);
    if (questionIndex === -1) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }

    questions.splice(questionIndex, 1);

    res.json({ message: 'Questão deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar questão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE PONTUAÇÃO ====================

// Salvar pontuação
app.post('/api/scores', authenticateToken, (req, res) => {
  try {
    const { courseId, score, totalQuestions, timeSpent, answersDetail } = req.body;

    // Validações
    if (score === undefined || !totalQuestions || !courseId) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Verificar se curso existe
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    const scoreEntry = {
      id: scores.length + 1,
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

    scores.push(scoreEntry);

    res.status(201).json({
      message: 'Pontuação salva com sucesso',
      scoreEntry
    });
  } catch (error) {
    console.error('Erro ao salvar pontuação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter histórico de pontuações do usuário
app.get('/api/scores/user', authenticateToken, (req, res) => {
  try {
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
app.get('/api/ranking', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const period = req.query.period || 'all'; // all, today, week, month
    const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;

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
app.get('/api/stats', (req, res) => {
  try {
    const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;
    
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
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalUsers = users.length;
    const totalCourses = courses.length;
    const totalQuestions = questions.length;
    const totalAttempts = scores.length;
    
    // Usuários ativos (com pelo menos uma tentativa)
    const activeUsers = new Set(scores.map(s => s.userId)).size;
    
    // Curso mais popular
    const coursePopularity = {};
    scores.forEach(s => {
      coursePopularity[s.courseId] = (coursePopularity[s.courseId] || 0) + 1;
    });
    
    const mostPopularCourseId = Object.keys(coursePopularity).length > 0
      ? parseInt(Object.keys(coursePopularity).reduce((a, b) => coursePopularity[a] > coursePopularity[b] ? a : b))
      : null;
    
    const mostPopularCourse = mostPopularCourseId ? courses.find(c => c.id === mostPopularCourseId) : null;
    
    // Média geral de acertos
    const averageScore = scores.length > 0
      ? (scores.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / scores.length).toFixed(2)
      : 0;
    
    // Últimas atividades
    const recentActivities = scores
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(s => ({
        username: s.username,
        courseName: s.courseName,
        percentage: s.percentage,
        date: s.createdAt
      }));
    
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

// Listar todos os usuários (admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
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
app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role inválida' });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    users[userIndex].role = role;
    
    res.json({ message: 'Role atualizada com sucesso', user: users[userIndex] });
  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar usuário (admin)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Remover pontuações do usuário
    scores.splice(0, scores.length, ...scores.filter(s => s.userId !== userId));
    
    users.splice(userIndex, 1);
    
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório detalhado por curso (admin)
app.get('/api/admin/reports/course/:courseId', authenticateToken, requireAdmin, (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
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
app.get('/api/admin/export/:type', authenticateToken, requireAdmin, (req, res) => {
  try {
    const type = req.params.type; // 'users', 'scores', 'courses'
    
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

// ==================== ROTA DE TESTE ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor rodando!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
