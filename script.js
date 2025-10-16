// script.js - Главный файл игры "Камертон 2026" v2.0

import { gameData } from './gameData.js';
import {
    AudioManager, StorageManager, AnimationManager,
    ResourceLoader, GameState, AchievementManager, Utils
} from './modules/index.js';

// Инициализация менеджеров
const storage = new StorageManager();
const loader = new ResourceLoader();
let userSettings = storage.getItem('settings') || {
    textSpeed: 1.0, bgmVolume: 0.4, sfxVolume: 0.3, skipTutorial: false
};

const audio = new AudioManager(userSettings);
const animation = new AnimationManager();
const gameState = new GameState(storage);
const achievements = new AchievementManager(storage);

const saveSettings = Utils.debounce(() => storage.setItem('settings', userSettings), 500);

// DOM элементы
const els = {
    storyText: document.getElementById('story-text'),
    choicesContainer: document.getElementById('choices-container'),
    locationText: document.getElementById('location'),
    backgroundImage: document.getElementById('background-image'),
    spriteArea: document.getElementById('sprite-area'),
    hintButton: document.getElementById('hint-button'),
    speakerName: document.getElementById('speaker-name'),
    continuePrompt: document.getElementById('continue-prompt'),
    transitionOverlay: document.getElementById('transition-overlay'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    gameContainer: document.getElementById('game-container'),
    progressIndicator: document.getElementById('progress-indicator'),
    endingScreen: document.getElementById('ending-screen'),
    mainMenu: document.getElementById('main-menu'),
    settingsScreen: document.getElementById('settings-screen'),
    achievementsScreen: document.getElementById('achievements-screen'),
    pauseMenu: document.getElementById('pause-menu'),
    historyPanel: document.getElementById('history-panel'),
    sceneProgress: document.getElementById('scene-progress')
};

// Константы
const BASE_TYPING_SPEED = 25;
const ORIGINAL_HINT_TEXT = gameData['hint']?.story[0].text || 'Возврат...';

// Состояние печати
let currentTypingResolver = null;
let currentStoryIndex = 0;
let typingSoundCounter = 0;

// === ФУНКЦИИ UI ===
function showMainMenu() {
    els.gameContainer.style.display = 'none';
    els.mainMenu.style.display = 'flex';
    document.getElementById('continue-game-btn').style.display = gameState.hasSave() ? 'block' : 'none';
}

function showSettings() {
    els.settingsScreen.style.display = 'flex';
    document.getElementById('text-speed-slider').value = userSettings.textSpeed;
    document.getElementById('text-speed-value').textContent = userSettings.textSpeed + 'x';
    document.getElementById('bgm-volume-slider').value = userSettings.bgmVolume;
    document.getElementById('bgm-volume-value').textContent = Math.round(userSettings.bgmVolume * 100) + '%';
    document.getElementById('sfx-volume-slider').value = userSettings.sfxVolume;
    document.getElementById('sfx-volume-value').textContent = Math.round(userSettings.sfxVolume * 100) + '%';
    document.getElementById('skip-tutorial-checkbox').checked = userSettings.skipTutorial;
}

function showAchievements() {
    els.achievementsScreen.style.display = 'flex';
    const list = document.getElementById('achievements-list');
    list.innerHTML = achievements.getAll().map(a => `
        <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">${a.title}</div>
                <div class="achievement-desc">${a.desc}</div>
            </div>
        </div>
    `).join('');
}

function showHistory() {
    els.historyPanel.style.display = 'flex';
    const list = document.getElementById('history-list');
    const history = gameState.getHistory();

    if (history.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7;">История пуста</p>';
    } else {
        list.innerHTML = history.map(e => `
            <div class="history-item">
                ${e.speaker ? `<div class="history-speaker">${e.speaker}:</div>` : ''}
                <div>${e.text}</div>
            </div>
        `).join('');
        list.scrollTop = list.scrollHeight;
        achievements.unlock('storyteller');
    }
}

// === ИГРОВАЯ ЛОГИКА ===
function typeText(text) {
    gameState.setTyping(true);
    audio.stopTyping();
    els.storyText.textContent = '';
    document.getElementById('text-box').classList.remove('text-complete');

    return new Promise(resolve => {
        currentTypingResolver = resolve;
        let index = 0;
        const speed = BASE_TYPING_SPEED / userSettings.textSpeed;

        function printChar() {
            if (!gameState.isTyping) {
                els.storyText.textContent = text;
                document.getElementById('text-box').classList.add('text-complete');
                els.continuePrompt.style.display = 'block';
                audio.stopTyping();
                if (gameState.incrementSkip() >= 10) achievements.unlock('speed_reader');
                resolve();
                return;
            }

            if (index < text.length) {
                els.storyText.textContent += text.charAt(index);
                if (typingSoundCounter++ % 1 === 0 && text.charAt(index).trim()) {
                    audio.playTyping();
                }
                index++;
                setTimeout(printChar, speed);
            } else {
                gameState.setTyping(false);
                document.getElementById('text-box').classList.add('text-complete');
                els.continuePrompt.style.display = 'block';
                audio.stopTyping();
                resolve();
            }
        }
        printChar();
    });
}

function updateSpriteEmphasis(speaker) {
    const sprites = els.spriteArea.querySelectorAll('.sprite');
    const excluded = ['Система', 'РЕШЕНИЕ', 'ИТОГ', 'Твои Мысли', 'Подсказка', 'ВОЗВРАТ'];

    if (!speaker || excluded.some(n => speaker.includes(n))) {
        sprites.forEach(s => s.classList.remove('dimmed'));
    } else {
        sprites.forEach(s => s.classList.toggle('dimmed', s.alt !== speaker));
    }
}

function updateSceneProgress() {
    const match = gameState.currentSceneId.match(/scene(\d+)/);
    els.sceneProgress.textContent = match ? `Сцена ${match[1]}/5` : '';
}

async function showScene(sceneId) {
    if (gameState.isAdvancing) return;

    const scene = gameData[sceneId];
    if (!scene) return console.error('Сцена не найдена:', sceneId);

    if (sceneId === gameState.currentSceneId && !scene.isHint) {
        return renderSceneContent(sceneId);
    }

    await loader.preloadScene(scene);
    if (sceneId !== gameState.currentSceneId) audio.playTransition();

    els.transitionOverlay.classList.add('active');
    setTimeout(() => {
        renderSceneContent(sceneId);
        setTimeout(() => els.transitionOverlay.classList.remove('active'), 50);
    }, 800);
}

function renderSceneContent(sceneId) {
    animation.stopAll();
    audio.stopTyping();

    const scene = gameData[sceneId];

    if (gameState.currentSceneId === 'hint' && sceneId !== 'hint' && gameData['hint']) {
        gameData['hint'].story[0].text = ORIGINAL_HINT_TEXT;
    }

    const isReturningFromHint = gameState.currentSceneId === 'hint' && sceneId !== 'hint';
    gameState.currentSceneId = sceneId;
    gameState.setAwaitingConsequence(false);
    gameState.checkAutoSave();
    updateSceneProgress();

    if (scene.bgm) audio.playBGM(scene.bgm);
    els.locationText.textContent = scene.location;
    els.backgroundImage.style.backgroundImage = scene.background || 'none';

    // Спрайты
    els.spriteArea.innerHTML = '';
    const sprites = scene.sprites || (scene.sprite ? [scene.sprite] : []);
    sprites.forEach(s => {
        const img = document.createElement('img');
        img.alt = s.name;
        img.className = `sprite ${s.position}`;
        if (s.baseSrc && s.frames > 1) {
            animation.startAnimation(img, s.baseSrc, s.frames);
        } else {
            img.src = s.src;
        }
        els.spriteArea.appendChild(img);
    });

    els.choicesContainer.innerHTML = '';
    els.choicesContainer.style.pointerEvents = 'none';
    els.choicesContainer.style.opacity = '0';
    els.hintButton.style.display = 'none';
    els.speakerName.style.display = 'none';
    els.continuePrompt.style.display = 'none';

    const textBox = document.getElementById('text-box');

    if (scene.isEnding) {
        updateSpriteEmphasis(null);
        generateEnding(sceneId);
        textBox.onclick = null;
    } else {
        if (!isReturningFromHint) {
            currentStoryIndex = 0;
            gameState.setAwaitingChoice(false);
        }

        if (isReturningFromHint) {
            const choiceIdx = scene.story?.findIndex(s => s.action === 'show_choices');
            if (choiceIdx !== -1) {
                const step = scene.story[choiceIdx];
                updateSpriteEmphasis(null);
                els.speakerName.textContent = 'РЕШЕНИЕ';
                els.speakerName.style.display = 'block';
                els.storyText[step.text.includes('<span') ? 'innerHTML' : 'textContent'] = step.text;
                document.getElementById('text-box').classList.add('text-complete');
                showChoices(scene);
                textBox.onclick = null;
                currentStoryIndex = choiceIdx;
                gameState.setAwaitingChoice(true);
                return;
            }
        }

        textBox.onclick = goToNextStoryStep;
        goToNextStoryStep();
    }
}

async function goToNextStoryStep() {
    if (gameState.isTyping) {
        gameState.setTyping(false);
        if (currentTypingResolver) currentTypingResolver();
        return;
    }

    if (gameState.isAdvancing) return;
    gameState.setAdvancing(true);

    try {
        const scene = gameData[gameState.currentSceneId];

        if (gameState.isAwaitingConsequenceClick) {
            updateSpriteEmphasis(null);
            const nextId = 'scene' + (gameState.totalScenes + 1);
            gameState.setAwaitingConsequence(false);
            gameState.setAdvancing(false);
            gameData[nextId] ? showScene(nextId) : checkEnding();
            return;
        }

        if (gameState.isAwaitingChoice || !scene.story || currentStoryIndex >= scene.story.length) {
            if (gameState.currentSceneId === 'hint' && !gameState.isAwaitingChoice) {
                const lastStep = scene.story[scene.story.length - 1];
                if (lastStep.action === 'show_choices') {
                    document.getElementById('text-box').onclick = null;
                    els.speakerName.textContent = 'ВОЗВРАТ';
                    els.speakerName.style.display = 'block';
                    els.storyText.textContent = lastStep.text;
                    showChoices(scene);
                }
            }
            return;
        }

        const step = scene.story[currentStoryIndex];

        if (step.text && step.action !== 'show_choices') {
            gameState.addToHistory(step.speaker || '', step.text);
        }

        if (step.action === 'show_choices') {
            updateSpriteEmphasis(null);
            els.speakerName.textContent = gameState.currentSceneId === 'hint' ? 'ВОЗВРАТ' : 'РЕШЕНИЕ';
            els.speakerName.style.display = 'block';

            if (step.text.includes('<span')) {
                els.storyText.innerHTML = step.text;
                document.getElementById('text-box').classList.add('text-complete');
                els.continuePrompt.style.display = 'block';
            } else {
                await typeText(step.text);
            }

            if (!gameState.isAwaitingChoice) showChoices(scene);
            document.getElementById('text-box').onclick = null;
            return;
        }

        if (step.spriteSrc && step.speaker) {
            const sprite = els.spriteArea.querySelector(`.sprite[alt="${step.speaker}"]`);
            if (sprite) animation.startAnimation(sprite, step.spriteSrc, 6);
        }

        if (step.speaker) {
            els.speakerName.textContent = step.speaker;
            els.speakerName.style.display = 'block';
            updateSpriteEmphasis(step.speaker);
        } else {
            els.speakerName.style.display = 'none';
            updateSpriteEmphasis(null);
        }

        if (step.text.includes('<span')) {
            els.storyText.innerHTML = step.text;
            document.getElementById('text-box').classList.add('text-complete');
            els.continuePrompt.style.display = 'block';
        } else {
            await typeText(step.text);
        }

        currentStoryIndex++;
    } finally {
        gameState.setAdvancing(false);
    }
}

function showChoices(scene) {
    gameState.setAwaitingChoice(true);
    els.choicesContainer.innerHTML = '';

    scene.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.textContent = choice.text;
        btn.className = 'choice-button';

        if (choice.nextScene === 'return') {
            btn.onclick = () => {
                if (!gameState.isAdvancing && gameState.isAwaitingChoice) {
                    handleChoice(gameState.currentSceneId, idx, false);
                }
            };
        } else if (gameState.currentSceneId.startsWith('tutorial') ||
                   gameState.currentSceneId.startsWith('ending') ||
                   gameState.currentSceneId === 'welcome_message') {
            btn.onclick = () => !gameState.isAdvancing && showScene(choice.nextScene);
        } else {
            btn.onclick = () => {
                if (!gameState.isAdvancing && gameState.isAwaitingChoice) {
                    handleChoice(gameState.currentSceneId, idx, false);
                    achievements.unlock('first_choice');
                }
            };
        }

        els.choicesContainer.appendChild(btn);
    });

    els.choicesContainer.style.pointerEvents = 'auto';
    els.choicesContainer.style.opacity = '1';

    const showHint = scene.hint && !scene.isHint &&
                     !gameState.currentSceneId.startsWith('tutorial') &&
                     !gameState.currentSceneId.startsWith('ending') &&
                     gameState.currentSceneId !== 'welcome_message';
    els.hintButton.style.display = showHint ? 'block' : 'none';
}

