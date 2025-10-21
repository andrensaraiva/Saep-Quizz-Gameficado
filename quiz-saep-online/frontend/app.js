// Configuração da API
const RENDER_API_URL = 'https://SUA-URL-RENDER.onrender.com/api'; // TODO: substitua pela URL real da Render
const LOCAL_API_URL = 'http://localhost:3000/api';

const API_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return LOCAL_API_URL;
    }

    if (host.includes('github.io')) {
        return RENDER_API_URL;
    }

    return LOCAL_API_URL;
})();

// Estado Global
let quizData = [];
let courses = [];
let currentCourse = null;
let currentUser = null;
let currentToken = null;
let startTime = null;
let timerInterval = null;
let currentAnswers = {};
let currentResults = null;

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar se há token salvo
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        currentToken = savedToken;
        await verifyToken();
    }

    await loadCourses();
    await loadQuestions();
});

// ==================== AUTENTICAÇÃO ====================

function showAuthModal(type) {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (type === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
    
    modal.style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Erro ao fazer login');
            return;
        }
        
        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', data.token);
        
        updateUserInterface();
        closeAuthModal();
        alert('Login realizado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Erro ao cadastrar');
            return;
        }
        
        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', data.token);
        
        updateUserInterface();
        closeAuthModal();
        alert('Cadastro realizado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserInterface();
        } else {
            logout();
        }
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        logout();
    }
}

function logout() {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('token');
    updateUserInterface();
    backToMenu();
}

function updateUserInterface() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const profileBtn = document.getElementById('profile-btn');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        profileBtn.style.display = 'block';
        document.getElementById('username-display').textContent = `👋 ${currentUser.username}`;

        if (adminPanelBtn) {
            adminPanelBtn.style.display = currentUser.role === 'admin' ? 'block' : 'none';
        }
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
        profileBtn.style.display = 'none';

        if (adminPanelBtn) {
            adminPanelBtn.style.display = 'none';
        }
    }
}

// ==================== CARREGAR QUESTÕES ====================

async function loadCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao carregar cursos');
        }

        courses = data.courses || [];
        currentCourse = courses.length > 0 ? courses[0] : null;

        updateCourseDetails();
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        alert('Erro ao carregar informações do curso. Verifique se o servidor está rodando e se há cursos cadastrados.');
        courses = [];
        currentCourse = null;
        updateCourseDetails();
    }
}

