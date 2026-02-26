// ==================== PROFESSOR.JS ====================
const RENDER_API_URL = 'https://saep-quizz-gameficado.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:3000/api';

const API_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return LOCAL_API_URL;
    if (host.includes('github.io')) return RENDER_API_URL;
    if (host.includes('onrender.com')) return '/api';
    return '/api';
})();

// Toast
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
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="Toast.dismiss(this.parentElement)">&times;</button>
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
    success(m, d) { return this.show(m, 'success', d); },
    error(m, d) { return this.show(m, 'error', d); },
    warning(m, d) { return this.show(m, 'warning', d); },
    info(m, d) { return this.show(m, 'info', d); }
};

let currentUser = null;
let currentToken = null;
let allCourses = [];
let dashboardData = null;
let performanceChart = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async function() {
    Toast.init();
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
        Toast.warning('Você precisa estar logado!');
        window.location.href = 'index.html';
        return;
    }
    currentToken = savedToken;
    await verifyToken();

    if (!currentUser || (currentUser.role !== 'professor' && currentUser.role !== 'admin')) {
        Toast.error('Acesso negado. Apenas professores.');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('prof-username').textContent = `👨‍🏫 ${currentUser.username}`;
    await loadCourses();
    await loadProfDashboard();

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    });
});

async function verifyToken() {
    try {
        const res = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) { currentUser = (await res.json()).user; }
        else { logout(); }
    } catch { logout(); }
}

function logout() { localStorage.removeItem('token'); window.location.href = 'index.html'; }
function backToMain() { window.location.href = 'index.html'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function showProfSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(`${name}-section`).style.display = 'block';
    event.target.closest('.nav-item').classList.add('active');

    switch(name) {
        case 'prof-dashboard': loadProfDashboard(); break;
        case 'prof-turmas': loadTurmasList(); break;
        case 'prof-quizzes': populateQuizForm(); break;
        case 'prof-questions': populateQuestionForm(); break;
    }
}

// ==================== COURSES ====================
async function loadCourses() {
    try {
        const res = await fetch(`${API_URL}/courses`);
        if (res.ok) {
            const data = await res.json();
            allCourses = data.courses || [];
        }
    } catch (e) { console.error('Erro ao carregar cursos:', e); }
}

function fillCourseSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const curVal = sel.value;
    sel.innerHTML = '<option value="">Selecione um curso...</option>';
    allCourses.forEach(c => {
        sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    if (curVal) sel.value = curVal;
}

// ==================== DASHBOARD ====================
async function loadProfDashboard() {
    try {
        const res = await fetch(`${API_URL}/professor/dashboard`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error('Erro ao carregar dashboard');
        dashboardData = await res.json();

        document.getElementById('prof-total-turmas').textContent = dashboardData.totalTurmas;
        document.getElementById('prof-total-alunos').textContent = dashboardData.totalAlunos;
        document.getElementById('prof-total-quizzes').textContent = dashboardData.totalQuizzes;
        document.getElementById('prof-total-questions').textContent = dashboardData.totalQuestions;

        renderPerformanceChart();
        renderTurmasDetail();
    } catch (e) {
        console.error('Erro dashboard:', e);
        Toast.error('Erro ao carregar dashboard');
    }
}

function renderPerformanceChart() {
    const ctx = document.getElementById('turma-performance-chart');
    if (!ctx || !dashboardData) return;

    if (performanceChart) performanceChart.destroy();

    const turmas = dashboardData.turmas || [];
    const labels = turmas.map(t => t.name);
    const avgScores = turmas.map(t => t.averageScore || 0);
    const totalAttempts = turmas.map(t => t.totalAttempts || 0);

    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Média de Acertos (%)',
                    data: avgScores,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Total de Tentativas',
                    data: totalAttempts,
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#e2e8f0' } }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { beginAtZero: true, max: 100, position: 'left', ticks: { color: '#94a3b8', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y1: { beginAtZero: true, position: 'right', ticks: { color: '#94a3b8' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

function renderTurmasDetail() {
    const container = document.getElementById('prof-turmas-detail');
    if (!container || !dashboardData) return;

    const turmas = dashboardData.turmas || [];
    if (turmas.length === 0) {
        container.innerHTML = '<div class="dashboard-card"><p style="color:#94a3b8;text-align:center;">Nenhuma turma encontrada. Crie uma turma para começar!</p></div>';
        return;
    }

    container.innerHTML = turmas.map(turma => `
        <div class="dashboard-card" style="margin-bottom: 16px;">
            <h3>🏫 ${turma.name} <span style="color:#94a3b8;font-size:0.9em;">(${turma.totalAlunos} alunos)</span></h3>
            <div class="stats-grid-admin" style="margin: 12px 0;">
                <div class="stat-card-admin" style="background:#1e293b;">
                    <div class="stat-value-admin" style="color:#60a5fa;">${turma.averageScore}%</div>
                    <div class="stat-label-admin">Média Geral</div>
                </div>
                <div class="stat-card-admin" style="background:#1e293b;">
                    <div class="stat-value-admin" style="color:#4ade80;">${turma.totalAttempts}</div>
                    <div class="stat-label-admin">Tentativas</div>
                </div>
            </div>
            ${turma.alunos.length > 0 ? `
                <h4 style="color:#e2e8f0;margin-bottom:8px;">🏆 Ranking da Turma (Competitivo)</h4>
                <table class="admin-table" style="width:100%;">
                    <thead><tr>
                        <th>#</th><th>Aluno</th><th>Média</th><th>Tentativas</th>
                    </tr></thead>
                    <tbody>
                        ${turma.alunos.map(a => `
                            <tr style="${a.rank <= 3 ? 'background:rgba(99,102,241,0.1);' : ''}">
                                <td>${a.rank <= 3 ? ['🥇','🥈','🥉'][a.rank-1] : a.rank}</td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        ${a.avatarUrl ? `<img src="${a.avatarUrl}" style="width:28px;height:28px;border-radius:50%;" onerror="this.style.display='none'">` : ''}
                                        ${a.username}
                                    </div>
                                </td>
                                <td><span style="color:${a.averageScore >= 70 ? '#4ade80' : a.averageScore >= 50 ? '#fbbf24' : '#f87171'}">${a.averageScore}%</span></td>
                                <td>${a.totalAttempts}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color:#94a3b8;">Nenhum aluno cadastrado nesta turma ainda.</p>'}
        </div>
    `).join('');
}

// ==================== TURMAS ====================
async function loadTurmasList() {
    try {
        const res = await fetch(`${API_URL}/turmas`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const turmas = (data.turmas || []).filter(t => t.professorId === currentUser.id || currentUser.role === 'admin');

        const container = document.getElementById('prof-turmas-list');
        if (turmas.length === 0) {
            container.innerHTML = '<div class="dashboard-card"><p style="color:#94a3b8;text-align:center;">Nenhuma turma criada ainda.</p></div>';
            return;
        }

        container.innerHTML = turmas.map(t => `
            <div class="dashboard-card" style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h3 style="margin:0;">${t.name}</h3>
                        <p style="color:#94a3b8;margin:4px 0;">📚 ${t.courseName} | 👨‍🏫 ${t.professorName} | 👥 ${t.alunoCount} alunos</p>
                        ${t.description ? `<p style="color:#cbd5e1;font-size:0.9em;">${t.description}</p>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button onclick="viewTurma(${t.id})" class="btn-primary" style="padding:6px 12px;">👁️ Ver</button>
                        <button onclick="deleteTurma(${t.id})" class="btn-danger" style="padding:6px 12px;">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Erro:', e);
        Toast.error('Erro ao carregar turmas');
    }
}

function showCreateTurmaModal() {
    fillCourseSelect('turma-course');
    document.getElementById('create-turma-modal').style.display = 'flex';
}

async function handleCreateTurma(e) {
    e.preventDefault();
    const name = document.getElementById('turma-name').value.trim();
    const description = document.getElementById('turma-description').value.trim();
    const courseId = parseInt(document.getElementById('turma-course').value);
    if (!name || !courseId) return Toast.warning('Preencha todos os campos obrigatórios');

    try {
        const res = await fetch(`${API_URL}/turmas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ name, description, courseId })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        Toast.success('Turma criada com sucesso!');
        closeModal('create-turma-modal');
        loadTurmasList();
    } catch (e) { Toast.error(e.message || 'Erro ao criar turma'); }
}

async function viewTurma(turmaId) {
    try {
        const res = await fetch(`${API_URL}/turmas/${turmaId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error();
        const turma = await res.json();

        document.getElementById('view-turma-title').textContent = `🏫 ${turma.name}`;
        document.getElementById('view-turma-content').innerHTML = `
            <p><strong>Curso:</strong> ${turma.courseName}</p>
            <p><strong>Professor:</strong> ${turma.professorName}</p>
            <p><strong>Descrição:</strong> ${turma.description || 'Sem descrição'}</p>
            <h3 style="margin-top:16px;">👥 Alunos Cadastrados (${turma.alunos.length})</h3>
            ${turma.alunos.length > 0 ? `
                <table class="admin-table" style="width:100%;">
                    <thead><tr><th>Avatar</th><th>Nome</th><th>Email</th></tr></thead>
                    <tbody>
                        ${turma.alunos.map(a => `
                            <tr>
                                <td>${a.avatarUrl ? `<img src="${a.avatarUrl}" style="width:32px;height:32px;border-radius:50%;" onerror="this.style.display='none'">` : '👤'}</td>
                                <td>${a.username}</td>
                                <td>${a.email}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color:#94a3b8;">Nenhum aluno nesta turma ainda.</p>'}
        `;
        document.getElementById('view-turma-modal').style.display = 'flex';
    } catch { Toast.error('Erro ao carregar turma'); }
}

async function deleteTurma(turmaId) {
    if (!confirm('Tem certeza que deseja deletar esta turma?')) return;
    try {
        const res = await fetch(`${API_URL}/turmas/${turmaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error();
        Toast.success('Turma deletada!');
        loadTurmasList();
    } catch { Toast.error('Erro ao deletar turma'); }
}

// ==================== QUIZ ====================
function populateQuizForm() {
    fillCourseSelect('quiz-course');
    loadProfTurmas();
}

async function loadProfTurmas() {
    try {
        const res = await fetch(`${API_URL}/turmas`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const sel = document.getElementById('quiz-turma');
        sel.innerHTML = '<option value="">Todas (sem turma específica)</option>';
        (data.turmas || []).filter(t => t.professorId === currentUser.id || currentUser.role === 'admin').forEach(t => {
            sel.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
    } catch {}
}

async function loadCourseQuestions() {
    const courseId = document.getElementById('quiz-course').value;
    const container = document.getElementById('quiz-questions-list');
    if (!courseId) { container.innerHTML = '<p style="color:#94a3b8;">Selecione um curso primeiro</p>'; return; }

    try {
        const res = await fetch(`${API_URL}/courses/${courseId}/questions`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const questions = data.questions || [];

        if (questions.length === 0) {
            container.innerHTML = '<p style="color:#94a3b8;">Nenhuma questão neste curso.</p>';
            return;
        }

        container.innerHTML = questions.map(q => `
            <label style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-bottom:1px solid #1e293b;cursor:pointer;">
                <input type="checkbox" name="quiz-question" value="${q.id}" checked style="margin-top:4px;">
                <div>
                    <strong style="color:#60a5fa;">${q.id}</strong> - <span style="color:#e2e8f0;">${(q.command || '').substring(0, 80)}...</span>
                    <br><small style="color:#94a3b8;">${q.capacity || q.capacidade || 'Geral'} | ${q.difficulty || 'Médio'}</small>
                </div>
            </label>
        `).join('');
    } catch { container.innerHTML = '<p style="color:#f87171;">Erro ao carregar questões</p>'; }
}

async function handleCreateQuiz(e) {
    e.preventDefault();
    const name = document.getElementById('quiz-name').value.trim();
    const description = document.getElementById('quiz-description').value.trim();
    const courseId = parseInt(document.getElementById('quiz-course').value);
    const turmaId = document.getElementById('quiz-turma').value ? parseInt(document.getElementById('quiz-turma').value) : null;
    const questionIds = [...document.querySelectorAll('input[name="quiz-question"]:checked')].map(cb => cb.value);

    if (!name || !courseId) return Toast.warning('Preencha nome e curso');
    if (questionIds.length === 0) return Toast.warning('Selecione pelo menos uma questão');

    try {
        const res = await fetch(`${API_URL}/professor/quizzes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ name, description, courseId, turmaId, questionIds })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        Toast.success('Quiz criado com sucesso!');
        document.getElementById('quiz-name').value = '';
        document.getElementById('quiz-description').value = '';
    } catch (e) { Toast.error(e.message || 'Erro ao criar quiz'); }
}

// ==================== QUESTION ====================
function populateQuestionForm() {
    fillCourseSelect('question-course');
}

async function handleCreateQuestion(e) {
    e.preventDefault();
    const courseId = parseInt(document.getElementById('question-course').value);
    const capacity = document.getElementById('question-capacity').value.trim();
    const difficulty = document.getElementById('question-difficulty').value;
    const context = document.getElementById('question-context').value.trim();
    const command = document.getElementById('question-command').value.trim();

    const optionTexts = [...document.querySelectorAll('.option-text')].map(el => el.value.trim());
    const correctIdx = parseInt(document.querySelector('input[name="correct-option"]:checked').value);
    const letters = ['A', 'B', 'C', 'D'];
    const options = optionTexts.map((text, i) => ({
        letter: letters[i], text, correct: i === correctIdx, image: null
    }));

    if (!courseId || !context || !command || optionTexts.some(t => !t)) {
        return Toast.warning('Preencha todos os campos');
    }

    try {
        const res = await fetch(`${API_URL}/professor/courses/${courseId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ capacidade: capacity, dificuldade: difficulty, context, command, options })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        Toast.success('Questão criada com sucesso!');
        // Reset form
        document.getElementById('question-context').value = '';
        document.getElementById('question-command').value = '';
        document.querySelectorAll('.option-text').forEach(el => el.value = '');
    } catch (e) { Toast.error(e.message || 'Erro ao criar questão'); }
}

// ==================== GERADOR DE SIMULADO COM IA (PROFESSOR) ====================

let profSimQuestions = [];
let profSimCourseId = null;
let profSimEditIdx = null;

async function showProfSimuladoWizard() {
    await loadCourses();
    const cs = document.getElementById('prof-sim-course');
    cs.innerHTML = '<option value="">Selecione...</option>';
    allCourses.forEach(c => { cs.innerHTML += `<option value="${c.id}">${c.name}</option>`; });

    document.getElementById('prof-sim-default-cap').innerHTML = '<option value="">Selecione curso primeiro...</option>';
    document.getElementById('prof-sim-default-skill').innerHTML = '<option value="">Selecione...</option>';
    document.getElementById('prof-sim-questions-config').innerHTML = '<p style="color:#94a3b8;text-align:center;">Selecione um curso primeiro.</p>';
    profSimQuestions = [];
    profSimCourseId = null;

    document.getElementById('prof-sim-step-config').style.display = 'block';
    document.getElementById('prof-sim-step-progress').style.display = 'none';
    document.getElementById('prof-sim-step-review').style.display = 'none';

    const countInput = document.getElementById('prof-sim-count');
    countInput.onchange = () => buildProfSimRows();
    countInput.oninput = () => buildProfSimRows();

    document.getElementById('prof-simulado-wizard-modal').style.display = 'flex';
}

function loadProfSimCapacities() {
    const courseId = parseInt(document.getElementById('prof-sim-course').value);
    const capSel = document.getElementById('prof-sim-default-cap');
    const skillSel = document.getElementById('prof-sim-default-skill');
    capSel.innerHTML = '<option value="">Selecione...</option>';
    skillSel.innerHTML = '<option value="">Selecione...</option>';
    if (!courseId) { document.getElementById('prof-sim-questions-config').innerHTML = '<p style="color:#94a3b8;text-align:center;">Selecione curso.</p>'; return; }
    const course = allCourses.find(c => c.id === courseId);
    if (!course || !course.capacities) return;
    course.capacities.forEach(cap => { capSel.innerHTML += `<option value="${cap.id}" data-skills='${JSON.stringify(cap.skills||[])}'>${cap.id} - ${cap.name}</option>`; });
    buildProfSimRows();
}

function loadProfSimDefaultSkills() {
    const capSel = document.getElementById('prof-sim-default-cap');
    const skillSel = document.getElementById('prof-sim-default-skill');
    skillSel.innerHTML = '<option value="">Selecione...</option>';
    const sel = capSel.options[capSel.selectedIndex];
    if (!sel || !sel.dataset.skills) return;
    JSON.parse(sel.dataset.skills).forEach(s => { skillSel.innerHTML += `<option value="${s}">${s}</option>`; });
}

function applyProfDefaultThemeToAll() {
    const cap = document.getElementById('prof-sim-default-cap').value;
    const skill = document.getElementById('prof-sim-default-skill').value;
    const diff = document.getElementById('prof-sim-default-diff').value;
    const count = parseInt(document.getElementById('prof-sim-count').value) || 5;
    for (let i = 0; i < count; i++) {
        const cs = document.getElementById(`prof-sq-${i}-cap`);
        if (cs && cap) { cs.value = cap; loadProfSimRowSkills(i); if (skill) setTimeout(() => { const s = document.getElementById(`prof-sq-${i}-skill`); if (s) s.value = skill; }, 50); }
        const ds = document.getElementById(`prof-sq-${i}-diff`);
        if (ds && diff) ds.value = diff;
    }
    Toast.success('Temas aplicados!');
}

function buildProfSimRows() {
    const courseId = parseInt(document.getElementById('prof-sim-course').value);
    const count = Math.min(Math.max(parseInt(document.getElementById('prof-sim-count').value) || 1, 1), 20);
    const container = document.getElementById('prof-sim-questions-config');
    if (!courseId) { container.innerHTML = '<p style="color:#94a3b8;text-align:center;">Selecione curso.</p>'; return; }
    const course = allCourses.find(c => c.id === courseId);
    const caps = (course && course.capacities) || [];
    let capOpts = '<option value="">Selecione...</option>';
    caps.forEach(cap => { capOpts += `<option value="${cap.id}" data-skills='${JSON.stringify(cap.skills||[])}'>${cap.id} - ${cap.name}</option>`; });
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div style="display:grid;grid-template-columns:40px 1fr 1fr 120px 1fr;gap:8px;align-items:end;padding:10px;border-bottom:1px solid #1e293b;${i%2===0?'background:#111827;':''}border-radius:4px;">
            <div style="font-weight:700;color:#6366f1;font-size:1.1rem;text-align:center;padding-bottom:6px;">#${i+1}</div>
            <div><label style="font-size:0.75rem;color:#94a3b8;display:block;">Capacidade</label><select id="prof-sq-${i}-cap" class="form-select" style="font-size:0.85rem;" onchange="loadProfSimRowSkills(${i})">${capOpts}</select></div>
            <div><label style="font-size:0.75rem;color:#94a3b8;display:block;">Habilidade/Tema</label><select id="prof-sq-${i}-skill" class="form-select" style="font-size:0.85rem;"><option value="">Selecione capacidade...</option></select></div>
            <div><label style="font-size:0.75rem;color:#94a3b8;display:block;">Dificuldade</label><select id="prof-sq-${i}-diff" class="form-select" style="font-size:0.85rem;"><option value="fácil">Fácil</option><option value="médio" selected>Médio</option><option value="difícil">Difícil</option></select></div>
            <div><label style="font-size:0.75rem;color:#94a3b8;display:block;">Contexto extra</label><input type="text" id="prof-sq-${i}-content" style="font-size:0.85rem;" placeholder="Detalhe..."></div>
        </div>`;
    }
    container.innerHTML = html;
}

function loadProfSimRowSkills(i) {
    const capSel = document.getElementById(`prof-sq-${i}-cap`);
    const skillSel = document.getElementById(`prof-sq-${i}-skill`);
    skillSel.innerHTML = '<option value="">Selecione...</option>';
    const sel = capSel.options[capSel.selectedIndex];
    if (!sel || !sel.dataset.skills) return;
    JSON.parse(sel.dataset.skills).forEach(s => { skillSel.innerHTML += `<option value="${s}">${s}</option>`; });
}

async function startProfSimuladoGeneration() {
    const courseId = parseInt(document.getElementById('prof-sim-course').value);
    const provider = document.getElementById('prof-sim-provider').value;
    const count = parseInt(document.getElementById('prof-sim-count').value) || 5;
    const inclCtx = document.getElementById('prof-sim-context-images').value === 'true';
    const inclOpt = document.getElementById('prof-sim-option-images').value === 'true';
    if (!courseId) { Toast.warning('Selecione um curso.'); return; }

    const specs = [];
    for (let i = 0; i < count; i++) {
        const capSel = document.getElementById(`prof-sq-${i}-cap`);
        const capacity = capSel ? (capSel.options[capSel.selectedIndex]?.textContent || capSel.value) : '';
        if (!capacity || capacity === 'Selecione...') { Toast.warning(`Questão #${i+1}: selecione capacidade.`); return; }
        specs.push({ capacity, skill: document.getElementById(`prof-sq-${i}-skill`)?.value || '', difficulty: document.getElementById(`prof-sq-${i}-diff`)?.value || 'médio', content: document.getElementById(`prof-sq-${i}-content`)?.value || '' });
    }

    profSimCourseId = courseId;
    document.getElementById('prof-sim-step-config').style.display = 'none';
    document.getElementById('prof-sim-step-progress').style.display = 'block';
    document.getElementById('prof-sim-step-review').style.display = 'none';
    document.getElementById('prof-sim-progress-bar').style.width = '0%';
    document.getElementById('prof-sim-progress-title').textContent = `Gerando ${count} questões...`;

    let fakeP = 0;
    const iv = setInterval(() => { fakeP = Math.min(fakeP + (90 - fakeP) * 0.02, 90); document.getElementById('prof-sim-progress-bar').style.width = `${fakeP}%`; }, 500);
    document.getElementById('prof-sim-generate-btn').disabled = true;

    try {
        const res = await fetch(`${API_URL}/ai/generate-simulado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ courseId, provider, questions: specs, includeContextImages: inclCtx, includeOptionImages: inclOpt, imageProvider: 'pollinations' })
        });
        clearInterval(iv);
        document.getElementById('prof-sim-progress-bar').style.width = '100%';
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');
        profSimQuestions = data.questions || [];
        if (profSimQuestions.length === 0) throw new Error('Nenhuma questão gerada.');
        const course = allCourses.find(c => c.id === courseId);
        document.getElementById('prof-sim-quiz-name').value = `Simulado SAEP - ${course ? course.name : 'Quiz'} (${new Date().toLocaleDateString('pt-BR')})`;

        // Load turmas for select
        try {
            const tRes = await fetch(`${API_URL}/turmas`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
            const tData = await tRes.json();
            const turmaSelect = document.getElementById('prof-sim-turma');
            turmaSelect.innerHTML = '<option value="">Todas (sem turma)</option>';
            (tData.turmas || []).forEach(t => { turmaSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
        } catch {}

        setTimeout(() => {
            renderProfSimReview();
            document.getElementById('prof-sim-step-progress').style.display = 'none';
            document.getElementById('prof-sim-step-review').style.display = 'block';
            Toast.success(`${profSimQuestions.length} questões geradas!`);
        }, 600);
    } catch (e) {
        clearInterval(iv);
        Toast.error(e.message);
        document.getElementById('prof-sim-step-progress').style.display = 'none';
        document.getElementById('prof-sim-step-config').style.display = 'block';
    } finally { document.getElementById('prof-sim-generate-btn').disabled = false; }
}

function renderProfSimReview() {
    const container = document.getElementById('prof-sim-review-list');
    document.getElementById('prof-sim-review-count').textContent = `${profSimQuestions.length} questão(ões)`;
    if (profSimQuestions.length === 0) { container.innerHTML = '<p style="color:#94a3b8;">Nenhuma questão.</p>'; return; }
    const diffC = { 'fácil': '#10b981', 'médio': '#f59e0b', 'difícil': '#ef4444' };
    container.innerHTML = profSimQuestions.map((q, idx) => {
        const correct = q.options.find(o => o.correct);
        return `<div id="prof-sim-rv-${idx}" style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <span style="font-weight:800;color:#6366f1;font-size:1.1rem;">#${idx+1}</span>
                    <span style="background:#6366f120;color:#6366f1;padding:2px 8px;border-radius:6px;font-size:0.75rem;">${q.capacidade}</span>
                    <span style="background:${diffC[q.difficulty]||'#94a3b8'}20;color:${diffC[q.difficulty]||'#94a3b8'};padding:2px 8px;border-radius:6px;font-size:0.75rem;">${q.difficulty}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="editProfSimQ(${idx})" class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;">✏️ Editar</button>
                    <button onclick="regenProfSimQ(${idx})" class="btn-secondary" style="padding:4px 10px;font-size:0.8rem;">🔄 Regenerar</button>
                    <button onclick="removeProfSimQ(${idx})" class="btn-danger" style="padding:4px 10px;font-size:0.8rem;">🗑️</button>
                </div>
            </div>
            ${q.context ? `<div style="color:#cbd5e1;font-size:0.9rem;margin-bottom:8px;border-left:3px solid #3b82f6;padding-left:10px;">${q.context.substring(0,200)}${q.context.length>200?'...':''}</div>` : ''}
            <div style="font-weight:600;color:#e2e8f0;margin:8px 0;"><strong>Pergunta:</strong> ${q.command}</div>
            <div style="display:grid;gap:4px;">${q.options.map(o => `<div style="padding:6px 10px;border-radius:6px;font-size:0.85rem;${o.correct?'background:#10b98120;color:#10b981;border:1px solid #10b981;':'background:#11182720;color:#94a3b8;border:1px solid #1e293b;'}"><strong>${o.letter})</strong> ${o.text} ${o.correct?'✓':''}</div>`).join('')}</div>
            ${correct && correct.explanation ? `<div style="margin-top:8px;font-size:0.8rem;color:#64748b;border-top:1px solid #334155;padding-top:8px;"><strong>Justificativa:</strong> ${correct.explanation}</div>` : ''}
        </div>`;
    }).join('');
}

function editProfSimQ(idx) {
    const q = profSimQuestions[idx];
    if (!q) return;
    profSimEditIdx = idx;
    document.getElementById('prof-sim-edit-context').value = q.context || '';
    document.getElementById('prof-sim-edit-command').value = q.command || '';
    document.getElementById('prof-sim-edit-img').value = q.contextImage || '';
    let html = '<h4 style="margin-top:12px;">Alternativas:</h4>';
    (q.options || []).forEach((opt, oi) => {
        html += `<div style="border:1px solid #334155;border-radius:8px;padding:12px;margin-bottom:10px;background:${opt.correct?'#10b98110':'#1e293b'};">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><strong style="color:#6366f1;">${opt.letter})</strong>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="radio" name="prof-sim-correct" value="${oi}" ${opt.correct?'checked':''}><span style="font-size:0.8rem;color:#94a3b8;">Correta</span></label></div>
            <div class="form-group" style="margin:0 0 8px 0;"><label style="font-size:0.75rem;">Texto:</label><input type="text" id="prof-sim-opt-${oi}" value="${(opt.text||'').replace(/"/g,'&quot;')}" style="width:100%;"></div>
            <div class="form-group" style="margin:0;"><label style="font-size:0.75rem;">Justificativa:</label><input type="text" id="prof-sim-just-${oi}" value="${(opt.correct?(opt.explanation||''):(opt.justification||'')).replace(/"/g,'&quot;')}" style="width:100%;"></div>
        </div>`;
    });
    document.getElementById('prof-sim-edit-opts').innerHTML = html;
    document.getElementById('prof-sim-edit-modal').style.display = 'flex';
}

function saveProfSimEditedQuestion() {
    if (profSimEditIdx === null) return;
    const q = profSimQuestions[profSimEditIdx];
    q.context = document.getElementById('prof-sim-edit-context').value;
    q.command = document.getElementById('prof-sim-edit-command').value;
    q.contextImage = document.getElementById('prof-sim-edit-img').value || null;
    const correctRadio = document.querySelector('input[name="prof-sim-correct"]:checked');
    const correctIdx = correctRadio ? parseInt(correctRadio.value) : 0;
    q.options.forEach((opt, oi) => {
        opt.text = document.getElementById(`prof-sim-opt-${oi}`).value;
        const just = document.getElementById(`prof-sim-just-${oi}`).value;
        opt.correct = (oi === correctIdx);
        if (opt.correct) opt.explanation = just; else opt.justification = just;
    });
    closeModal('prof-sim-edit-modal');
    renderProfSimReview();
    Toast.success(`Questão #${profSimEditIdx + 1} atualizada!`);
}

async function regenProfSimQ(idx) {
    const q = profSimQuestions[idx];
    if (!q || !confirm(`Regenerar questão #${idx+1}?`)) return;
    const card = document.getElementById(`prof-sim-rv-${idx}`);
    if (card) card.style.opacity = '0.5';
    try {
        const res = await fetch(`${API_URL}/ai/generate-simulado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ courseId: profSimCourseId, provider: document.getElementById('prof-sim-provider').value || 'gemini', questions: [{ capacity: q.capacidade, skill: '', difficulty: q.difficulty, content: '' }], includeContextImages: false, includeOptionImages: false })
        });
        const data = await res.json();
        if (!res.ok || !data.questions?.length) throw new Error(data.error || 'Falha');
        profSimQuestions[idx] = data.questions[0];
        renderProfSimReview();
        Toast.success(`Questão #${idx+1} regenerada!`);
    } catch (e) { Toast.error(e.message); if (card) card.style.opacity = '1'; }
}

function removeProfSimQ(idx) {
    if (!confirm(`Remover questão #${idx+1}?`)) return;
    profSimQuestions.splice(idx, 1);
    renderProfSimReview();
    Toast.info('Questão removida.');
}

async function saveProfSimulado() {
    const name = document.getElementById('prof-sim-quiz-name').value.trim();
    const desc = document.getElementById('prof-sim-quiz-desc').value.trim();
    if (!name) { Toast.warning('Dê um nome ao simulado.'); return; }
    if (profSimQuestions.length === 0) { Toast.warning('Nenhuma questão.'); return; }
    const saveBtn = document.getElementById('prof-sim-save-btn');
    saveBtn.disabled = true; saveBtn.textContent = '⏳ Salvando...';
    try {
        const savedIds = [];
        for (const q of profSimQuestions) {
            const payload = { id: q.id, capacidade: q.capacidade, context: q.context, command: q.command, options: q.options, contextImage: q.contextImage || null };
            const res = await fetch(`${API_URL}/professor/courses/${profSimCourseId}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) { const d = await res.json(); savedIds.push(d.question?.id || q.id); }
            else savedIds.push(q.id);
        }
        const quizRes = await fetch(`${API_URL}/professor/quizzes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ name, description: desc, courseId: profSimCourseId, questionIds: savedIds })
        });
        if (!quizRes.ok) { const e = await quizRes.json(); throw new Error(e.error || 'Erro'); }
        Toast.success(`Simulado "${name}" salvo com ${savedIds.length} questões!`);
        closeModal('prof-simulado-wizard-modal');
        profSimQuestions = [];
    } catch (e) { Toast.error(e.message); }
    finally { saveBtn.disabled = false; saveBtn.textContent = '✅ Salvar Simulado'; }
}
