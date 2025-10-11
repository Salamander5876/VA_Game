// script.js - Полный код игровой логики для Визуальной Новеллы "Камертон 2026"

// --- 0. ИМПОРТ ДАННЫХ ИГРЫ ---
import { gameData } from './gameData.js';


// --- 1. КОНСТАНТЫ И ЭЛЕМЕНТЫ DOM ---
const storyText = document.getElementById('story-text');
const choicesContainer = document.getElementById('choices-container');
const locationText = document.getElementById('location');
const backgroundImage = document.getElementById('background-image');
const spriteArea = document.getElementById('sprite-area');
const hintButton = document.getElementById('hint-button'); 
const speakerName = document.getElementById('speaker-name');
const continuePrompt = document.getElementById('continue-prompt'); 
const transitionOverlay = document.getElementById('transition-overlay'); 

// ЭЛЕМЕНТЫ ЗАГРУЗКИ (НОВЫЕ)
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const startGameButton = document.getElementById('start-game-button');
const gameContainer = document.getElementById('game-container');
const progressIndicator = document.getElementById('progress-indicator'); // Для отображения прогресса

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
const TYPING_SPEED = 25; // Скорость печати (мс на букву)
const ANIMATION_FRAME_DELAY = 200; // Задержка между кадрами анимации (мс)
const DEFAULT_FRAMES = 6; // Количество кадров по умолчанию для анимированных спрайтов и фонов
let isTyping = false; 
let currentTypingResolver = null; 

let currentSceneId = 'welcome_message'; // Начинаем со сцены загрузки
let currentSceneStack = []; 
let correctChoices = 0;
let totalScenes = 0;
let consequencesReport = [];
let currentStoryIndex = 0; 
let isAwaitingChoice = false;
let isAwaitingConsequenceClick = false; 

// Запоминаем оригинальный первый текст Володи для сцены 'hint', чтобы его можно было восстанавливать
const ORIGINAL_HINT_TEXT = gameData['hint'] ? gameData['hint'].story[0].text : 'Возврат...';


// --- НОВЫЕ АУДИО-КОНСТАНТЫ И ЭЛЕМЕНТЫ ---
const typingSound = new Audio('sound/typing.mp3'); 
typingSound.volume = 0.3; // Регулировка громкости звука печати

const transitionSound = new Audio('sound/переход.mp3');
transitionSound.volume = 0.5; // Регулировка громкости звука перехода

// НОВЫЕ ЭЛЕМЕНТЫ ДЛЯ ФОНОВОЙ МУЗЫКИ (BGM)
const backgroundMusic = new Audio();
backgroundMusic.volume = 0.4; // Громкость BGM
let currentBGM = null; // Отслеживание текущей BGM

// Флаг для контроля частоты проигрывания звука печати
let typingSoundPlaybackCounter = 0;
const TYPING_SOUND_INTERVAL = 1; // Проигрывать звук на каждую 2-ю букву

/**
 * Инициализирует аудио-элементы, чтобы они были готовы к проигрыванию.
 */
function initializeAudio() {
    // Предварительная загрузка для ускорения
    typingSound.preload = 'auto';
    transitionSound.preload = 'auto';
    backgroundMusic.preload = 'auto'; // Добавлено для BGM
    
    // Подготовка звука печати (для быстрого сброса и проигрывания)
    typingSound.load(); 
    transitionSound.load(); 
    // BGM будет загружаться в preloadAssets
}

/**
 * Останавливает и сбрасывает звук печати.
 */
function stopTypingSound() {
    typingSound.pause();
    typingSound.currentTime = 0;
}
// --- КОНЕЦ НОВЫХ АУДИО-КОНСТАНТ И ЭЛЕМЕНТОВ ---


// --- ПОЛИФИЛ ДЛЯ ОДНОКРАТНОГО СЛУШАТЕЛЯ НА DOCUMENT ---
/**
 * Вспомогательная функция для добавления обработчика, который удаляется после первого вызова.
 */
document.once = function(event, callback) {
    const listener = function() {
        callback();
        document.removeEventListener(event, listener);
    };
    document.addEventListener(event, listener);
};
// --- КОНЕЦ ПОЛИФИЛА ---


// --- 2. ЛОГИКА ЗАГРУЗКИ КОНТЕНТА ---

/**
 * Ищет все изображения и музыку в gameData и загружает их.
 */