async function loadQuestions(courseId = currentCourse ? currentCourse.id : null) {
    if (!courseId) {
        quizData = [];
        updateQuestionCounters();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/questions`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao carregar questões');
        }

        quizData = data.questions || [];
        updateQuestionCounters();
    } catch (error) {
        console.error('Erro ao carregar questões:', error);
        alert('Erro ao carregar as questões. Verifique se o servidor está rodando e se o curso possui questões cadastradas.');
        quizData = [];
        updateQuestionCounters();
    }
}

function updateCourseDetails() {
    const courseNameEl = document.getElementById('course-name-display');
    const courseDescriptionEl = document.getElementById('course-description');
    const courseCategoryEl = document.getElementById('course-category');
    const courseCapacitiesEl = document.getElementById('course-capacities');

    if (currentCourse) {
        if (courseNameEl) {
            courseNameEl.textContent = currentCourse.name;
        }
        if (courseDescriptionEl) {
            courseDescriptionEl.textContent = currentCourse.description || 'Curso disponível para avaliação.';
        }
        if (courseCategoryEl) {
            courseCategoryEl.textContent = currentCourse.category || 'Geral';
        }
        if (courseCapacitiesEl) {
            courseCapacitiesEl.textContent = currentCourse.capacitiesLabel || 'Variadas';
        }
    } else {
        if (courseNameEl) {
            courseNameEl.textContent = 'Nenhum curso disponível';
        }
        if (courseDescriptionEl) {
            courseDescriptionEl.textContent = 'Cadastre um curso pelo painel administrativo para iniciar o quiz.';
        }
        if (courseCategoryEl) {
            courseCategoryEl.textContent = '-';
        }
        if (courseCapacitiesEl) {
            courseCapacitiesEl.textContent = '-';
        }
    }
}

function updateQuestionCounters() {
    document.getElementById('total-questions').textContent = quizData.length;
    document.getElementById('total-questions-display').textContent = quizData.length;
}

// ==================== NAVEGAÇÃO ====================

function backToMenu() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('report-container').style.display = 'none';
    document.getElementById('ranking-container').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
}

// ==================== QUIZ ====================

function startQuiz() {
    if (quizData.length === 0) {
        alert('Nenhuma questão disponível para este curso. Verifique o painel administrativo.');
        return;
    }

    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    
    buildQuiz();
    startTimer();
}

function buildQuiz() {
    const quizForm = document.getElementById('quiz-form');
    let questionsHtml = '';
    
    // Embaralhar questões e opções
    const shuffledQuiz = [...quizData].sort(() => Math.random() - 0.5);
    
    shuffledQuiz.forEach((q, index) => {
        const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
        q.correctIndex = shuffledOptions.findIndex(option => option.correct);
        q.shuffledOptions = shuffledOptions;
        
        questionsHtml += `
            <div class="question-block" id="${q.id}">
                <h4>Questão ${index + 1} (Capacidade: ${q.capacidade})</h4>
                <p class="context">${q.context}</p>
                <p class="command">${q.command}</p>
                <div class="options-container">
        `;
        
        shuffledOptions.forEach((option, optionIndex) => {
            questionsHtml += `
                <label>
                    <input type="radio" name="${q.id}" value="${optionIndex}">
                    ${String.fromCharCode(65 + optionIndex)}) ${option.text}
                </label>
            `;
        });
        
        questionsHtml += `
                </div>
                <div class="feedback" id="feedback-${q.id}"></div>
            </div>
        `;
    });
    
    quizForm.innerHTML = questionsHtml;
    window.shuffledQuizData = shuffledQuiz;
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('timer-display').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ==================== VERIFICAR RESPOSTAS ====================

document.getElementById('submit-btn').addEventListener('click', function() {
    if (!confirm('Deseja finalizar e verificar suas respostas?')) {
        return;
    }
    
    clearInterval(timerInterval);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    let score = 0;
    const wrongQuestions = [];
    const answersDetail = [];
    const capacityStats = {};
    
    window.shuffledQuizData.forEach((q, index) => {
        const questionBlock = document.getElementById(q.id);
        const feedbackEl = document.getElementById(`feedback-${q.id}`);
        const selectedOptionEl = document.querySelector(`input[name="${q.id}"]:checked`);
        
        questionBlock.classList.remove('correct', 'incorrect');
        feedbackEl.style.display = 'none';
        
        // Inicializar estatística de capacidade
        if (!capacityStats[q.capacidade]) {
            capacityStats[q.capacidade] = { correct: 0, total: 0 };
        }
        capacityStats[q.capacidade].total++;
        
        const isCorrect = selectedOptionEl && parseInt(selectedOptionEl.value) === q.correctIndex;
        
        answersDetail.push({
            questionId: q.id,
            capacity: q.capacidade,
            correct: isCorrect
        });
        
        if (isCorrect) {
            score++;
            capacityStats[q.capacidade].correct++;
            questionBlock.classList.add('correct');
        } else {
            questionBlock.classList.add('incorrect');
            wrongQuestions.push({ number: index + 1, id: q.id });
            
            const userAnswerIndex = selectedOptionEl ? parseInt(selectedOptionEl.value) : -1;
            const chosenOption = userAnswerIndex >= 0 ? q.shuffledOptions[userAnswerIndex] : null;
            const correctOption = q.shuffledOptions[q.correctIndex];
            
            let feedbackHtml = `
                <p class="correct-answer-text">✓ Resposta Correta: ${correctOption.text}</p>
            `;
            
            if (chosenOption) {
                feedbackHtml += `
                    <div class="justification">
                        <strong>Por que sua resposta está incorreta:</strong>
                        <p>${chosenOption.justification}</p>
                    </div>
                `;
            } else {
                feedbackHtml += `<p><strong>Você não respondeu esta questão.</strong></p>`;
            }
            
            feedbackEl.innerHTML = feedbackHtml;
            feedbackEl.style.display = 'block';
        }
    });
    
    // Salvar resultados
    currentResults = {
        score,
        totalQuestions: window.shuffledQuizData.length,
        timeSpent,
        answersDetail,
        capacityStats,
        wrongQuestions
    };
    
    showReport();
});

// ==================== RELATÓRIO ====================

function showReport() {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('report-container').style.display = 'block';
    
    const { score, totalQuestions, timeSpent, capacityStats, wrongQuestions } = currentResults;
    const percentage = ((score / totalQuestions) * 100).toFixed(1);
    
    // Pontuação
    document.getElementById('percentage-display').textContent = `${percentage}%`;
    document.getElementById('score-text').textContent = `${score} de ${totalQuestions} questões`;
    
    // Tempo
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    document.getElementById('time-spent').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Contadores
    document.getElementById('correct-count').textContent = score;
    document.getElementById('wrong-count').textContent = totalQuestions - score;
    
    // Estatísticas por capacidade
    const capacityStatsHtml = Object.keys(capacityStats)
        .sort()
        .map(cap => {
            const stat = capacityStats[cap];
            const capPercentage = ((stat.correct / stat.total) * 100).toFixed(0);
            return `
                <div class="capacity-item">
                    <span class="capacity-name">${cap}</span>
                    <span class="capacity-score">${stat.correct}/${stat.total} (${capPercentage}%)</span>
                </div>
            `;
        })
        .join('');
    
    document.getElementById('capacity-stats').innerHTML = `
        <h3>📊 Desempenho por Capacidade</h3>
        ${capacityStatsHtml}
    `;
    
    // Lista de questões erradas
    const wrongListEl = document.getElementById('wrong-questions-list');
    if (wrongQuestions.length > 0) {
        let wrongHtml = '<h3>❌ Questões para revisar:</h3><ul>';
        wrongQuestions.forEach(item => {
            wrongHtml += `<li><a href="#${item.id}">Questão ${item.number}</a></li>`;
        });
        wrongHtml += '</ul>';
        wrongListEl.innerHTML = wrongHtml;
    } else {
        wrongListEl.innerHTML = '<h3 style="color: var(--cor-correta);">🎉 Parabéns! Você acertou todas as questões!</h3>';
    }
    
    // Mostrar botão de salvar se usuário estiver logado
    const saveScoreSection = document.getElementById('save-score-section');
    if (currentUser) {
        saveScoreSection.style.display = 'block';
    } else {
        saveScoreSection.style.display = 'none';
    }
    
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function retryQuiz() {
    currentResults = null;
    startQuiz();
}

// ==================== SALVAR PONTUAÇÃO ====================

async function saveScore() {
    if (!currentUser || !currentToken) {
        alert('Você precisa estar logado para salvar sua pontuação!');
        showAuthModal('login');
        return;
    }
    
    if (!currentResults) {
        alert('Nenhum resultado para salvar.');
        return;
    }

    if (!currentCourse) {
        alert('Nenhum curso selecionado. Atualize a página e tente novamente.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                courseId: currentCourse.id,
                score: currentResults.score,
                totalQuestions: currentResults.totalQuestions,
                timeSpent: currentResults.timeSpent,
                answersDetail: currentResults.answersDetail
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Erro ao salvar pontuação');
            return;
        }
        
        alert('✓ Pontuação salva com sucesso no ranking!');
        document.getElementById('save-score-section').style.display = 'none';
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// ==================== RANKING ====================

async function showRanking() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('ranking-container').style.display = 'block';
    
    await loadRanking('all');
}

async function loadRanking(period) {
    // Atualizar botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });
    
    try {
        const courseParam = currentCourse ? `&courseId=${currentCourse.id}` : '';
        const response = await fetch(`${API_URL}/ranking?period=${period}${courseParam}`);
        const data = await response.json();
        
        if (!response.ok) {
            alert('Erro ao carregar ranking');
            return;
        }
        
        displayRanking(data.ranking);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('ranking-list').innerHTML = 
            '<p style="text-align: center; color: var(--cor-errada);">Erro ao carregar ranking. Verifique se o servidor está rodando.</p>';
    }
}

function displayRanking(ranking) {
    const rankingList = document.getElementById('ranking-list');
    
    if (ranking.length === 0) {
        rankingList.innerHTML = '<p style="text-align: center;">Nenhuma pontuação registrada ainda.</p>';
        return;
    }
    
    let html = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Jogador</th>
                    <th>Pontuação</th>
                    <th>Tempo</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    ranking.forEach(entry => {
        const rankClass = entry.rank === 1 ? 'rank-gold' : entry.rank === 2 ? 'rank-silver' : entry.rank === 3 ? 'rank-bronze' : '';
        const minutes = Math.floor(entry.timeSpent / 60);
        const seconds = entry.timeSpent % 60;
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        const date = new Date(entry.date).toLocaleDateString('pt-BR');
        
        html += `
            <tr>
                <td><span class="rank-number ${rankClass}">${entry.rank}</span></td>
                <td>${entry.username}${entry.courseName ? ` • <small>${entry.courseName}</small>` : ''}</td>
                <td>${entry.percentage}% (${entry.score}/${entry.totalQuestions})</td>
                <td>${timeStr}</td>
                <td>${date}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    rankingList.innerHTML = html;
}

