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
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
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
            <button class="toast-close" onclick="Toast.dismiss(this.parentElement)" aria-label="Fechar">&times;</button>
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

    success(msg, d) { return this.show(msg, 'success', d); },
    error(msg, d) { return this.show(msg, 'error', d); },
    warning(msg, d) { return this.show(msg, 'warning', d); },
    info(msg, d) { return this.show(msg, 'info', d); },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

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
        Toast.warning('Você precisa estar logado!');
        window.location.href = 'index.html';
        return;
    }

    currentToken = savedToken;
    await verifyToken();

    if (!currentUser || currentUser.role !== 'admin') {
        Toast.error('Acesso negado. Apenas administradores.');
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
        case 'quizzes':
            loadQuizzes();
            break;
        case 'questions':
            loadQuestionSection();
            break;
        case 'users':
            loadUsers();
            break;
        case 'results':
            loadResultsSection();
            break;
        case 'feedbacks':
            loadFeedbacks();
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
        Toast.error('Erro ao carregar dashboard');
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

let editingCourseId = null;
let capacityCounter = 0;

function showAddCourseModal() {
    editingCourseId = null;
    capacityCounter = 0;
    document.getElementById('course-modal-title').textContent = 'Adicionar Novo Curso';
    document.getElementById('course-name').value = '';
    document.getElementById('course-description').value = '';
    document.getElementById('course-category').value = '';
    document.getElementById('course-color').value = '#3b82f6';
    document.getElementById('capacities-container').innerHTML = '';
    openModal('add-course-modal');
}

function addCapacity(capacity = null) {
    const container = document.getElementById('capacities-container');
    const index = capacityCounter++;
    
    const capacityDiv = document.createElement('div');
    capacityDiv.className = 'capacity-item';
    capacityDiv.id = `capacity-${index}`;
    capacityDiv.innerHTML = `
        <div style="background: var(--bg-card); border: 2px solid var(--border); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: var(--violet);">Capacidade ${index + 1}</strong>
                <button type="button" onclick="removeCapacity(${index})" class="btn-danger" style="padding: 5px 10px; font-size: 0.875rem;">
                    Remover
                </button>
            </div>
            
            <div class="form-group">
                <label>ID da Capacidade:</label>
                <input type="text" id="capacity-id-${index}" placeholder="ex: C1, C2..." 
                    value="${capacity ? capacity.id : ''}" required 
                    style="width: 100px;">
            </div>
            
            <div class="form-group">
                <label>Nome da Capacidade:</label>
                <input type="text" id="capacity-name-${index}" placeholder="ex: Lógica de Programação" 
                    value="${capacity ? capacity.name : ''}" required>
            </div>
            
            <div class="form-group">
                <label>Habilidades:</label>
                <div id="skills-container-${index}" style="margin-top: 10px;">
                    ${capacity && capacity.skills ? capacity.skills.map((skill, skillIndex) => `
                        <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                            <input type="text" class="skill-input-${index}" placeholder="Habilidade..." 
                                value="${skill}" style="flex: 1;">
                            <button type="button" onclick="this.parentElement.remove()" class="btn-secondary" 
                                style="padding: 5px 10px; font-size: 0.875rem;">Remover</button>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" onclick="addSkill(${index})" class="btn-secondary" 
                    style="margin-top: 8px; font-size: 0.875rem;">
                    + Adicionar Habilidade
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(capacityDiv);
}

function removeCapacity(index) {
    const element = document.getElementById(`capacity-${index}`);
    if (element) {
        element.remove();
    }
}

function addSkill(capacityIndex) {
    const container = document.getElementById(`skills-container-${capacityIndex}`);
    const skillDiv = document.createElement('div');
    skillDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px;';
    skillDiv.innerHTML = `
        <input type="text" class="skill-input-${capacityIndex}" placeholder="Habilidade..." style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" class="btn-secondary" 
            style="padding: 5px 10px; font-size: 0.875rem;">Remover</button>
    `;
    container.appendChild(skillDiv);
}

function collectCapacitiesData() {
    const capacities = [];
    const container = document.getElementById('capacities-container');
    const capacityDivs = container.querySelectorAll('.capacity-item');
    
    capacityDivs.forEach((div, index) => {
        const id = div.querySelector(`[id^="capacity-id-"]`).value.trim();
        const name = div.querySelector(`[id^="capacity-name-"]`).value.trim();
        
        if (id && name) {
            const skillInputs = div.querySelectorAll(`[class*="skill-input-"]`);
            const skills = Array.from(skillInputs)
                .map(input => input.value.trim())
                .filter(skill => skill !== '');
            
            capacities.push({ id, name, skills });
        }
    });
    
    return capacities;
}

async function handleAddCourse(event) {
    event.preventDefault();

    const capacities = collectCapacitiesData();

    const courseData = {
        name: document.getElementById('course-name').value,
        description: document.getElementById('course-description').value,
        category: document.getElementById('course-category').value,
        color: document.getElementById('course-color').value,
        capacities: capacities
    };

    try {
        const url = editingCourseId 
            ? `${API_URL}/courses/${editingCourseId}`
            : `${API_URL}/courses`;
        
        const method = editingCourseId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();

        if (!response.ok) {
            Toast.error(data.error || 'Erro ao salvar curso');
            return;
        }

        Toast.success(editingCourseId ? 'Curso atualizado com sucesso!' : 'Curso criado com sucesso!');
        closeModal('add-course-modal');
        event.target.reset();
        loadCourses();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
    }
}

async function editCourse(courseId) {
    try {
        // Buscar dados do curso
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();
        const courses = data.courses || [];
        const course = courses.find(c => c.id === courseId);
        
        if (!course) {
            Toast.error('Curso não encontrado');
            return;
        }

        // Preencher modal
        editingCourseId = courseId;
        capacityCounter = 0;
        
        document.getElementById('course-modal-title').textContent = 'Editar Curso';
        document.getElementById('course-name').value = course.name;
        document.getElementById('course-description').value = course.description || '';
        document.getElementById('course-category').value = course.category || '';
        document.getElementById('course-color').value = course.color || '#3b82f6';
        
        // Limpar e adicionar capacidades existentes
        document.getElementById('capacities-container').innerHTML = '';
        
        if (course.capacities && course.capacities.length > 0) {
            course.capacities.forEach(capacity => {
                addCapacity(capacity);
            });
        }
        
        openModal('add-course-modal');
        
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao carregar dados do curso');
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
            Toast.error(data.error || 'Erro ao deletar curso');
            return;
        }

        Toast.success('Curso deletado com sucesso!');
        loadCourses();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
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

        // Aceitar tanto array direto quanto objeto { questions: [...] }
        const questionsList = Array.isArray(data) ? data : (data.questions || []);

        if (questionsList.length === 0) {
            document.getElementById('questions-list').innerHTML = '<p>Nenhuma questão cadastrada neste curso.</p>';
            return;
        }

        const questionsHtml = questionsList.map(q => {
            const hasImages = q.contextImage || (Array.isArray(q.options) && q.options.some(opt => opt.image));

            return `
            <div class="question-item">
                <div class="question-header">
                    <span class="question-id">${q.id}</span>
                    <div>
                        <span class="question-capacity">${q.capacidade}</span>
                        <button onclick="deleteQuestion(${courseId}, '${q.id}')" class="btn-icon btn-delete" style="margin-left: 10px;">🗑️</button>
                    </div>
                </div>
                <div class="question-command"><strong>${q.command}</strong></div>
                <div class="question-options">
                    ${q.options.length} opções${hasImages ? ' • <span class="question-media-flag">🖼️ Imagens</span>' : ''}
                </div>
            </div>
        `;
        }).join('');

        document.getElementById('questions-list').innerHTML = questionsHtml;
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao carregar questões');
    }
}

