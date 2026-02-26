// db.js - Módulo de integração com Firebase Realtime Database
const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
let db = null;

function initializeFirebase() {
  try {
    // Verificar se as credenciais do Firebase estão configuradas
    if (process.env.FIREBASE_CREDENTIALS) {
      // Credenciais no formato JSON (usado no Render)
      const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      console.log('✅ Firebase inicializado com credenciais do ambiente');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Credenciais separadas em variáveis individuais
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      console.log('✅ Firebase inicializado com variáveis separadas');
    } else {
      console.warn('⚠️ Firebase não configurado - usando memória local (dados serão perdidos ao reiniciar)');
      return null;
    }
    
    db = admin.database();
    return db;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error.message);
    console.warn('⚠️ Continuando com armazenamento em memória');
    return null;
  }
}

// Wrapper para operações de banco de dados (Firebase ou memória)
class Database {
  constructor() {
    this.firebase = initializeFirebase();
    
    // Fallback: arrays em memória caso Firebase não esteja configurado
    this.memory = {
      users: [],
      courses: [],
      questions: [],
      quizzes: [],
      scores: [],
      feedbacks: [],
      turmas: []
    };
  }

  // ==================== USERS ====================
  
  async getUsers() {
    if (this.firebase) {
      const snapshot = await db.ref('users').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.users;
  }

  async getUserById(id) {
    if (this.firebase) {
      const snapshot = await db.ref(`users/${id}`).once('value');
      return snapshot.val();
    }
    return this.memory.users.find(u => u.id === id);
  }

  async getUserByEmail(email) {
    if (this.firebase) {
      const snapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
      const users = snapshot.val();
      return users ? Object.values(users)[0] : null;
    }
    return this.memory.users.find(u => u.email === email);
  }

  async getUserByUsername(username) {
    if (this.firebase) {
      const snapshot = await db.ref('users').orderByChild('username').equalTo(username).once('value');
      const users = snapshot.val();
      return users ? Object.values(users)[0] : null;
    }
    return this.memory.users.find(u => u.username === username);
  }

  async createUser(user) {
    if (this.firebase) {
      await db.ref(`users/${user.id}`).set(user);
      return user;
    }
    this.memory.users.push(user);
    return user;
  }

  async updateUser(id, updates) {
    if (this.firebase) {
      await db.ref(`users/${id}`).update(updates);
      const snapshot = await db.ref(`users/${id}`).once('value');
      return snapshot.val();
    }
    const index = this.memory.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.memory.users[index] = { ...this.memory.users[index], ...updates };
      return this.memory.users[index];
    }
    return null;
  }