function handleChoice(sceneId, choiceIdx, isHint = false) {
    if (gameState.isAdvancing) return;

    if (isHint) {
        const scene = gameData[sceneId];
        if (!scene.hint) return;
        gameState.pushScene(sceneId);
        if (gameData['hint']) gameData['hint'].story[0].text = scene.hint;
        if (gameState.incrementHintUsed() >= 3) achievements.unlock('hint_master');
        showScene('hint');
        return;
    }

    const scene = gameData[sceneId];
    const choice = scene.choices[choiceIdx];

    gameState.setAwaitingChoice(false);
    gameState.setAdvancing(true);

    els.choicesContainer.style.pointerEvents = 'none';
    els.choicesContainer.style.opacity = '0';
    els.hintButton.style.display = 'none';
    els.continuePrompt.style.display = 'none';
    document.getElementById('text-box').onclick = null;

    if (choice.nextScene === 'return') {
        gameState.setAdvancing(false);
        showScene(gameState.popScene());
        return;
    }

    if (choice.nextScene) {
        gameState.setAdvancing(false);
        showScene(choice.nextScene);
        return;
    }

    updateSpriteEmphasis(null);
    gameState.incrementScenes();

    const consequenceText = choice.correct === true
        ? (choice.consequence || '')
        : (choice.consequence || 'Ситуация разрешилась без твоего решающего влияния.');

    if (choice.correct === true) gameState.incrementCorrectChoices();
    gameState.addConsequence(scene.location, choice.text, consequenceText, choice.correct);

    els.speakerName.textContent = 'ИТОГ';
    els.speakerName.style.display = 'block';
    els.storyText.innerHTML = consequenceText.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>');

    gameState.setAdvancing(false);
    gameState.setAwaitingConsequence(true);
    document.getElementById('text-box').onclick = goToNextStoryStep;
    els.continuePrompt.style.display = 'block';
}

