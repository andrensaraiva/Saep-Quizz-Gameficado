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

// ==================== TOAST NOTIFICATION SYSTEM ====================

const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info', duration = 4500) {
        if (!this.container) this.init();

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.style.setProperty('--toast-duration', `${duration}ms`);
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close" onclick="Toast.dismiss(this.parentElement)" aria-label="Fechar notificação">&times;</button>
        `;

        this.container.appendChild(toast);

        const timer = setTimeout(() => this.dismiss(toast), duration);
        toast._timer = timer;

        return toast;
    },

    dismiss(toast) {
        if (!toast || toast._dismissed) return;
        toast._dismissed = true;
        clearTimeout(toast._timer);
        toast.classList.add('toast--removing');
        toast.addEventListener('animationend', () => toast.remove());
    },

    success(message, duration) { return this.show(message, 'success', duration); },
    error(message, duration) { return this.show(message, 'error', duration); },
    warning(message, duration) { return this.show(message, 'warning', duration); },
    info(message, duration) { return this.show(message, 'info', duration); },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ==================== SANITIZAÇÃO XSS ====================

function sanitizeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== CONFIRMATION MODAL ====================

function showConfirmModal(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const yesBtn = document.getElementById('confirm-modal-yes');
        const noBtn = document.getElementById('confirm-modal-no');

        function cleanup() {
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
        }

        function onYes() { cleanup(); resolve(true); }
        function onNo() { cleanup(); resolve(false); }

        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);

        // Focus trap para acessibilidade
        yesBtn.focus();
    });
}

// ==================== LOADING BUTTON HELPERS ====================

function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.classList.add('btn-loading');
        btn.disabled = true;
        btn._originalText = btn.textContent;
    } else {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        if (btn._originalText) btn.textContent = btn._originalText;
    }
}

// ==================== MODAL CLOSE HANDLERS ====================

function initModalCloseHandlers() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'flex' || modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    });
    // Close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });
}

// ==================== BACK TO TOP ====================

function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 300);
    });
}

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
    // Inicializar sistemas
    Toast.init();
    initBackToTop();
    initModalCloseHandlers();

    // Verificar se há token salvo
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        currentToken = savedToken;
        await verifyToken();
    }

    await loadCourses();
    await loadAvailableQuizzes();
    // Não carrega questões no init - lazy load quando necessário

    // Carregar perfil de gamificação se logado
    if (currentUser && currentToken) {
        await Gamification.loadProfile();
        Gamification.renderXpBar();
    }
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
    
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    // Focus first input after short delay
    setTimeout(() => {
        const firstInput = modal.querySelector('div[style*="block"] input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'none';
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit-btn');
    
    setButtonLoading(btn, true);
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            Toast.error(data.error || 'Erro ao fazer login');
            return;
        }
        
        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', data.token);
        
        updateUserInterface();
        closeAuthModal();
        Toast.success('Login realizado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const btn = document.getElementById('register-submit-btn');
    
    setButtonLoading(btn, true);
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            Toast.error(data.error || 'Erro ao cadastrar');
            return;
        }
        
        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', data.token);
        
        updateUserInterface();
        closeAuthModal();
        Toast.success('Cadastro realizado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
    } finally {
        setButtonLoading(btn, false);
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

        // Atualizar gamificação
        Gamification.loadProfile().then(() => Gamification.renderXpBar());
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
        profileBtn.style.display = 'none';

        if (adminPanelBtn) {
            adminPanelBtn.style.display = 'none';
        }

        // Esconder XP bar
        Gamification.renderXpBar();
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
        Toast.error('Erro ao carregar cursos. Verifique se o servidor está rodando.');
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
        Toast.error('Erro ao carregar as questões. Verifique o servidor.');
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
    // Usar a contagem do curso se disponível, senão usar quizData.length
    const count = currentCourse && currentCourse.questionsCount !== undefined 
        ? currentCourse.questionsCount 
        : quizData.length;
    
    const totalQuestionsEl = document.getElementById('total-questions');
    const totalQuestionsDisplayEl = document.getElementById('total-questions-display');
    
    if (totalQuestionsEl) totalQuestionsEl.textContent = count;
    if (totalQuestionsDisplayEl) totalQuestionsDisplayEl.textContent = count;
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
        Toast.warning('Por favor, selecione um quiz primeiro.');
        return;
    }

    await startQuizById(quizId);
}

async function startQuizById(quizId) {
    // Buscar detalhes do quiz selecionado
    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}`);
        const quizDetails = await response.json();

        if (!response.ok || !quizDetails.questions || quizDetails.questions.length === 0) {
            Toast.warning('Este quiz não possui questões disponíveis.');
            return;
        }

        currentQuiz = quizDetails;
        quizData = quizDetails.questions;
        currentCourse = quizDetails.course;

        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('quiz-container').style.display = 'block';
        
        // Reset gamification combo
        Gamification.resetCombo();

        buildQuiz();
        startTimer();

    } catch (error) {
        console.error('Erro ao carregar quiz:', error);
        Toast.error('Erro ao carregar o quiz. Tente novamente.');
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

document.getElementById('submit-btn').addEventListener('click', async function() {
    // Count unanswered questions
    const totalQuestions = window.shuffledQuizData.length;
    const answeredCount = window.shuffledQuizData.filter(q => 
        document.querySelector(`input[name="${q.id}"]:checked`)
    ).length;
    const unanswered = totalQuestions - answeredCount;
    
    let confirmMsg = 'Deseja finalizar e verificar suas respostas?';
    if (unanswered > 0) {
        confirmMsg = `Você ainda tem ${unanswered} questão(ões) sem resposta.\n\n${confirmMsg}`;
    }
    
    const confirmed = await showConfirmModal('Finalizar Quiz', confirmMsg);
    if (!confirmed) {
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
            // Gamification: track combo
            Gamification.registerCorrectAnswer();
        } else {
            questionBlock.classList.add('incorrect');
            // Gamification: break combo
            Gamification.registerWrongAnswer();
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
        wrongQuestions,
        maxCombo: Gamification.getMaxCombo()
    };

    // Enviar resultado automaticamente para o painel admin (mesmo sem login)
    await submitResultToAdmin();

    // Gamificação: submeter resultado e mostrar XP
    let gamificationResult = null;
    if (currentUser && currentToken) {
        gamificationResult = await Gamification.submitQuizResult({
            courseId: currentCourse ? currentCourse.id : null,
            quizId: currentQuiz ? currentQuiz.id : null,
            score: currentResults.score,
            totalQuestions: currentResults.totalQuestions,
            timeSpent: currentResults.timeSpent,
            answersDetail: currentResults.answersDetail
        });
    }
    currentResults.gamificationResult = gamificationResult;

    showReport();

    // Mostrar animações de gamificação após o relatório
    if (gamificationResult) {
        // Confetti se score >= 80%
        const pct = (currentResults.score / currentResults.totalQuestions) * 100;
        if (pct >= 80) {
            Gamification.launchConfetti();
        }

        // Level up
        if (gamificationResult.leveledUp) {
            setTimeout(() => {
                Gamification.showLevelUp(gamificationResult.oldLevel, gamificationResult.newLevel);
            }, 1000);
        }

        // Conquistas
        if (gamificationResult.newAchievements && gamificationResult.newAchievements.length > 0) {
            const delay = gamificationResult.leveledUp ? 5500 : 1000;
            setTimeout(() => {
                Gamification.showAchievementsSequentially(gamificationResult.newAchievements);
            }, delay);
        }

        // Atualizar XP bar no header
        Gamification.renderXpBar();
    }
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

    // Renderizar XP Summary Card
    const xpContainer = document.getElementById('xp-summary-container');
    if (xpContainer) {
        if (currentResults.gamificationResult) {
            xpContainer.innerHTML = Gamification.renderXpSummary(currentResults.gamificationResult);
        } else if (currentUser) {
            xpContainer.innerHTML = '<p class="xp-login-prompt">Faça login para ganhar XP!</p>';
        } else {
            xpContainer.innerHTML = '';
        }
    }

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
        let wrongHtml = `
            <h3>❌ Questões para revisar:</h3>
            <ul class="wrong-list">
        `;
        wrongQuestions.forEach(item => {
            wrongHtml += `
                <li>
                    <a href="#review-${item.id}" class="review-link">
                        Questão ${item.number}
                    </a>
                </li>
            `;
        });
        wrongHtml += '</ul>';
        wrongListEl.innerHTML = wrongHtml;
        
        // Criar seção detalhada de respostas erradas PRIMEIRO
        showWrongAnswersDetail(wrongQuestions);
        
        // DEPOIS adicionar scroll suave aos links (aguardar DOM atualizar)
        setTimeout(() => {
            document.querySelectorAll('.review-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    console.log('🔍 Clicou no link:', targetId);
                    console.log('🔍 Elemento encontrado:', targetElement);
                    
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Adicionar destaque temporário
                        targetElement.style.boxShadow = '0 0 0 4px #fbbf24';
                        setTimeout(() => {
                            targetElement.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                        }, 1500);
                    } else {
                        console.error('❌ Elemento não encontrado:', targetId);
                    }
                });
            });
        }, 100);
    } else {
        wrongListEl.innerHTML = '<h3 class="all-correct-msg">🎉 Parabéns! Você acertou todas as questões!</h3>';
        document.getElementById('wrong-answers-detail').innerHTML = '';
    }

    const saveScoreSection = document.getElementById('save-score-section');
    if (currentUser) {
        saveScoreSection.style.display = 'block';
    } else {
        saveScoreSection.style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showWrongAnswersDetail(wrongQuestions) {
    const container = document.getElementById('wrong-answers-detail');
    
    if (!wrongQuestions || wrongQuestions.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="review-header">
            <h2>📚 Revisão Detalhada das Questões Erradas</h2>
            <p>Entenda onde você errou e qual era a resposta correta</p>
        </div>
    `;

    wrongQuestions.forEach(item => {
        const question = window.shuffledQuizData.find(q => q.id === item.id);
        if (!question) return;

        const answerDetail = currentResults.answersDetail.find(a => a.questionId === item.id);
        if (!answerDetail) return;

        // Encontrar as opções originais
        const userOption = question.shuffledOptions.find(opt => 
            opt.letter === answerDetail.selectedOption || 
            opt.text === answerDetail.selectedOptionText
        );
        const correctOption = question.shuffledOptions[question.correctIndex];

        html += `
            <div id="review-${item.id}" class="review-card">
                <div class="review-card__header">
                    <div class="review-card__number">${item.number}</div>
                    <div class="review-card__body">
                        <h3 class="review-card__command">${question.command}</h3>
                        ${question.context ? `<p class="review-card__context"><strong>Contexto:</strong> ${question.context}</p>` : ''}
                        ${question.contextImage ? `<img src="${question.contextImage}" alt="Contexto da questão" class="review-card__img">` : ''}
                    </div>
                </div>

                <!-- SUA RESPOSTA (ERRADA) -->
                ${userOption ? `
                    <div class="answer-box answer-box--wrong">
                        <div class="answer-box__labels">
                            <span class="answer-box__badge answer-box__badge--wrong">✗ SUA RESPOSTA</span>
                            <span class="answer-box__letter answer-box__letter--wrong">${answerDetail.selectedOption}</span>
                        </div>
                        <p class="answer-box__text">${userOption.text}</p>
                        ${userOption.image ? `<img src="${userOption.image}" alt="Imagem da alternativa selecionada" class="review-card__img">` : ''}
                        ${userOption.justification || userOption.explanation ? `
                            <div class="explanation-block explanation-block--wrong">
                                <strong class="explanation-block__title explanation-block__title--wrong">⚠️ Por que está incorreta:</strong>
                                <p class="explanation-block__text">${userOption.justification || userOption.explanation}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="answer-box answer-box--wrong">
                        <p class="answer-box__unanswered">⚠️ Você não respondeu esta questão</p>
                    </div>
                `}

                <!-- RESPOSTA CORRETA -->
                <div class="answer-box answer-box--correct">
                    <div class="answer-box__labels">
                        <span class="answer-box__badge answer-box__badge--correct">✓ RESPOSTA CORRETA</span>
                        <span class="answer-box__letter answer-box__letter--correct">${answerDetail.correctOption}</span>
                    </div>
                    <p class="answer-box__text">${correctOption.text}</p>
                    ${correctOption.image ? `<img src="${correctOption.image}" alt="Imagem da resposta correta" class="review-card__img">` : ''}
                    ${correctOption.explanation ? `
                        <div class="explanation-block explanation-block--correct">
                            <strong class="explanation-block__title explanation-block__title--correct">💡 Explicação:</strong>
                            <p class="explanation-block__text">${correctOption.explanation}</p>
                        </div>
                    ` : ''}
                </div>

                ${question.capacity ? `
                    <div class="review-card__capacity">📚 ${question.capacity}</div>
                ` : ''}

                <!-- Botão para Gerar Questão Similar com IA -->
                <div class="ai-cta">
                    <div class="ai-cta__inner">
                        <div class="ai-cta__text">
                            <h4>🤖 Quer praticar mais sobre este tema?</h4>
                            <p>A IA pode gerar uma nova questão similar para você treinar!</p>
                        </div>
                        <button class="ai-cta__btn generate-similar-btn" 
                                data-question-number="${item.number}"
                                data-capacity="${question.capacity || ''}"
                                data-command="${encodeURIComponent(question.command)}"
                                data-question-id="${question.id}">
                            ✨ Gerar Nova Questão
                        </button>
                    </div>
                </div>

                <!-- Container para a questão gerada -->
                <div id="ai-question-${item.number}" class="ai-question-container"></div>
            </div>
        `;
    });

    container.innerHTML = html;
    
    // Adicionar event listeners aos botões de gerar questão similar
    document.querySelectorAll('.generate-similar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const questionNumber = parseInt(this.dataset.questionNumber);
            const capacity = this.dataset.capacity;
            const command = decodeURIComponent(this.dataset.command);
            const questionId = parseInt(this.dataset.questionId);
            generateSimilarQuestion(questionNumber, capacity, command, questionId, this);
        });
    });
}

