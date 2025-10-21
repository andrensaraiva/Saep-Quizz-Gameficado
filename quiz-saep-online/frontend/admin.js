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
let currentUser = null;
let currentToken = null;
let allCourses = [];
let optionCounter = 0;

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
        alert('Você precisa estar logado!');
        window.location.href = 'index.html';
        return;
    }

    currentToken = savedToken;
    await verifyToken();

    if (!currentUser || currentUser.role !== 'admin') {
        alert('Acesso negado. Apenas administradores.');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('admin-username').textContent = `👤 ${currentUser.username}`;

    // Carregar dados iniciais
    await loadDashboard();
    await loadAllCourses();
});

// ==================== AUTENTICAÇÃO ====================

async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
        } else {
            logout();
        }
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        logout();
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function backToMain() {
    window.location.href = 'index.html';
}

// ==================== NAVEGAÇÃO ====================

function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });

    // Remover active de todos os nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Mostrar seção selecionada
    document.getElementById(`${sectionName}-section`).style.display = 'block';

    // Adicionar active ao nav item clicado
    event.target.closest('.nav-item').classList.add('active');

    // Carregar dados da seção
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'courses':
            loadCourses();
            break;
        case 'questions':
            loadQuestionSection();
            break;
        case 'users':
            loadUsers();
            break;
        case 'reports':
            loadReportSection();
            break;
    }
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) throw new Error('Erro ao carregar dashboard');

        const data = await response.json();

        // Atualizar cards
        document.getElementById('dash-total-users').textContent = data.totalUsers;
        document.getElementById('dash-total-courses').textContent = data.totalCourses;
        document.getElementById('dash-total-questions').textContent = data.totalQuestions;
        document.getElementById('dash-total-attempts').textContent = data.totalAttempts;
        document.getElementById('dash-active-users').textContent = data.activeUsers;
        document.getElementById('dash-average-score').textContent = `${data.averageScore}%`;
        document.getElementById('dash-popular-course').textContent = 
            data.mostPopularCourse ? data.mostPopularCourse.name : '-';

        // Atividades recentes
        const activitiesHtml = data.recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-user">${activity.username}</div>
                <div class="activity-details">
                    ${activity.courseName} • ${activity.percentage}% • 
                    ${new Date(activity.date).toLocaleDateString('pt-BR')}
                </div>
            </div>
        `).join('');

        document.getElementById('recent-activities').innerHTML = activitiesHtml || '<p>Nenhuma atividade recente</p>';

    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao carregar dashboard');
    }
}

// ==================== CURSOS ====================

async function loadAllCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();
        allCourses = data.courses;
        return allCourses;
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        return [];
    }
}

async function loadCourses() {
    await loadAllCourses();

    const coursesHtml = allCourses.map(course => `
        <div class="course-card">
            <div class="course-info">
                <div class="course-badge" style="background-color: ${course.color}20; color: ${course.color};">
                    ${course.category}
                </div>
                <div class="course-name">${course.name}</div>
                <div class="course-description">${course.description || 'Sem descrição'}</div>
                <div class="course-stats">
                    <span>❓ ${course.questionsCount} questões</span>
                    <span>📝 ${course.attemptsCount} tentativas</span>
                </div>
            </div>
            <div class="course-actions">
                <button onclick="editCourse(${course.id})" class="btn-icon btn-edit">✏️ Editar</button>
                <button onclick="deleteCourse(${course.id}, '${course.name}')" class="btn-icon btn-delete">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');

    document.getElementById('courses-list').innerHTML = coursesHtml || '<p>Nenhum curso cadastrado ainda.</p>';
}

function showAddCourseModal() {
    document.getElementById('add-course-modal').style.display = 'block';
}

async function handleAddCourse(event) {
    event.preventDefault();

    const courseData = {
        name: document.getElementById('course-name').value,
        description: document.getElementById('course-description').value,
        category: document.getElementById('course-category').value,
        color: document.getElementById('course-color').value
    };

    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Erro ao criar curso');
            return;
        }

        alert('Curso criado com sucesso!');
        closeModal('add-course-modal');
        event.target.reset();
        loadCourses();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

