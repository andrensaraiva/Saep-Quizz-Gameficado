/**
 * Script de Inicialização - Criar primeiro curso e importar questões
 * 
 * Execute este script uma única vez para:
 * 1. Criar um usuário administrador
 * 2. Criar o curso "Programação de Jogos Digitais"
 * 3. Importar as 22 questões existentes
 * 
 * Uso: node init-first-course.js
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_API_URL = 'http://localhost:3000/api';
const API_URL = (() => {
    const rawUrl = process.env.API_URL || DEFAULT_API_URL;
    return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
})();

const FRONTEND_BASE_URL = (() => {
    const fromEnv = process.env.FRONTEND_URL;
    if (fromEnv) {
        return fromEnv.endsWith('/') ? fromEnv.slice(0, -1) : fromEnv;
    }

    if (API_URL.startsWith('http://localhost') || API_URL.startsWith('http://127.0.0.1')) {
        return 'http://localhost:3000';
    }

    // Assume Render serving frontend via GitHub Pages; fallback to API host root
    try {
        const url = new URL(API_URL);
        url.pathname = '';
        return url.toString().replace(/\/$/, '');
    } catch (error) {
        return 'http://localhost:3000';
    }
})();

// Configurações
const ADMIN_USER = {
    username: 'admin',
    email: 'admin@quiz.com',
    password: 'admin123',
    adminSecret: 'admin_secret_super_seguro_mude_isto' // Mesmo valor do backend/.env
};

const FIRST_COURSE = {
    name: 'Programação de Jogos Digitais',
    description: 'Curso completo sobre desenvolvimento de jogos, cobrindo conceitos fundamentais de game design, programação e mecânicas de jogo.',
    category: 'Tecnologia',
    color: '#6366f1'
};

async function main() {
    console.log('🚀 Iniciando configuração do sistema...\n');

    try {
        // 1. Criar usuário admin
        console.log('1️⃣ Criando usuário administrador...');
        const adminToken = await createAdmin();
        console.log('   ✅ Admin criado com sucesso!\n');

        // 2. Criar primeiro curso
        console.log('2️⃣ Criando curso "Programação de Jogos Digitais"...');
        const courseId = await createCourse(adminToken);
        console.log(`   ✅ Curso criado com ID: ${courseId}\n`);

        // 3. Importar questões
        console.log('3️⃣ Importando questões do arquivo shared/questions.json...');
        const result = await importQuestions(courseId, adminToken);
        console.log(`   ✅ ${result.imported} questões importadas com sucesso!\n`);

    console.log('════════════════════════════════════════════════════════');
    console.log('✨ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('════════════════════════════════════════════════════════');
    console.log(`🌐 API utilizada: ${API_URL}`);
        console.log('\n📋 CREDENCIAIS DO ADMINISTRADOR:');
        console.log(`   Usuário: ${ADMIN_USER.username}`);
        console.log(`   Senha: ${ADMIN_USER.password}`);
        console.log(`   Email: ${ADMIN_USER.email}`);
        console.log('\n🌐 ACESSO:');
    console.log(`   Painel Admin: ${FRONTEND_BASE_URL}/admin.html`);
    console.log(`   Quiz: ${FRONTEND_BASE_URL}/index.html`);
        console.log('\n⚠️  IMPORTANTE: Altere a senha do admin após o primeiro login!\n');

    } catch (error) {
        console.error('❌ Erro durante a inicialização:', error.message || error);
        if (error?.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

async function createAdmin() {
    try {
        const response = await fetch(`${API_URL}/auth/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: ADMIN_USER.username,
                email: ADMIN_USER.email,
                password: ADMIN_USER.password,
                adminSecret: ADMIN_USER.adminSecret
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                console.log('   ℹ️  Admin já existe, fazendo login...');
                return await loginAdmin();
            }
            throw new Error(data.error || 'Erro ao criar admin');
        }

        return data.token;
    } catch (error) {
        throw new Error(`Falha ao criar admin: ${error.message}`);
    }
}

async function loginAdmin() {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_USER.email,
                password: ADMIN_USER.password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }

        return data.token;
    } catch (error) {
        throw new Error(`Falha ao fazer login: ${error.message}`);
    }
}

async function createCourse(token) {
    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(FIRST_COURSE)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao criar curso');
        }

        return data.course.id;
    } catch (error) {
        throw new Error(`Falha ao criar curso: ${error.message}`);
    }
}

async function importQuestions(courseId, token) {
    try {
        // Ler arquivo de questões
        const questionsPath = path.join(__dirname, 'shared', 'questions.json');
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

        const response = await fetch(`${API_URL}/courses/${courseId}/questions/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ questionsData })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao importar questões');
        }

        if (data.errors && data.errors.length > 0) {
            console.log('\n   ⚠️  Alguns erros ocorreram:');
            data.errors.forEach(err => {
                console.log(`      - Questão ${err.index}: ${err.error}`);
            });
        }

        return data;
    } catch (error) {
        throw new Error(`Falha ao importar questões: ${error.message}`);
    }
}

// Executar script
if (require.main === module) {
    main();
}
