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
        alert('Por favor, selecione um quiz primeiro.');
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

document.getElementById('submit-btn').addEventListener('click', async function() {
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

    // Enviar resultado automaticamente para o painel admin (mesmo sem login)
    await submitResultToAdmin();

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
        
        // Criar seção detalhada de respostas erradas
        showWrongAnswersDetail(wrongQuestions);
    } else {
        wrongListEl.innerHTML = '<h3 style="color: var(--cor-correta);">🎉 Parabéns! Você acertou todas as questões!</h3>';
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
        <div style="margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <h2 style="margin: 0 0 10px 0; font-size: 1.8rem;">📚 Revisão Detalhada das Questões Erradas</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 1.1rem;">Entenda onde você errou e qual era a resposta correta</p>
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
            <div style="margin: 25px 0; padding: 25px; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: 5px solid #ef4444;">
                <div style="display: flex; align-items: start; gap: 15px; margin-bottom: 15px;">
                    <div style="flex-shrink: 0; width: 45px; height: 45px; background: #fee2e2; color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
                        ${item.number}
                    </div>
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 1.2rem; line-height: 1.5;">${question.command}</h3>
                        ${question.context ? `<p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin: 10px 0; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #94a3b8;"><strong>Contexto:</strong> ${question.context}</p>` : ''}
                        ${question.contextImage ? `<img src="${question.contextImage}" alt="Contexto da questão" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">` : ''}
                    </div>
                </div>

                <!-- SUA RESPOSTA (ERRADA) -->
                ${userOption ? `
                    <div style="padding: 20px; background: #fef2f2; border-radius: 10px; border: 2px solid #fca5a5; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                            <span style="background: #dc2626; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">
                                ✗ SUA RESPOSTA
                            </span>
                            <span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-weight: 600;">
                                ${answerDetail.selectedOption}
                            </span>
                        </div>
                        <p style="margin: 0 0 12px 0; font-size: 1.05rem; color: #1e293b; line-height: 1.6; font-weight: 500;">
                            ${userOption.text}
                        </p>
                        ${userOption.image ? `
                            <img src="${userOption.image}" alt="Imagem da alternativa selecionada" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        ` : ''}
                        ${userOption.justification || userOption.explanation ? `
                            <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #dc2626;">
                                <strong style="color: #dc2626; display: block; margin-bottom: 8px; font-size: 1rem;">
                                    ⚠️ Por que está incorreta:
                                </strong>
                                <p style="margin: 0; color: #475569; line-height: 1.7; font-size: 0.95rem;">
                                    ${userOption.justification || userOption.explanation}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div style="padding: 20px; background: #fef2f2; border-radius: 10px; border: 2px solid #fca5a5; margin-bottom: 20px;">
                        <p style="margin: 0; color: #dc2626; font-weight: 600; font-size: 1.05rem;">
                            ⚠️ Você não respondeu esta questão
                        </p>
                    </div>
                `}

                <!-- RESPOSTA CORRETA -->
                <div style="padding: 20px; background: #f0fdf4; border-radius: 10px; border: 2px solid #86efac;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <span style="background: #16a34a; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">
                            ✓ RESPOSTA CORRETA
                        </span>
                        <span style="background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-weight: 600;">
                            ${answerDetail.correctOption}
                        </span>
                    </div>
                    <p style="margin: 0 0 12px 0; font-size: 1.05rem; color: #1e293b; line-height: 1.6; font-weight: 500;">
                        ${correctOption.text}
                    </p>
                    ${correctOption.image ? `
                        <img src="${correctOption.image}" alt="Imagem da resposta correta" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    ` : ''}
                    ${correctOption.explanation ? `
                        <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #16a34a;">
                            <strong style="color: #16a34a; display: block; margin-bottom: 8px; font-size: 1rem;">
                                💡 Explicação:
                            </strong>
                            <p style="margin: 0; color: #475569; line-height: 1.7; font-size: 0.95rem;">
                                ${correctOption.explanation}
                            </p>
                        </div>
                    ` : ''}
                </div>

                ${question.capacity ? `
                    <div style="margin-top: 15px; display: inline-block; background: #ede9fe; color: #7c3aed; padding: 8px 14px; border-radius: 8px; font-size: 0.9rem; font-weight: 600;">
                        📚 ${question.capacity}
                    </div>
                ` : ''}

                <!-- Botão para Gerar Questão Similar com IA -->
                <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div style="color: white;">
                            <h4 style="margin: 0 0 5px 0; font-size: 1rem;">🤖 Quer praticar mais sobre este tema?</h4>
                            <p style="margin: 0; font-size: 0.9rem; opacity: 0.95;">A IA pode gerar uma nova questão similar para você treinar!</p>
                        </div>
                        <button onclick="generateSimilarQuestion(${item.number}, '${question.capacity}', '${question.command.replace(/'/g, "\\'")}', ${question.id})" 
                                class="btn-secondary" 
                                style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s;"
                                onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
                                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                            ✨ Gerar Nova Questão
                        </button>
                    </div>
                </div>

                <!-- Container para a questão gerada -->
                <div id="ai-question-${item.number}" style="margin-top: 15px; display: none;"></div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function retryQuiz() {
    currentResults = null;
    startQuiz();
}

// ==================== GERAR QUESTÃO SIMILAR COM IA ====================

async function generateSimilarQuestion(questionNumber, capacity, originalCommand, originalQuestionId) {
    const container = document.getElementById(`ai-question-${questionNumber}`);
    const button = event.target;
    
    // Desabilitar botão e mostrar loading
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> Gerando...';
    
    container.style.display = 'block';
    container.innerHTML = `
        <div style="padding: 30px; background: #f8fafc; border-radius: 12px; text-align: center;">
            <div class="loading-spinner" style="margin: 0 auto 15px;"></div>
            <p style="color: #64748b; margin: 0;">A IA está criando uma questão similar para você praticar...</p>
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
            <div style="padding: 20px; background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; text-align: center;">
                <p style="color: #dc2626; margin: 0; font-weight: 600;">❌ ${error.message}</p>
                <p style="color: #64748b; margin: 10px 0 0 0; font-size: 0.9rem;">Tente novamente em alguns instantes.</p>
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
            <div class="quiz-option" style="margin-bottom: 12px; padding: 15px; background: white; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                 onclick="selectAIOption('${questionId}', ${index}, ${option.correct})"
                 onmouseover="if(!this.classList.contains('selected')) { this.style.borderColor='#667eea'; this.style.background='#f8f9ff'; }"
                 onmouseout="if(!this.classList.contains('selected')) { this.style.borderColor='#e2e8f0'; this.style.background='white'; }">
                <label style="display: flex; align-items: start; cursor: pointer; width: 100%;">
                    <input type="radio" name="${questionId}" value="${index}" style="margin-right: 12px; margin-top: 4px; width: 20px; height: 20px; cursor: pointer; accent-color: #667eea;">
                    <div style="flex: 1;">
                        <strong style="color: #667eea; margin-right: 8px;">${letter})</strong>
                        <span style="color: #1e293b;">${option.text}</span>
                    </div>
                </label>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="padding: 25px; background: linear-gradient(to bottom, #f0f9ff, white); border: 3px solid #667eea; border-radius: 12px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0;">
                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 1.1rem;">
                    🤖 IA
                </span>
                <div>
                    <h4 style="margin: 0; color: #1e293b; font-size: 1.1rem;">Questão Gerada para Prática</h4>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.85rem;">Responda para verificar seu aprendizado</p>
                </div>
            </div>

            ${question.context ? `
                <div style="padding: 15px; background: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 6px; margin-bottom: 20px;">
                    <strong style="color: #64748b; display: block; margin-bottom: 8px;">📖 Contexto:</strong>
                    <p style="margin: 0; color: #475569; line-height: 1.6;">${question.context}</p>
                </div>
            ` : ''}

            <div style="margin-bottom: 20px;">
                <h5 style="color: #1e293b; font-size: 1.05rem; line-height: 1.6; margin-bottom: 15px;">${question.command}</h5>
                ${optionsHtml}
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="checkAIAnswer('${questionId}', ${questionNumber})" 
                        class="btn-primary" 
                        style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.transform='scale(1.05)'"
                        onmouseout="this.style.transform='scale(1)'">
                    ✓ Verificar Resposta
                </button>
            </div>

            <div id="${questionId}-result" style="margin-top: 20px; display: none;"></div>
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
        const parent = input.closest('.quiz-option');
        parent.classList.remove('selected');
        parent.style.borderColor = '#e2e8f0';
        parent.style.background = 'white';
    });

    // Selecionar nova opção
    const selectedInput = document.querySelector(`input[name="${questionId}"][value="${optionIndex}"]`);
    if (selectedInput) {
        selectedInput.checked = true;
        const parent = selectedInput.closest('.quiz-option');
        parent.classList.add('selected');
        parent.style.borderColor = '#667eea';
        parent.style.background = '#f0f9ff';
    }
}