function retryQuiz() {
    currentResults = null;
    Gamification.resetCombo();
    if (currentQuiz && currentQuiz.id) {
        startQuizById(currentQuiz.id);
    } else {
        startQuiz();
    }
}

// ==================== GERAR QUESTÃO SIMILAR COM IA ====================

async function generateSimilarQuestion(questionNumber, capacity, originalCommand, originalQuestionId, buttonElement) {
    const container = document.getElementById(`ai-question-${questionNumber}`);
    const button = buttonElement;
    
    // Desabilitar botão e mostrar loading
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> Gerando...';
    
    container.style.display = 'block';
    container.innerHTML = `
        <div class="ai-loading">
            <div class="loading-spinner"></div>
            <p>A IA está criando uma questão similar para você praticar...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/ai/generate-similar-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                capacity: capacity,
                originalCommand: originalCommand,
                courseId: currentCourse ? currentCourse.id : 1
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao gerar questão');
        }

        // Exibir a questão gerada
        displayAIQuestion(container, data.question, questionNumber);
        
        // Esconder o botão após gerar
        button.style.display = 'none';

    } catch (error) {
        console.error('Erro ao gerar questão:', error);
        container.innerHTML = `
            <div class="ai-error">
                <p>❌ ${error.message}</p>
                <p>Tente novamente em alguns instantes.</p>
            </div>
        `;
        
        // Reabilitar botão
        button.disabled = false;
        button.innerHTML = '✨ Gerar Nova Questão';
    }
}

function displayAIQuestion(container, question, questionNumber) {
    const questionId = `ai-q-${questionNumber}`;
    
    const optionsHtml = question.options.map((option, index) => {
        const letter = String.fromCharCode(65 + index);
        return `
            <div class="ai-option"
                 onclick="selectAIOption('${questionId}', ${index}, ${option.correct})">
                <label>
                    <input type="radio" name="${questionId}" value="${index}">
                    <div>
                        <strong class="ai-option__letter">${letter})</strong>
                        <span class="ai-option__text">${option.text}</span>
                    </div>
                </label>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="ai-question-card">
            <div class="ai-question-card__header">
                <span class="ai-question-card__badge">🤖 IA</span>
                <div>
                    <h4>Questão Gerada para Prática</h4>
                    <p>Responda para verificar seu aprendizado</p>
                </div>
            </div>

            ${question.context ? `
                <div class="ai-question-card__context">
                    <strong>📖 Contexto:</strong>
                    <p>${question.context}</p>
                </div>
            ` : ''}

            <div class="ai-question-card__body">
                <h5>${question.command}</h5>
                ${optionsHtml}
            </div>

            <div class="ai-actions">
                <button onclick="checkAIAnswer('${questionId}', ${questionNumber})" class="ai-verify-btn">
                    ✓ Verificar Resposta
                </button>
            </div>

            <div id="${questionId}-result" class="ai-result"></div>
        </div>
    `;

    // Armazenar a questão para verificação posterior
    if (!window.aiQuestions) {
        window.aiQuestions = {};
    }
    window.aiQuestions[questionId] = question;
}

function selectAIOption(questionId, optionIndex, isCorrect) {
    // Remover seleção anterior
    const allOptions = document.querySelectorAll(`input[name="${questionId}"]`);
    allOptions.forEach(input => {
        const parent = input.closest('.ai-option');
        parent.classList.remove('selected');
    });

    // Selecionar nova opção
    const selectedInput = document.querySelector(`input[name="${questionId}"][value="${optionIndex}"]`);
    if (selectedInput) {
        selectedInput.checked = true;
        const parent = selectedInput.closest('.ai-option');
        parent.classList.add('selected');
    }
}

function checkAIAnswer(questionId, questionNumber) {
    const selectedOption = document.querySelector(`input[name="${questionId}"]:checked`);
    const resultContainer = document.getElementById(`${questionId}-result`);
    
    if (!selectedOption) {
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
            <div class="ai-warning">
                <p>⚠️ Por favor, selecione uma resposta antes de verificar!</p>
            </div>
        `;
        return;
    }

    const question = window.aiQuestions[questionId];
    const selectedIndex = parseInt(selectedOption.value);
    const selectedAnswerOption = question.options[selectedIndex];
    const correctOption = question.options.find(opt => opt.correct);
    const isCorrect = selectedAnswerOption.correct;

    // Marcar visualmente as opções
    const allOptions = document.querySelectorAll(`input[name="${questionId}"]`);
    allOptions.forEach((input, index) => {
        const parent = input.closest('.ai-option');
        const option = question.options[index];
        
        if (option.correct) {
            parent.classList.add('ai-correct');
        } else if (index === selectedIndex && !isCorrect) {
            parent.classList.add('ai-wrong');
        }
        
        // Desabilitar todas as opções
        input.disabled = true;
        parent.classList.add('disabled');
    });

    // Desabilitar botão de verificar
    event.target.disabled = true;

    // Mostrar resultado
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = `
        <div class="ai-result-card ${isCorrect ? 'ai-result-card--correct' : 'ai-result-card--wrong'}">
            <div class="ai-result-card__header">
                <div class="ai-result-card__emoji">${isCorrect ? '🎉' : '📚'}</div>
                <div>
                    <h4>${isCorrect ? 'Parabéns! Você acertou!' : 'Ops! Resposta incorreta'}</h4>
                    <p>${isCorrect ? 'Você está progredindo muito bem!' : 'Continue estudando, você vai conseguir!'}</p>
                </div>
            </div>

            ${!isCorrect ? `
                <div class="ai-result-correct-answer">
                    <strong>✓ Resposta Correta:</strong>
                    <p>${correctOption.text}</p>
                </div>
            ` : ''}

            ${correctOption.explanation ? `
                <div class="explanation-block ${isCorrect ? 'explanation-block--correct' : 'explanation-block--ai'}">
                    <strong class="explanation-block__title explanation-block__title--ai">💡 Explicação:</strong>
                    <p class="explanation-block__text">${correctOption.explanation}</p>
                </div>
            ` : ''}
        </div>
    `;

    // Scroll suave até o resultado
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// ==================== SALVAR PONTUAÇÃO ====================

