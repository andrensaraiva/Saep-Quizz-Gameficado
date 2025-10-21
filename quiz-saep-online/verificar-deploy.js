#!/usr/bin/env node

// Script para verificar se o servidor está funcionando corretamente
const https = require('https');

const RENDER_URL = 'https://saep-quizz-gameficado.onrender.com';

console.log('🔍 Verificando servidor no Render...\n');

function checkEndpoint(path, name) {
    return new Promise((resolve) => {
        https.get(`${RENDER_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ ${name}: OK (${res.statusCode})`);
                    try {
                        const json = JSON.parse(data);
                        console.log(`   Dados:`, json);
                    } catch (e) {
                        console.log(`   Resposta recebida com sucesso`);
                    }
                    resolve(true);
                } else {
                    console.log(`❌ ${name}: ERRO (${res.statusCode})`);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.log(`❌ ${name}: ERRO - ${err.message}`);
            resolve(false);
        });
    });
}

async function runChecks() {
    console.log(`URL Base: ${RENDER_URL}\n`);
    
    const checks = [
        { path: '/api/health', name: 'API Health' },
        { path: '/api/courses', name: 'Listar Cursos' },
        { path: '/', name: 'Frontend (Index)' }
    ];

    for (const check of checks) {
        await checkEndpoint(check.path, check.name);
        console.log('');
    }

    console.log('✨ Verificação concluída!\n');
    console.log('Se todos os testes passaram, seu servidor está funcionando corretamente.');
    console.log('Se houver erros, verifique:');
    console.log('  1. Se o deploy foi concluído no Render');
    console.log('  2. Se as variáveis de ambiente estão configuradas');
    console.log('  3. Os logs no painel do Render');
}

runChecks();
