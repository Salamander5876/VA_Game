// script.js - Главный файл игры "Камертон 2026" v2.0

import { gameData } from './gameData.js';
import { credits } from './credits.js';
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
    sceneProgress: document.getElementById('scene-progress'),
    consequenceModal: document.getElementById('consequence-modal'),
    consequenceTitle: document.getElementById('consequence-title'),
    consequenceText: document.getElementById('consequence-text'),
    consequenceContinueBtn: document.getElementById('consequence-continue-btn')
};

// Константы
const BASE_TYPING_SPEED = 25;
const ORIGINAL_HINT_TEXT = gameData['hint']?.story[0].text || 'Возврат...';

// Состояние печати
let currentTypingResolver = null;
let currentStoryIndex = 0;
let typingSoundCounter = 0;

// === ФУНКЦИИ UI ===
function showDisclaimer() {
    const disclaimerOverlay = document.getElementById('disclaimer-overlay');
    const disclaimerAudio = document.getElementById('disclaimer-audio');
    const acceptBtn = document.getElementById('disclaimer-accept-btn');

    disclaimerOverlay.style.display = 'flex';

    // Проигрываем звук один раз
    disclaimerAudio.volume = userSettings.bgmVolume;
    disclaimerAudio.play().catch(e => console.log('Disclaimer audio blocked:', e));

    // Отслеживаем окончание музыки для достижения
    disclaimerAudio.onended = () => {
        achievements.unlock('prank_time');
    };

    // Обработчик кнопки принятия
    acceptBtn.onclick = () => {
        audio.playMenuClick();
        disclaimerAudio.pause();
        disclaimerAudio.currentTime = 0;

        disclaimerOverlay.style.display = 'none';
        showMainMenu();
    };
}

function showMainMenu() {
    els.gameContainer.style.display = 'none';
    els.mainMenu.style.display = 'flex';
    document.getElementById('continue-game-btn').style.display = gameState.hasSave() ? 'block' : 'none';

    // Останавливаем игровую музыку
    audio.stopBGM();

    // Запускаем музыку главного меню (если есть)
    if (window.menuMusic && window.menuMusic.paused) {
        window.menuMusic.play().catch(e => console.log('Menu music play blocked:', e));
    }
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
    els.sceneProgress.textContent = match ? `Сцена ${match[1]}/9` : '';
}