async function saveScore() {
    if (!currentUser || !currentToken) {
        Toast.warning('Você precisa estar logado para salvar sua pontuação!');
        showAuthModal('login');
        return;
    }
    
    if (!currentResults) {
        Toast.warning('Nenhum resultado para salvar.');
        return;
    }

    if (!currentCourse) {
        Toast.warning('Nenhum curso selecionado. Atualize a página.');
        return;
    }
    
    const btn = document.getElementById('save-score-btn');
    setButtonLoading(btn, true);
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
            Toast.error(data.error || 'Erro ao salvar pontuação');
            return;
        }
        
        Toast.success('Pontuação salva com sucesso no ranking!');
        document.getElementById('save-score-section').style.display = 'none';
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ==================== ENVIAR RESULTADO PARA ADMIN ====================

async function submitResultToAdmin() {
    console.log('📤 Iniciando envio de resultado para admin...');
    console.log('📦 currentResults:', currentResults);
    console.log('📦 currentCourse:', currentCourse);
    console.log('📦 currentQuiz:', currentQuiz);
    
    if (!currentResults) {
        console.log('❌ Nenhum resultado para enviar');
        return;
    }

    const courseId = currentCourse ? currentCourse.id : null;
    const quizId = currentQuiz ? currentQuiz.id : null;

    if (!courseId) {
        console.log('❌ Nenhum curso selecionado, não é possível enviar resultado');
        return;
    }

    try {
        // Gerar um identificador anônimo baseado na sessão
        let anonymousId = sessionStorage.getItem('anonymousId');
        if (!anonymousId) {
            anonymousId = 'Anônimo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('anonymousId', anonymousId);
        }

        const resultData = {
            courseId: courseId,
            quizId: quizId,
            score: currentResults.score,
            totalQuestions: currentResults.totalQuestions,
            timeSpent: currentResults.timeSpent,
            answersDetail: currentResults.answersDetail,
            capacityStats: currentResults.capacityStats,
            userInfo: currentUser ? `${currentUser.username} (${currentUser.email})` : anonymousId
        };

        console.log('📡 Enviando dados:', resultData);
        console.log('📡 URL:', `${API_URL}/results/anonymous`);

        const response = await fetch(`${API_URL}/results/anonymous`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resultData)
        });
        
        console.log('📥 Response status:', response.status);
        
        const data = await response.json();
        console.log('📥 Response data:', data);
        
        if (response.ok) {
            console.log('✅ Resultado enviado para o painel admin com sucesso! ID:', data.id);
        } else {
            console.error('❌ Erro ao enviar resultado para admin:', data.error);
        }
    } catch (error) {
        console.error('❌ Erro de conexão ao enviar resultado para admin:', error);
        // Não exibe erro para o usuário, apenas registra no console
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
            Toast.error('Erro ao carregar ranking');
            return;
        }
        
        displayRanking(data.ranking);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('ranking-list').innerHTML = 
            '<p class="status-msg status-msg--error">Erro ao carregar ranking. Verifique se o servidor está rodando.</p>';
    }
}