  async deleteUser(id) {
    if (this.firebase) {
      await db.ref(`users/${id}`).remove();
      return true;
    }
    const index = this.memory.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.memory.users.splice(index, 1);
      return true;
    }
    return false;
  }

  // ==================== COURSES ====================
  
  async getCourses() {
    if (this.firebase) {
      const snapshot = await db.ref('courses').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.courses;
  }

  async getCourseById(id) {
    if (this.firebase) {
      const snapshot = await db.ref(`courses/${id}`).once('value');
      return snapshot.val();
    }
    return this.memory.courses.find(c => c.id === id);
  }

  async createCourse(course) {
    if (this.firebase) {
      await db.ref(`courses/${course.id}`).set(course);
      return course;
    }
    this.memory.courses.push(course);
    return course;
  }

  async updateCourse(id, updates) {
    if (this.firebase) {
      await db.ref(`courses/${id}`).update(updates);
      const snapshot = await db.ref(`courses/${id}`).once('value');
      return snapshot.val();
    }
    const index = this.memory.courses.findIndex(c => c.id === id);
    if (index !== -1) {
      this.memory.courses[index] = { ...this.memory.courses[index], ...updates };
      return this.memory.courses[index];
    }
    return null;
  }

  async deleteCourse(id) {
    if (this.firebase) {
      await db.ref(`courses/${id}`).remove();
      return true;
    }
    const index = this.memory.courses.findIndex(c => c.id === id);
    if (index !== -1) {
      this.memory.courses.splice(index, 1);
      return true;
    }
    return false;
  }

  // ==================== QUESTIONS ====================
  
  async getQuestions() {
    if (this.firebase) {
      const snapshot = await db.ref('questions').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.questions;
  }

  async getQuestionsByCourse(courseId) {
    if (this.firebase) {
      const snapshot = await db.ref('questions').orderByChild('courseId').equalTo(courseId).once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.questions.filter(q => q.courseId === courseId);
  }

  async getQuestionById(courseId, questionId) {
    if (this.firebase) {
      // Buscar diretamente pela chave composta
      const key = `${courseId}_${questionId}`;
      const snapshot = await db.ref(`questions/${key}`).once('value');
      return snapshot.val();
    }
    return this.memory.questions.find(q => q.id === questionId && q.courseId === courseId);
  }

  async createQuestion(question) {
    if (this.firebase) {
      const key = `${question.courseId}_${question.id}`;
      await db.ref(`questions/${key}`).set(question);
      return question;
    }
    this.memory.questions.push(question);
    return question;
  }

  async deleteQuestion(courseId, questionId) {
    if (this.firebase) {
      const key = `${courseId}_${questionId}`;
      await db.ref(`questions/${key}`).remove();
      return true;
    }
    const index = this.memory.questions.findIndex(q => q.id === questionId && q.courseId === courseId);
    if (index !== -1) {
      this.memory.questions.splice(index, 1);
      return true;
    }
    return false;
  }

  async deleteQuestionsByCourse(courseId) {
    if (this.firebase) {
      const snapshot = await db.ref('questions').orderByChild('courseId').equalTo(courseId).once('value');
      const questions = snapshot.val();
      if (questions) {
        const updates = {};
        Object.keys(questions).forEach(key => {
          updates[`questions/${key}`] = null;
        });
        await db.ref().update(updates);
      }
      return true;
    }
    this.memory.questions = this.memory.questions.filter(q => q.courseId !== courseId);
    return true;
  }

  // ==================== QUIZZES ====================
  
  async getQuizzes() {
    if (this.firebase) {
      const snapshot = await db.ref('quizzes').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.quizzes;
  }

  async getQuizById(id) {
    if (this.firebase) {
      const snapshot = await db.ref(`quizzes/${id}`).once('value');
      return snapshot.val();
    }
    return this.memory.quizzes.find(q => q.id === id);
  }

  async getQuizzesByCourse(courseId) {
    if (this.firebase) {
      const snapshot = await db.ref('quizzes').orderByChild('courseId').equalTo(courseId).once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.quizzes.filter(q => q.courseId === courseId);
  }

  async createQuiz(quiz) {
    if (this.firebase) {
      await db.ref(`quizzes/${quiz.id}`).set(quiz);
      return quiz;
    }
    this.memory.quizzes.push(quiz);
    return quiz;
  }

  async updateQuiz(id, updates) {
    if (this.firebase) {
      await db.ref(`quizzes/${id}`).update(updates);
      const snapshot = await db.ref(`quizzes/${id}`).once('value');
      return snapshot.val();
    }
    const index = this.memory.quizzes.findIndex(q => q.id === id);
    if (index !== -1) {
      this.memory.quizzes[index] = { ...this.memory.quizzes[index], ...updates };
      return this.memory.quizzes[index];
    }
    return null;
  }

  async deleteQuiz(id) {
    if (this.firebase) {
      await db.ref(`quizzes/${id}`).remove();
      return true;
    }
    const index = this.memory.quizzes.findIndex(q => q.id === id);
    if (index !== -1) {
      this.memory.quizzes.splice(index, 1);
      return true;
    }
    return false;
  }

  // ==================== SCORES ====================
  
  async getScores() {
    if (this.firebase) {
      const snapshot = await db.ref('scores').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.scores;
  }

  async getScoresByUser(userId) {
    if (this.firebase) {
      const snapshot = await db.ref('scores').orderByChild('userId').equalTo(userId).once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.scores.filter(s => s.userId === userId);
  }

  async getScoresByCourse(courseId) {
    if (this.firebase) {
      const snapshot = await db.ref('scores').orderByChild('courseId').equalTo(courseId).once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.scores.filter(s => s.courseId === courseId);
  }

  async createScore(score) {
    if (this.firebase) {
      await db.ref(`scores/${score.id}`).set(score);
      return score;
    }
    this.memory.scores.push(score);
    return score;
  }

  async deleteScore(id) {
    if (this.firebase) {
      await db.ref(`scores/${id}`).remove();
      return true;
    }
    const index = this.memory.scores.findIndex(s => s.id === id);
    if (index !== -1) {
      this.memory.scores.splice(index, 1);
      return true;
    }
    return false;
  }

  async deleteScoresByUser(userId) {
    if (this.firebase) {
      const snapshot = await db.ref('scores').orderByChild('userId').equalTo(userId).once('value');
      const scores = snapshot.val();
      if (scores) {
        const updates = {};
        Object.keys(scores).forEach(key => {
          updates[`scores/${key}`] = null;
        });
        await db.ref().update(updates);
      }
      return true;
    }
    this.memory.scores = this.memory.scores.filter(s => s.userId !== userId);
    return true;
  }

  async deleteScoresByCourse(courseId) {
    if (this.firebase) {
      const snapshot = await db.ref('scores').orderByChild('courseId').equalTo(courseId).once('value');
      const scores = snapshot.val();
      if (scores) {
        const updates = {};
        Object.keys(scores).forEach(key => {
          updates[`scores/${key}`] = null;
        });
        await db.ref().update(updates);
      }
      return true;
    }
    this.memory.scores = this.memory.scores.filter(s => s.courseId !== courseId);
    return true;
  }

  // ==================== FEEDBACKS ====================
  
  async getFeedbacks() {
    if (this.firebase) {
      const snapshot = await db.ref('feedbacks').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.feedbacks;
  }

  async getFeedbackById(id) {
    if (this.firebase) {
      const snapshot = await db.ref(`feedbacks/${id}`).once('value');
      return snapshot.val();
    }
    return this.memory.feedbacks.find(f => f.id === id);
  }

  async getFeedbacksByStatus(status) {
    if (this.firebase) {
      const snapshot = await db.ref('feedbacks').orderByChild('status').equalTo(status).once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.feedbacks.filter(f => f.status === status);
  }

  async createFeedback(feedback) {
    if (this.firebase) {
      await db.ref(`feedbacks/${feedback.id}`).set(feedback);
      return feedback;
    }
    this.memory.feedbacks.push(feedback);
    return feedback;
  }

  async updateFeedback(id, updates) {
    if (this.firebase) {
      await db.ref(`feedbacks/${id}`).update(updates);
      const snapshot = await db.ref(`feedbacks/${id}`).once('value');
      return snapshot.val();
    }
    const index = this.memory.feedbacks.findIndex(f => f.id === id);
    if (index !== -1) {
      this.memory.feedbacks[index] = { ...this.memory.feedbacks[index], ...updates };
      return this.memory.feedbacks[index];
    }
    return null;
  }

  async deleteFeedback(id) {
    if (this.firebase) {
      await db.ref(`feedbacks/${id}`).remove();
      return true;
    }
    const index = this.memory.feedbacks.findIndex(f => f.id === id);
    if (index !== -1) {
      this.memory.feedbacks.splice(index, 1);
      return true;
    }
    return false;
  }

  // ==================== TURMAS ====================

  async getTurmas() {
    if (this.firebase) {
      const snapshot = await db.ref('turmas').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return this.memory.turmas || [];
  }

  async getTurmaById(id) {
    if (this.firebase) {
      const snapshot = await db.ref(`turmas/${id}`).once('value');
      return snapshot.val();
    }
    return (this.memory.turmas || []).find(t => t.id === id);
  }

  async createTurma(turma) {
    if (this.firebase) {
      await db.ref(`turmas/${turma.id}`).set(turma);
      return turma;
    }
    if (!this.memory.turmas) this.memory.turmas = [];
    this.memory.turmas.push(turma);
    return turma;
  }

  async updateTurma(id, updates) {
    if (this.firebase) {
      await db.ref(`turmas/${id}`).update(updates);
      const snapshot = await db.ref(`turmas/${id}`).once('value');
      return snapshot.val();
    }
    const index = (this.memory.turmas || []).findIndex(t => t.id === id);
    if (index !== -1) {
      this.memory.turmas[index] = { ...this.memory.turmas[index], ...updates };
      return this.memory.turmas[index];
    }
    return null;
  }

  async deleteTurma(id) {
    if (this.firebase) {
      await db.ref(`turmas/${id}`).remove();
      return true;
    }
    const index = (this.memory.turmas || []).findIndex(t => t.id === id);
    if (index !== -1) {
      this.memory.turmas.splice(index, 1);
      return true;
    }
    return false;
  }

  async getTurmasByProfessor(professorId) {
    if (this.firebase) {
      const snapshot = await db.ref('turmas').orderByChild('professorId').equalTo(professorId).once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    return (this.memory.turmas || []).filter(t => t.professorId === professorId);
  }

  // ==================== GAMIFICATION ====================

  async getGamificationProfile(userId) {
    if (this.firebase) {
      const snapshot = await db.ref(`gamification/${userId}`).once('value');
      return snapshot.val();
    }
    if (!this.memory.gamification) this.memory.gamification = {};
    return this.memory.gamification[userId] || null;
  }

  async saveGamificationProfile(userId, profile) {
    if (this.firebase) {
      await db.ref(`gamification/${userId}`).set(profile);
      return profile;
    }
    if (!this.memory.gamification) this.memory.gamification = {};
    this.memory.gamification[userId] = profile;
    return profile;
  }

  async updateGamificationProfile(userId, updates) {
    if (this.firebase) {
      await db.ref(`gamification/${userId}`).update(updates);
      const snapshot = await db.ref(`gamification/${userId}`).once('value');
      return snapshot.val();
    }
    if (!this.memory.gamification) this.memory.gamification = {};
    if (this.memory.gamification[userId]) {
      this.memory.gamification[userId] = { ...this.memory.gamification[userId], ...updates };
    }
    return this.memory.gamification[userId] || null;
  }

  async getAllGamificationProfiles() {
    if (this.firebase) {
      const snapshot = await db.ref('gamification').once('value');
      return snapshot.val() ? Object.values(snapshot.val()) : [];
    }
    if (!this.memory.gamification) this.memory.gamification = {};
    return Object.values(this.memory.gamification);
  }

  // ==================== HELPERS ====================
  
  async getNextId(collection) {
    if (this.firebase) {
      // Usar transação para evitar IDs duplicados
      const ref = db.ref(`_counters/${collection}`);
      const result = await ref.transaction((current) => {
        return (current || 0) + 1;
      });
      if (result.committed) {
        return result.snapshot.val();
      }
      // Fallback: método antigo
      const snapshot = await db.ref(collection).once('value');
      const items = snapshot.val() ? Object.values(snapshot.val()) : [];
      if (items.length === 0) return 1;
      return Math.max(...items.map(item => item.id || 0)) + 1;
    }
    const items = this.memory[collection];
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map(item => item.id || 0)) + 1;
  }

  isFirebaseEnabled() {
    return this.firebase !== null;
  }

  async resetAll() {
    if (this.firebase) {
      await db.ref('/').set(null);
    }
    this.memory = {
      users: [],
      courses: [],
      questions: [],
      quizzes: [],
      scores: [],
      feedbacks: [],
      turmas: []
    };
    return true;
  }
}

module.exports = new Database();