function showAddQuestionModal() {
    optionCounter = 0;
    document.getElementById('options-container').innerHTML = '';
    const contextImageInput = document.getElementById('question-context-image');
    if (contextImageInput) {
        contextImageInput.value = '';
    }
    
    // Limpar e desabilitar campo de ID (será gerado automaticamente)
    const questionIdInput = document.getElementById('question-id');
    if (questionIdInput) {
        questionIdInput.value = '';
        questionIdInput.placeholder = 'Será gerado automaticamente';
        questionIdInput.readOnly = true;
        questionIdInput.style.backgroundColor = '#f0f0f0';
    }
    
    // Atualizar preview do próximo ID quando o curso for selecionado
    const courseSelect = document.getElementById('question-course');
    if (courseSelect) {
        courseSelect.addEventListener('change', updateNextQuestionId, { once: true });
    }
    
    addOption();
    addOption();
    openModal('add-question-modal');
}

async function updateNextQuestionId() {
    const courseId = parseInt(document.getElementById('question-course').value);
    const questionIdInput = document.getElementById('question-id');
    
    if (!courseId || !questionIdInput) return;
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/next-question-id`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            questionIdInput.value = data.nextId;
            questionIdInput.placeholder = `Próximo ID: ${data.nextId}`;
        }
    } catch (error) {
        console.error('Erro ao obter próximo ID:', error);
    }
}

function addOption() {
    const optionIndex = optionCounter++;
    const letter = String.fromCharCode(65 + optionIndex);
    const optionHtml = `
        <div class="option-input-group" data-option-index="${optionIndex}">
            <div class="option-input-header">
                <span class="option-chip">${letter}</span>
            </div>
            <label for="option-text-${optionIndex}">Texto da opção ${letter}</label>
            <input type="text" id="option-text-${optionIndex}" class="option-text" placeholder="Texto da opção ${letter}" required>
            <label for="option-image-${optionIndex}">Imagem (URL opcional)</label>
            <input type="url" id="option-image-${optionIndex}" class="option-image-url" placeholder="https://exemplo.com/imagem.jpg">
            <label for="option-justification-${optionIndex}">Justificativa ou explicação</label>
            <textarea id="option-justification-${optionIndex}" class="option-justification" rows="2" placeholder="Use para justificar alternativas incorretas ou explicar a correta"></textarea>
            <div class="option-checkbox">
                <input type="checkbox" id="option-correct-${optionIndex}" class="option-correct">
                <label for="option-correct-${optionIndex}">Esta é a resposta correta</label>
            </div>
        </div>
    `;
    document.getElementById('options-container').insertAdjacentHTML('beforeend', optionHtml);
}

async function handleAddQuestion(event) {
    event.preventDefault();

    const courseId = parseInt(document.getElementById('question-course').value);
    const questionId = document.getElementById('question-id').value.trim();
    const capacity = document.getElementById('question-capacity').value;
    const difficulty = document.getElementById('question-difficulty').value;
    const context = document.getElementById('question-context').value;
    const contextImage = document.getElementById('question-context-image').value.trim();
    const command = document.getElementById('question-command').value;

    // Coletar opções
    const options = [];
    document.querySelectorAll('#options-container .option-input-group').forEach(group => {
        const textInput = group.querySelector('.option-text');
        const imageInput = group.querySelector('.option-image-url');
        const justificationInput = group.querySelector('.option-justification');
        const correctInput = group.querySelector('.option-correct');

        const text = textInput ? textInput.value.trim() : '';
        const imageUrl = imageInput ? imageInput.value.trim() : '';
        const justificationField = justificationInput ? justificationInput.value.trim() : '';
        const isCorrect = correctInput ? correctInput.checked : false;

        if (!text) {
            return;
        }

        const option = { text };
        if (imageUrl) {
            option.image = imageUrl;
        }

        if (isCorrect) {
            option.correct = true;
            if (justificationField) {
                option.explanation = justificationField;
            }
        } else if (justificationField) {
            option.justification = justificationField;
        }

        options.push(option);
    });

    if (options.length < 2) {
        Toast.warning('Informe pelo menos duas opções com texto.');
        return;
    }

    // Validar
    const correctCount = options.filter(o => o.correct).length;
    if (correctCount !== 1) {
        Toast.warning('Marque exatamente UMA opção como correta!');
        return;
    }

    const questionData = {
        // Se ID estiver vazio, não envia (backend vai gerar automaticamente)
        capacidade: capacity,
        dificuldade: difficulty,
        context,
        command,
        options
    };

    // Só adiciona ID se foi fornecido (para compatibilidade retroativa)
    if (questionId) {
        questionData.id = questionId;
    }

    if (contextImage) {
        questionData.contextImage = contextImage;
    }

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
            Toast.error(data.error || 'Erro ao criar questão');
            return;
        }

        Toast.success(`Questão criada com sucesso! ID: ${data.question.id}`);
        closeModal('add-question-modal');
        event.target.reset();
        loadQuestionsByCourse();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
    }
}

function showImportModal() {
    openModal('import-modal');
}

async function handleImportQuestions(event) {
    event.preventDefault();

    const courseId = parseInt(document.getElementById('import-course').value);
    const jsonText = document.getElementById('import-json').value;

    let questionsData;
    try {
        questionsData = JSON.parse(jsonText);
    } catch (error) {
        Toast.error('JSON inválido! Verifique o formato.');
        return;
    }

    if (!Array.isArray(questionsData)) {
        Toast.error('O JSON deve ser um array de questões.');
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
            Toast.error(data.error || 'Erro ao importar questões');
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

        Toast.success(message);
        closeModal('import-modal');
        event.target.reset();
        
        // Selecionar o curso importado
        document.getElementById('course-filter').value = courseId;
        loadQuestionsByCourse();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
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
            Toast.error(data.error || 'Erro ao deletar questão');
            return;
        }

        Toast.success('Questão deletada com sucesso!');
        loadQuestionsByCourse();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
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
            Toast.error('Erro ao carregar usuários');
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
        Toast.error('Erro ao carregar usuários');
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
            Toast.error(data.error || 'Erro ao promover usuário');
            return;
        }

        Toast.success('Usuário promovido com sucesso!');
        loadUsers();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
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
            Toast.error(data.error || 'Erro ao deletar usuário');
            return;
        }

        Toast.success('Usuário deletado com sucesso!');
        loadUsers();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
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
            Toast.error('Erro ao exportar dados');
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

        Toast.success('Arquivo exportado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao exportar dados');
    }
}

async function generateCourseReport() {
    const courseId = document.getElementById('report-course-select').value;

    if (!courseId) {
        Toast.warning('Selecione um curso');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/reports/course/${courseId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            Toast.error('Erro ao gerar relatório');
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
                        <p style="color: var(--text-muted); margin-bottom: 15px;">
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
        Toast.error('Erro ao gerar relatório');
    }
}

// ==================== MODAL ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('is-open');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
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

    const includeContextImagesCheckbox = document.getElementById('ai-include-context-images');
    const includeOptionImagesCheckbox = document.getElementById('ai-include-option-images');
    const imageProviderSelect = document.getElementById('ai-image-provider');

    if (includeContextImagesCheckbox) {
        includeContextImagesCheckbox.checked = true;
        includeContextImagesCheckbox.disabled = false;
        includeContextImagesCheckbox.title = '';
    }

    if (includeOptionImagesCheckbox) {
        includeOptionImagesCheckbox.checked = false; // Desativado por padrão
        includeOptionImagesCheckbox.disabled = false;
        includeOptionImagesCheckbox.title = '';
    }

    if (imageProviderSelect) {
        imageProviderSelect.disabled = false;
        imageProviderSelect.innerHTML = '<option value="pollinations">Pollinations (gratuito)</option>';
    }

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

            if (imageProviderSelect) {
                const imageStatus = status.images || {};
                const providers = Array.isArray(imageStatus.providers) && imageStatus.providers.length > 0
                    ? imageStatus.providers
                    : ['pollinations'];

                imageProviderSelect.innerHTML = '';

                providers.forEach(providerKey => {
                    const option = document.createElement('option');
                    option.value = providerKey;
                    option.textContent = providerKey === 'pollinations'
                        ? 'Pollinations (gratuito)'
                        : providerKey;
                    imageProviderSelect.appendChild(option);
                });

                const defaultProvider = imageStatus.defaultProvider && providers.includes(imageStatus.defaultProvider)
                    ? imageStatus.defaultProvider
                    : providers[0];
                imageProviderSelect.value = defaultProvider;
                imageProviderSelect.disabled = imageStatus.available === false;

                if (imageStatus.available === false && imageProviderSelect.options.length === 0) {
                    const fallback = document.createElement('option');
                    fallback.value = '';
                    fallback.textContent = 'Nenhum provedor disponível';
                    fallback.disabled = true;
                    fallback.selected = true;
                    imageProviderSelect.appendChild(fallback);
                }
            }

            if (includeContextImagesCheckbox) {
                const available = status.images ? status.images.available !== false : true;
                includeContextImagesCheckbox.checked = available;
                includeContextImagesCheckbox.disabled = !available;
                includeContextImagesCheckbox.title = available ? '' : 'Nenhum provedor de imagem disponível no momento';
            }

            if (includeOptionImagesCheckbox) {
                const available = status.images ? status.images.available !== false : true;
                includeOptionImagesCheckbox.checked = false; // Sempre começa desativado
                includeOptionImagesCheckbox.disabled = !available;
                includeOptionImagesCheckbox.title = available ? '' : 'Nenhum provedor de imagem disponível no momento';
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status das APIs:', error);
    }

    // Resetar preview
    document.getElementById('ai-preview').style.display = 'none';
    generatedAIQuestion = null;

    // Resetar cascata de capacidades/habilidades
    document.getElementById('ai-capacity').innerHTML = '<option value="">Primeiro selecione um curso...</option>';
    document.getElementById('ai-skill').innerHTML = '<option value="">Primeiro selecione uma capacidade...</option>';

    openModal('ai-question-modal');
}

function loadCapacitiesForAI() {
    const courseId = parseInt(document.getElementById('ai-course').value);
    const capacitySelect = document.getElementById('ai-capacity');
    const skillSelect = document.getElementById('ai-skill');

    capacitySelect.innerHTML = '<option value="">Selecione uma capacidade...</option>';
    skillSelect.innerHTML = '<option value="">Primeiro selecione uma capacidade...</option>';

    if (!courseId) {
        capacitySelect.innerHTML = '<option value="">Primeiro selecione um curso...</option>';
        return;
    }

    const course = allCourses.find(c => c.id === courseId);
    if (!course || !course.capacities || course.capacities.length === 0) {
        capacitySelect.innerHTML = '<option value="">Este curso não possui capacidades configuradas</option>';
        return;
    }

    course.capacities.forEach(capacity => {
        const option = document.createElement('option');
        option.value = capacity.id;
        option.textContent = `${capacity.id} - ${capacity.name}`;
        option.dataset.skills = JSON.stringify(capacity.skills || []);
        capacitySelect.appendChild(option);
    });
}

function loadSkillsForAI() {
    const capacitySelect = document.getElementById('ai-capacity');
    const skillSelect = document.getElementById('ai-skill');

    skillSelect.innerHTML = '<option value="">Selecione uma habilidade...</option>';

    const selectedOption = capacitySelect.options[capacitySelect.selectedIndex];
    if (!selectedOption || !selectedOption.dataset.skills) {
        return;
    }

    const skills = JSON.parse(selectedOption.dataset.skills);
    if (!skills || skills.length === 0) {
        skillSelect.innerHTML = '<option value="">Esta capacidade não possui habilidades configuradas</option>';
        return;
    }

    skills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        skillSelect.appendChild(option);
    });
}

async function handleGenerateAIQuestion(event) {
    event.preventDefault();

    const provider = document.getElementById('ai-provider').value;
    const courseId = parseInt(document.getElementById('ai-course').value);
    const capacity = document.getElementById('ai-capacity').value;
    const skill = document.getElementById('ai-skill').value;
    const content = document.getElementById('ai-content').value;
    const difficulty = document.getElementById('ai-difficulty').value;
    const includeContextImagesInput = document.getElementById('ai-include-context-images');
    const includeOptionImagesInput = document.getElementById('ai-include-option-images');
    const imageProviderSelect = document.getElementById('ai-image-provider');

    const includeContextImages = includeContextImagesInput ? includeContextImagesInput.checked : true;
    const includeOptionImages = includeOptionImagesInput ? includeOptionImagesInput.checked : false;
    const imageProvider = imageProviderSelect && imageProviderSelect.value
        ? imageProviderSelect.value
        : 'pollinations';

    if (!courseId) {
        Toast.warning('Por favor, selecione um curso');
        return;
    }

    if (!skill) {
        Toast.warning('Por favor, selecione uma habilidade');
        return;
    }

    // Encontrar o nome da capacidade selecionada
    const capacitySelect = document.getElementById('ai-capacity');
    const selectedCapacityOption = capacitySelect.options[capacitySelect.selectedIndex];
    const capacityName = selectedCapacityOption ? selectedCapacityOption.textContent : capacity;

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
                courseId,
                provider,
                capacity: capacityName,
                content: skill + (content ? `. ${content}` : ''),
                difficulty,
                includeContextImages,
                includeOptionImages,
                imageProvider
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

        Toast.success('Questão gerada com sucesso! Revise abaixo antes de salvar.');

    } catch (error) {
        console.error('Erro:', error);
        Toast.error(`Erro ao gerar questão: ${error.message}`);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

function displayAIQuestionPreview(question) {
    const previewContainer = document.getElementById('ai-question-preview');
    
    const correctOption = question.options.find(opt => opt.correct);
    const contextImageHtml = question.contextImage
        ? `
            <div class="question-preview-media">
                <img src="${question.contextImage}" alt="Ilustração sugerida para o contexto da questão">
            </div>
        `
        : '';

    const optionsHtml = question.options.map((opt, index) => {
        const letter = opt.letter || String.fromCharCode(65 + index);
        const explanation = opt.explanation ? `<br><small style="color: #666;"><em>Explicação: ${opt.explanation}</em></small>` : '';
        const optionImage = opt.image
            ? `
                <div class="preview-option-media">
                    <img src="${opt.image}" alt="Imagem sugerida para a alternativa ${letter}">
                </div>
            `
            : '';

        return `
            <li style="padding: 10px; margin: 5px 0; background: ${opt.correct ? '#C8E6C9' : 'white'}; border: 1px solid ${opt.correct ? '#4CAF50' : '#ddd'}; border-radius: 4px;">
                <strong>${letter})</strong> ${opt.text}
                ${opt.correct ? '<span style="color: #4CAF50; font-weight: bold;"> ✓ CORRETA</span>' : ''}
                ${explanation}
                ${optionImage}
            </li>
        `;
    }).join('');

    const correctExplanation = correctOption && correctOption.explanation
        ? `
            <div style="margin-top: 15px; padding: 10px; background: #E8F5E9; border-left: 3px solid #4CAF50;">
                <strong>✓ Resposta Correta:</strong> ${correctOption.letter}) ${correctOption.text}<br>
                <strong>Explicação:</strong> ${correctOption.explanation}
            </div>
        `
        : '';

    const imageMetadata = question.imageMetadata && question.imageMetadata.provider
        ? `<span class="image-metadata">Imagens geradas via ${question.imageMetadata.provider}</span>`
        : '';

    const imageWarning = question.imageGenerationError
        ? `<div class="alert-warning">⚠️ ${question.imageGenerationError}</div>`
        : '';

    previewContainer.innerHTML = `
        <div class="question-card" style="background: var(--bg-card); padding: 20px; border-radius: 8px; border: 2px solid #4CAF50;">
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
                <div style="margin-top: 15px; padding: 10px; background: var(--bg-surface); border-left: 3px solid #2196F3;">
                    <strong>Contexto:</strong><br>
                    ${question.context}
                </div>
            ` : ''}

            ${contextImageHtml}
            
            <div style="margin-top: 15px; padding: 10px; background: var(--bg-surface); border-left: 3px solid #4CAF50;">
                <strong>Pergunta:</strong><br>
                ${question.command}
            </div>
            
            <div style="margin-top: 15px;">
                <strong>Alternativas:</strong>
                <ul style="list-style: none; padding: 0; margin-top: 10px;">
                    ${optionsHtml}
                </ul>
            </div>
            
            ${correctExplanation}
            ${imageMetadata}
            ${imageWarning}
        </div>
    `;

    document.getElementById('ai-preview').style.display = 'block';
    
    // Scroll para o preview
    document.getElementById('ai-preview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function approveAIQuestion() {
    if (!generatedAIQuestion) {
        Toast.warning('Nenhuma questão para aprovar');
        return;
    }

    const courseId = generatedAIQuestion.courseId;

    if (!courseId) {
        Toast.error('Curso destino não definido. Regere a questão e tente novamente.');
        return;
    }

    const payload = {
        id: generatedAIQuestion.id,
        capacidade: generatedAIQuestion.capacidade,
        context: generatedAIQuestion.context,
        command: generatedAIQuestion.command,
        options: generatedAIQuestion.options
    };

    if (generatedAIQuestion.contextImage) {
        payload.contextImage = generatedAIQuestion.contextImage;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao salvar questão');
        }

        Toast.success('Questão aprovada e salva com sucesso!');
        closeModal('ai-question-modal');
        await loadQuestionsByCourse();
        
        // Resetar
        generatedAIQuestion = null;
        document.getElementById('ai-preview').style.display = 'none';

    } catch (error) {
        console.error('Erro:', error);
        Toast.error(`Erro ao salvar questão: ${error.message}`);
    }
}