function preloadAssets() {
    return new Promise(async (resolve) => {
        const assetsToLoad = new Set();
        // Добавляем звуковые файлы к загрузке, чтобы отобразить полный прогресс
        assetsToLoad.add(typingSound.src.split('/').pop()); // Просто для счетчика
        assetsToLoad.add(transitionSound.src.split('/').pop()); // Просто для счетчика

        for (const key in gameData) {
            const scene = gameData[key];
            
            // 0. Собираем BGM (НОВОЕ)
            if (scene.bgm) { 
                assetsToLoad.add(scene.bgm);
            }
            
            // 1. Собираем все фоны
            if (scene.background && scene.background.startsWith('url(')) {
                const url = scene.background.slice(4, -1).replace(/['"]/g, '');
                assetsToLoad.add(url);
            }
            // 2, 3, 4. Собираем все спрайты (существующая логика)
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

        // Удаляем фиктивные имена (например, звуки, которые не URL), чтобы загружать только реальные URL
        const realAssetsToLoad = Array.from(assetsToLoad).filter(url => url.includes('/') || url.endsWith('.mp3')); 
        const total = realAssetsToLoad.length;
        let loadedCount = 0;

        loadingText.textContent = `Загрузка: 0 из ${total} файлов... (0%)`;
        
        initializeAudio(); 
        
        const loadPromises = realAssetsToLoad.map(url => {
            return new Promise(assetResolve => {
                // Определяем, это изображение или аудио
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

        // Ждем загрузки всех файлов
        await Promise.all(loadPromises);

        resolve();
    });
}

/**
 * Инициализирует игру после завершения загрузки и запускает анимацию исчезновения.
 */
function initializeGame() {
    // 1. Показываем контейнер игры
    gameContainer.style.display = 'block';

    // 2. Запускаем первую сцену ('welcome_message'). 
    showScene('welcome_message'); 
    
    // 3. Запускаем анимацию плавного исчезновения оверлея
    loadingOverlay.classList.add('fade-out');
    
    // 4. Полностью скрываем элемент оверлея после завершения анимации (0.5с)
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('fade-out'); // Для сброса, если потребуется перезапуск
    }, 500); 
}

// --- 3. ОСНОВНЫЕ ИГРОВЫЕ ФУНКЦИИ ---

/**
 * Плавно отображает текст с эффектом печати.
 */
function typeText(text) {
    isTyping = true;
    stopTypingSound(); // Сбрасываем звук, если он был активен
    storyText.textContent = '';
    document.getElementById('text-box').classList.remove('text-complete'); 

    return new Promise(resolve => {
        currentTypingResolver = resolve;
        let index = 0;

        function printChar() {
            if (!isTyping) { 
                // Прерывание печати (Fast-Forward)
                storyText.textContent = text;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block';
                stopTypingSound(); // Останавливаем звук при прерывании
                resolve(); 
                return;
            }

            if (index < text.length) {
                let char = text.charAt(index);
                storyText.textContent += char;
                
                // ЛОГИКА ЗВУКА ПЕЧАТИ
                if (typingSoundPlaybackCounter % TYPING_SOUND_INTERVAL === 0 && char.trim() !== '') {
                    // Проигрываем звук только если символ не пробел и на каждой N-ой итерации
                    typingSound.currentTime = 0; // Сбрасываем для мгновенного проигрывания
                    typingSound.play().catch(e => console.log("Ошибка проигрывания звука печати:", e));
                }
                typingSoundPlaybackCounter++;
                // КОНЕЦ ЛОГИКИ ЗВУКА ПЕЧАТИ
                
                index++;
                setTimeout(printChar, TYPING_SPEED);
            } else {
                isTyping = false;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block'; 
                stopTypingSound(); // Останавливаем звук по завершении
                resolve();
            }
        }
        printChar();
    });
}


/**
 * Обновляет класс 'dimmed' у спрайтов.
 */
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
        } 
        else {
            sprite.classList.add('dimmed');
        }
    });
}

/**
 * Останавливает все анимации спрайтов перед сменой сцены.
 */
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

/**
 * Запускает анимацию для указанного спрайта.
 */
function startSpriteAnimation(sprite, baseSrc, frames = DEFAULT_FRAMES) {
    // Останавливаем предыдущую анимацию
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

/**
 * Переключает сцену с эффектом перехода.
 */
function showScene(sceneId) {
    if (sceneId === currentSceneId && !gameData[sceneId].isHint) {
        renderSceneContent(sceneId);
        return;
    }

    // ЛОГИКА ЗВУКА ПЕРЕХОДА: Проигрываем звук только при реальной смене сцены
    if (sceneId !== currentSceneId) {
        transitionSound.currentTime = 0; // Сбрасываем для мгновенного проигрывания
        transitionSound.play().catch(e => console.log("Ошибка проигрывания звука перехода:", e));
    }
    // КОНЕЦ ЛОГИКИ ЗВУКА ПЕРЕХОДА

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


/**
 * Рендерит всю информацию сцены (фон, спрайты, начальный текст, BGM).
 */
function renderSceneContent(sceneId) {
    // Останавливаем все предыдущие анимации спрайтов
    stopAllSpriteAnimations();
    stopTypingSound(); // Остановка звука печати при смене контента
    
    const scene = gameData[sceneId];
    if (!scene) {
        console.error('Сцена не найдена:', sceneId);
        return;
    }

    // --- ЛОГИКА ВОССТАНОВЛЕНИЯ HINT-ТЕКСТА ---
    if (currentSceneId === 'hint' && sceneId !== 'hint') {
        if (gameData['hint']) {
            gameData['hint'].story[0].text = ORIGINAL_HINT_TEXT;
        }
    }
    // --- КОНЕЦ ЛОГИКИ ---

    const isReturningFromHint = currentSceneId === 'hint' && sceneId !== 'hint';
    currentSceneId = sceneId;
    
    isAwaitingConsequenceClick = false; 

    // --- ЛОГИКА СМЕНЫ BGM (НОВОЕ) ---
    if (scene.bgm && scene.bgm !== currentBGM) {
        currentBGM = scene.bgm;
        backgroundMusic.src = currentBGM;
        backgroundMusic.loop = true; // Зацикливание музыки
        
        backgroundMusic.play().catch(e => {
            console.warn("Автозапуск BGM заблокирован. Музыка начнется после первого взаимодействия с пользователем.", e);
            // Если автозапуск заблокирован, добавляем слушатель на первый клик/нажатие клавиши
            document.once('click', () => {
                backgroundMusic.play().catch(err => console.error("Ошибка повторного запуска BGM:", err));
            });
            document.once('keydown', () => {
                backgroundMusic.play().catch(err => console.error("Ошибка повторного запуска BGM:", err));
            });
        });

    } else if (!scene.bgm && currentBGM) {
        backgroundMusic.pause();
        currentBGM = null;
    }
    // --- КОНЕЦ ЛОГИКИ СМЕНЫ BGM ---
    
    
    locationText.textContent = scene.location;
    backgroundImage.style.backgroundImage = scene.background ? scene.background : 'none';

    // ОБНОВЛЕННАЯ ЛОГИКА ОТОБРАЖЕНИЯ СПРАЙТОВ (ПОДДЕРЖКА МАССИВА)
    spriteArea.innerHTML = '';
    let spritesToRender = [];

    if (scene.sprites && Array.isArray(scene.sprites)) {
        spritesToRender = scene.sprites;
    } 
    else if (scene.sprite) {
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
    hintButton.style.display = 'none'; // Скрываем по умолчанию
    speakerName.style.display = 'none'; 
    continuePrompt.style.display = 'none'; 
    
    const textBox = document.getElementById('text-box');

    if (scene.isEnding) {
        updateSpriteEmphasis(null);
        generateEnding(sceneId);
        speakerName.style.display = 'none';
        textBox.onclick = null; 
    } else {
        // Сброс индекса и флага происходит только если мы не возвращаемся из HINT
        if (!isReturningFromHint) {
            currentStoryIndex = 0;
            isAwaitingChoice = false;
        }

        // Если возвращаемся из подсказки, принудительно показываем экран выбора без повторной печати
        if (isReturningFromHint) {
            const choiceStepIndex = scene.story.findIndex(step => step.action === 'show_choices');
            if (choiceStepIndex !== -1) {
                const step = scene.story[choiceStepIndex];
                updateSpriteEmphasis(null);
                speakerName.textContent = 'РЕШЕНИЕ';
                speakerName.style.display = 'block';
                continuePrompt.style.display = 'none';
                if (step.text.includes('<span')) {
                    storyText.innerHTML = step.text;
                } else {
                    storyText.textContent = step.text;  // Устанавливаем текст напрямую, без печати
                }
                document.getElementById('text-box').classList.add('text-complete');
                showChoices(scene);
                textBox.onclick = null;
                currentStoryIndex = choiceStepIndex;
                isAwaitingChoice = true;
                return;
            }
        }

        // Устанавливаем обработчик клика для перехода (Активирован, даже для hint)
        textBox.onclick = goToNextStoryStep;
        goToNextStoryStep();
    }
}


/**
 * Переходит к следующему шагу истории (фразе) или запускает действие.
 */
async function goToNextStoryStep() {
    const scene = gameData[currentSceneId];
    
    // ЛОГИКА БЫСТРОЙ ПЕЧАТИ (Fast-Forward)
    if (isTyping) {
        isTyping = false; 
        if (currentTypingResolver) {
            currentTypingResolver(); 
        }
        return; 
    }

    // ЛОГИКА: ОБРАБОТКА КЛИКА ПОСЛЕ ВЫБОРА (для перехода к следующей сцене)
    if (isAwaitingConsequenceClick) {
        updateSpriteEmphasis(null);
        
        let nextSceneId = 'scene' + (totalScenes + 1);

        isAwaitingConsequenceClick = false; 

        if (gameData[nextSceneId]) {
            showScene(nextSceneId);
        } else {
            checkEnding(); 
        }
        return; 
    }

    // Если ожидаем выбор или история закончилась
    if (isAwaitingChoice || !scene.story || currentStoryIndex >= scene.story.length) {
        
        // Этот блок специально для того, чтобы в сцене HINT гарантированно показать кнопку ВОЗВРАТ,
        // даже если история состояла из одной фразы.
        if (currentSceneId === 'hint' && !isAwaitingChoice) {
            const lastStep = scene.story[scene.story.length - 1];
            if (lastStep.action === 'show_choices') {
                 // Здесь мы принудительно запускаем логику показа выбора
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

    // 1. Обработка действий (actions)
    if (step.action === 'show_choices') {
        updateSpriteEmphasis(null);
        
        // Отключаем клик по текстовому полю.
        document.getElementById('text-box').onclick = null; 
        
        speakerName.textContent = currentSceneId === 'hint' ? 'ВОЗВРАТ' : 'РЕШЕНИЕ'; 
        speakerName.style.display = 'block';
        continuePrompt.style.display = 'none'; 

        // --- Поддержка HTML в тексте перед выбором ---
        if (step.text.includes('<span')) {
            storyText.innerHTML = step.text;
        } else {
            await typeText(step.text);
        }
        // ---------------------------------------------
        
        showChoices(scene);
        return;
    }

    // 2. СМЕНА СПРАЙТА (теперь с поддержкой анимации)
    if (step.spriteSrc && step.speaker) {
        const targetSprite = spriteArea.querySelector(`.sprite[alt="${step.speaker}"]`);
        if (targetSprite) {
            // Останавливаем текущую анимацию
            const oldIntervalId = targetSprite.dataset.intervalId;
            if (oldIntervalId) {
                clearInterval(parseInt(oldIntervalId));
                delete targetSprite.dataset.intervalId;
            }

            // Устанавливаем новый базовый путь и запускаем анимацию
            const newBaseSrc = step.spriteSrc; // Предполагаем, что это базовый путь без .png
            startSpriteAnimation(targetSprite, newBaseSrc, DEFAULT_FRAMES);
        } else {
            console.warn(`Спрайт для говорящего "${step.speaker}" не найден для смены эмоции.`);
        }
    }

    // 3. Отображение диалога
    if (step.speaker) {
        speakerName.textContent = step.speaker;
        speakerName.style.display = 'block';
        updateSpriteEmphasis(step.speaker);
    } else {
        speakerName.style.display = 'none';
        updateSpriteEmphasis(null);
    }
    
    // --- ИСПОЛЬЗОВАНИЕ typeText ИЛИ innerHTML ---
    if (step.text.includes('<span')) {
        storyText.innerHTML = step.text;
        document.getElementById('text-box').classList.add('text-complete');
        continuePrompt.style.display = 'block'; 
    } else {
        await typeText(step.text);
    }
    // -------------------------------------------------------------

    currentStoryIndex++;
}

/**
 * Отображает кнопки выбора и активирует кнопку подсказки.
 */
function showChoices(scene) {
    isAwaitingChoice = true;

    choicesContainer.innerHTML = '';
    scene.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.className = 'choice-button';
        
        // Измененная логика: обрабатываем 'return' специально через handleChoice
        // Для остальных: все, кроме основных сцен, ведут к следующей сцене напрямую
        if (choice.nextScene === 'return') {
            button.onclick = () => handleChoice(currentSceneId, index, false);
        } else if (currentSceneId.startsWith('tutorial') || currentSceneId.startsWith('ending') || currentSceneId === 'welcome_message') {
            button.onclick = () => showScene(choice.nextScene);
        } else {
            button.onclick = () => handleChoice(currentSceneId, index, false);
        }

        choicesContainer.appendChild(button);
    });

    choicesContainer.style.pointerEvents = 'auto';
    choicesContainer.style.opacity = '1';

    // --- ЛОГИКА ПОКАЗА КНОПКИ ПОДСКАЗКИ ---
    if (scene.hint && !scene.isHint && !currentSceneId.startsWith('tutorial') && !currentSceneId.startsWith('ending') && currentSceneId !== 'welcome_message') {
        hintButton.style.display = 'block';
    } else {
        hintButton.style.display = 'none';
    }
    // ----------------------------------------------------
}


/**
 * Обрабатывает выбор игрока.
 */
function handleChoice(sceneId, choiceIndex, isHintRequest = false) {
    
    // --- ЛОГИКА ДЛЯ ПОДСКАЗКИ ---
    if (isHintRequest) {
        const currentScene = gameData[sceneId];
        
        if (!currentScene.hint) {
            return;
        }

        // ПЕРЕД входом в hint сохраняем текущее состояние истории в стеке!
        currentSceneStack.push(sceneId); 
        
        // Временно заменяем первый текст Володи на текст подсказки
        if (gameData['hint']) {
            gameData['hint'].story[0].text = currentScene.hint;
        }

        showScene('hint'); 
        
        return;
    }
    // --- КОНЕЦ ЛОГИКИ ДЛЯ ПОДСКАЗКИ ---


    const scene = gameData[sceneId];
    const choice = scene.choices[choiceIndex];
    
    isAwaitingChoice = false;
    choicesContainer.style.pointerEvents = 'none';
    choicesContainer.style.opacity = '0';
    hintButton.style.display = 'none';
    continuePrompt.style.display = 'none'; 
    document.getElementById('text-box').onclick = null; 

    // Логика возврата из сцены 'hint'
    if (choice.nextScene === 'return') {
        const previousSceneId = currentSceneStack.pop();
        
        // Мы возвращаемся на тот же шаг истории.
        // Переменные currentStoryIndex и isAwaitingChoice сохраняют то состояние,
        // в котором они были до вызова showScene('hint').
        showScene(previousSceneId);
        return;
    }

    if (choice.nextScene) {
        showScene(choice.nextScene);
        return;
    }
    
    // ... (Остальная логика обработки выбора) ...
    
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
    // Используем innerHTML для поддержки тегов **
    storyText.innerHTML = `${consequenceText.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}`;
    
    isAwaitingConsequenceClick = true; 
    document.getElementById('text-box').onclick = goToNextStoryStep; 
    continuePrompt.style.display = 'block'; 
}

/**
 * Проверка на секретную концовку.
 */
function checkEnding() {
    if (correctChoices === totalScenes && totalScenes > 0) {
        showScene('ending_secret');
    } else {
        showScene('ending_consequences');
    }
}

/**
 * Генерация финального отчета.
 */
function generateEnding(sceneId) {
    const scene = gameData[sceneId];

    let mainText = scene.text.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>');
    let reportHTML = '';
    let overallText = '';

    if (sceneId === 'ending_consequences') {
        // Общий итог
        overallText = `
            <div style="margin-top: 20px; padding: 15px; background-color: rgba(10, 104, 54, 0.2); border-left: 4px solid var(--light-green); border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: var(--light-green);">Общий итог</h3>
                <p style="margin: 0;">Ты принял <b>${correctChoices} из ${totalScenes}</b> решений, соответствующих духу смены.</p>
                <p style="margin: 10px 0 0 0;">Жизнь — это игра, в которой ты учишься. Спасибо за твой выбор!</p>
            </div>
        `;

        // Детальный отчет в виде таблицы
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
    }
    
    storyText.innerHTML = mainText + overallText + reportHTML;
    
    showChoices(scene);
}

// --- 4. ЗАПУСК ИГРЫ (ИЗМЕНЕННАЯ ТОЧКА ВХОДА) ---

// Добавляем обработчик для кнопки подсказки
hintButton.onclick = () => handleChoice(currentSceneId, null, true); 

// Добавляем обработчик для быстрого пролистывания по клавише
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); 
        goToNextStoryStep();
    }
});

// ТОЧКА ВХОДА: Запускаем процесс предзагрузки
window.onload = async () => {
    // 1. Убедимся, что контейнер игры скрыт, а оверлей загрузки виден
    gameContainer.style.display = 'none'; 
    loadingOverlay.style.display = 'flex';
    loadingOverlay.classList.remove('fade-out'); // Сбрасываем, если остался

    // 2. Запускаем предзагрузку
    await preloadAssets();

    // 3. После загрузки показываем кнопку и ждем клика
    loadingText.textContent = 'Контент загружен. Пожалуйста, нажмите "НАЧАТЬ ИГРУ".';
    
    // Добавляем обработчик на кнопку "НАЧАТЬ ИГРУ"
    startGameButton.style.display = 'block';
    startGameButton.onclick = initializeGame;
};