function checkEnding() {
    if (gameState.isPerfectRun()) {
        achievements.unlock('perfect_run');
        showScene('ending_secret');
    } else {
        showScene('ending_consequences');
    }
}

function generateEnding(sceneId) {
    const scene = gameData[sceneId];

    if (scene.isFinalVideo) {
        handleVideoEnding(scene);
        return;
    }

    const progress = gameState.getProgress();
    const consequences = gameState.getConsequences();
    let html = '';

    if (sceneId === 'ending_consequences') {
        html = scene.text.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>');
        html += `
            <div style="margin-top: 20px; padding: 15px; background-color: rgba(10, 104, 54, 0.2); border-left: 4px solid var(--light-green); border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: var(--light-green);">Общий итог</h3>
                <p style="margin: 0;">Ты принял <b>${progress.correctChoices} из ${progress.totalScenes}</b> решений, соответствующих духу смены.</p>
                <p style="margin: 10px 0 0 0;">Жизнь — это игра, в которой ты учишься. Спасибо за твой выбор!</p>
            </div>
            <div style="margin-top: 30px;">
                <h3 style="margin: 0 0 15px 0; color: var(--accent-warm);">Детальный отчет</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: rgba(0, 0, 0, 0.3); border-radius: 4px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: rgba(10, 104, 54, 0.5);">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--light-green); color: var(--white);">Ситуация</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--light-green); color: var(--white);">Выбор</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 1px solid var(--light-green); color: var(--white);">Статус</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--light-green); color: var(--white);">Последствие</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${consequences.map((r, i) => {
                            const status = r.isCorrect ? '✅ ВЕРНО' : '❌ ОШИБКА';
                            const color = r.isCorrect ? '#49a861' : '#ff4444';
                            return `
                                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                    <td style="padding: 10px; font-weight: bold;">${i + 1}. ${r.scene}</td>
                                    <td style="padding: 10px;">"${r.choice}"</td>
                                    <td style="padding: 10px; text-align: center; font-weight: bold; color: ${color};">${status}</td>
                                    <td style="padding: 10px;">${r.consequence.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (scene.story) {
        html = scene.story.map(s =>
            s.speaker ? `<p><b>${s.speaker}:</b> ${s.text.replace(/\*\*/g, '<b>')}</p>`
                      : `<p>${s.text.replace(/\*\*/g, '<b>')}</p>`
        ).join('');
    } else if (scene.text) {
        html = scene.text.replace(/\*\*/g, '<b>');
    }

    els.storyText.innerHTML = html;
    showChoices(scene);
    achievements.unlock('completionist');
}

function handleVideoEnding(scene) {
    els.gameContainer.style.display = 'none';
    els.endingScreen.style.display = 'flex';

    const video = document.getElementById('game-ending-video');
    const playBtn = document.getElementById('play-video-btn');
    const finalMsg = document.getElementById('final-message');
    const restartBtn = document.getElementById('ending-restart-button');

    finalMsg.style.display = 'none';
    playBtn.style.display = 'none';
    restartBtn.style.display = 'none';
    video.style.display = 'block';
    video.src = '1013.mp4';
    video.load();

    video.play().catch(() => {
        playBtn.style.display = 'block';
        playBtn.onclick = () => video.play();
    });

    video.onended = () => {
        audio.stopBGM();
        video.style.display = 'none';
        finalMsg.innerHTML = scene.finalText?.replace(/\*\*/g, '<b>') || 'Игра завершена.';
        finalMsg.style.display = 'block';
        restartBtn.style.display = 'block';
    };
}

function initializeGame(continueMode = false) {
    els.gameContainer.style.display = 'block';
    els.mainMenu.style.display = 'none';

    if (continueMode && gameState.load()) {
        showScene(gameState.currentSceneId);
    } else {
        gameState.currentSceneId = userSettings.skipTutorial ? 'scene1' : 'welcome_message';
        showScene(gameState.currentSceneId);
    }

    els.loadingOverlay.classList.add('fade-out');
    setTimeout(() => {
        els.loadingOverlay.style.display = 'none';
        els.loadingOverlay.classList.remove('fade-out');
    }, 500);
}

// === СОБЫТИЯ ===
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('new-game-btn').onclick = () => {
        gameState.reset();
        storage.removeItem('save');
        initializeGame(false);
    };

    document.getElementById('continue-game-btn').onclick = () => initializeGame(true);
    document.getElementById('settings-btn').onclick = showSettings;
    document.getElementById('achievements-btn').onclick = showAchievements;

    document.getElementById('settings-back-btn').onclick = () => {
        els.settingsScreen.style.display = 'none';
        if (els.gameContainer.style.display === 'none') showMainMenu();
    };

    document.getElementById('text-speed-slider').oninput = (e) => {
        userSettings.textSpeed = parseFloat(e.target.value);
        document.getElementById('text-speed-value').textContent = userSettings.textSpeed + 'x';
        saveSettings();
    };

    document.getElementById('bgm-volume-slider').oninput = (e) => {
        userSettings.bgmVolume = parseFloat(e.target.value);
        document.getElementById('bgm-volume-value').textContent = Math.round(userSettings.bgmVolume * 100) + '%';
        audio.updateSettings(userSettings);
        saveSettings();
    };

    document.getElementById('sfx-volume-slider').oninput = (e) => {
        userSettings.sfxVolume = parseFloat(e.target.value);
        document.getElementById('sfx-volume-value').textContent = Math.round(userSettings.sfxVolume * 100) + '%';
        audio.updateSettings(userSettings);
        saveSettings();
    };

    document.getElementById('skip-tutorial-checkbox').onchange = (e) => {
        userSettings.skipTutorial = e.target.checked;
        saveSettings();
    };

    document.getElementById('achievements-back-btn').onclick = () => {
        els.achievementsScreen.style.display = 'none';
        showMainMenu();
    };

    document.getElementById('pause-menu-btn').onclick = () => {
        els.pauseMenu.style.display = 'flex';
        audio.pauseBGM();
    };

    document.getElementById('resume-btn').onclick = () => {
        els.pauseMenu.style.display = 'none';
        audio.resumeBGM();
    };

    document.getElementById('pause-settings-btn').onclick = () => {
        els.pauseMenu.style.display = 'none';
        showSettings();
    };

    document.getElementById('save-game-btn').onclick = () => {
        gameState.save();
        els.pauseMenu.style.display = 'none';
    };

    document.getElementById('main-menu-btn').onclick = () => {
        if (confirm('Вернуться в главное меню? Несохраненный прогресс будет утерян.')) {
            els.pauseMenu.style.display = 'none';
            gameState.reset();
            showMainMenu();
        }
    };

    document.getElementById('history-btn').onclick = showHistory;
    document.getElementById('history-close-btn').onclick = () => els.historyPanel.style.display = 'none';

    els.hintButton.onclick = () => {
        if (!gameState.isAdvancing && gameState.isAwaitingChoice) {
            handleChoice(gameState.currentSceneId, null, true);
        }
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            if (els.pauseMenu.style.display === 'flex' ||
                els.settingsScreen.style.display === 'flex' ||
                els.achievementsScreen.style.display === 'flex' ||
                els.historyPanel.style.display === 'flex' ||
                els.mainMenu.style.display === 'flex') return;
            e.preventDefault();
            goToNextStoryStep();
        } else if (e.key === 'Escape') {
            if (els.pauseMenu.style.display === 'flex') {
                els.pauseMenu.style.display = 'none';
                audio.resumeBGM();
            } else if (els.historyPanel.style.display === 'flex') {
                els.historyPanel.style.display = 'none';
            } else if (els.gameContainer.style.display !== 'none') {
                els.pauseMenu.style.display = 'flex';
                audio.pauseBGM();
            }
        } else if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
            if (els.gameContainer.style.display !== 'none' && els.historyPanel.style.display === 'none') {
                showHistory();
            }
        }
    });

    document.getElementById('ending-restart-button').onclick = () => {
        els.endingScreen.style.display = 'none';
        gameState.reset();
        showMainMenu();
    };
});

// === ЗАПУСК ===
window.onload = async () => {
    els.gameContainer.style.display = 'none';
    els.mainMenu.style.display = 'none';
    els.loadingOverlay.style.display = 'flex';

    try {
        els.loadingText.textContent = 'Загрузка ресурсов...';
        await loader.preloadCritical();

        els.loadingText.textContent = 'Загрузка завершена...';
        els.progressIndicator.style.width = '100%';

        setTimeout(() => {
            els.loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                els.loadingOverlay.style.display = 'none';
                showMainMenu();
            }, 500);
        }, 800);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        els.loadingText.textContent = 'Ошибка загрузки. Обновите страницу.';
    }
};

window.showNotification = Utils.showNotification;
console.log('🎮 Камертон 2026 v2.0');
