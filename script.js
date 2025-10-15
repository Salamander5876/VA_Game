// script.js - Улучшенная версия игровой логики для "Камертон 2026"

import { gameData } from './gameData.js';

// === НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ (НОВОЕ) ===
let userSettings = {
    textSpeed: 1.0, // 0.5x, 1x, 2x
    bgmVolume: 0.4,
    sfxVolume: 0.3,
    skipTutorial: false
};

// Загрузка настроек из localStorage
function loadSettings() {
    const saved = localStorage.getItem('kamerton_settings');
    if (saved) {
        userSettings = { ...userSettings, ...JSON.parse(saved) };
    }
}

function saveSettings() {
    localStorage.setItem('kamerton_settings', JSON.stringify(userSettings));
}

// === DOM ЭЛЕМЕНТЫ ===
const storyText = document.getElementById('story-text');
const choicesContainer = document.getElementById('choices-container');
const locationText = document.getElementById('location');
const backgroundImage = document.getElementById('background-image');
const spriteArea = document.getElementById('sprite-area');
const hintButton = document.getElementById('hint-button');
const speakerName = document.getElementById('speaker-name');
const continuePrompt = document.getElementById('continue-prompt');
const transitionOverlay = document.getElementById('transition-overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const startGameButton = document.getElementById('start-game-button');
const gameContainer = document.getElementById('game-container');
const progressIndicator = document.getElementById('progress-indicator');
const endingScreen = document.getElementById('ending-screen');
const gameEndingVideo = document.getElementById('game-ending-video');
const finalMessage = document.getElementById('final-message');
const endingRestartButton = document.getElementById('ending-restart-button');

// Новые элементы
const mainMenu = document.getElementById('main-menu');
const newGameBtn = document.getElementById('new-game-btn');
const continueGameBtn = document.getElementById('continue-game-btn');
const settingsBtn = document.getElementById('settings-btn');
const achievementsBtn = document.getElementById('achievements-btn');
const settingsScreen = document.getElementById('settings-screen');
const achievementsScreen = document.getElementById('achievements-screen');
const pauseMenuBtn = document.getElementById('pause-menu-btn');
const historyBtn = document.getElementById('history-btn');
const pauseMenu = document.getElementById('pause-menu');
const historyPanel = document.getElementById('history-panel');
const sceneProgress = document.getElementById('scene-progress');

// === КОНСТАНТЫ ===
const BASE_TYPING_SPEED = 25;
const ANIMATION_FRAME_DELAY = 200;
const DEFAULT_FRAMES = 6;
const TYPING_SOUND_INTERVAL = 1;

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let isAdvancing = false;
let isTyping = false;
let currentTypingResolver = null;
let currentSceneId = 'welcome_message';
let currentSceneStack = [];
let correctChoices = 0;
let totalScenes = 0;
let consequencesReport = [];
let currentStoryIndex = 0;
let isAwaitingChoice = false;
let isAwaitingConsequenceClick = false;
let typingSoundPlaybackCounter = 0;
let currentBGM = null;
let dialogHistory = []; // История диалогов (НОВОЕ)
let gameState = null; // Состояние игры для сохранения (НОВОЕ)

const ORIGINAL_HINT_TEXT = gameData['hint'] ? gameData['hint'].story[0].text : 'Возврат...';

// === АУДИО ===
const typingSound = new Audio('sound/typing.mp3');
typingSound.volume = userSettings.sfxVolume;

const transitionSound = new Audio('sound/переход.mp3');
transitionSound.volume = userSettings.sfxVolume;

const backgroundMusic = new Audio();
backgroundMusic.volume = userSettings.bgmVolume;

// === ДОСТИЖЕНИЯ (НОВОЕ) ===
const achievements = {
    first_choice: { title: 'Первый выбор', desc: 'Сделайте свой первый выбор', unlocked: false, icon: '🎯' },
    perfect_run: { title: 'Идеальная гармония', desc: 'Пройдите игру без ошибок', unlocked: false, icon: '🏆' },
    hint_master: { title: 'Мудрый советник', desc: 'Используйте подсказку 3 раза', unlocked: false, icon: '💡' },
    speed_reader: { title: 'Скоростной читатель', desc: 'Пропустите текст 10 раз', unlocked: false, icon: '⚡' },
    storyteller: { title: 'Хранитель историй', desc: 'Откройте историю диалогов', unlocked: false, icon: '📜' }
};

let hintUsedCount = 0;
let skipCount = 0;

function loadAchievements() {
    const saved = localStorage.getItem('kamerton_achievements');
    if (saved) {
        const savedAchievements = JSON.parse(saved);
        Object.keys(savedAchievements).forEach(key => {
            if (achievements[key]) {
                achievements[key].unlocked = savedAchievements[key];
            }
        });
    }
}

function unlockAchievement(key) {
    if (achievements[key] && !achievements[key].unlocked) {
        achievements[key].unlocked = true;
        showAchievementNotification(achievements[key]);
        saveAchievements();
    }
}

function saveAchievements() {
    const toSave = {};
    Object.keys(achievements).forEach(key => {
        toSave[key] = achievements[key].unlocked;
    });
    localStorage.setItem('kamerton_achievements', JSON.stringify(toSave));
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #0A6836, #49a861);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        z-index: 10002;
        animation: slideIn 0.5s ease-out;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 2em;">${achievement.icon}</span>
            <div>
                <div style="font-weight: bold; margin-bottom: 5px;">Достижение разблокировано!</div>
                <div style="font-size: 0.9em;">${achievement.title}</div>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// === СИСТЕМА СОХРАНЕНИЙ (НОВОЕ) ===
function saveGame() {
    gameState = {
        currentSceneId,
        correctChoices,
        totalScenes,
        consequencesReport,
        dialogHistory,
        timestamp: Date.now()
    };
    localStorage.setItem('kamerton_save', JSON.stringify(gameState));
    showNotification('Игра сохранена!');
}

function loadGame() {
    const saved = localStorage.getItem('kamerton_save');
    if (saved) {
        gameState = JSON.parse(saved);
        currentSceneId = gameState.currentSceneId;
        correctChoices = gameState.correctChoices;
        totalScenes = gameState.totalScenes;
        consequencesReport = gameState.consequencesReport;
        dialogHistory = gameState.dialogHistory;
        return true;
    }
    return false;
}

function showNotification(text) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(10, 104, 54, 0.95);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10002;
        animation: fadeInOut 2s ease-in-out;
    `;
    notification.textContent = text;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// === ИНИЦИАЛИЗАЦИЯ АУДИО ===
function initializeAudio() {
    typingSound.preload = 'auto';
    transitionSound.preload = 'auto';
    backgroundMusic.preload = 'auto';
    typingSound.load();
    transitionSound.load();
}

function stopTypingSound() {
    typingSound.pause();
    typingSound.currentTime = 0;
}

function updateAudioVolumes() {
    typingSound.volume = userSettings.sfxVolume;
    transitionSound.volume = userSettings.sfxVolume;
    backgroundMusic.volume = userSettings.bgmVolume;
}

// === ПРЕДЗАГРУЗКА РЕСУРСОВ ===
function preloadAssets() {
    return new Promise(async (resolve) => {
        const assetsToLoad = new Set();
        
        assetsToLoad.add(typingSound.src.split('/').pop());
        assetsToLoad.add(transitionSound.src.split('/').pop());

        for (const key in gameData) {
            const scene = gameData[key];
            
            if (scene.bgm) assetsToLoad.add(scene.bgm);
            
            if (scene.background && scene.background.startsWith('url(')) {
                const url = scene.background.slice(4, -1).replace(/['"]/g, '');
                assetsToLoad.add(url);
            }
            
            if (scene.sprites && Array.isArray(scene.sprites)) {
                scene.sprites.forEach(spriteData => {
                    if (spriteData.baseSrc && spriteData.frames) {
                        for (let i = 1; i <= spriteData.frames; i++) {
                            assetsToLoad.add(`${spriteData.baseSrc}/${i}.png`);
                        }
                    } else if (spriteData.src) {
                        assetsToLoad.add(spriteData.src);
                    }
                });
            }
            
            if (scene.sprite) {
                const spriteData = scene.sprite;
                if (spriteData.baseSrc && spriteData.frames) {
                    for (let i = 1; i <= spriteData.frames; i++) {
                        assetsToLoad.add(`${spriteData.baseSrc}/${i}.png`);
                    }
                } else if (spriteData.src) {
                    assetsToLoad.add(spriteData.src);
                }
            }
            
            if (scene.story) {
                scene.story.forEach(step => {
                    if (step.spriteSrc) {
                        for (let i = 1; i <= DEFAULT_FRAMES; i++) {
                            assetsToLoad.add(`${step.spriteSrc}/${i}.png`);
                        }
                    }
                });
            }
        }

        const realAssetsToLoad = Array.from(assetsToLoad).filter(url => 
            url.includes('/') || url.endsWith('.mp3')
        );
        const total = realAssetsToLoad.length;
        let loadedCount = 0;

        loadingText.textContent = `Загрузка: 0 из ${total} файлов... (0%)`;
        
        initializeAudio();
        
        const loadPromises = realAssetsToLoad.map(url => {
            return new Promise(assetResolve => {
                if (url.endsWith('.mp3')) {
                    const audio = new Audio(url);
                    audio.oncanplaythrough = audio.onerror = () => {
                        loadedCount++;
                        const percent = Math.round((loadedCount / total) * 100);
                        loadingText.textContent = `Загрузка: ${loadedCount} из ${total} файлов... (${percent}%)`;
                        if (progressIndicator) {
                            progressIndicator.style.width = `${percent}%`;
                        }
                        assetResolve();
                    };
                    audio.load();
                } else {
                    const img = new Image();
                    img.onload = img.onerror = () => {
                        loadedCount++;
                        const percent = Math.round((loadedCount / total) * 100);
                        loadingText.textContent = `Загрузка: ${loadedCount} из ${total} файлов... (${percent}%)`;
                        if (progressIndicator) {
                            progressIndicator.style.width = `${percent}%`;
                        }
                        assetResolve();
                    };
                    img.src = url;
                }
            });
        });

        await Promise.all(loadPromises);
        resolve();
    });
}

// === ГЛАВНОЕ МЕНЮ (НОВОЕ) ===
function showMainMenu() {
    gameContainer.style.display = 'none';
    mainMenu.style.display = 'flex';
    
    // Проверяем наличие сохранения
    if (localStorage.getItem('kamerton_save')) {
        continueGameBtn.style.display = 'block';
    } else {
        continueGameBtn.style.display = 'none';
    }
}

function hideMainMenu() {
    mainMenu.style.display = 'none';
}

// === НАСТРОЙКИ (НОВОЕ) ===
function showSettings() {
    settingsScreen.style.display = 'flex';
    
    // Устанавливаем текущие значения
    document.getElementById('text-speed-slider').value = userSettings.textSpeed;
    document.getElementById('text-speed-value').textContent = userSettings.textSpeed + 'x';
    
    document.getElementById('bgm-volume-slider').value = userSettings.bgmVolume;
    document.getElementById('bgm-volume-value').textContent = Math.round(userSettings.bgmVolume * 100) + '%';
    
    document.getElementById('sfx-volume-slider').value = userSettings.sfxVolume;
    document.getElementById('sfx-volume-value').textContent = Math.round(userSettings.sfxVolume * 100) + '%';
    
    document.getElementById('skip-tutorial-checkbox').checked = userSettings.skipTutorial;
}

function hideSettings() {
    settingsScreen.style.display = 'none';
}

// === ДОСТИЖЕНИЯ (НОВОЕ) ===
function showAchievements() {
    achievementsScreen.style.display = 'flex';
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    
    Object.keys(achievements).forEach(key => {
        const ach = achievements[key];
        const item = document.createElement('div');
        item.className = `achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">${ach.title}</div>
                <div class="achievement-desc">${ach.desc}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

function hideAchievements() {
    achievementsScreen.style.display = 'none';
}

// === ИСТОРИЯ ДИАЛОГОВ (НОВОЕ) ===
function showHistory() {
    historyPanel.style.display = 'flex';
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (dialogHistory.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7;">История пуста</p>';
        return;
    }
    
    dialogHistory.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            ${entry.speaker ? `<div class="history-speaker">${entry.speaker}:</div>` : ''}
            <div>${entry.text}</div>
        `;
        list.appendChild(item);
    });
    
    list.scrollTop = list.scrollHeight;
    unlockAchievement('storyteller');
}

function hideHistory() {
    historyPanel.style.display = 'none';
}

// === МЕНЮ ПАУЗЫ (НОВОЕ) ===
function showPause() {
    pauseMenu.style.display = 'flex';
    backgroundMusic.pause();
}

function hidePause() {
    pauseMenu.style.display = 'none';
    if (currentBGM) {
        backgroundMusic.play().catch(e => console.log('BGM resume error:', e));
    }
}

// === ИГРОВАЯ ЛОГИКА ===
function typeText(text) {
    isTyping = true;
    stopTypingSound();
    storyText.textContent = '';
    document.getElementById('text-box').classList.remove('text-complete');

    return new Promise(resolve => {
        currentTypingResolver = resolve;
        let index = 0;
        const speed = BASE_TYPING_SPEED / userSettings.textSpeed;

        function printChar() {
            if (!isTyping) {
                storyText.textContent = text;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block';
                stopTypingSound();
                skipCount++;
                if (skipCount >= 10) unlockAchievement('speed_reader');
                resolve();
                return;
            }

            if (index < text.length) {
                let char = text.charAt(index);
                storyText.textContent += char;
                
                if (typingSoundPlaybackCounter % TYPING_SOUND_INTERVAL === 0 && char.trim() !== '') {
                    typingSound.currentTime = 0;
                    typingSound.play().catch(e => console.log("Typing sound error:", e));
                }
                typingSoundPlaybackCounter++;
                
                index++;
                setTimeout(printChar, speed);
            } else {
                isTyping = false;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block';
                stopTypingSound();
                resolve();
            }
        }
        printChar();
    });
}

function updateSpriteEmphasis(currentSpeakerName) {
    const sprites = spriteArea.querySelectorAll('.sprite');
    const excludedNames = ['Система', 'РЕШЕНИЕ', 'ИТОГ', 'Твои Мысли', 'Подсказка', 'ВОЗВРАТ'];
    
    if (sprites.length === 0 || !currentSpeakerName || excludedNames.some(name => currentSpeakerName.includes(name))) {
        sprites.forEach(sprite => sprite.classList.remove('dimmed'));
        return;
    }

    sprites.forEach(sprite => {
        const spriteName = sprite.alt;
        if (spriteName === currentSpeakerName) {
            sprite.classList.remove('dimmed');
        } else {
            sprite.classList.add('dimmed');
        }
    });
}

function stopAllSpriteAnimations() {
    const sprites = spriteArea.querySelectorAll('.sprite');
    sprites.forEach(sprite => {
        const intervalId = sprite.dataset.intervalId;
        if (intervalId) {
            clearInterval(parseInt(intervalId));
            delete sprite.dataset.intervalId;
        }
    });
}

function startSpriteAnimation(sprite, baseSrc, frames = DEFAULT_FRAMES) {
    const oldIntervalId = sprite.dataset.intervalId;
    if (oldIntervalId) {
        clearInterval(parseInt(oldIntervalId));
    }

    sprite.dataset.baseSrc = baseSrc;
    sprite.dataset.frames = frames;
    sprite.dataset.currentFrame = 1;
    sprite.src = `${baseSrc}/1.png`;

    const interval = setInterval(() => {
        let frame = parseInt(sprite.dataset.currentFrame) + 1;
        if (frame > frames) frame = 1;
        sprite.dataset.currentFrame = frame;
        sprite.src = `${baseSrc}/${frame}.png`;
    }, ANIMATION_FRAME_DELAY);

    sprite.dataset.intervalId = interval;
}

function updateSceneProgress() {
    const totalGameScenes = 5;
    const match = currentSceneId.match(/scene(\d+)/);
    if (match) {
        const currentNum = parseInt(match[1]);
        sceneProgress.textContent = `Сцена ${currentNum}/${totalGameScenes}`;
    } else {
        sceneProgress.textContent = '';
    }
}

function showScene(sceneId) {
    if (isAdvancing) return;

    if (sceneId === currentSceneId && !gameData[sceneId]?.isHint) {
        renderSceneContent(sceneId);
        return;
    }

    if (sceneId !== currentSceneId) {
        transitionSound.currentTime = 0;
        transitionSound.play().catch(e => console.log("Transition sound error:", e));
    }

    if (transitionOverlay) {
        transitionOverlay.classList.add('active');
        
        setTimeout(() => {
            renderSceneContent(sceneId);
            
            setTimeout(() => {
                transitionOverlay.classList.remove('active');
            }, 50);
        }, 800);
    } else {
        renderSceneContent(sceneId);
    }
}

function renderSceneContent(sceneId) {
    stopAllSpriteAnimations();
    stopTypingSound();
    
    const scene = gameData[sceneId];
    if (!scene) {
        console.error('Сцена не найдена:', sceneId);
        return;
    }

    if (currentSceneId === 'hint' && sceneId !== 'hint') {
        if (gameData['hint']) {
            gameData['hint'].story[0].text = ORIGINAL_HINT_TEXT;
        }
    }

    const isReturningFromHint = currentSceneId === 'hint' && sceneId !== 'hint';
    currentSceneId = sceneId;
    isAwaitingConsequenceClick = false;
    
    updateSceneProgress();

    // BGM логика
    if (scene.bgm && scene.bgm !== currentBGM) {
        currentBGM = scene.bgm;
        backgroundMusic.src = currentBGM;
        backgroundMusic.loop = true;
        
        backgroundMusic.play().catch(e => {
            console.warn("BGM autoplay blocked:", e);
            document.addEventListener('click', () => {
                backgroundMusic.play().catch(err => console.error("BGM retry error:", err));
            }, { once: true });
        });
    } else if (!scene.bgm && currentBGM) {
        backgroundMusic.pause();
        currentBGM = null;
    }
    
    locationText.textContent = scene.location;
    backgroundImage.style.backgroundImage = scene.background || 'none';

    // Отображение спрайтов
    spriteArea.innerHTML = '';
    let spritesToRender = [];

    if (scene.sprites && Array.isArray(scene.sprites)) {
        spritesToRender = scene.sprites;
    } else if (scene.sprite) {
        spritesToRender = [scene.sprite];
    }

    spritesToRender.forEach(spriteData => {
        const spriteDiv = document.createElement('img');
        spriteDiv.alt = spriteData.name;
        spriteDiv.className = `sprite ${spriteData.position}`;
        
        if (spriteData.baseSrc && spriteData.frames > 1) {
            startSpriteAnimation(spriteDiv, spriteData.baseSrc, spriteData.frames);
        } else {
            spriteDiv.src = spriteData.src;
        }
        
        spriteArea.appendChild(spriteDiv);
    });
    
    choicesContainer.innerHTML = '';
    choicesContainer.style.pointerEvents = 'none';
    choicesContainer.style.opacity = '0';
    hintButton.style.display = 'none';
    speakerName.style.display = 'none';
    continuePrompt.style.display = 'none';
    
    const textBox = document.getElementById('text-box');

    if (scene.isEnding) {
        updateSpriteEmphasis(null);
        generateEnding(sceneId);
        speakerName.style.display = 'none';
        textBox.onclick = null;
    } else {
        if (!isReturningFromHint) {
            currentStoryIndex = 0;
            isAwaitingChoice = false;
        }

        if (isReturningFromHint) {
            const choiceStepIndex = scene.story?.findIndex(step => step.action === 'show_choices');
            if (choiceStepIndex !== -1) {
                const step = scene.story[choiceStepIndex];
                updateSpriteEmphasis(null);
                speakerName.textContent = 'РЕШЕНИЕ';
                speakerName.style.display = 'block';
                continuePrompt.style.display = 'none';
                if (step.text.includes('<span')) {
                    storyText.innerHTML = step.text;
                } else {
                    storyText.textContent = step.text;
                }
                document.getElementById('text-box').classList.add('text-complete');
                showChoices(scene);
                textBox.onclick = null;
                currentStoryIndex = choiceStepIndex;
                isAwaitingChoice = true;
                return;
            }
        }

        textBox.onclick = goToNextStoryStep;
        goToNextStoryStep();
    }
}

async function goToNextStoryStep() {
    // Fast-forward
    if (isTyping) {
        isTyping = false;
        if (currentTypingResolver) {
            currentTypingResolver();
        }
        return;
    }

    if (isAdvancing) return;
    isAdvancing = true;

    try {
        const scene = gameData[currentSceneId];
        
        if (isAwaitingConsequenceClick) {
            updateSpriteEmphasis(null);
            let nextSceneId = 'scene' + (totalScenes + 1);
            isAwaitingConsequenceClick = false;
            isAdvancing = false;
            
            if (gameData[nextSceneId]) {
                showScene(nextSceneId);
            } else {
                checkEnding();
            }
            return;
        }

        if (isAwaitingChoice || !scene.story || currentStoryIndex >= scene.story.length) {
            if (currentSceneId === 'hint' && !isAwaitingChoice) {
                const lastStep = scene.story[scene.story.length - 1];
                if (lastStep.action === 'show_choices') {
                    document.getElementById('text-box').onclick = null;
                    speakerName.textContent = 'ВОЗВРАТ';
                    speakerName.style.display = 'block';
                    continuePrompt.style.display = 'none';
                    storyText.textContent = lastStep.text;
                    showChoices(scene);
                    return;
                }
            }
            return;
        }

        const step = scene.story[currentStoryIndex];

        // Сохранение в историю (НОВОЕ)
        if (step.text && step.action !== 'show_choices') {
            dialogHistory.push({
                speaker: step.speaker || '',
                text: step.text
            });
        }

        if (step.action === 'show_choices') {
            updateSpriteEmphasis(null);
            speakerName.textContent = currentSceneId === 'hint' ? 'ВОЗВРАТ' : 'РЕШЕНИЕ';
            speakerName.style.display = 'block';
            continuePrompt.style.display = 'none';

            if (step.text.includes('<span')) {
                storyText.innerHTML = step.text;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block';
                showChoices(scene);
            } else {
                await typeText(step.text);
                showChoices(scene);
            }
            
            document.getElementById('text-box').onclick = null;
            return;
        }

        // Смена спрайта
        if (step.spriteSrc && step.speaker) {
            const targetSprite = spriteArea.querySelector(`.sprite[alt="${step.speaker}"]`);
            if (targetSprite) {
                const oldIntervalId = targetSprite.dataset.intervalId;
                if (oldIntervalId) {
                    clearInterval(parseInt(oldIntervalId));
                    delete targetSprite.dataset.intervalId;
                }
                const newBaseSrc = step.spriteSrc;
                startSpriteAnimation(targetSprite, newBaseSrc, DEFAULT_FRAMES);
            }
        }

        if (step.speaker) {
            speakerName.textContent = step.speaker;
            speakerName.style.display = 'block';
            updateSpriteEmphasis(step.speaker);
        } else {
            speakerName.style.display = 'none';
            updateSpriteEmphasis(null);
        }
        
        if (step.text.includes('<span')) {
            storyText.innerHTML = step.text;
            document.getElementById('text-box').classList.add('text-complete');
            continuePrompt.style.display = 'block';
        } else {
            await typeText(step.text);
        }

        currentStoryIndex++;
    } finally {
        isAdvancing = false;
    }
}

function showChoices(scene) {
    isAwaitingChoice = true;

    choicesContainer.innerHTML = '';
    scene.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.className = 'choice-button';
        
        if (choice.nextScene === 'return') {
            button.onclick = () => handleChoice(currentSceneId, index, false);
        } else if (currentSceneId.startsWith('tutorial') || currentSceneId.startsWith('ending') || currentSceneId === 'welcome_message') {
            button.onclick = () => showScene(choice.nextScene);
        } else {
            button.onclick = () => {
                handleChoice(currentSceneId, index, false);
                unlockAchievement('first_choice');
            };
        }

        choicesContainer.appendChild(button);
    });

    choicesContainer.style.pointerEvents = 'auto';
    choicesContainer.style.opacity = '1';

    if (scene.hint && !scene.isHint && !currentSceneId.startsWith('tutorial') && 
        !currentSceneId.startsWith('ending') && currentSceneId !== 'welcome_message') {
        hintButton.style.display = 'block';
    } else {
        hintButton.style.display = 'none';
    }
}

function handleChoice(sceneId, choiceIndex, isHintRequest = false) {
    if (isHintRequest) {
        const currentScene = gameData[sceneId];
        if (!currentScene.hint) return;

        currentSceneStack.push(sceneId);
        
        if (gameData['hint']) {
            gameData['hint'].story[0].text = currentScene.hint;
        }

        hintUsedCount++;
        if (hintUsedCount >= 3) unlockAchievement('hint_master');

        showScene('hint');
        return;
    }

    const scene = gameData[sceneId];
    const choice = scene.choices[choiceIndex];
    
    isAwaitingChoice = false;
    choicesContainer.style.pointerEvents = 'none';
    choicesContainer.style.opacity = '0';
    hintButton.style.display = 'none';
    continuePrompt.style.display = 'none';
    document.getElementById('text-box').onclick = null;

    if (choice.nextScene === 'return') {
        const previousSceneId = currentSceneStack.pop();
        isAdvancing = false;
        showScene(previousSceneId);
        return;
    }

    if (choice.nextScene) {
        isAdvancing = false;
        showScene(choice.nextScene);
        return;
    }
    
    updateSpriteEmphasis(null);

    totalScenes++;
    let consequenceText = '';

    if (choice.correct === true) {
        correctChoices++;
        consequenceText = `${choice.consequence || ''}`;
    } else if (choice.correct === false) {
        consequenceText = `${choice.consequence || 'Ситуация разрешилась без твоего решающего влияния.'}`;
    }

    consequencesReport.push({
        scene: scene.location,
        choice: choice.text,
        consequence: consequenceText,
        isCorrect: choice.correct
    });

    speakerName.textContent = 'ИТОГ';
    speakerName.style.display = 'block';
    storyText.innerHTML = `${consequenceText.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}`;
    
    isAdvancing = false;
    isAwaitingConsequenceClick = true;
    document.getElementById('text-box').onclick = goToNextStoryStep;
    continuePrompt.style.display = 'block';
}

function checkEnding() {
    if (correctChoices === totalScenes && totalScenes > 0) {
        unlockAchievement('perfect_run');
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

    let mainText = '';
    let reportHTML = '';
    let overallText = '';

    if (sceneId === 'ending_consequences') {
        mainText = scene.text.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>');

        overallText = `
            <div style="margin-top: 20px; padding: 15px; background-color: rgba(10, 104, 54, 0.2); border-left: 4px solid var(--light-green); border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: var(--light-green);">Общий итог</h3>
                <p style="margin: 0;">Ты принял <b>${correctChoices} из ${totalScenes}</b> решений, соответствующих духу смены.</p>
                <p style="margin: 10px 0 0 0;">Жизнь — это игра, в которой ты учишься. Спасибо за твой выбор!</p>
            </div>
        `;

        reportHTML = `
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
        `;

        consequencesReport.forEach((report, index) => {
            const status = report.isCorrect ? '✅ ВЕРНО' : '❌ ОШИБКА';
            const statusColor = report.isCorrect ? 'color: #49a861;' : 'color: #ff4444;';
            const consequenceText = report.consequence.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>');

            reportHTML += `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <td style="padding: 10px; font-weight: bold;">${index + 1}. ${report.scene}</td>
                    <td style="padding: 10px;">"${report.choice}"</td>
                    <td style="padding: 10px; text-align: center; font-weight: bold; ${statusColor}">${status}</td>
                    <td style="padding: 10px;">${consequenceText}</td>
                </tr>
            `;
        });

        reportHTML += `
                    </tbody>
                </table>
            </div>
        `;
    } else if (scene.story) {
        let endingStoryHTML = '';
        scene.story.forEach(step => {
            if (step.speaker) {
                endingStoryHTML += `<p><b>${step.speaker}:</b> ${step.text.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}</p>`;
            } else {
                endingStoryHTML += `<p>${step.text.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}</p>`;
            }
        });
        mainText = endingStoryHTML;
    } else if (scene.text) {
        mainText = scene.text.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>');
    }
    
    storyText.innerHTML = mainText + overallText + reportHTML;
    showChoices(scene);
}

function handleVideoEnding(scene) {
    gameContainer.style.display = 'none';
    endingScreen.style.display = 'flex';
    
    const video = gameEndingVideo;
    const playBtn = document.getElementById('play-video-btn');
    finalMessage.style.display = 'none';
    playBtn.style.display = 'none';
    video.style.display = 'block';
    
    video.src = '1013.mp4';
    video.load();
    video.muted = false;
    video.preload = 'metadata';
    
    const playPromise = video.play();
    playPromise.then(() => {
        console.log('Видео автозапустилось (muted).');
        video.addEventListener('click', () => {
            video.muted = false;
        }, { once: true });
    }).catch(e => {
        console.warn('Автоплей заблокирован. Показываем кнопку play:', e);
        playBtn.style.display = 'block';
        playBtn.onclick = () => {
            video.muted = false;
            video.play().catch(err => {
                console.error('Ошибка ручного play:', err);
                video.style.display = 'none';
                playBtn.style.display = 'none';
                finalMessage.innerHTML = scene.finalText ? scene.finalText.replace(/\*\*/g, '<b>') : 'Ошибка воспроизведения видео. Нажмите, чтобы начать заново.';
                finalMessage.style.display = 'block';
                endingRestartButton.style.display = 'block';
            });
        };
    });

    video.onended = () => {
        backgroundMusic.pause();
        currentBGM = null;
        video.style.display = 'none';
        playBtn.style.display = 'none';
        finalMessage.innerHTML = scene.finalText ? scene.finalText.replace(/\*\*/g, '<b>') : 'Игра завершена. Нажмите кнопку, чтобы начать заново.';
        finalMessage.style.display = 'block';
        endingRestartButton.style.display = 'block';
    };

    video.onerror = () => {
        console.error('Ошибка загрузки видео (кодек/путь?).');
        video.style.display = 'none';
        playBtn.style.display = 'none';
        finalMessage.innerHTML = '<p style="color: #ff4444;">Ошибка загрузки видео (проверьте файл 1013.mp4). Финал:</p>' + (scene.finalText ? scene.finalText.replace(/\*\*/g, '<b>') : '');
        finalMessage.style.display = 'block';
        endingRestartButton.style.display = 'block';
    };
}

// === ИНИЦИАЛИЗАЦИЯ ИГРЫ ===
function initializeGame(continueMode = false) {
    gameContainer.style.display = 'block';
    hideMainMenu();
    
    if (continueMode && loadGame()) {
        showScene(currentSceneId);
    } else {
        // Проверка пропуска туториала
        if (userSettings.skipTutorial) {
            currentSceneId = 'scene1';
        } else {
            currentSceneId = 'welcome_message';
        }
        showScene(currentSceneId);
    }
    
    loadingOverlay.classList.add('fade-out');
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('fade-out');
    }, 500);
}

function resetGame() {
    correctChoices = 0;
    totalScenes = 0;
    consequencesReport = [];
    currentSceneId = 'welcome_message';
    dialogHistory = [];
    currentStoryIndex = 0;
    isAwaitingChoice = false;
    isAwaitingConsequenceClick = false;
    hintUsedCount = 0;
    skipCount = 0;
}

// === ОБРАБОТЧИКИ СОБЫТИЙ ===
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadAchievements();
    updateAudioVolumes();

    // Главное меню
    newGameBtn.onclick = () => {
        resetGame();
        localStorage.removeItem('kamerton_save');
        initializeGame(false);
    };

    continueGameBtn.onclick = () => {
        initializeGame(true);
    };

    settingsBtn.onclick = showSettings;
    achievementsBtn.onclick = showAchievements;

    // Настройки
    document.getElementById('settings-back-btn').onclick = () => {
        hideSettings();
        if (gameContainer.style.display === 'none') {
            showMainMenu();
        }
    };

    document.getElementById('text-speed-slider').oninput = (e) => {
        userSettings.textSpeed = parseFloat(e.target.value);
        document.getElementById('text-speed-value').textContent = userSettings.textSpeed + 'x';
        saveSettings();
    };

    document.getElementById('bgm-volume-slider').oninput = (e) => {
        userSettings.bgmVolume = parseFloat(e.target.value);
        document.getElementById('bgm-volume-value').textContent = Math.round(userSettings.bgmVolume * 100) + '%';
        updateAudioVolumes();
        saveSettings();
    };

    document.getElementById('sfx-volume-slider').oninput = (e) => {
        userSettings.sfxVolume = parseFloat(e.target.value);
        document.getElementById('sfx-volume-value').textContent = Math.round(userSettings.sfxVolume * 100) + '%';
        updateAudioVolumes();
        saveSettings();
    };

    document.getElementById('skip-tutorial-checkbox').onchange = (e) => {
        userSettings.skipTutorial = e.target.checked;
        saveSettings();
    };

    // Достижения
    document.getElementById('achievements-back-btn').onclick = () => {
        hideAchievements();
        showMainMenu();
    };

    // Пауза
    pauseMenuBtn.onclick = showPause;
    document.getElementById('resume-btn').onclick = hidePause;
    document.getElementById('pause-settings-btn').onclick = () => {
        hidePause();
        showSettings();
    };
    document.getElementById('save-game-btn').onclick = () => {
        saveGame();
        hidePause();
    };
    document.getElementById('main-menu-btn').onclick = () => {
        if (confirm('Вернуться в главное меню? Несохраненный прогресс будет утерян.')) {
            hidePause();
            resetGame();
            showMainMenu();
        }
    };

    // История
    historyBtn.onclick = showHistory;
    document.getElementById('history-close-btn').onclick = hideHistory;

    // Подсказка
    hintButton.onclick = () => handleChoice(currentSceneId, null, true);

    // Клавиатура
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            if (pauseMenu.style.display === 'flex' || 
                settingsScreen.style.display === 'flex' || 
                achievementsScreen.style.display === 'flex' ||
                historyPanel.style.display === 'flex' ||
                mainMenu.style.display === 'flex') {
                return;
            }
            e.preventDefault();
            goToNextStoryStep();
        } else if (e.key === 'Escape') {
            if (pauseMenu.style.display === 'flex') {
                hidePause();
            } else if (historyPanel.style.display === 'flex') {
                hideHistory();
            } else if (gameContainer.style.display !== 'none') {
                showPause();
            }
        } else if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
            if (gameContainer.style.display !== 'none' && historyPanel.style.display === 'none') {
                showHistory();
            }
        }
    });

    // Рестарт после концовки
    endingRestartButton.onclick = () => {
        endingScreen.style.display = 'none';
        resetGame();
        showMainMenu();
    };
});

// === ЗАПУСК ИГРЫ ===
window.onload = async () => {
    gameContainer.style.display = 'none';
    mainMenu.style.display = 'none';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.classList.remove('fade-out');

    await preloadAssets();

    loadingText.textContent = 'Контент загружен. Нажмите "НАЧАТЬ ИГРУ".';
    startGameButton.style.display = 'block';
    startGameButton.onclick = () => {
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            showMainMenu();
        }, 500);
    };
};

// CSS анимации (добавить в style.css или через JS)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @keyframes fadeInOut {
        0% { opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);