async function deleteCourse(courseId, courseName) {
    if (!confirm(`Tem certeza que deseja excluir o curso "${courseName}"? Todas as questões e pontuações serão removidas!`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Erro ao deletar curso');
            return;
        }

        alert('Curso deletado com sucesso!');
        loadCourses();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// ==================== QUESTÕES ====================

async function loadQuestionSection() {
    await loadAllCourses();

    // Preencher select de cursos
    const selectHtml = '<option value="">Selecione um curso...</option>' +
        allCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    document.getElementById('course-filter').innerHTML = selectHtml;
    document.getElementById('question-course').innerHTML = selectHtml;
    document.getElementById('import-course').innerHTML = selectHtml;
}

async function loadQuestionsByCourse() {
    const courseId = document.getElementById('course-filter').value;

    if (!courseId) {
        document.getElementById('questions-list').innerHTML = '<p>Selecione um curso para ver as questões.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/questions`);
        const data = await response.json();

        if (data.questions.length === 0) {
            document.getElementById('questions-list').innerHTML = '<p>Nenhuma questão cadastrada neste curso.</p>';
            return;
        }

        const questionsHtml = data.questions.map(q => `
            <div class="question-item">
                <div class="question-header">
                    <span class="question-id">${q.id}</span>
                    <div>
                        <span class="question-capacity">${q.capacidade}</span>
                        <button onclick="deleteQuestion(${courseId}, '${q.id}')" class="btn-icon btn-delete" style="margin-left: 10px;">🗑️</button>
                    </div>
                </div>
                <div class="question-command"><strong>${q.command}</strong></div>
                <div class="question-options">${q.options.length} opções</div>
            </div>
        `).join('');

        document.getElementById('questions-list').innerHTML = questionsHtml;
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao carregar questões');
    }
}

function showAddQuestionModal() {
    optionCounter = 0;
    document.getElementById('options-container').innerHTML = '';
    addOption();
    addOption();
    document.getElementById('add-question-modal').style.display = 'block';
}

function addOption() {
    optionCounter++;
    const optionHtml = `
        <div class="option-input-group" id="option-${optionCounter}">
            <input type="text" placeholder="Texto da opção ${optionCounter}" required>
            <textarea placeholder="Justificativa (para opções incorretas)" rows="2"></textarea>
            <div class="option-checkbox">
                <input type="checkbox" name="correct-option" value="${optionCounter}">
                <label>Esta é a resposta correta</label>
            </div>
        </div>
    `;
    document.getElementById('options-container').insertAdjacentHTML('beforeend', optionHtml);
}

async function handleAddQuestion(event) {
    event.preventDefault();

    const courseId = parseInt(document.getElementById('question-course').value);
    const questionId = document.getElementById('question-id').value;
    const capacity = document.getElementById('question-capacity').value;
    const context = document.getElementById('question-context').value;
    const command = document.getElementById('question-command').value;

    // Coletar opções
    const options = [];
    document.querySelectorAll('#options-container .option-input-group').forEach(group => {
        const text = group.querySelector('input[type="text"]').value;
        const justification = group.querySelector('textarea').value;
        const isCorrect = group.querySelector('input[type="checkbox"]').checked;

        const option = { text };
        if (isCorrect) {
            option.correct = true;
        } else if (justification) {
            option.justification = justification;
        }

        options.push(option);
    });

    // Validar
    const correctCount = options.filter(o => o.correct).length;
    if (correctCount !== 1) {
        alert('Marque exatamente UMA opção como correta!');
        return;
    }

    const questionData = {
        id: questionId,
        capacidade: capacity,
        context,
        command,
        options
    };

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(questionData)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Erro ao criar questão');
            return;
        }

        alert('Questão criada com sucesso!');
        closeModal('add-question-modal');
        event.target.reset();
        loadQuestionsByCourse();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

function showImportModal() {
    document.getElementById('import-modal').style.display = 'block';
}

async function handleImportQuestions(event) {
    event.preventDefault();

    const courseId = parseInt(document.getElementById('import-course').value);
    const jsonText = document.getElementById('import-json').value;

    let questionsData;
    try {
        questionsData = JSON.parse(jsonText);
    } catch (error) {
        alert('JSON inválido! Verifique o formato.');
        return;
    }

    if (!Array.isArray(questionsData)) {
        alert('O JSON deve ser um array de questões.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/questions/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ questionsData })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Erro ao importar questões');
            return;
        }

        let message = `Importação concluída!\n\n`;
        message += `✓ ${data.imported} questões importadas\n`;
        message += `Total processado: ${data.total}\n`;
        
        if (data.errors && data.errors.length > 0) {
            message += `\n⚠️ ${data.errors.length} erros:\n`;
            data.errors.slice(0, 5).forEach(err => {
                message += `- Questão ${err.index}: ${err.error}\n`;
            });
        }

        alert(message);
        closeModal('import-modal');
        event.target.reset();
        
        // Selecionar o curso importado
        document.getElementById('course-filter').value = courseId;
        loadQuestionsByCourse();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

async function deleteQuestion(courseId, questionId) {
    if (!confirm(`Tem certeza que deseja excluir a questão ${questionId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/questions/${questionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Erro ao deletar questão');
            return;
        }

        alert('Questão deletada com sucesso!');
        loadQuestionsByCourse();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// ==================== USUÁRIOS ====================

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Erro ao carregar usuários');
            return;
        }

        const usersHtml = data.users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-name">
                        ${user.username}
                        <span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}">
                            ${user.role === 'admin' ? '👑 Admin' : '👤 Usuário'}
                        </span>
                    </div>
                    <div class="user-email">${user.email}</div>
                </div>
                <div class="user-stats">
                    <div class="user-stat">
                        <div class="user-stat-value">${user.attemptsCount}</div>
                        <div class="user-stat-label">Tentativas</div>
                    </div>
                    <div class="user-stat">
                        <div class="user-stat-value">${user.averageScore}%</div>
                        <div class="user-stat-label">Média</div>
                    </div>
                </div>
                <div class="course-actions">
                    ${user.role !== 'admin' ? `
                        <button onclick="promoteToAdmin(${user.id}, '${user.username}')" class="btn-icon btn-edit">👑 Tornar Admin</button>
                    ` : ''}
                    ${user.id !== currentUser.id ? `
                        <button onclick="deleteUser(${user.id}, '${user.username}')" class="btn-icon btn-delete">🗑️ Excluir</button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        document.getElementById('users-list').innerHTML = usersHtml;
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao carregar usuários');
    }
}

async function promoteToAdmin(userId, username) {
    if (!confirm(`Promover ${username} para administrador?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ role: 'admin' })
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Erro ao promover usuário');
            return;
        }

        alert('Usuário promovido com sucesso!');
        loadUsers();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${username}? Todas as pontuações serão removidas!`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Erro ao deletar usuário');
            return;
        }

        alert('Usuário deletado com sucesso!');
        loadUsers();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// ==================== RELATÓRIOS ====================

async function loadReportSection() {
    await loadAllCourses();

    const selectHtml = '<option value="">Selecione um curso...</option>' +
        allCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    document.getElementById('report-course-select').innerHTML = selectHtml;
}

async function exportData(type) {
    try {
        const response = await fetch(`${API_URL}/admin/export/${type}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) {
            alert('Erro ao exportar dados');
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('Arquivo exportado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao exportar dados');
    }
}

async function generateCourseReport() {
    const courseId = document.getElementById('report-course-select').value;

    if (!courseId) {
        alert('Selecione um curso');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/reports/course/${courseId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Erro ao gerar relatório');
            return;
        }

        const reportHtml = `
            <div class="report-card">
                <div class="report-header">
                    <h3>${data.course.name}</h3>
                    <p>${data.course.description || 'Sem descrição'}</p>
                </div>

                <div class="report-section">
                    <h4>📊 Estatísticas Gerais</h4>
                    <div class="stats-grid-admin" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="stat-card-admin">
                            <div class="stat-value-admin">${data.totalQuestions}</div>
                            <div class="stat-label-admin">Total de Questões</div>
                        </div>
                        <div class="stat-card-admin">
                            <div class="stat-value-admin">${data.totalAttempts}</div>
                            <div class="stat-label-admin">Total de Tentativas</div>
                        </div>
                        <div class="stat-card-admin">
                            <div class="stat-value-admin">${data.averageScore}%</div>
                            <div class="stat-label-admin">Média de Acertos</div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h4>🏆 Top 10 Melhores Desempenhos</h4>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Posição</th>
                                    <th>Usuário</th>
                                    <th>Pontuação</th>
                                    <th>Tempo</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.topPerformers.map((performer, index) => `
                                    <tr>
                                        <td>${index + 1}º</td>
                                        <td>${performer.username}</td>
                                        <td>${performer.percentage}%</td>
                                        <td>${Math.floor(performer.timeSpent / 60)}:${String(performer.timeSpent % 60).padStart(2, '0')}</td>
                                        <td>${new Date(performer.date).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                ${data.questionStats.length > 0 ? `
                    <div class="report-section">
                        <h4>📈 Estatísticas por Questão</h4>
                        <p style="color: #64748b; margin-bottom: 15px;">
                            Questões com menor taxa de acerto merecem atenção especial
                        </p>
                        <div class="data-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Questão</th>
                                        <th>Acertos</th>
                                        <th>Total</th>
                                        <th>Taxa de Acerto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.questionStats
                                        .sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage))
                                        .slice(0, 10)
                                        .map(stat => `
                                            <tr>
                                                <td>${stat.questionId}</td>
                                                <td>${stat.correct}</td>
                                                <td>${stat.total}</td>
                                                <td><strong>${stat.percentage}%</strong></td>
                                            </tr>
                                        `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('report-content').innerHTML = reportHtml;
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao gerar relatório');
    }
}

// ==================== MODAL ====================

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ==================== IA - GERAÇÃO DE QUESTÕES ====================

let generatedAIQuestion = null;

async function showAIQuestionModal() {
    // Carregar cursos no select
    const courseSelect = document.getElementById('ai-course');
    courseSelect.innerHTML = '<option value="">Selecione o curso...</option>';
    allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        courseSelect.appendChild(option);
    });

    // Verificar status das APIs
    try {
        const response = await fetch(`${API_URL}/ai/status`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const status = await response.json();
            console.log('Status das APIs de IA:', status);
            
            // Atualizar opções disponíveis
            const providerSelect = document.getElementById('ai-provider');
            providerSelect.innerHTML = '';
            
            if (status.gemini.configured) {
                const opt = document.createElement('option');
                opt.value = 'gemini';
                opt.textContent = '🟢 Google Gemini (Gratuito)';
                providerSelect.appendChild(opt);
            } else {
                const opt = document.createElement('option');
                opt.value = 'gemini';
                opt.textContent = '🔴 Google Gemini (Não configurado)';
                opt.disabled = true;
                providerSelect.appendChild(opt);
            }
            
            if (status.chatgpt.configured) {
                const opt = document.createElement('option');
                opt.value = 'chatgpt';
                opt.textContent = '🟢 ChatGPT (OpenAI)';
                providerSelect.appendChild(opt);
            } else {
                const opt = document.createElement('option');
                opt.value = 'chatgpt';
                opt.textContent = '🔴 ChatGPT (Não configurado)';
                opt.disabled = true;
                providerSelect.appendChild(opt);
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status das APIs:', error);
    }

    // Resetar preview
    document.getElementById('ai-preview').style.display = 'none';
    generatedAIQuestion = null;

    document.getElementById('ai-question-modal').style.display = 'block';
}

async function handleGenerateAIQuestion(event) {
    event.preventDefault();

    const provider = document.getElementById('ai-provider').value;
    const courseId = parseInt(document.getElementById('ai-course').value);
    const capacity = document.getElementById('ai-capacity').value;
    const content = document.getElementById('ai-content').value;
    const difficulty = document.getElementById('ai-difficulty').value;

    if (!courseId) {
        alert('Por favor, selecione um curso');
        return;
    }

    const generateBtn = document.getElementById('generate-btn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '⏳ Gerando questão... Aguarde (pode levar até 30s)';

    try {
        const response = await fetch(`${API_URL}/ai/generate-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                provider,
                capacity,
                content,
                difficulty
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao gerar questão');
        }

        // Armazenar questão gerada
        generatedAIQuestion = {
            ...data.question,
            courseId
        };

        // Mostrar preview
        displayAIQuestionPreview(generatedAIQuestion);

        alert('✅ Questão gerada com sucesso! Revise abaixo antes de salvar.');

    } catch (error) {
        console.error('Erro:', error);
        alert(`❌ Erro ao gerar questão: ${error.message}\n\nDica: Verifique se a API key está configurada no servidor.`);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

function displayAIQuestionPreview(question) {
    const previewContainer = document.getElementById('ai-question-preview');
    
    const correctOption = question.options.find(opt => opt.correct);
    
    previewContainer.innerHTML = `
        <div class="question-card" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px solid #4CAF50;">
            <div style="margin-bottom: 10px;">
                <span class="badge" style="background: #2196F3; color: white; padding: 5px 10px; border-radius: 4px;">
                    ${question.capacidade}
                </span>
                <span class="badge" style="background: #FF9800; color: white; padding: 5px 10px; border-radius: 4px; margin-left: 10px;">
                    ${question.difficulty || 'N/A'}
                </span>
                <span class="badge" style="background: #9C27B0; color: white; padding: 5px 10px; border-radius: 4px; margin-left: 10px;">
                    Gerado por ${question.generatedBy}
                </span>
            </div>
            
            <div><strong>ID:</strong> ${question.id}</div>
            
            ${question.context ? `
                <div style="margin-top: 15px; padding: 10px; background: white; border-left: 3px solid #2196F3;">
                    <strong>Contexto:</strong><br>
                    ${question.context}
                </div>
            ` : ''}
            
            <div style="margin-top: 15px; padding: 10px; background: white; border-left: 3px solid #4CAF50;">
                <strong>Pergunta:</strong><br>
                ${question.command}
            </div>
            
            <div style="margin-top: 15px;">
                <strong>Alternativas:</strong>
                <ul style="list-style: none; padding: 0; margin-top: 10px;">
                    ${question.options.map(opt => `
                        <li style="padding: 10px; margin: 5px 0; background: ${opt.correct ? '#C8E6C9' : 'white'}; border: 1px solid ${opt.correct ? '#4CAF50' : '#ddd'}; border-radius: 4px;">
                            <strong>${opt.letter})</strong> ${opt.text}
                            ${opt.correct ? '<span style="color: #4CAF50; font-weight: bold;"> ✓ CORRETA</span>' : ''}
                            ${opt.explanation ? `<br><small style="color: #666;"><em>Explicação: ${opt.explanation}</em></small>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            ${correctOption && correctOption.explanation ? `
                <div style="margin-top: 15px; padding: 10px; background: #E8F5E9; border-left: 3px solid #4CAF50;">
                    <strong>✓ Resposta Correta:</strong> ${correctOption.letter}) ${correctOption.text}<br>
                    <strong>Explicação:</strong> ${correctOption.explanation}
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('ai-preview').style.display = 'block';
    
    // Scroll para o preview
    document.getElementById('ai-preview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function approveAIQuestion() {
    if (!generatedAIQuestion) {
        alert('Nenhuma questão para aprovar');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(generatedAIQuestion)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao salvar questão');
        }

        alert('✅ Questão aprovada e salva com sucesso!');
        closeModal('ai-question-modal');
        await loadQuestionsByCourse();
        
        // Resetar
        generatedAIQuestion = null;
        document.getElementById('ai-preview').style.display = 'none';

    } catch (error) {
        console.error('Erro:', error);
        alert(`❌ Erro ao salvar questão: ${error.message}`);
    }
}

function rejectAIQuestion() {
    if (confirm('Deseja rejeitar esta questão e gerar uma nova?')) {
        generatedAIQuestion = null;
        document.getElementById('ai-preview').style.display = 'none';
        alert('Questão rejeitada. Preencha os campos e clique em "Gerar Questão" novamente.');
    }
}

function editAIQuestion() {
    if (!generatedAIQuestion) {
        alert('Nenhuma questão para editar');
        return;
    }

    // Fechar modal de IA
    closeModal('ai-question-modal');

    // Abrir modal de adicionar questão com dados preenchidos
    showAddQuestionModal();

    // Aguardar o modal carregar
    setTimeout(() => {
        // Preencher os campos
        document.getElementById('question-course').value = generatedAIQuestion.courseId;
        document.getElementById('question-id').value = generatedAIQuestion.id;
        document.getElementById('question-capacity').value = generatedAIQuestion.capacidade;
        document.getElementById('question-context').value = generatedAIQuestion.context || '';
        document.getElementById('question-command').value = generatedAIQuestion.command;

        // Limpar opções existentes
        optionCounter = 0;
        document.getElementById('options-container').innerHTML = '';

        // Adicionar as opções geradas
        generatedAIQuestion.options.forEach(opt => {
            addOption();
            const lastIndex = optionCounter - 1;
            document.getElementById(`option-text-${lastIndex}`).value = opt.text;
            document.getElementById(`option-correct-${lastIndex}`).checked = opt.correct || false;
            document.getElementById(`option-justification-${lastIndex}`).value = opt.explanation || opt.justification || '';
        });

        alert('✏️ Questão carregada para edição. Faça as alterações desejadas e clique em "Criar Questão".');
    }, 300);
}