function rejectAIQuestion() {
    if (confirm('Deseja rejeitar esta questão e gerar uma nova?')) {
        generatedAIQuestion = null;
        document.getElementById('ai-preview').style.display = 'none';
        Toast.info('Questão rejeitada. Gere uma nova questão.');
    }
}

function editAIQuestion() {
    if (!generatedAIQuestion) {
        Toast.warning('Nenhuma questão para editar');
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
        document.getElementById('question-context-image').value = generatedAIQuestion.contextImage || '';
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
            document.getElementById(`option-image-${lastIndex}`).value = opt.image || '';
            document.getElementById(`option-justification-${lastIndex}`).value = opt.correct
                ? (opt.explanation || '')
                : (opt.justification || '');
        });

        Toast.info('Questão carregada para edição. Faça as alterações e clique em "Criar Questão".');
    }, 300);
}

// ==================== QUIZZES ====================

let allQuizzes = [];
let editingQuizId = null;

async function loadQuizzes() {
    try {
        const response = await fetch(`${API_URL}/quizzes`);
        const quizzes = await response.json();
        allQuizzes = quizzes;

        const container = document.getElementById('quizzes-list');
        
        if (quizzes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>📝 Nenhum quiz cadastrado ainda</p><p>Clique em "Novo Quiz" para criar o primeiro!</p></div>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => {
            const course = allCourses.find(c => c.id === quiz.courseId);
            return `
                <div class="course-card" style="border-left: 4px solid ${course ? course.color : '#3b82f6'}">
                    <h3>${quiz.name}</h3>
                    <p>${quiz.description || 'Sem descrição'}</p>
                    <p><strong>Curso:</strong> ${course ? course.name : 'N/A'}</p>
                    <p><strong>Questões:</strong> ${quiz.questionIds ? quiz.questionIds.length : 0}</p>
                    <p style="color: #94a3b8; font-size: 0.875rem;">Criado em ${new Date(quiz.createdAt).toLocaleDateString()}</p>
                    <div class="card-actions">
                        <button onclick="editQuiz(${quiz.id})" class="btn-secondary">Editar</button>
                        <button onclick="deleteQuiz(${quiz.id})" class="btn-danger">Excluir</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar quizzes:', error);
        Toast.error('Erro ao carregar quizzes');
    }
}

function showAddQuizModal() {
    editingQuizId = null;
    document.getElementById('quiz-modal-title').textContent = 'Novo Quiz';
    document.getElementById('quiz-form').reset();
    
    // Carregar cursos
    const courseSelect = document.getElementById('quiz-course');
    courseSelect.innerHTML = '<option value="">Selecione o curso...</option>';
    allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        courseSelect.appendChild(option);
    });

    // Resetar container de questões
    document.getElementById('quiz-questions-container').innerHTML = '<p style="color: #94a3b8; text-align: center;">Selecione um curso primeiro...</p>';

    openModal('quiz-modal');
}

async function loadQuestionsForQuiz() {
    const courseId = parseInt(document.getElementById('quiz-course').value);
    const filterCapacity = document.getElementById('quiz-filter-capacity').value;
    const filterDifficulty = document.getElementById('quiz-filter-difficulty').value;
    const container = document.getElementById('quiz-questions-container');

    if (!courseId) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 30px;">Selecione um curso primeiro...</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/questions`);
        const data = await response.json();
        let questions = data.questions || data; // Aceita tanto { questions: [...] } quanto array direto

        if (!Array.isArray(questions) || questions.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 30px;">Este curso não possui questões cadastradas</p>';
            return;
        }

        // Aplicar filtros
        if (filterCapacity) {
            questions = questions.filter(q => (q.capacity || 'Geral') === filterCapacity);
        }
        if (filterDifficulty) {
            questions = questions.filter(q => (q.difficulty || 'Médio') === filterDifficulty);
        }

        if (questions.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 30px;">Nenhuma questão encontrada com os filtros aplicados</p>';
            return;
        }

        // Se estamos editando, carregar as questões já selecionadas
        let selectedIds = [];
        if (editingQuizId) {
            const quiz = allQuizzes.find(q => q.id === editingQuizId);
            selectedIds = quiz ? quiz.questionIds.map(id => String(id)) : [];
        }

        // Agrupar questões por capacidade
        const questionsByCapacity = {};
        questions.forEach(q => {
            const capacity = q.capacity || 'Geral';
            if (!questionsByCapacity[capacity]) {
                questionsByCapacity[capacity] = [];
            }
            questionsByCapacity[capacity].push(q);
        });

        // Mapear capacidades para nomes legíveis
        const capacityMap = {
            'C1': 'Capacidade 1: Planejamento e Documentação',
            'C2': 'Capacidade 2: Desenvolvimento e Implementação',
            'C3': 'Capacidade 3: Testes, Qualidade e Deploy',
            'C4': 'Capacidade 4: Metodologias e Gestão',
            'C5': 'Capacidade 5: Performance e Otimização'
        };

        let html = '';
        
        // Ordenar capacidades
        const sortedCapacities = Object.keys(questionsByCapacity).sort();

        sortedCapacities.forEach(capacity => {
            const capacityQuestions = questionsByCapacity[capacity];
            const capacityLabel = capacityMap[capacity] || capacity;
            
            html += `
                <div style="margin-bottom: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: white; font-size: 1rem; font-weight: 600;">
                            📚 ${capacityLabel}
                        </h4>
                        <span style="background: rgba(255,255,255,0.3); color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                            ${capacityQuestions.length} questão${capacityQuestions.length > 1 ? 'ões' : ''}
                        </span>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${capacityQuestions.map(q => {
                            const isSelected = selectedIds.includes(String(q.id));
                            const difficultyLabel = q.difficulty || 'Médio';
                            
                            return `
                                <div class="quiz-question-item" style="margin-bottom: 8px; padding: 16px; background: var(--bg-card); border-radius: 8px; border: 2px solid ${isSelected ? '#a78bfa' : 'rgba(139,92,246,0.15)'}; transition: all 0.2s ease; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" 
                                     onmouseover="if(!this.querySelector('input[type=checkbox]').checked) { this.style.borderColor='#a78bfa'; this.style.background='#1c2333'; }" 
                                     onmouseout="if(!this.querySelector('input[type=checkbox]').checked) { this.style.borderColor='rgba(139,92,246,0.15)'; this.style.background='var(--bg-card)'; }"
                                     onclick="toggleQuestionCheckbox(this);">
                                    <label style="display: flex; align-items: start; cursor: pointer; width: 100%;">
                                        <input type="checkbox" name="quiz-question" value="${q.id}" ${isSelected ? 'checked' : ''} 
                                               style="margin-right: 12px; margin-top: 4px; width: 20px; height: 20px; cursor: pointer; flex-shrink: 0; accent-color: #a78bfa;"
                                               onclick="event.stopPropagation(); updateQuestionBorder(this);">
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 8px;">${q.command}</div>
                                            <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                                                <span style="background: rgba(167,139,250,0.15); color: #a78bfa; padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">
                                                    🎯 ${difficultyLabel}
                                                </span>
                                                <span style="background: var(--bg-deep); color: var(--text-muted); padding: 3px 8px; border-radius: 4px; font-size: 0.7rem;">
                                                    ID: ${q.id}
                                                </span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar questões:', error);
        container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 30px;">Erro ao carregar questões</p>';
    }
}

// Função auxiliar para toggle do checkbox
function toggleQuestionCheckbox(element) {
    const checkbox = element.querySelector('input[type=checkbox]');
    checkbox.checked = !checkbox.checked;
    updateQuestionBorder(checkbox);
}

// Função auxiliar para atualizar borda quando checkbox muda
function updateQuestionBorder(checkbox) {
    const parent = checkbox.closest('.quiz-question-item');
    if (checkbox.checked) {
        parent.style.borderColor = '#a78bfa';
        parent.style.background = '#1c2333';
    } else {
        parent.style.borderColor = 'rgba(139,92,246,0.15)';
        parent.style.background = 'var(--bg-card)';
    }
}

// Selecionar todas as questões
function selectAllQuestions() {
    const checkboxes = document.querySelectorAll('#quiz-questions-container input[name="quiz-question"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        updateQuestionBorder(checkbox);
    });
}

// Desselecionar todas as questões
function deselectAllQuestions() {
    const checkboxes = document.querySelectorAll('#quiz-questions-container input[name="quiz-question"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        updateQuestionBorder(checkbox);
    });
}

async function handleQuizSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('quiz-name').value;
    const description = document.getElementById('quiz-description').value;
    const courseId = parseInt(document.getElementById('quiz-course').value);

    // Coletar IDs das questões selecionadas (manter como string)
    const checkboxes = document.querySelectorAll('input[name="quiz-question"]:checked');
    const questionIds = Array.from(checkboxes).map(cb => cb.value);

    console.log('IDs selecionados:', questionIds);

    if (questionIds.length === 0) {
        Toast.warning('Selecione pelo menos uma questão para o quiz');
        return;
    }

    try {
        const url = editingQuizId 
            ? `${API_URL}/quizzes/${editingQuizId}`
            : `${API_URL}/quizzes`;

        const method = editingQuizId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, description, courseId, questionIds })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao salvar quiz');
        }

        Toast.success(editingQuizId ? 'Quiz atualizado com sucesso!' : 'Quiz criado com sucesso!');
        closeModal('quiz-modal');
        loadQuizzes();

    } catch (error) {
        console.error('Erro:', error);
        Toast.error(`Erro: ${error.message}`);
    }
}