// ==================== PERFIL ====================

async function showProfile() {
    if (!currentUser || !currentToken) {
        alert('Você precisa estar logado para ver seu perfil!');
        showAuthModal('login');
        return;
    }
    
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';
    
    // Atualizar informações do perfil
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-avatar-text').textContent = currentUser.username.charAt(0).toUpperCase();
    
    // Carregar histórico
    await loadUserHistory();
}

async function loadUserHistory() {
    try {
        const response = await fetch(`${API_URL}/scores/user`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert('Erro ao carregar histórico');
            return;
        }
        
        displayHistory(data.scores);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('history-list').innerHTML = 
            '<p style="text-align: center; color: var(--cor-errada);">Erro ao carregar histórico.</p>';
    }
}

function displayHistory(scores) {
    const historyList = document.getElementById('history-list');
    
    if (scores.length === 0) {
        historyList.innerHTML = '<p style="text-align: center;">Você ainda não fez nenhuma tentativa.</p>';
        return;
    }
    
    let html = '';
    scores.forEach(score => {
        const date = new Date(score.createdAt).toLocaleString('pt-BR');
        const minutes = Math.floor(score.timeSpent / 60);
        const seconds = score.timeSpent % 60;
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        
        html += `
            <div class="history-item">
                <div>
                    <div><strong>${score.percentage}%</strong> (${score.score}/${score.totalQuestions})${score.courseName ? ` • ${score.courseName}` : ''}</div>
                    <div class="history-date">${date} • Tempo: ${timeStr}</div>
                </div>
                <div class="history-score">${score.score}</div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('auth-modal');
    if (event.target === modal) {
        closeAuthModal();
    }
}

function openAdminPanel() {
    window.location.href = 'admin.html';
}