function displayRanking(ranking) {
    const rankingList = document.getElementById('ranking-list');
    
    if (ranking.length === 0) {
        rankingList.innerHTML = '<p class="status-msg">Nenhuma pontuação registrada ainda.</p>';
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

// ==================== RANKING TOGGLE (Clássico vs Gamificado) ====================

function showClassicRanking() {
    document.getElementById('ranking-list').style.display = 'block';
    document.getElementById('gamified-leaderboard').style.display = 'none';
    document.getElementById('btn-ranking-classic').classList.add('active');
    document.getElementById('btn-ranking-gamified').classList.remove('active');
    document.querySelector('.ranking-filters').style.display = 'flex';
}

function showGamifiedRanking() {
    document.getElementById('ranking-list').style.display = 'none';
    document.getElementById('gamified-leaderboard').style.display = 'block';
    document.getElementById('btn-ranking-classic').classList.remove('active');
    document.getElementById('btn-ranking-gamified').classList.add('active');
    document.querySelector('.ranking-filters').style.display = 'none';
    Gamification.renderGamifiedLeaderboard('gamified-leaderboard');
}

// ==================== PERFIL ====================

async function showProfile() {
    if (!currentUser || !currentToken) {
        Toast.warning('Você precisa estar logado para ver seu perfil!');
        showAuthModal('login');
        return;
    }
    
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('profile-container').style.display = 'block';
    
    // Atualizar informações do perfil
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-avatar-text').textContent = currentUser.username.charAt(0).toUpperCase();
    
    // Carregar e renderizar perfil gamificado
    await Gamification.loadProfile();
    Gamification.renderGamifiedProfile('gamification-profile-section');

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
            Toast.error('Erro ao carregar histórico');
            return;
        }
        
        displayHistory(data.scores);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('history-list').innerHTML = 
            '<p class="status-msg status-msg--error">Erro ao carregar histórico.</p>';
    }
}

