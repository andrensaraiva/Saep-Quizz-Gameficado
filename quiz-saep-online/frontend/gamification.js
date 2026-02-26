// ==================== GAMIFICATION MODULE ====================

const Gamification = (() => {
    // State
    let profile = null;
    let levelProgress = null;
    let allAchievements = [];
    let currentCombo = 0;
    let maxCombo = 0;
    let liveScore = 0;
    let liveTotalAnswered = 0;

    // ==================== API ====================

    async function loadProfile() {
        if (!currentToken) return null;
        try {
            const response = await fetch(`${API_URL}/gamification/profile`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (!response.ok) return null;
            const data = await response.json();
            profile = data.profile;
            levelProgress = data.levelProgress;
            allAchievements = data.allAchievements || [];
            return data;
        } catch (error) {
            console.error('Erro ao carregar perfil de gamificação:', error);
            return null;
        }
    }

    async function submitQuizResult(quizData) {
        if (!currentToken) return null;
        try {
            const response = await fetch(`${API_URL}/gamification/submit-quiz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    ...quizData,
                    maxCombo: maxCombo
                })
            });
            if (!response.ok) return null;
            const data = await response.json();
            profile = data.profile;
            levelProgress = data.levelProgress;
            return data;
        } catch (error) {
            console.error('Erro ao submeter resultado gamificado:', error);
            return null;
        }
    }

    async function loadLeaderboard() {
        try {
            const response = await fetch(`${API_URL}/gamification/leaderboard`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.leaderboard || [];
        } catch (error) {
            console.error('Erro ao carregar leaderboard:', error);
            return [];
        }
    }

    // ==================== XP BAR UI ====================

    function renderXpBar() {
        const container = document.getElementById('gamification-xp-bar');
        if (!container) return;

        if (!currentUser || !profile) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const progressPercent = levelProgress ? levelProgress.progressPercent.toFixed(1) : 0;
        const currentXp = profile.xp || 0;
        const nextLevelXp = levelProgress ? levelProgress.nextLevelXp : 100;

        container.innerHTML = `
            <div class="xp-bar-header">
                <div class="level-badge" title="Nível ${profile.level}">
                    ${profile.level}
                </div>
                <div class="xp-info">
                    <div class="level-text">Nível ${profile.level}</div>
                    <div class="xp-progress-bar">
                        <div class="xp-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="xp-text">${currentXp} / ${nextLevelXp} XP</div>
                </div>
                ${profile.currentStreak > 0 ? `
                    <div class="streak-badge" title="Streak de ${profile.currentStreak} dia(s)">
                        <span class="streak-fire">🔥</span> ${profile.currentStreak}
                    </div>
                ` : `
                    <div class="streak-badge no-streak" title="Faça um quiz hoje para iniciar seu streak!">
                        🔥 0
                    </div>
                `}
            </div>
        `;
    }

    // ==================== COMBO SYSTEM ====================

    function resetCombo() {
        currentCombo = 0;
        maxCombo = 0;
        liveScore = 0;
        liveTotalAnswered = 0;
        updateComboUI();
    }

    function registerCorrectAnswer() {
        currentCombo++;
        liveScore++;
        liveTotalAnswered++;
        if (currentCombo > maxCombo) maxCombo = currentCombo;
        updateComboUI();
        showXpPopup(currentCombo >= 3 ? '+' + (10 + Math.min(currentCombo, 5) * 2) + ' XP' : '+10 XP');
        updateLiveScore();
    }

    function registerWrongAnswer() {
        currentCombo = 0;
        liveTotalAnswered++;
        updateComboUI();
        updateLiveScore();
    }

    function updateComboUI() {
        let indicator = document.getElementById('combo-indicator');
        if (!indicator) {
            // Create combo container
            const container = document.createElement('div');
            container.className = 'combo-container';
            container.id = 'combo-container';
            container.innerHTML = `<div class="combo-indicator" id="combo-indicator"></div>`;
            document.body.appendChild(container);
            indicator = document.getElementById('combo-indicator');
        }

        if (currentCombo >= 2) {
            indicator.classList.add('active');
            indicator.classList.remove('fire', 'legendary');

            if (currentCombo >= 8) {
                indicator.classList.add('legendary');
            } else if (currentCombo >= 5) {
                indicator.classList.add('fire');
            }

            const multiplier = Math.min(currentCombo, 5);
            indicator.innerHTML = `
                <div class="combo-count">${currentCombo}x</div>
                <div class="combo-label">COMBO</div>
                ${multiplier > 1 ? `<div class="combo-multiplier">+${multiplier * 2} XP bônus</div>` : ''}
            `;

            // Trigger bounce
            indicator.style.animation = 'none';
            indicator.offsetHeight; // reflow
            indicator.style.animation = '';
        } else {
            indicator.classList.remove('active', 'fire', 'legendary');
        }
    }

    function updateLiveScore() {
        const el = document.getElementById('quiz-live-score');
        if (el) {
            el.textContent = `${liveScore}/${liveTotalAnswered}`;
        }
    }

    // ==================== XP POPUP ====================

    function showXpPopup(text) {
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.textContent = text;
        popup.style.left = (Math.random() * 30 + 60) + '%';
        popup.style.top = '30%';
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1500);
    }

    // ==================== LEVEL UP ANIMATION ====================

    function showLevelUp(oldLevel, newLevel) {
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-content">
                <div class="level-up-icon">🏆</div>
                <div class="level-up-title">LEVEL UP!</div>
                <div class="level-up-level">${newLevel}</div>
                <div class="level-up-subtitle">Você avançou do nível ${oldLevel} para o nível ${newLevel}!</div>
            </div>
        `;
        document.body.appendChild(overlay);
        launchConfetti();

        overlay.addEventListener('click', () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        });

        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.5s ease';
                setTimeout(() => overlay.remove(), 500);
            }
        }, 4000);
    }

    // ==================== ACHIEVEMENT NOTIFICATION ====================

    function showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="ach-icon">${achievement.icon}</div>
            <div class="ach-info">
                <div class="ach-label">🏅 Conquista Desbloqueada!</div>
                <div class="ach-name">${achievement.name}</div>
                <div class="ach-desc">${achievement.description}</div>
            </div>
            <div class="ach-xp">+${achievement.xpReward} XP</div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 600);
        }, 4000);
    }

    function showAchievementsSequentially(achievements) {
        achievements.forEach((ach, index) => {
            setTimeout(() => showAchievementNotification(ach), index * 4500);
        });
    }

    // ==================== CONFETTI ====================

    function launchConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);

        const colors = ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#f97316'];
        const shapes = ['■', '●', '▲', '★'];

        for (let i = 0; i < 80; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            piece.style.left = Math.random() * 100 + '%';
            piece.style.color = colors[Math.floor(Math.random() * colors.length)];
            piece.style.fontSize = (Math.random() * 12 + 8) + 'px';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.animationDelay = Math.random() * 1.5 + 's';
            container.appendChild(piece);
        }

        setTimeout(() => container.remove(), 5000);
    }

    // ==================== XP SUMMARY CARD ====================

    function renderXpSummary(result) {
        if (!result) return '';

        const breakdown = result.xpBreakdown || {};
        const breakdownItems = [];

        if (breakdown.correctAnswers) breakdownItems.push({ icon: '✓', label: 'Respostas', value: breakdown.correctAnswers });
        if (breakdown.completion) breakdownItems.push({ icon: '📝', label: 'Conclusão', value: breakdown.completion });
        if (breakdown.perfectScore) breakdownItems.push({ icon: '💎', label: 'Score Perfeito', value: breakdown.perfectScore });
        if (breakdown.speedBonus) breakdownItems.push({ icon: '⚡', label: 'Bônus Velocidade', value: breakdown.speedBonus });
        if (breakdown.comboBonus) breakdownItems.push({ icon: '🔥', label: 'Bônus Combo', value: breakdown.comboBonus });
        if (breakdown.streakBonus) breakdownItems.push({ icon: '📅', label: 'Bônus Streak', value: breakdown.streakBonus });
        if (breakdown.achievements) breakdownItems.push({ icon: '🏅', label: 'Conquistas', value: breakdown.achievements });

        const progressPercent = result.levelProgress ? result.levelProgress.progressPercent.toFixed(1) : 0;

        return `
            <div class="xp-summary-card">
                <div class="xp-summary-header">
                    <div>
                        <div class="xp-total-label">XP Ganho</div>
                        <div class="xp-total-earned">+${result.xpGained} XP</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="level-badge" style="width: 56px; height: 56px; font-size: 1.3rem; margin: 0 auto;">
                            ${result.newLevel}
                        </div>
                        ${result.leveledUp ? '<div style="color: #fbbf24; font-size: 0.8rem; font-weight: 700; margin-top: 4px;">LEVEL UP! 🎉</div>' : ''}
                    </div>
                </div>

                <div class="xp-breakdown">
                    ${breakdownItems.map(item => `
                        <div class="xp-breakdown-item">
                            <div class="xp-breakdown-value">${item.icon} +${item.value}</div>
                            <div class="xp-breakdown-label">${item.label}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="xp-level-progress">
                    <div class="xp-level-info">
                        <span class="xp-level-current">Nível ${result.newLevel}</span>
                        <span class="xp-level-next">${result.levelProgress ? result.levelProgress.currentXp : 0} / ${result.levelProgress ? result.levelProgress.nextLevelXp : 100} XP</span>
                    </div>
                    <div class="xp-level-bar">
                        <div class="xp-level-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>

                ${maxCombo >= 2 ? `
                    <div style="margin-top: 16px; text-align: center; color: #94a3b8; font-size: 0.9rem;">
                        Melhor combo neste quiz: <strong style="color: #fbbf24;">${maxCombo}x</strong>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ==================== GAMIFIED PROFILE SECTION ====================

    function renderGamifiedProfile(containerId) {
        const container = document.getElementById(containerId);
        if (!container || !profile) {
            if (container) container.innerHTML = '';
            return;
        }

        const unlockedIds = (profile.achievements || []).map(a => a.id);
        const progressPercent = levelProgress ? levelProgress.progressPercent.toFixed(1) : 0;
        const accuracy = profile.totalQuestions > 0
            ? ((profile.totalCorrect / profile.totalQuestions) * 100).toFixed(1)
            : 0;

        container.innerHTML = `
            <div class="gamification-profile">
                <div class="gp-level-card">
                    <div class="gp-level-label">Nível</div>
                    <div class="gp-level-number">${profile.level}</div>
                    <div class="gp-xp-display">${profile.xp} XP</div>
                    <div style="margin-top: 16px;">
                        <div class="xp-progress-bar" style="height: 10px; background: rgba(255,255,255,0.2);">
                            <div class="xp-progress-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.8rem; opacity: 0.8;">
                            <span>Nível ${profile.level}</span>
                            <span>Nível ${profile.level + 1}</span>
                        </div>
                    </div>
                </div>

                <div class="gp-stats-grid">
                    <div class="gp-stat">
                        <div class="gp-stat-icon">📝</div>
                        <div class="gp-stat-value">${profile.totalQuizzes || 0}</div>
                        <div class="gp-stat-label">Quizzes</div>
                    </div>
                    <div class="gp-stat">
                        <div class="gp-stat-icon">🎯</div>
                        <div class="gp-stat-value">${accuracy}%</div>
                        <div class="gp-stat-label">Precisão</div>
                    </div>
                    <div class="gp-stat">
                        <div class="gp-stat-icon">🔥</div>
                        <div class="gp-stat-value">${profile.currentStreak || 0}</div>
                        <div class="gp-stat-label">Streak Atual</div>
                    </div>
                    <div class="gp-stat">
                        <div class="gp-stat-icon">💥</div>
                        <div class="gp-stat-value">${profile.bestCombo || 0}x</div>
                        <div class="gp-stat-label">Melhor Combo</div>
                    </div>
                    <div class="gp-stat">
                        <div class="gp-stat-icon">💎</div>
                        <div class="gp-stat-value">${profile.perfectScores || 0}</div>
                        <div class="gp-stat-label">Perfeitos</div>
                    </div>
                    <div class="gp-stat">
                        <div class="gp-stat-icon">📅</div>
                        <div class="gp-stat-value">${profile.longestStreak || 0}</div>
                        <div class="gp-stat-label">Maior Streak</div>
                    </div>
                </div>

                <div class="achievements-section">
                    <h3>🏅 Conquistas (${unlockedIds.length}/${allAchievements.length})</h3>
                    <div class="achievements-grid">
                        ${allAchievements.map(ach => {
                            const isUnlocked = unlockedIds.includes(ach.id);
                            const unlockedData = isUnlocked ? profile.achievements.find(a => a.id === ach.id) : null;
                            return `
                                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" 
                                     title="${isUnlocked ? 'Desbloqueada em ' + new Date(unlockedData.unlockedAt).toLocaleDateString('pt-BR') : 'Bloqueada - ' + ach.description}">
                                    <div class="ach-card-icon">${ach.icon}</div>
                                    <div class="ach-card-name">${ach.name}</div>
                                    <div class="ach-card-desc">${ach.description}</div>
                                    <div class="ach-card-xp">${isUnlocked ? '✓ ' : ''}+${ach.xpReward} XP</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== GAMIFIED LEADERBOARD ====================

    async function renderGamifiedLeaderboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<p style="text-align: center; color: #64748b;">Carregando leaderboard...</p>';

        const leaderboard = await loadLeaderboard();

        if (leaderboard.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b;">Nenhum jogador no leaderboard ainda.</p>';
            return;
        }

        const html = `
            <table class="ranking-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jogador</th>
                        <th>Nível</th>
                        <th>XP</th>
                        <th>Quizzes</th>
                        <th>🏅</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaderboard.slice(0, 50).map(entry => {
                        const rankClass = entry.rank === 1 ? 'rank-gold' : entry.rank === 2 ? 'rank-silver' : entry.rank === 3 ? 'rank-bronze' : '';
                        const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';
                        return `
                            <tr>
                                <td><span class="rank-number ${rankClass}">${medal || entry.rank}</span></td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div class="level-badge" style="width: 30px; height: 30px; font-size: 0.75rem; border-width: 1px;">
                                            ${entry.level}
                                        </div>
                                        ${entry.username}
                                    </div>
                                </td>
                                <td>Lv. ${entry.level}</td>
                                <td style="font-weight: 700; color: #f59e0b;">${entry.xp.toLocaleString()}</td>
                                <td>${entry.totalQuizzes}</td>
                                <td>${entry.achievementCount}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    // ==================== PUBLIC API ====================

    return {
        loadProfile,
        submitQuizResult,
        renderXpBar,
        resetCombo,
        registerCorrectAnswer,
        registerWrongAnswer,
        showLevelUp,
        showAchievementNotification,
        showAchievementsSequentially,
        launchConfetti,
        renderXpSummary,
        renderGamifiedProfile,
        renderGamifiedLeaderboard,
        showXpPopup,
        getMaxCombo: () => maxCombo,
        getCombo: () => currentCombo,
        getProfile: () => profile,
        getLevelProgress: () => levelProgress,
        getAllAchievements: () => allAchievements
    };
})();