function checkAIAnswer(questionId, questionNumber) {
    const selectedOption = document.querySelector(`input[name="${questionId}"]:checked`);
    const resultContainer = document.getElementById(`${questionId}-result`);
    
    if (!selectedOption) {
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
            <div style="padding: 15px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; text-align: center;">
                <p style="color: #92400e; margin: 0; font-weight: 600;">⚠️ Por favor, selecione uma resposta antes de verificar!</p>
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
        const parent = input.closest('.quiz-option');
        const option = question.options[index];
        
        if (option.correct) {
            parent.style.borderColor = '#16a34a';
            parent.style.background = '#f0fdf4';
        } else if (index === selectedIndex && !isCorrect) {
            parent.style.borderColor = '#dc2626';
            parent.style.background = '#fef2f2';
        }
        
        // Desabilitar todas as opções
        input.disabled = true;
        parent.style.cursor = 'default';
    });

    // Desabilitar botão de verificar
    event.target.disabled = true;
    event.target.style.opacity = '0.6';
    event.target.style.cursor = 'not-allowed';

    // Mostrar resultado
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = `
        <div style="padding: 25px; background: ${isCorrect ? '#f0fdf4' : '#fef2f2'}; border: 3px solid ${isCorrect ? '#16a34a' : '#dc2626'}; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                <div style="font-size: 3rem;">${isCorrect ? '🎉' : '📚'}</div>
                <div>
                    <h4 style="margin: 0; color: ${isCorrect ? '#16a34a' : '#dc2626'}; font-size: 1.3rem;">
                        ${isCorrect ? 'Parabéns! Você acertou!' : 'Ops! Resposta incorreta'}
                    </h4>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.95rem;">
                        ${isCorrect ? 'Você está progredindo muito bem!' : 'Continue estudando, você vai conseguir!'}
                    </p>
                </div>
            </div>

            ${!isCorrect ? `
                <div style="padding: 15px; background: white; border-radius: 8px; margin-bottom: 15px;">
                    <strong style="color: #16a34a; display: block; margin-bottom: 8px;">✓ Resposta Correta:</strong>
                    <p style="margin: 0; color: #1e293b; line-height: 1.6;">${correctOption.text}</p>
                </div>
            ` : ''}

            ${correctOption.explanation ? `
                <div style="padding: 15px; background: white; border-radius: 8px; border-left: 4px solid ${isCorrect ? '#16a34a' : '#667eea'};">
                    <strong style="color: #667eea; display: block; margin-bottom: 8px;">💡 Explicação:</strong>
                    <p style="margin: 0; color: #475569; line-height: 1.7;">${correctOption.explanation}</p>
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