async function showScene(sceneId) {
    if (gameState.isAdvancing) return;

    const scene = gameData[sceneId];
    if (!scene) return console.error('Сцена не найдена:', sceneId);

    if (sceneId === gameState.currentSceneId && !scene.isHint) {
        return renderSceneContent(sceneId);
    }

    // Убрали lazy loading - все ресурсы уже предзагружены
    if (sceneId !== gameState.currentSceneId) audio.playTransition();

    els.transitionOverlay.classList.add('active');
    setTimeout(() => {
        renderSceneContent(sceneId);
        setTimeout(() => els.transitionOverlay.classList.remove('active'), 200);
    }, 400);
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

    // Разблокировка достижения при входе в сцену
    if (scene.unlockAchievement) {
        achievements.unlock(scene.unlockAchievement);
    }

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

        // Проверяем, нужно ли показывать спрайт сразу или позже
        if (s.showOnDialogue !== undefined && s.showOnDialogue > 0) {
            img.style.display = 'none'; // Скрываем спрайт изначально
        }

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

    if (scene.isAnimationSequence) {
        playAnimationSequence();
        textBox.onclick = null;
    } else if (scene.isReport) {
        showReport(scene);
        textBox.onclick = null;
    } else if (scene.isEnding) {
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
            gameState.setAwaitingConsequence(false);
            gameState.setAdvancing(false);

            // Специальная проверка: если текущая сцена scene9, переходим к scene9_ending
            if (gameState.currentSceneId === 'scene9') {
                showScene('scene9_ending');
            } else {
                const nextId = 'scene' + (gameState.totalScenes + 1);
                gameData[nextId] ? showScene(nextId) : checkEnding();
            }
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

        // Обработка смены фона
        if (step.changeBackground) {
            els.backgroundImage.style.backgroundImage = step.changeBackground;
        }

        // Обработка динамической смены музыки
        if (step.bgm) {
            audio.playBGM(step.bgm);
        }

        // Обработка показа спрайтов на определённом диалоге
        const sprites = scene.sprites || (scene.sprite ? [scene.sprite] : []);
        sprites.forEach(s => {
            // Показ спрайта на определённом диалоге
            if (s.showOnDialogue === currentStoryIndex) {
                const spriteElement = els.spriteArea.querySelector(`.sprite[alt="${s.name}"]`);
                if (spriteElement) {
                    spriteElement.style.display = 'block';
                    spriteElement.style.animation = 'fadeIn 0.5s ease-in';
                }
            }

            // Скрытие спрайта на определённом диалоге
            if (s.hideOnDialogue === currentStoryIndex) {
                const spriteElement = els.spriteArea.querySelector(`.sprite[alt="${s.name}"]`);
                if (spriteElement) {
                    spriteElement.style.animation = 'fadeOut 0.5s ease-out';
                    setTimeout(() => {
                        spriteElement.style.display = 'none';
                    }, 500);
                }
            }

            // Повторное появление спрайта (для второго показа)
            if (s.showOnDialogue2 === currentStoryIndex) {
                const spriteElement = els.spriteArea.querySelector(`.sprite[alt="${s.name}"]`);
                if (spriteElement) {
                    spriteElement.style.display = 'block';
                    spriteElement.style.animation = 'fadeIn 0.5s ease-in';
                }
            }

            // Перемещение спрайта на определённом диалоге
            if (s.moveToLeft === currentStoryIndex) {
                const spriteElement = els.spriteArea.querySelector(`.sprite[alt="${s.name}"]`);
                if (spriteElement) {
                    spriteElement.classList.remove('center');
                    spriteElement.classList.add('left');
                }
            }

            if (s.moveToRight === currentStoryIndex) {
                const spriteElement = els.spriteArea.querySelector(`.sprite[alt="${s.name}"]`);
                if (spriteElement) {
                    spriteElement.classList.remove('center');
                    spriteElement.classList.add('right');
                }
            }
        });

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
                    audio.playMenuClick();
                    handleChoice(gameState.currentSceneId, idx, false);
                }
            };
        } else if (gameState.currentSceneId.startsWith('tutorial') ||
                   gameState.currentSceneId.startsWith('ending') ||
                   gameState.currentSceneId === 'welcome_message') {
            btn.onclick = () => {
                if (!gameState.isAdvancing) {
                    audio.playMenuClick();
                    showScene(choice.nextScene);
                }
            };
        } else {
            btn.onclick = () => {
                if (!gameState.isAdvancing && gameState.isAwaitingChoice) {
                    audio.playMenuClick();
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

    // Показываем модальное окно с последствиями
    showConsequenceModal(consequenceText);

    gameState.setAdvancing(false);
    gameState.setAwaitingConsequence(true);
}

// Функция показа модального окна с последствиями
function showConsequenceModal(consequenceText) {
    els.consequenceTitle.textContent = 'Последствия выбора';

    // Форматируем текст: разбиваем на абзацы по точкам и переносам строк
    let formattedText = consequenceText
        .replace(/\*\*/g, '<b>')
        .replace(/\*\*/g, '</b>')
        .replace(/\n/g, '<br><br>') // Двойные переносы для абзацев
        .split('. ')
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0)
        .map(sentence => {
            // Добавляем точку обратно, если её нет
            if (!sentence.endsWith('.') && !sentence.endsWith('!') && !sentence.endsWith('?') && !sentence.endsWith('<br>')) {
                sentence += '.';
            }
            return `<p style="margin-bottom: 15px; line-height: 1.8;">${sentence}</p>`;
        })
        .join('');

    els.consequenceText.innerHTML = formattedText;
    els.consequenceModal.classList.add('show');

    // Обработчик кнопки "Продолжить"
    const handleContinue = () => {
        audio.playMenuClick();
        els.consequenceModal.classList.remove('show');
        els.consequenceModal.onclick = null; // Убираем обработчик
        goToNextStoryStep();
    };

    els.consequenceContinueBtn.onclick = handleContinue;

    // Закрытие по клику на фон (но не на контент)
    els.consequenceModal.onclick = (e) => {
        if (e.target === els.consequenceModal) {
            handleContinue();
        }
    };
}

function checkEnding() {
    if (gameState.isPerfectRun()) {
        achievements.unlock('perfect_run');
        showScene('ending_secret');
    } else {
        showScene('ending_consequences');
    }
}

async function playAnimationSequence() {
    try {
        // Получаем текстовое поле и header
        const textBox = document.getElementById('text-box');
        const header = document.getElementById('header');

        els.continuePrompt.style.display = 'none';

        // Получаем спрайт Володи (GIF уже загружен из gameData)
        const volodyaSprite = els.spriteArea.querySelector('.sprite[alt="Володя"]');

        // Part 1: GIF анимация проигрывается + part1.opus (7 секунд)
        try {
            audio.playBGM('sound/sceneEnd/part1.opus');
        } catch (e) {
            console.log('Part1 audio error:', e);
        }

        // Показываем первый текст во время part1 (7 секунд)
        els.speakerName.textContent = 'Володя';
        els.speakerName.style.display = 'block';
        els.storyText.textContent = 'Ну что ж, вот мы и подошли к тому моменту, когда пора прощаться...';

        await new Promise(resolve => setTimeout(resolve, 7000));

        // Part 2: GIF продолжает проигрываться + part2.opus (2 секунды)
        try {
            audio.playBGM('sound/sceneEnd/part2.opus');
        } catch (e) {
            console.log('Part2 audio error:', e);
        }

        // Меняем текст во время part2 (2 секунды)
        els.storyText.textContent = 'Спасибо за смену, друг!';

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Part 3: part3.opus (без анимации)
        // Черный экран с надписью "КОНЕЦ" появляются СРАЗУ
        try {
            audio.playBGM('sound/sceneEnd/part3.opus');
        } catch (e) {
            console.log('Part3 audio error:', e);
        }

        // Скрываем спрайт
        if (volodyaSprite) {
            volodyaSprite.style.display = 'none';
        }

        // Очищаем область спрайтов
        els.spriteArea.innerHTML = '';

        // Очищаем текст перед скрытием
        els.storyText.textContent = '';
        els.speakerName.style.display = 'none';

        // Черный фон на весь экран
        els.backgroundImage.style.backgroundImage = 'none';
        els.backgroundImage.style.backgroundColor = '#000';
        els.backgroundImage.style.height = '100vh';
        els.backgroundImage.style.width = '100vw';
        els.backgroundImage.style.position = 'fixed';
        els.backgroundImage.style.top = '0';
        els.backgroundImage.style.left = '0';
        els.backgroundImage.style.zIndex = '1';

        // СКРЫВАЕМ текстовое поле добавлением класса
        if (textBox) {
            textBox.classList.add('hidden');
        }

        // СКРЫВАЕМ header
        if (header) {
            header.style.display = 'none';
        }

        // Создаем элемент для надписи "КОНЕЦ" по центру экрана
        const endingTitle = document.createElement('div');
        endingTitle.id = 'ending-title';
        endingTitle.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4rem;
            color: white;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
        `;
        endingTitle.textContent = 'КОНЕЦ';
        document.body.appendChild(endingTitle);

        // Ждем 3 секунды
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Убираем надпись "КОНЕЦ"
        if (endingTitle && endingTitle.parentNode) {
            endingTitle.remove();
        }

        // Показываем титры
        await showCredits();

        // После титров автоматически переходим к концовке
        // Возвращаем фон к исходному состоянию
        els.backgroundImage.style.backgroundColor = '';
        els.backgroundImage.style.height = '';
        els.backgroundImage.style.width = '';
        els.backgroundImage.style.position = '';
        els.backgroundImage.style.top = '';
        els.backgroundImage.style.left = '';
        els.backgroundImage.style.zIndex = '';

        // Показываем текстовое поле обратно
        if (textBox) {
            textBox.classList.remove('hidden');
        }

        // Показываем header обратно
        if (header) {
            header.style.display = '';
        }

        // Автоматический переход к концовке
        checkEnding();
    } catch (error) {
        console.error('Animation sequence error:', error);
        // В случае ошибки показываем кнопку для продолжения
        els.choicesContainer.innerHTML = '';
        const continueBtn = document.createElement('button');
        continueBtn.textContent = 'Продолжить';
        continueBtn.className = 'choice-button';
        continueBtn.onclick = () => {
            audio.playMenuClick();
            // Возвращаем фон к исходному состоянию
            els.backgroundImage.style.backgroundColor = '';
            els.backgroundImage.style.height = '';
            els.backgroundImage.style.width = '';
            els.backgroundImage.style.position = '';
            els.backgroundImage.style.top = '';
            els.backgroundImage.style.left = '';
            els.backgroundImage.style.zIndex = '';
            // Показываем текстовое поле обратно
            const textBox = document.getElementById('text-box');
            if (textBox) {
                textBox.classList.remove('hidden');
            }
            // Показываем header обратно
            const header = document.getElementById('header');
            if (header) {
                header.style.display = '';
            }
            checkEnding();
        };
        els.choicesContainer.appendChild(continueBtn);
        els.choicesContainer.style.pointerEvents = 'auto';
        els.choicesContainer.style.opacity = '1';
    }
}

function showReport(scene) {
    // Скрываем игровой интерфейс
    document.getElementById('header').style.display = 'none';
    document.getElementById('text-box').style.display = 'none';
    document.getElementById('sprite-area').style.display = 'none';
    document.getElementById('background-image').style.display = 'none';

    // Создаем экран отчета
    const reportScreen = document.createElement('div');
    reportScreen.id = 'report-screen';

    const reportContent = document.createElement('div');
    reportContent.id = 'report-content';

    // Заголовок
    const title = document.createElement('h1');
    title.id = 'report-title';
    title.textContent = scene.location;
    reportContent.appendChild(title);

    // Вступительный текст (если есть)
    if (scene.text) {
        const introText = document.createElement('div');
        introText.id = 'report-text';
        introText.innerHTML = scene.text;
        reportContent.appendChild(introText);
    }

    // Специальная обработка для ending_consequences - показываем таблицу с последствиями
    if (gameState.currentSceneId === 'ending_consequences') {
        const progress = gameState.getProgress();
        const consequences = gameState.getConsequences();

        // Общий итог
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = 'margin-top: 20px; padding: 15px; background-color: rgba(10, 104, 54, 0.2); border-left: 4px solid var(--light-green); border-radius: 4px;';
        summaryDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: var(--light-green);">Общий итог</h3>
            <p style="margin: 10px 0 0 0; text-align: center;">Жизнь — это игра, в которой ты учишься. Спасибо за твой выбор!</p>
        `;
        reportContent.appendChild(summaryDiv);

        // Детальный отчет
        const reportHeader = document.createElement('h3');
        reportHeader.style.cssText = 'margin: 30px 0 20px 0; color: var(--accent-warm); text-align: center;';
        reportHeader.textContent = 'Детальный отчет';
        reportContent.appendChild(reportHeader);

        // Каждая ситуация как отдельная карточка
        const consequencesContainer = document.createElement('div');
        consequencesContainer.className = 'consequences-container';

        consequences.forEach((r, i) => {
            const card = document.createElement('div');
            card.className = 'consequence-card';
            card.innerHTML = `
                <div class="consequence-field">
                    <span class="consequence-label">Ситуация</span>
                    <div class="consequence-value situation">${i + 1}. ${r.scene}</div>
                </div>
                <div class="consequence-field">
                    <span class="consequence-label">Выбор</span>
                    <div class="consequence-value choice">"${r.choice}"</div>
                </div>
                <div class="consequence-field">
                    <span class="consequence-label">Последствие</span>
                    <div class="consequence-value result">${r.consequence.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}</div>
                </div>
            `;
            consequencesContainer.appendChild(card);
        });

        reportContent.appendChild(consequencesContainer);
    }
    // История (если есть)
    else if (scene.story && scene.story.length > 0) {
        scene.story.forEach(step => {
            const section = document.createElement('div');
            section.className = 'report-section';

            if (step.speaker && step.speaker !== 'Рассказчик') {
                const speaker = document.createElement('div');
                speaker.className = 'report-speaker';
                speaker.textContent = step.speaker;
                section.appendChild(speaker);
            }

            if (step.text) {
                const text = document.createElement('div');
                text.className = 'report-story-text';
                // Обрабатываем переносы строк для final_share
                const formattedText = step.text.replace(/\n/g, '<br><br>');
                text.innerHTML = formattedText;
                section.appendChild(text);
            }

            reportContent.appendChild(section);
        });
    }

    reportScreen.appendChild(reportContent);

    // Кнопка "Продолжить"
    if (scene.choices && scene.choices.length > 0) {
        const continueBtn = document.createElement('button');
        continueBtn.id = 'report-continue-btn';
        continueBtn.className = 'choice-button';
        continueBtn.textContent = scene.choices[0].text;

        // Для final_share делаем кнопку особенной
        if (gameState.currentSceneId === 'final_share') {
            continueBtn.classList.add('final-video-btn');
        }

        continueBtn.onclick = () => {
            audio.playMenuClick();
            reportScreen.remove();
            // Показываем игровой интерфейс обратно
            document.getElementById('header').style.display = '';
            document.getElementById('text-box').style.display = '';
            document.getElementById('sprite-area').style.display = '';
            document.getElementById('background-image').style.display = '';

            if (scene.choices[0].nextScene) {
                showScene(scene.choices[0].nextScene);
            }
        };
        reportScreen.appendChild(continueBtn);
    }

    document.body.appendChild(reportScreen);

    // Прокручиваем наверх
    reportScreen.scrollTop = 0;
}

async function showCredits() {
    // Создаем контейнер для титров
    const creditsContainer = document.createElement('div');
    creditsContainer.id = 'credits-container';
    creditsContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        z-index: 999;
    `;
    document.body.appendChild(creditsContainer);

    // Разбиваем титры на группы по 8
    const creditsPerPage = 8;
    const pages = [];
    for (let i = 0; i < credits.length; i += creditsPerPage) {
        pages.push(credits.slice(i, i + creditsPerPage));
    }

    // Показываем каждую страницу титров
    for (const page of pages) {
        // Очищаем контейнер
        creditsContainer.innerHTML = '';

        // Добавляем титры на страницу
        for (const credit of page) {
            const creditItem = document.createElement('div');
            creditItem.style.cssText = `
                text-align: center;
                margin-bottom: 1.5rem;
                opacity: 0;
                transition: opacity 0.8s ease-in;
            `;

            const roleEl = document.createElement('div');
            roleEl.style.cssText = `
                font-size: 1.2rem;
                color: #aaa;
                margin-bottom: 0.5rem;
            `;
            roleEl.textContent = credit.role;

            const nameEl = document.createElement('div');
            nameEl.style.cssText = `
                font-size: 1.8rem;
                color: white;
                font-weight: bold;
            `;
            nameEl.textContent = credit.name;

            creditItem.appendChild(roleEl);
            creditItem.appendChild(nameEl);
            creditsContainer.appendChild(creditItem);
        }

        // Плавное появление всех титров на странице
        await new Promise(resolve => setTimeout(resolve, 200));
        const items = creditsContainer.querySelectorAll('div');
        items.forEach(item => item.style.opacity = '1');

        // Держим страницу на экране: 2 секунды × количество людей
        const displayTime = page.length * 1400; // 1.4 секунды на каждого человека
        await new Promise(resolve => setTimeout(resolve, displayTime));

        // Плавное исчезновение
        items.forEach(item => item.style.opacity = '0');
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Убираем контейнер титров
    creditsContainer.remove();
}

function generateEnding(sceneId) {
    const scene = gameData[sceneId];

    if (scene.isFinalVideo) {
        handleVideoEnding(scene);
        return;
    }

    // Для концовок с отчётами используем специальный экран
    if (sceneId === 'ending_consequences' || sceneId === 'ending_secret' || sceneId === 'final_share') {
        showReport(scene);
        achievements.unlock('completionist');
        return;
    }

    // Для других концовок показываем обычный текст
    let html = '';
    if (scene.story) {
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
    // ВАЖНО: Выключаем музыку ПЕРЕД показом видео экрана
    audio.stopBGM();

    els.gameContainer.style.display = 'none';
    els.endingScreen.style.display = 'flex';

    const video = document.getElementById('game-ending-video');
    const finalMsg = document.getElementById('final-message');
    const restartBtn = document.getElementById('ending-restart-button');

    finalMsg.style.display = 'none';
    restartBtn.style.display = 'none';
    video.style.display = 'block';

    // Устанавливаем локальное видео с автозапуском
    video.src = 'final.mp4';
    video.play();

    // Показываем кнопку возврата в меню через 1 минуту
    setTimeout(() => {
        restartBtn.style.display = 'block';
    }, 60000); // 1 минута = 60000 мс
}

function initializeGame(continueMode = false) {
    els.gameContainer.style.display = 'block';
    els.mainMenu.style.display = 'none';

    // Останавливаем музыку главного меню
    if (window.menuMusic && !window.menuMusic.paused) {
        window.menuMusic.pause();
        window.menuMusic.currentTime = 0;
    }

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
        audio.playMenuClick();
        gameState.reset();
        storage.removeItem('save');
        initializeGame(false);
    };

    document.getElementById('continue-game-btn').onclick = () => {
        audio.playMenuClick();
        initializeGame(true);
    };

    document.getElementById('settings-btn').onclick = () => {
        audio.playMenuClick();
        showSettings();
    };

    document.getElementById('achievements-btn').onclick = () => {
        audio.playMenuClick();
        showAchievements();
    };

    document.getElementById('settings-back-btn').onclick = () => {
        audio.playMenuClick();
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
        audio.playMenuClick();
        els.achievementsScreen.style.display = 'none';
        showMainMenu();
    };

    document.getElementById('pause-menu-btn').onclick = () => {
        audio.playMenuClick();
        els.pauseMenu.style.display = 'flex';
        audio.pauseBGM();
    };

    document.getElementById('resume-btn').onclick = () => {
        audio.playMenuClick();
        els.pauseMenu.style.display = 'none';
        audio.resumeBGM();
    };

    document.getElementById('pause-settings-btn').onclick = () => {
        audio.playMenuClick();
        els.pauseMenu.style.display = 'none';
        showSettings();
    };

    document.getElementById('save-game-btn').onclick = () => {
        audio.playMenuClick();
        gameState.save();
        els.pauseMenu.style.display = 'none';
    };

    document.getElementById('main-menu-btn').onclick = () => {
        if (confirm('Вернуться в главное меню? Несохраненный прогресс будет утерян.')) {
            audio.playMenuClick();
            els.pauseMenu.style.display = 'none';
            gameState.reset();
            showMainMenu();
        }
    };

    document.getElementById('history-btn').onclick = () => {
        audio.playMenuClick();
        showHistory();
    };

    document.getElementById('history-close-btn').onclick = () => {
        audio.playMenuClick();
        els.historyPanel.style.display = 'none';
    };

    els.hintButton.onclick = () => {
        if (!gameState.isAdvancing && gameState.isAwaitingChoice) {
            audio.playMenuClick();
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
        audio.playMenuClick();
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

        els.loadingText.textContent = 'Загрузка завершена!';
        els.progressIndicator.style.width = '100%';

        // Показываем кнопку "Перейти к игре"
        const startButton = document.getElementById('start-game-button');
        startButton.style.display = 'block';

        // При клике на кнопку - показываем дисклеймер
        startButton.onclick = () => {
            audio.playMenuClick();

            els.loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                els.loadingOverlay.style.display = 'none';
                showDisclaimer();
            }, 500);
        };
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        els.loadingText.textContent = 'Ошибка загрузки. Обновите страницу.';
    }
};

window.showNotification = Utils.showNotification;
console.log('🎮 Камертон 2026 v2.0');

// === ПУЛЬСАЦИЯ ФОНА И МУЗЫКА ДЛЯ ГЛАВНОГО МЕНЮ ===
// Делаем переменные глобальными для доступа из любого места
window.menuMusic = null;
window.audioContext = null;
window.analyser = null;
window.dataArray = null;
window.pulseAnimationId = null;

// Переменные для сглаживания (новые)
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedHue = 180; // Начальный оттенок
// УВЕЛИЧЕННЫЙ коэффициент сглаживания для замедления всех изменений
const smoothingFactor = 0.95; 

function initMenuMusicAndPulse() {
    const canvas = document.getElementById('equalizer-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Устанавливаем размер canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Создаем аудио элемент
    window.menuMusic = new Audio('sound/BGmusic.opus');
    window.menuMusic.loop = true;
    window.menuMusic.volume = userSettings.bgmVolume * 0.5; // Тише чем обычная музыка

    // Функция для запуска музыки и визуализации
    function startMusicAndVisualizer() {
        if (!window.audioContext) {
            // Создаем AudioContext
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.analyser = window.audioContext.createAnalyser();
            const source = window.audioContext.createMediaElementSource(window.menuMusic);
            source.connect(window.analyser);
            window.analyser.connect(window.audioContext.destination);

            window.analyser.fftSize = 512; // Больше для лучшего анализа басов
            const bufferLength = window.analyser.frequencyBinCount;
            window.dataArray = new Uint8Array(bufferLength);
        }

        window.menuMusic.play().catch(e => console.log('Menu music autoplay blocked:', e));
        animatePulse();
    }

    // Переменные для плавной анимации
    let time = 0;
    let colorHue = 180; 

    // Анимация пульсации фона (как в Яндекс.Музыке)
    function animatePulse() {
        if (els.mainMenu.style.display === 'none') {
            return; // Останавливаем анимацию если меню скрыто
        }

        window.pulseAnimationId = requestAnimationFrame(animatePulse);
        time += 0.016; // Примерно 60 FPS

        if (!window.analyser || !window.dataArray) {
            // Если музыка еще не запущена, показываем базовую анимацию
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#0a1a23'); // Очень темный сине-голубой
            gradient.addColorStop(0.5, '#134045'); // Темный циан/бирюзовый
            gradient.addColorStop(1, '#0e0e1a'); // Очень темный синий (почти черный)
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        window.analyser.getByteFrequencyData(window.dataArray);

        // Вычисляем средний уровень басов (низкие частоты)
        let bassSum = 0;
        const bassRange = 30;
        for (let i = 0; i < bassRange; i++) {
            bassSum += window.dataArray[i];
        }
        const bassAverage = bassSum / bassRange / 255;

        // Вычисляем средний уровень средних частот
        let midSum = 0;
        const midStart = 30;
        const midEnd = 80;
        for (let i = midStart; i < midEnd; i++) {
            midSum += window.dataArray[i];
        }
        const midAverage = midSum / (midEnd - midStart) / 255;
        
        // ===================================
        // === ПЛАВНОСТЬ (СГЛАЖИВАНИЕ LPF) ===
        // ===================================
        const factor = 1 - smoothingFactor;
        
        // Сглаживание басов
        smoothedBass = smoothedBass * smoothingFactor + bassAverage * factor;

        // Сглаживание средних частот
        smoothedMid = smoothedMid * smoothingFactor + midAverage * factor;

        // Плавно меняем оттенок цвета под музыку
        // Уменьшаем влияние басов (множитель 0.5 -> 0.2) для более медленной смены цвета
        colorHue += (smoothedBass * 2 - 1) * 0.2; 
        // Ограничиваем оттенок диапазоном от темно-зеленого (140) до глубокого синего (200)
        if (colorHue > 200) colorHue = 140; 
        if (colorHue < 140) colorHue = 200;

        // Сглаживание изменения оттенка
        smoothedHue = smoothedHue * smoothingFactor + colorHue * factor;
        // ===================================

        // Создаем динамический градиент с плавными переливами
        const gradient = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2 + Math.sin(time * 0.5) * 100,
            canvas.height / 2 + Math.cos(time * 0.5) * 100,
            // Используем сглаженные басы для размера пульсации
            canvas.width * (0.7 + smoothedBass * 0.3) 
        );

        // Цвета плавно пульсируют
        // Используем сглаженные значения для насыщенности и яркости
        const saturation = 40 + smoothedMid * 30; // 40-70%
        const lightness1 = 10 + smoothedBass * 15; // 10-25%
        const lightness2 = 18 + smoothedMid * 15; // 18-33%
        const lightness3 = 8 + smoothedBass * 10; // 8-18%

        // Используем сглаженный оттенок (smoothedHue)
        gradient.addColorStop(0, `hsl(${smoothedHue}, ${saturation}%, ${lightness1}%)`);
        gradient.addColorStop(0.4, `hsl(${smoothedHue + 15}, ${saturation - 10}%, ${lightness2}%)`);
        gradient.addColorStop(0.7, `hsl(${smoothedHue - 15}, ${saturation - 20}%, ${lightness3}%)`);
        gradient.addColorStop(1, 'hsl(210, 20%, 5%)'); 

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Добавляем тонкие световые волны
        const numWaves = 3;
        for (let i = 0; i < numWaves; i++) {
            const waveGradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, 
                // Используем сглаженные басы для размера волн
                canvas.width * (0.3 + i * 0.2 + smoothedBass * 0.3)
            );
            // Используем сглаженный оттенок
            waveGradient.addColorStop(0, `hsla(${smoothedHue}, 60%, 40%, 0)`);
            waveGradient.addColorStop(0.5, `hsla(${smoothedHue}, 60%, 40%, ${0.05 + smoothedBass * 0.1})`);
            waveGradient.addColorStop(1, `hsla(${smoothedHue}, 60%, 40%, 0)`);

            ctx.fillStyle = waveGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Добавляем мягкие звезды
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 50; i++) {
            const sx = (Math.sin(time * 0.2 + i) * 0.5 + 0.5) * canvas.width;
            const sy = (Math.cos(time * 0.3 + i * 2) * 0.5 + 0.5) * canvas.height;
            // Используем сглаженные средние частоты для размера звезд
            const size = 1 + Math.random() * 1.5 * (1 + smoothedMid * 0.5); 

            // Используем сглаженные средние частоты для мерцания
            ctx.globalAlpha = 0.3 + Math.random() * 0.4 * (1 + smoothedMid); 
            ctx.fillRect(sx, sy, size, size);
        }
        ctx.globalAlpha = 1;
    }
   

// initMenuMusicAndPulse(); // Добавьте вызов этой функции в соответствующем месте вашего кода

    // Автоматический запуск при показе меню
    const observer = new MutationObserver(() => {
        if (els.mainMenu.style.display !== 'none') {
            resizeCanvas();

            // ВСЕГДА запускаем анимацию сразу
            if (!window.pulseAnimationId) {
                animatePulse();
            }

            // Пытаемся запустить музыку
            if (!window.audioContext) {
                // Первый раз - создаем контекст и пытаемся запустить
                try {
                    startMusicAndVisualizer();
                } catch (e) {
                    console.log('Waiting for user interaction to start music');
                    // Запустим при любом взаимодействии
                    const startOnInteraction = () => {
                        startMusicAndVisualizer();
                        document.removeEventListener('click', startOnInteraction);
                        document.removeEventListener('keydown', startOnInteraction);
                    };
                    document.addEventListener('click', startOnInteraction, { once: true });
                    document.addEventListener('keydown', startOnInteraction, { once: true });
                }
            } else {
                // Контекст уже есть, просто запускаем музыку
                if (window.menuMusic.paused) {
                    window.menuMusic.play().catch(() => {
                        console.log('Music play blocked, waiting for interaction');
                    });
                }
            }
        } else {
            // Останавливаем музыку когда меню скрывается
            if (window.menuMusic && !window.menuMusic.paused) {
                window.menuMusic.pause();
                window.menuMusic.currentTime = 0;
            }
            if (window.pulseAnimationId) {
                cancelAnimationFrame(window.pulseAnimationId);
                window.pulseAnimationId = null;
            }
        }
    });

    observer.observe(els.mainMenu, { attributes: true, attributeFilter: ['style'] });

    // Пытаемся запустить музыку сразу при загрузке страницы (если меню показано)
    if (els.mainMenu.style.display !== 'none') {
        setTimeout(() => {
            try {
                startMusicAndVisualizer();
            } catch (e) {
                console.log('Initial autoplay blocked');
            }
        }, 100);
    }

    // Добавляем глобальный обработчик для первого взаимодействия в меню
    // Теперь музыка запускается автоматически при открытии меню (после клика на "Перейти к игре")
    const startMenuMusicOnFirstInteraction = () => {
        if (els.mainMenu.style.display !== 'none' && window.menuMusic && window.menuMusic.paused) {
            startMusicAndVisualizer();
        }
        document.removeEventListener('click', startMenuMusicOnFirstInteraction);
        document.removeEventListener('keydown', startMenuMusicOnFirstInteraction);
    };
    document.addEventListener('click', startMenuMusicOnFirstInteraction);
    document.addEventListener('keydown', startMenuMusicOnFirstInteraction);
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', initMenuMusicAndPulse);