function displayHistory(scores) {
    const historyList = document.getElementById('history-list');
    
    if (scores.length === 0) {
        historyList.innerHTML = '<p class="status-msg">Você ainda não fez nenhuma tentativa.</p>';
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

let allQuizzesData = []; // Armazenar todos os quizzes

async function loadAvailableQuizzes() {
    try {
        const response = await fetch(`${API_URL}/quizzes`);
        quizzes = await response.json();
        allQuizzesData = quizzes;

        // Carregar cursos para o filtro
        const courseFilter = document.getElementById('course-filter');
        courseFilter.innerHTML = '<option value="">Todos os Cursos</option>';
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name;
            courseFilter.appendChild(option);
        });

        // Exibir quizzes
        displayQuizzes(quizzes);

    } catch (error) {
        console.error('Erro ao carregar quizzes:', error);
        document.getElementById('quizzes-grid').innerHTML = 
            '<p class="quizzes-error">Erro ao carregar quizzes</p>';
    }
}

function displayQuizzes(quizzesToShow) {
    const grid = document.getElementById('quizzes-grid');

    if (quizzesToShow.length === 0) {
        grid.innerHTML = `
            <div class="quizzes-empty">
                <div class="quizzes-empty__icon">📝</div>
                <h3>Nenhum quiz disponível</h3>
                <p>Aguarde até que o administrador crie novos quizzes.</p>
            </div>
        `;
        return;
    }

    const html = quizzesToShow.map(quiz => {
        const course = courses.find(c => c.id === quiz.courseId);
        const questionCount = quiz.questionIds ? quiz.questionIds.length : 0;
        const difficultyColor = questionCount < 15 ? '#10b981' : questionCount < 30 ? '#f59e0b' : '#ef4444';
        const difficultyLabel = questionCount < 15 ? 'Curto' : questionCount < 30 ? 'Médio' : 'Longo';

        return `
            <div class="quiz-card" onclick="selectQuiz(${quiz.id})">
                <div class="quiz-card__header">
                    <div class="quiz-card__course">📚 ${course ? course.name : 'Curso'}</div>
                    <h3 class="quiz-card__name">${quiz.name}</h3>
                </div>

                ${quiz.description ? `
                    <p class="quiz-card__desc">
                        ${quiz.description.substring(0, 100)}${quiz.description.length > 100 ? '...' : ''}
                    </p>
                ` : `
                    <p class="quiz-card__desc--empty">Sem descrição</p>
                `}

                <div class="quiz-card__meta">
                    <div class="quiz-card__stat">
                        <span class="quiz-card__stat-icon">📝</span>
                        <span class="quiz-card__stat-value">${questionCount}</span>
                        <span class="quiz-card__stat-label">questões</span>
                    </div>
                    <div class="quiz-card__difficulty" style="background: ${difficultyColor}20; color: ${difficultyColor};">
                        ${difficultyLabel}
                    </div>
                </div>

                <button onclick="event.stopPropagation(); selectQuiz(${quiz.id})" class="quiz-card__btn">
                    ▶ Iniciar Quiz
                </button>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;
}

function filterQuizzes() {
    const courseFilter = document.getElementById('course-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;

    let filtered = [...allQuizzesData];

    // Filtrar por curso
    if (courseFilter) {
        filtered = filtered.filter(q => q.courseId == courseFilter);
    }

    // Ordenar
    switch(sortFilter) {
        case 'recent':
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'questions-desc':
            filtered.sort((a, b) => (b.questionIds?.length || 0) - (a.questionIds?.length || 0));
            break;
        case 'questions-asc':
            filtered.sort((a, b) => (a.questionIds?.length || 0) - (b.questionIds?.length || 0));
            break;
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }

    displayQuizzes(filtered);
}

function selectQuiz(quizId) {
    // Iniciar o quiz selecionado
    currentQuiz = allQuizzesData.find(q => q.id === quizId);
    if (currentQuiz) {
        startQuizById(quizId);
    }
}

// ==================== AJUDA PARA ALUNOS ====================

function showStudentHelp() {
    const modal = document.getElementById('student-help-modal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'flex-start';
    modal.style.justifyContent = 'center';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Fechar qualquer modal ao clicar fora do conteúdo
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function openAdminPanel() {
    window.location.href = 'admin.html';
}

// ==================== FEEDBACK ====================

function showFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function handleSendFeedback(event) {
    event.preventDefault();

    const name = document.getElementById('feedback-name').value.trim();
    const email = document.getElementById('feedback-email').value.trim();
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value.trim();

    if (!message) {
        Toast.warning('Por favor, escreva uma mensagem.');
        return;
    }

    const btn = document.getElementById('feedback-submit-btn');
    setButtonLoading(btn, true);
    try {
        const response = await fetch(`${API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, type, message })
        });

        const data = await response.json();

        if (!response.ok) {
            Toast.error(data.error || 'Erro ao enviar feedback');
            return;
        }

        Toast.success('Feedback enviado com sucesso! Obrigado pela sua contribuição.');
        closeModal('feedback-modal');
        
        // Limpar formulário
        document.getElementById('feedback-name').value = '';
        document.getElementById('feedback-email').value = '';
        document.getElementById('feedback-type').value = 'sugestao';
        document.getElementById('feedback-message').value = '';
    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        Toast.error('Erro ao conectar com o servidor. Tente novamente mais tarde.');
    } finally {
        setButtonLoading(btn, false);
    }
}