// ==================== ENVIAR RESULTADO PARA ADMIN ====================

async function submitResultToAdmin() {
    if (!currentResults) {
        console.log('Nenhum resultado para enviar');
        return;
    }

    const courseId = currentCourse ? currentCourse.id : null;
    const quizId = currentQuiz ? currentQuiz.id : null;

    if (!courseId) {
        console.log('Nenhum curso selecionado, não é possível enviar resultado');
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

        const response = await fetch(`${API_URL}/results/anonymous`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resultData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Resultado enviado para o painel admin:', data.id);
        } else {
            console.warn('⚠️ Erro ao enviar resultado para admin:', data.error);
        }
    } catch (error) {
        console.warn('⚠️ Erro de conexão ao enviar resultado para admin:', error);
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
            '<p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Erro ao carregar quizzes</p>';
    }
}

function displayQuizzes(quizzesToShow) {
    const grid = document.getElementById('quizzes-grid');

    if (quizzesToShow.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📝</div>
                <h3 style="color: #64748b; margin-bottom: 10px;">Nenhum quiz disponível</h3>
                <p style="color: #94a3b8;">Aguarde até que o administrador crie novos quizzes.</p>
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
            <div class="quiz-card" onclick="selectQuiz(${quiz.id})" style="
                background: white;
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid transparent;
                position: relative;
                overflow: hidden;
            "
            onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 20px rgba(102, 126, 234, 0.3)'; this.style.borderColor='#667eea';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.borderColor='transparent';">
                
                <!-- Header com gradiente -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; margin: -24px -24px 20px -24px; border-radius: 12px 12px 0 0;">
                    <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">📚 ${course ? course.name : 'Curso'}</div>
                    <h3 style="margin: 0; font-size: 1.3rem; font-weight: 700; line-height: 1.3;">${quiz.name}</h3>
                </div>

                <!-- Descrição -->
                ${quiz.description ? `
                    <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px; min-height: 45px;">
                        ${quiz.description.substring(0, 100)}${quiz.description.length > 100 ? '...' : ''}
                    </p>
                ` : `
                    <p style="color: #94a3b8; font-size: 0.9rem; font-style: italic; margin-bottom: 20px; min-height: 45px;">
                        Sem descrição
                    </p>
                `}

                <!-- Informações -->
                <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: #f1f5f9; border-radius: 6px;">
                        <span style="font-size: 1.2rem;">📝</span>
                        <span style="font-weight: 600; color: #1e293b;">${questionCount}</span>
                        <span style="color: #64748b; font-size: 0.85rem;">questões</span>
                    </div>
                    <div style="background: ${difficultyColor}20; color: ${difficultyColor}; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                        ${difficultyLabel}
                    </div>
                </div>

                <!-- Botão -->
                <button onclick="event.stopPropagation(); selectQuiz(${quiz.id})" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.transform='scale(1.05)'"
                        onmouseout="this.style.transform='scale(1)'">
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

// ==================== FEEDBACK ====================

function showFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    modal.style.display = 'block';
}

async function handleSendFeedback(event) {
    event.preventDefault();

    const name = document.getElementById('feedback-name').value.trim();
    const email = document.getElementById('feedback-email').value.trim();
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value.trim();

    if (!message) {
        alert('Por favor, escreva uma mensagem.');
        return;
    }

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
            alert(data.error || 'Erro ao enviar feedback');
            return;
        }

        alert('✅ Feedback enviado com sucesso! Obrigado pela sua contribuição.');
        closeModal('feedback-modal');
        
        // Limpar formulário
        document.getElementById('feedback-name').value = '';
        document.getElementById('feedback-email').value = '';
        document.getElementById('feedback-type').value = 'sugestao';
        document.getElementById('feedback-message').value = '';
    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        alert('Erro ao conectar com o servidor. Tente novamente mais tarde.');
    }
}