async function editQuiz(quizId) {
    const quiz = allQuizzes.find(q => q.id === quizId);
    if (!quiz) return;

    editingQuizId = quizId;
    document.getElementById('quiz-modal-title').textContent = 'Editar Quiz';
    
    // Preencher campos
    document.getElementById('quiz-name').value = quiz.name;
    document.getElementById('quiz-description').value = quiz.description || '';
    
    // Carregar cursos
    const courseSelect = document.getElementById('quiz-course');
    courseSelect.innerHTML = '<option value="">Selecione o curso...</option>';
    allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        courseSelect.appendChild(option);
    });
    courseSelect.value = quiz.courseId;

    // Carregar questões do curso
    await loadQuestionsForQuiz();

    openModal('quiz-modal');
}

async function deleteQuiz(quizId) {
    const quiz = allQuizzes.find(q => q.id === quizId);
    if (!quiz) return;

    if (!confirm(`Tem certeza que deseja excluir o quiz "${quiz.name}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao deletar quiz');
        }

        Toast.success('Quiz deletado com sucesso!');
        loadQuizzes();

    } catch (error) {
        console.error('Erro:', error);
        Toast.error(`Erro: ${error.message}`);
    }
}

// ==================== SISTEMA DE AJUDA ====================

function showHelpModal() {
    openModal('help-modal');
}

function showHelpContent(category) {
    const contentDiv = document.getElementById('help-content');
    
    const tutorials = {
        'cadastro': `
            <h3>👤 Como se Cadastrar no Sistema</h3>
            
            <h4>Para Alunos:</h4>
            <ol>
                <li>Acesse a página inicial do Quiz SAEP</li>
                <li>Clique no botão <strong>"Cadastrar"</strong> no canto superior direito</li>
                <li>Preencha os campos:
                    <ul>
                        <li><strong>Nome de usuário:</strong> Escolha um nome único</li>
                        <li><strong>E-mail:</strong> Seu e-mail válido</li>
                        <li><strong>Senha:</strong> Mínimo 6 caracteres</li>
                    </ul>
                </li>
                <li>Clique em <strong>"Cadastrar"</strong></li>
                <li>Faça login com suas credenciais</li>
                <li>Pronto! Você já pode fazer quizzes</li>
            </ol>
            
            <div class="tip-box">
                <strong>💡 Dica:</strong> Guarde bem suas credenciais! Você precisará delas para acessar seu histórico e ranking.
            </div>
            
            <h4>Acesso Administrativo:</h4>
            <p>Se você é instrutor/professor, entre em contato com o administrador do sistema para receber credenciais de admin.</p>
            
            <div class="success-box">
                <strong>✅ Credenciais Padrão do Admin:</strong><br>
                E-mail: admin@quiz.com<br>
                Senha: admin123<br>
                <small>(Altere após o primeiro acesso!)</small>
            </div>
        `,
        
        'fazer-quiz': `
            <h3>✏️ Como Fazer um Quiz</h3>
            
            <h4>Passo a Passo:</h4>
            <ol>
                <li><strong>Faça Login</strong> no sistema</li>
                <li>Na tela inicial, você verá um <strong>dropdown com os quizzes disponíveis</strong></li>
                <li>Selecione o quiz que deseja fazer (ex: "Quiz 1 - Programação de Jogos")</li>
                <li>Clique no botão <strong>"Iniciar Quiz"</strong></li>
                <li>Leia cada questão com atenção</li>
                <li>Selecione a alternativa que considerar correta</li>
                <li>Ao finalizar todas as questões, clique em <strong>"Enviar Respostas"</strong></li>
                <li>Veja seu resultado, pontuação e tempo gasto</li>
            </ol>
            
            <div class="tip-box">
                <strong>⏱️ Tempo:</strong> O sistema cronometra automaticamente. Tente responder com atenção mas sem pressa excessiva.
            </div>
            
            <h4>Após Terminar:</h4>
            <ul>
                <li>Você pode ver suas respostas corretas e incorretas</li>
                <li>Conferir explicações das questões</li>
                <li>Ver sua posição no ranking</li>
                <li>Acessar seu perfil para ver histórico completo</li>
            </ul>
            
            <div class="warning-box">
                <strong>⚠️ Atenção:</strong> Cada quiz só pode ser feito uma vez. Certifique-se de estar preparado antes de começar!
            </div>
        `,
        
        'criar-curso': `
            <h3>📚 Como Criar um Curso</h3>
            
            <h4>Etapas de Criação:</h4>
            <ol>
                <li>No painel admin, vá na seção <strong>"Cursos"</strong></li>
                <li>Clique em <strong>"+ Novo Curso"</strong></li>
                <li>Preencha os campos:
                    <ul>
                        <li><strong>Nome do Curso:</strong> Ex: "Programação Web"</li>
                        <li><strong>Descrição:</strong> Resumo do que o curso aborda</li>
                        <li><strong>Categoria:</strong> Ex: "Tecnologia", "Humanas", etc.</li>
                        <li><strong>Cor:</strong> Escolha uma cor para identificação visual</li>
                    </ul>
                </li>
                <li>Clique em <strong>"Criar Curso"</strong></li>
            </ol>
            
            <h4>Definindo Capacidades e Habilidades:</h4>
            <p>Cada curso pode ter <strong>capacidades</strong> (competências gerais) e cada capacidade possui <strong>habilidades</strong> específicas.</p>
            
            <div class="success-box">
                <strong>📋 Exemplo de Estrutura:</strong><br><br>
                <strong>Curso:</strong> Programação de Jogos Digitais<br><br>
                <strong>Capacidade C1:</strong> Lógica de Programação<br>
                • Habilidade 1: Estruturas condicionais<br>
                • Habilidade 2: Estruturas de repetição<br>
                • Habilidade 3: Funções e procedimentos<br><br>
                
                <strong>Capacidade C2:</strong> Programação Orientada a Objetos<br>
                • Habilidade 1: Classes e objetos<br>
                • Habilidade 2: Herança e polimorfismo<br>
                • Habilidade 3: Encapsulamento
            </div>
            
            <div class="tip-box">
                <strong>💡 Por que usar capacidades?</strong><br>
                Ao gerar questões com IA, você pode selecionar exatamente qual habilidade deseja avaliar, tornando as questões mais precisas e alinhadas ao seu plano de ensino.
            </div>
        `,
        
        'criar-quiz': `
            <h3>📝 Como Criar um Quiz Personalizado</h3>
            
            <h4>O que é um Quiz?</h4>
            <p>Um quiz é uma <strong>coleção de questões</strong> que os alunos podem fazer. Você pode criar quantos quizzes quiser com as questões que desejar!</p>
            
            <h4>Como Criar:</h4>
            <ol>
                <li>Vá na seção <strong>"Quizzes"</strong> no menu lateral</li>
                <li>Clique em <strong>"+ Novo Quiz"</strong></li>
                <li>Preencha:
                    <ul>
                        <li><strong>Nome:</strong> Ex: "Prova Bimestral", "Quiz Rápido", "Revisão C1"</li>
                        <li><strong>Descrição:</strong> Opcional, ex: "Avaliação do primeiro bimestre"</li>
                        <li><strong>Curso:</strong> Selecione o curso das questões</li>
                    </ul>
                </li>
                <li>Após selecionar o curso, aparecerá a <strong>lista de questões disponíveis</strong></li>
                <li>Marque as <strong>checkboxes</strong> das questões que deseja incluir</li>
                <li>Clique em <strong>"Salvar Quiz"</strong></li>
            </ol>
            
            <div class="success-box">
                <strong>✨ Vantagens:</strong><br>
                • Crie quizzes temáticos (só sobre loops, só sobre POO, etc.)<br>
                • Monte provas com questões selecionadas<br>
                • Mesma questão pode estar em vários quizzes<br>
                • Alunos escolhem qual quiz fazer
            </div>
            
            <h4>Editando um Quiz:</h4>
            <ol>
                <li>Na lista de quizzes, clique em <strong>"Editar"</strong></li>
                <li>Altere nome, descrição ou questões</li>
                <li>Clique em <strong>"Salvar Quiz"</strong></li>
            </ol>
            
            <div class="tip-box">
                <strong>💡 Dica:</strong> Crie um "Quiz 1" com todas as questões do curso como padrão, e depois crie quizzes menores para revisões específicas.
            </div>
        `,
        
        'gerar-questao': `
            <h3>🤖 Como Gerar Questões com IA</h3>
            
            <h4>Requisitos:</h4>
            <ul>
                <li>API Key do Google Gemini (gratuita!)</li>
                <li>Curso criado com capacidades e habilidades definidas</li>
            </ul>
            
            <h4>Configuração Inicial (uma vez):</h4>
            <ol>
                <li>Obtenha sua API Key: <a href="https://makersuite.google.com/app/apikey" target="_blank">makersuite.google.com</a></li>
                <li>Configure no arquivo <code>.env</code> do backend:
                    <pre>GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-2.5-flash</pre>
                </li>
                <li>Reinicie o servidor</li>
            </ol>
            
            <h4>Gerando uma Questão:</h4>
            <ol>
                <li>Vá em <strong>"Questões"</strong> no menu lateral</li>
                <li>Clique em <strong>"🤖 Gerar com IA"</strong></li>
                <li>Preencha o formulário:
                    <ul>
                        <li><strong>Provedor:</strong> Google Gemini (gratuito)</li>
                        <li><strong>Curso:</strong> Selecione o curso</li>
                        <li><strong>Capacidade:</strong> Escolha a capacidade (ex: C1 - Lógica)</li>
                        <li><strong>Habilidade:</strong> Escolha a habilidade específica</li>
                        <li><strong>Contexto adicional:</strong> Opcional, para personalizar</li>
                        <li><strong>Dificuldade:</strong> Fácil, Médio ou Difícil</li>
                        <li><strong>Gerar ilustrações:</strong> Marque se quiser imagens</li>
                    </ul>
                </li>
                <li>Clique em <strong>"Gerar Questão"</strong></li>
                <li>Aguarde 10-30 segundos</li>
                <li>Revise a questão gerada no preview</li>
                <li>Opções:
                    <ul>
                        <li><strong>"Aprovar e Salvar":</strong> Adiciona ao banco</li>
                        <li><strong>"Editar Antes de Salvar":</strong> Permite ajustes</li>
                        <li><strong>"Rejeitar e Gerar Outra":</strong> Tenta novamente</li>
                    </ul>
                </li>
            </ol>
            
            <div class="success-box">
                <strong>✨ A IA gera automaticamente:</strong><br>
                • Contexto da questão<br>
                • Pergunta bem formulada<br>
                • 4 alternativas (A, B, C, D)<br>
                • Marcação da resposta correta<br>
                • Explicação da resposta<br>
                • URLs de imagens (se solicitado)
            </div>
            
            <div class="tip-box">
                <strong>💡 Dicas para melhores resultados:</strong><br>
                • Seja específico na habilidade escolhida<br>
                • Use o campo de contexto para cenários práticos<br>
                • Sempre revise antes de aprovar<br>
                • Edite se necessário para adequar ao seu estilo
            </div>
            
            <div class="warning-box">
                <strong>⚠️ Limites do Gemini (gratuito):</strong><br>
                • 60 requisições por minuto<br>
                • Se atingir o limite, aguarde 1 minuto
            </div>
        `,
        
        'relatorios': `
            <h3>📊 Como Gerar Relatórios</h3>
            
            <h4>Acessando Relatórios:</h4>
            <ol>
                <li>No painel admin, vá em <strong>"Relatórios"</strong> no menu lateral</li>
                <li>Escolha o tipo de relatório desejado</li>
            </ol>
            
            <h4>Tipos de Relatórios Disponíveis:</h4>
            
            <div class="success-box">
                <strong>📈 Relatório de Desempenho Geral</strong><br>
                • Total de alunos cadastrados<br>
                • Média geral de pontuação<br>
                • Taxa de conclusão de quizzes<br>
                • Tempo médio de resposta
            </div>
            
            <div class="success-box">
                <strong>👥 Relatório por Aluno</strong><br>
                • Histórico completo de quizzes feitos<br>
                • Pontuação em cada quiz<br>
                • Evolução ao longo do tempo<br>
                • Capacidades com melhor/pior desempenho
            </div>
            
            <div class="success-box">
                <strong>📝 Relatório por Quiz</strong><br>
                • Quantos alunos fizeram o quiz<br>
                • Média de pontuação<br>
                • Questões com maior índice de erro<br>
                • Tempo médio de conclusão
            </div>
            
            <div class="success-box">
                <strong>❓ Relatório por Questão</strong><br>
                • Taxa de acerto da questão<br>
                • Alternativa mais escolhida (incluindo erradas)<br>
                • Identificar questões muito fáceis ou muito difíceis
            </div>
            
            <h4>Exportando Dados:</h4>
            <ol>
                <li>Visualize o relatório desejado</li>
                <li>Use as opções de exportação:
                    <ul>
                        <li><strong>PDF:</strong> Para impressão</li>
                        <li><strong>Excel:</strong> Para análise de dados</li>
                        <li><strong>CSV:</strong> Para importar em outras ferramentas</li>
                    </ul>
                </li>
            </ol>
            
            <div class="tip-box">
                <strong>💡 Use os relatórios para:</strong><br>
                • Identificar alunos com dificuldades<br>
                • Detectar questões mal formuladas<br>
                • Avaliar eficácia do ensino<br>
                • Acompanhar evolução da turma<br>
                • Tomar decisões pedagógicas baseadas em dados
            </div>
            
            <div class="warning-box">
                <strong>📅 Filtros Úteis:</strong><br>
                • Por período (últimos 7 dias, mês, bimestre)<br>
                • Por curso específico<br>
                • Por quiz específico<br>
                • Por capacidade/competência
            </div>
            
            <h4>Acompanhamento em Tempo Real:</h4>
            <p>No Dashboard principal, você tem acesso rápido a:</p>
            <ul>
                <li>Número de alunos ativos hoje</li>
                <li>Quizzes em andamento</li>
                <li>Últimas submissões</li>
                <li>Ranking atualizado</li>
            </ul>
        `
    };
    
    contentDiv.innerHTML = tutorials[category] || '<p style="text-align: center; color: #94a3b8;">Conteúdo não encontrado.</p>';
}

// ==================== RESULTADOS ANÔNIMOS ====================

async function loadResultsSection() {
    // Carregar cursos no filtro
    const courseFilter = document.getElementById('results-course-filter');
    courseFilter.innerHTML = '<option value="">Todos os Cursos</option>';
    
    try {
        const response = await fetch(`${API_URL}/courses`);
        if (response.ok) {
            const courses = await response.json();
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.name;
                courseFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.warn('Erro ao carregar cursos para filtro:', error);
    }

    // Carregar resultados iniciais
    loadAnonymousResults();
}

async function loadAnonymousResults() {
    console.log('🔍 Carregando resultados anônimos...');
    
    try {
        const courseFilter = document.getElementById('results-course-filter').value;
        let url = `${API_URL}/admin/anonymous-results?limit=100`;
        
        if (courseFilter) {
            url += `&courseId=${courseFilter}`;
        }

        console.log('📡 Chamando URL:', url);
        console.log('📡 Token:', currentToken ? 'Presente' : 'Ausente');

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            throw new Error('Erro ao carregar resultados: ' + response.status);
        }

        const data = await response.json();
        console.log('✅ Dados recebidos:', data);
        console.log('✅ Número de resultados:', data.results?.length || 0);
        
        if (!data.results) {
            console.error('❌ data.results é undefined!');
            throw new Error('Resposta inválida do servidor');
        }
        
        displayAnonymousResults(data.results, data.stats);

    } catch (error) {
        console.error('❌ Erro ao carregar resultados:', error);
        document.getElementById('results-list').innerHTML = 
            `<p style="color: #ef4444; text-align: center; padding: 20px;">
                Erro ao carregar resultados: ${error.message}
            </p>`;
    }
}

function displayAnonymousResults(results, stats) {
    console.log('📊 Exibindo resultados:', { results, stats });
    console.log('📊 Número de resultados:', results?.length || 0);
    console.log('📊 Stats:', stats);
    
    // Atualizar estatísticas
    document.getElementById('results-total').textContent = stats?.total || 0;
    document.getElementById('results-avg-score').textContent = (stats?.avgScore || 0) + '%';
    
    // Calcular tempo médio
    const avgTimeSeconds = results?.length > 0 ? Math.floor((stats?.totalTimeSpent || 0) / results.length) : 0;
    const avgTimeMinutes = Math.floor(avgTimeSeconds / 60);
    const avgTimeSecondsRem = avgTimeSeconds % 60;
    document.getElementById('results-avg-time').textContent = 
        `${String(avgTimeMinutes).padStart(2, '0')}:${String(avgTimeSecondsRem).padStart(2, '0')}`;

    // Melhor resultado
    const bestScore = results?.length > 0 ? Math.max(...results.map(r => parseFloat(r.percentage || 0))) : 0;
    document.getElementById('results-best-score').textContent = bestScore.toFixed(1) + '%';

    // Lista de resultados
    const resultsContainer = document.getElementById('results-list');

    if (!results || results.length === 0) {
        console.log('⚠️ Nenhum resultado para exibir');
        resultsContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">Nenhum resultado encontrado</p>';
        return;
    }

    console.log('✅ Gerando HTML para', results.length, 'resultados');

    const html = results.map(result => {
        const date = new Date(result.createdAt);
        const timeSpent = result.timeSpent || 0;
        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const scoreClass = parseFloat(result.percentage || 0) >= 70 ? 'success' : parseFloat(result.percentage || 0) >= 50 ? 'warning' : 'danger';

        // Armazenar resultado no objeto window para acesso na função de detalhes
        if (!window.anonymousResultsCache) {
            window.anonymousResultsCache = {};
        }
        window.anonymousResultsCache[result.id] = result;

        return `
            <div class="result-item" style="border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; background: var(--bg-card);">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <strong style="color: var(--text-primary); font-size: 1rem;">${result.userInfo}</strong>
                            <span class="badge ${scoreClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">
                                ${result.score}/${result.totalQuestions} (${result.percentage}%)
                            </span>
                        </div>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 16px; color: var(--text-muted); font-size: 0.9rem;">
                            <span><strong>Curso:</strong> ${result.courseName}</span>
                            ${result.quizName ? `<span><strong>Quiz:</strong> ${result.quizName}</span>` : ''}
                            <span><strong>Tempo:</strong> ${timeDisplay}</span>
                            <span><strong>Data:</strong> ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
                        </div>

                        ${result.questionsCorrect && result.questionsWrong ? `
                            <div style="margin-top: 12px; display: flex; gap: 16px; font-size: 0.85rem;">
                                <span style="color: #16a34a;">✅ Acertos: ${result.questionsCorrect.length}</span>
                                <span style="color: #dc2626;">❌ Erros: ${result.questionsWrong.length}</span>
                            </div>
                        ` : ''}

                        ${result.capacityPerformance && Object.keys(result.capacityPerformance).length > 0 ? `
                            <div style="margin-top: 12px; padding: 10px; background: var(--bg-surface); border-radius: 6px;">
                                <strong style="font-size: 0.85rem; color: var(--text-muted);">Desempenho por Capacidade:</strong>
                                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
                                    ${Object.entries(result.capacityPerformance).map(([cap, stats]) => `
                                        <span style="background: ${parseFloat(stats.percentage) >= 70 ? '#dcfce7' : parseFloat(stats.percentage) >= 50 ? '#fef3c7' : '#fecaca'}; 
                                                     color: ${parseFloat(stats.percentage) >= 70 ? '#166534' : parseFloat(stats.percentage) >= 50 ? '#92400e' : '#991b1b'};
                                                     padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                                            ${cap}: ${stats.correct}/${stats.total} (${stats.percentage}%)
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${result.ip && result.ip !== 'unknown' ? `
                            <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">
                                <span><strong>IP:</strong> ${result.ip}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: end; gap: 8px;">
                        <button onclick="showResultDetails('${result.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    console.log('✅ HTML gerado, inserindo no DOM. Tamanho:', html.length, 'caracteres');
    resultsContainer.innerHTML = html;
    console.log('✅ Resultados exibidos com sucesso!');
}

function showResultDetails(resultId) {
    // Buscar o resultado do cache
    const result = window.anonymousResultsCache ? window.anonymousResultsCache[resultId] : null;
    
    if (!result) {
        Toast.error('Resultado não encontrado');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal is-open';
    modal.style.display = 'flex';
    modal.id = 'result-details-modal';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    const date = new Date(result.createdAt);
    const timeDisplay = `${Math.floor(result.timeSpent / 60)}:${String(result.timeSpent % 60).padStart(2, '0')}`;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 860px; max-height: 90vh; overflow-y: auto; margin: 20px auto;">
            <span class="close" onclick="document.getElementById('result-details-modal').remove()">&times;</span>
            
            <h2 style="margin-bottom: 20px;">📊 Detalhes do Resultado</h2>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0;">${result.userInfo}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px;">
                    <div>
                        <div style="opacity: 0.9; font-size: 0.85rem;">Pontuação</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${result.score}/${result.totalQuestions}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.9; font-size: 0.85rem;">Percentual</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${result.percentage}%</div>
                    </div>
                    <div>
                        <div style="opacity: 0.9; font-size: 0.85rem;">Tempo</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${timeDisplay}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.9; font-size: 0.85rem;">Data</div>
                        <div style="font-size: 0.9rem;">${date.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            ${result.capacityPerformance && Object.keys(result.capacityPerformance).length > 0 ? `
                <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border);">
                    <h3 style="margin: 0 0 15px 0;">📈 Desempenho por Capacidade</h3>
                    ${Object.entries(result.capacityPerformance).map(([cap, stats]) => {
                        const percentage = parseFloat(stats.percentage);
                        const color = percentage >= 70 ? '#16a34a' : percentage >= 50 ? '#f59e0b' : '#dc2626';
                        const bgColor = percentage >= 70 ? '#dcfce7' : percentage >= 50 ? '#fef3c7' : '#fecaca';
                        
                        return `
                            <div style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <strong>${cap}</strong>
                                    <span>${stats.correct}/${stats.total} (${stats.percentage}%)</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: var(--bg-deep); border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${stats.percentage}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}

            ${result.questionsWrong && result.questionsWrong.length > 0 ? `
                <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border);">
                    <h3 style="margin: 0 0 15px 0; color: #dc2626;">❌ Questões Erradas (${result.questionsWrong.length})</h3>
                    ${result.questionsWrong.map((q, index) => `
                        <div style="padding: 12px; background: rgba(220,38,38,0.1); border-left: 3px solid #dc2626; border-radius: 6px; margin-bottom: 10px;">
                            <div style="font-weight: 600; margin-bottom: 5px;">Questão ${index + 1} - ${q.capacity}</div>
                            <div style="font-size: 0.9rem; color: var(--text-muted);">
                                <div><strong>Respondeu:</strong> ${q.selectedOption || 'Não respondeu'} ${q.selectedText ? `- ${q.selectedText.substring(0, 50)}...` : ''}</div>
                                <div style="color: #16a34a;"><strong>Correto:</strong> ${q.correctOption} ${q.correctText ? `- ${q.correctText.substring(0, 50)}...` : ''}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${result.questionsCorrect && result.questionsCorrect.length > 0 ? `
                <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                    <h3 style="margin: 0 0 10px 0; color: #16a34a;">✅ Questões Corretas (${result.questionsCorrect.length})</h3>
                    <div style="color: var(--text-muted); font-size: 0.9rem;">
                        ${result.questionsCorrect.map(q => `<span style="background: #dcfce7; padding: 4px 8px; border-radius: 4px; margin: 4px; display: inline-block;">${q.capacity}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
}

// ==================== FEEDBACKS ====================

async function loadFeedbacks(status = null) {
    try {
        const url = status ? `${API_URL}/admin/feedbacks?status=${status}` : `${API_URL}/admin/feedbacks`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            Toast.error('Erro ao carregar feedbacks');
            return;
        }

        // Atualizar contadores
        document.getElementById('feedback-novo').textContent = data.novo || 0;
        document.getElementById('feedback-lido').textContent = data.lido || 0;
        document.getElementById('feedback-respondido').textContent = data.respondido || 0;
        document.getElementById('feedback-total').textContent = data.total || 0;

        if (data.feedbacks.length === 0) {
            document.getElementById('feedbacks-list').innerHTML = '<p>Nenhum feedback encontrado.</p>';
            return;
        }

        const feedbacksHtml = data.feedbacks.map(feedback => {
            const typeEmoji = {
                'sugestao': '💡',
                'bug': '🐞',
                'elogio': '👍',
                'reclamacao': '📝'
            };

            const statusBadge = {
                'novo': '<span class="role-badge" style="background: #fef3c7; color: #d97706;">🆕 Novo</span>',
                'lido': '<span class="role-badge" style="background: #dbeafe; color: #1e40af;">👁️ Lido</span>',
                'respondido': '<span class="role-badge" style="background: #dcfce7; color: #15803d;">✅ Respondido</span>'
            };

            return `
                <div class="user-item" style="background: ${feedback.status === 'novo' ? 'rgba(251,191,36,0.08)' : 'var(--bg-card)'};">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <strong style="font-size: 1.1rem;">${typeEmoji[feedback.type] || '💬'} ${feedback.name}</strong>
                            ${statusBadge[feedback.status]}
                        </div>
                        
                        ${feedback.email ? `<div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 5px;">📧 ${feedback.email}</div>` : ''}
                        
                        <div style="margin: 10px 0; padding: 12px; background: var(--bg-surface); border-left: 4px solid var(--violet); border-radius: 6px;">
                            <p style="margin: 0; white-space: pre-wrap;">${feedback.message}</p>
                        </div>
                        
                        <div style="color: var(--text-muted); font-size: 0.875rem;">
                            📅 ${new Date(feedback.createdAt).toLocaleString('pt-BR')}
                        </div>
                    </div>
                    
                    <div class="course-actions" style="flex-direction: column; gap: 8px;">
                        ${feedback.status === 'novo' ? `
                            <button onclick="updateFeedbackStatus(${feedback.id}, 'lido')" class="btn-icon btn-edit" style="width: 140px;">
                                👁️ Marcar como Lido
                            </button>
                        ` : ''}
                        ${feedback.status === 'lido' ? `
                            <button onclick="updateFeedbackStatus(${feedback.id}, 'respondido')" class="btn-icon btn-success" style="width: 140px;">
                                ✅ Marcar Respondido
                            </button>
                        ` : ''}
                        <button onclick="deleteFeedback(${feedback.id})" class="btn-icon btn-delete" style="width: 140px;">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('feedbacks-list').innerHTML = feedbacksHtml;
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao carregar feedbacks');
    }
}

async function updateFeedbackStatus(feedbackId, newStatus) {
    try {
        const response = await fetch(`${API_URL}/admin/feedbacks/${feedbackId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (!response.ok) {
            Toast.error(data.error || 'Erro ao atualizar status');
            return;
        }

        // Recarregar feedbacks
        loadFeedbacks();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
    }
}

async function deleteFeedback(feedbackId) {
    if (!confirm('Tem certeza que deseja excluir este feedback?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/feedbacks/${feedbackId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            Toast.error(data.error || 'Erro ao deletar feedback');
            return;
        }

        Toast.success('Feedback deletado com sucesso!');
        loadFeedbacks();
    } catch (error) {
        console.error('Erro:', error);
        Toast.error('Erro ao conectar com o servidor');
    }
}

