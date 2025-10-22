// Configuração da API
const RENDER_API_URL = 'https://saep-quizz-gameficado.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:3000/api';

const API_URL = (() => {
    const host = window.location.hostname;
    
    // Se estiver rodando localmente
    if (host === 'localhost' || host === '127.0.0.1') {
        return LOCAL_API_URL;
    }

    // Se estiver no GitHub Pages
    if (host.includes('github.io')) {
        return RENDER_API_URL;
    }

    // Se estiver no próprio Render ou outro domínio, usar URL relativa
    if (host.includes('onrender.com')) {
        return '/api';
    }

    // Fallback para URL relativa (funciona quando frontend e backend estão no mesmo domínio)
    return '/api';
})();

console.log('🌐 API URL configurada:', API_URL);

// Estado Global
let quizData = [];
let courses = [];
let quizzes = [];
let currentCourse = null;
let currentQuiz = null;
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
    await loadAvailableQuizzes();
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

async function startQuiz() {
    const quizId = parseInt(document.getElementById('quiz-select').value);
    
    if (!quizId) {
        alert('Por favor, selecione um quiz primeiro.');
        return;
    }

    // Buscar detalhes do quiz selecionado
    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}`);
        const quizDetails = await response.json();

        if (!response.ok || !quizDetails.questions || quizDetails.questions.length === 0) {
            alert('Este quiz não possui questões disponíveis.');
            return;
        }

        currentQuiz = quizDetails;
        quizData = quizDetails.questions;
        currentCourse = quizDetails.course;

        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('quiz-container').style.display = 'block';
        
        buildQuiz();
        startTimer();

    } catch (error) {
        console.error('Erro ao carregar quiz:', error);
        alert('Erro ao carregar o quiz. Tente novamente.');
    }
}

function buildQuiz() {
    const quizForm = document.getElementById('quiz-form');
    
    const shuffledQuiz = [...quizData]
        .sort(() => Math.random() - 0.5)
        .map(originalQuestion => {
            const question = { ...originalQuestion };
            const shuffledOptions = [...(question.options || [])].sort(() => Math.random() - 0.5);
            question.correctIndex = shuffledOptions.findIndex(option => option.correct);
            question.shuffledOptions = shuffledOptions;
            return question;
        });

    const questionsHtml = shuffledQuiz.map((q, index) => {
        const contextText = q.context ? `<p class="context">${q.context}</p>` : '';
        const contextImage = q.contextImage
            ? `<div class="context-media"><img src="${q.contextImage}" alt="Ilustração de contexto da questão ${index + 1}" loading="lazy"></div>`
            : '';

        const optionsHtml = q.shuffledOptions.map((option, optionIndex) => {
            const letter = String.fromCharCode(65 + optionIndex);
            const optionImage = option.image
                ? `<div class="option-media"><img src="${option.image}" alt="Ilustração da alternativa ${letter} da questão ${index + 1}" loading="lazy"></div>`
                : '';

            return `
                <label class="option-card">
                    <input type="radio" name="${q.id}" value="${optionIndex}">
                    <div class="option-body">
                        <div class="option-header">
                            <span class="option-letter">${letter})</span>
                            <span class="option-text">${option.text}</span>
                        </div>
                        ${optionImage}
                    </div>
                </label>
            `;
        }).join('');

        return `
            <div class="question-block" id="${q.id}">
                <h4>Questão ${index + 1} (Capacidade: ${q.capacidade})</h4>
                ${contextText}
                ${contextImage}
                <p class="command">${q.command}</p>
                <div class="options-container">
                    ${optionsHtml}
                </div>
                <div class="feedback" id="feedback-${q.id}"></div>
            </div>
        `;
    }).join('');

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

        if (!capacityStats[q.capacidade]) {
            capacityStats[q.capacidade] = { correct: 0, total: 0 };
        }
        capacityStats[q.capacidade].total++;

        const userAnswerIndex = selectedOptionEl ? parseInt(selectedOptionEl.value, 10) : -1;
        const isCorrect = userAnswerIndex === q.correctIndex;
        const chosenOption = userAnswerIndex >= 0 ? q.shuffledOptions[userAnswerIndex] : null;
        const correctOption = q.shuffledOptions[q.correctIndex];
        const chosenLetter = chosenOption ? (chosenOption.letter || String.fromCharCode(65 + userAnswerIndex)) : null;
        const correctLetter = correctOption ? (correctOption.letter || String.fromCharCode(65 + q.correctIndex)) : null;
        const correctText = correctOption ? correctOption.text : 'Resposta indisponível';

        if (isCorrect) {
            score++;
            capacityStats[q.capacidade].correct++;
            questionBlock.classList.add('correct');
        } else {
            questionBlock.classList.add('incorrect');
            wrongQuestions.push({ number: index + 1, id: q.id });

            let feedbackHtml = `
                <p class="correct-answer-text">✓ Resposta Correta: ${correctText}</p>
            `;

            if (correctOption && correctOption.image) {
                feedbackHtml += `
                    <div class="feedback-media">
                        <img src="${correctOption.image}" alt="Imagem da resposta correta da questão ${index + 1}" loading="lazy">
                    </div>
                `;
            }

            if (correctOption && correctOption.explanation) {
                feedbackHtml += `
                    <p class="correct-explanation"><strong>Por que está correta:</strong> ${correctOption.explanation}</p>
                `;
            }

            if (chosenOption) {
                if (chosenOption.justification) {
                    feedbackHtml += `
                        <div class="justification">
                            <strong>Por que sua resposta está incorreta:</strong>
                            <p>${chosenOption.justification}</p>
                        </div>
                    `;
                }

                if (chosenOption.image && chosenOption !== correctOption) {
                    feedbackHtml += `
                        <div class="feedback-media">
                            <span class="feedback-label">Sua resposta:</span>
                            <img src="${chosenOption.image}" alt="Imagem da alternativa escolhida da questão ${index + 1}" loading="lazy">
                        </div>
                    `;
                }
            } else {
                feedbackHtml += `<p><strong>Você não respondeu esta questão.</strong></p>`;
            }

            feedbackEl.innerHTML = feedbackHtml;
            feedbackEl.style.display = 'block';
        }

        answersDetail.push({
            questionId: q.id,
            capacity: q.capacidade,
            correct: isCorrect,
            selectedOption: chosenLetter,
            selectedOptionText: chosenOption ? chosenOption.text : null,
            selectedOptionImage: chosenOption && chosenOption.image ? chosenOption.image : null,
            correctOption: correctLetter,
            correctOptionText: correctOption ? correctOption.text : null,
            correctOptionImage: correctOption && correctOption.image ? correctOption.image : null,
            contextImage: q.contextImage || null
        });
    });
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

function showReport() {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('report-container').style.display = 'block';
    
    const { score, totalQuestions, timeSpent, capacityStats, wrongQuestions } = currentResults;
    const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(1) : '0.0';

    document.getElementById('percentage-display').textContent = `${percentage}%`;
    document.getElementById('score-text').textContent = `${score} de ${totalQuestions} questões`;

    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    document.getElementById('time-spent').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    document.getElementById('correct-count').textContent = score;
    document.getElementById('wrong-count').textContent = totalQuestions - score;

    const capacityStatsHtml = Object.keys(capacityStats)
        .sort()
        .map(cap => {
            const stat = capacityStats[cap];
            const capPercentage = stat.total > 0 ? ((stat.correct / stat.total) * 100).toFixed(0) : '0';
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

    const saveScoreSection = document.getElementById('save-score-section');
    if (currentUser) {
        saveScoreSection.style.display = 'block';
    } else {
        saveScoreSection.style.display = 'none';
    }

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

// ==================== QUIZZES ====================

async function loadAvailableQuizzes() {
    try {
        const response = await fetch(`${API_URL}/quizzes`);
        quizzes = await response.json();

        const quizSelect = document.getElementById('quiz-select');
        const startBtn = document.getElementById('start-quiz-btn');

        if (quizzes.length === 0) {
            quizSelect.innerHTML = '<option value="">Nenhum quiz disponível</option>';
            startBtn.disabled = true;
            return;
        }

        quizSelect.innerHTML = '<option value="">Selecione um quiz...</option>';
        quizzes.forEach(quiz => {
            const course = courses.find(c => c.id === quiz.courseId);
            const option = document.createElement('option');
            option.value = quiz.id;
            option.textContent = `${quiz.name} (${course ? course.name : 'Curso desconhecido'}) - ${quiz.questionIds.length} questões`;
            quizSelect.appendChild(option);
        });

        // Habilitar botão quando um quiz for selecionado
        quizSelect.addEventListener('change', function() {
            startBtn.disabled = !this.value;
        });

    } catch (error) {
        console.error('Erro ao carregar quizzes:', error);
        const quizSelect = document.getElementById('quiz-select');
        quizSelect.innerHTML = '<option value="">Erro ao carregar quizzes</option>';
        document.getElementById('start-quiz-btn').disabled = true;
    }
}

// ==================== AJUDA PARA ALUNOS ====================

function showStudentHelp() {
    const modal = document.getElementById('student-help-modal');
    modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
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
