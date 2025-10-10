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

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
const TYPING_SPEED = 25; // Скорость печати (мс на букву)
let isTyping = false; 
let currentTypingResolver = null; 

let currentSceneId = 'intro';
let currentSceneStack = []; 
let correctChoices = 0;
let totalScenes = 0;
let consequencesReport = [];
let currentStoryIndex = 0; 
let isAwaitingChoice = false;
let isAwaitingConsequenceClick = false; 


// --- 2. ДАННЫЕ ИГРЫ (УДАЛЕНО И ЗАМЕНЕНО ИМПОРТОМ) ---
// const gameData = { ... }; 


// --- 3. ОСНОВНЫЕ ИГРОВЫЕ ФУНКЦИИ ---

/**
 * Плавно отображает текст с эффектом печати.
 */
function typeText(text) {
    // ... (код typeText остается прежним)
    isTyping = true;
    storyText.textContent = '';
    document.getElementById('text-box').classList.remove('text-complete'); 

    return new Promise(resolve => {
        currentTypingResolver = resolve;
        let index = 0;

        function printChar() {
            if (!isTyping) { 
                storyText.textContent = text;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block';
                resolve(); 
                return;
            }

            if (index < text.length) {
                storyText.textContent += text.charAt(index);
                index++;
                setTimeout(printChar, TYPING_SPEED);
            } else {
                isTyping = false;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block'; 
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
    
    if (sprites.length === 0 || !currentSpeakerName || currentSpeakerName.includes('Система') || currentSpeakerName.includes('РЕШЕНИЕ') || currentSpeakerName.includes('ИТОГ') || currentSpeakerName.includes('Твои Мысли')) {
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
 * Переключает сцену с эффектом перехода.
 */
function showScene(sceneId) {
    // ... (логика перехода остается прежней)
    if (sceneId === currentSceneId && !gameData[sceneId].isHint) {
        renderSceneContent(sceneId);
        return;
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


/**
 * Рендерит всю информацию сцены (фон, спрайты, начальный текст).
 * Скорректирована для поддержки массива 'sprites'.
 */
function renderSceneContent(sceneId) {
    const scene = gameData[sceneId];
    if (!scene) {
        console.error('Сцена не найдена:', sceneId);
        return;
    }

    currentSceneId = sceneId;
    currentStoryIndex = 0;
    isAwaitingChoice = false;
    isAwaitingConsequenceClick = false; 

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
        spriteDiv.src = spriteData.src;
        spriteDiv.alt = spriteData.name;
        spriteDiv.className = `sprite ${spriteData.position}`; 
        spriteArea.appendChild(spriteDiv);
    });
    
    choicesContainer.innerHTML = '';
    choicesContainer.style.pointerEvents = 'none';
    choicesContainer.style.opacity = '0';
    hintButton.style.display = 'none';
    speakerName.style.display = 'none'; 
    continuePrompt.style.display = 'none'; 
    
    if (scene.isEnding) {
        updateSpriteEmphasis(null);
        generateEnding(sceneId);
        speakerName.style.display = 'none';
        document.getElementById('text-box').onclick = null; 
    } else {
        document.getElementById('text-box').onclick = goToNextStoryStep;
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

    if (isAwaitingChoice || !scene.story || currentStoryIndex >= scene.story.length) {
        return;
    }

    const step = scene.story[currentStoryIndex];

    // 1. Обработка действий (actions)
    if (step.action === 'show_choices') {
        updateSpriteEmphasis(null);
        document.getElementById('text-box').onclick = null;
        speakerName.textContent = 'РЕШЕНИЕ';
        speakerName.style.display = 'block';
        continuePrompt.style.display = 'none'; 
        await typeText(step.text); // Напечатать текст перед выбором
        showChoices(scene);
        return;
    }

    // 2. СМЕНА СПРАЙТА
    if (step.spriteSrc && step.speaker) {
        const targetSprite = spriteArea.querySelector(`.sprite[alt="${step.speaker}"]`);
        if (targetSprite) {
            // Меняем источник изображения
            targetSprite.src = step.spriteSrc;
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
    
    await typeText(step.text);

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
        
        if (currentSceneId.startsWith('tutorial')) {
             button.onclick = () => showScene(choice.nextScene);
        } else {
             button.onclick = () => handleChoice(currentSceneId, index, false);
        }

        choicesContainer.appendChild(button);
    });

    choicesContainer.style.pointerEvents = 'auto';
    choicesContainer.style.opacity = '1';

    if (!scene.isHint && !currentSceneId.startsWith('tutorial')) {
        hintButton.style.display = 'block';
    }
}


/**
 * Обрабатывает выбор игрока.
 */
function handleChoice(sceneId, choiceIndex, isHintRequest = false) {
    
    if (isHintRequest) {
        updateSpriteEmphasis(null);
        currentSceneStack.push(sceneId);
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
        showScene(previousSceneId);
        return;
    }

    if (choice.nextScene) {
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
        // Формируем детальный отчет
        reportHTML += '<div style="margin-top: 20px;">';
        consequencesReport.forEach((report, index) => {
            const status = report.isCorrect ? '✅ ВЕРНО' : '❌ ОШИБКА';
            reportHTML += `
                <p style="margin-bottom: 5px;">--- **Ситуация ${index + 1}** (${report.scene}) ---</p>
                <p style="margin-left: 10px;">**Выбор:** "${report.choice}"</p>
                <p style="margin-left: 10px;">**Статус:** ${status}</p>
                <p style="margin-left: 10px;">**Последствие:** ${report.consequence.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}</p>
            `;
        });
        reportHTML += '</div>';

        // Добавляем общий итог
        overallText = `<p style="margin-top: 20px;">Ты принял **${correctChoices} из ${totalScenes}** решений, соответствующих духу смены.</p><p>Жизнь — это игра, в которой ты учишься. Спасибо за твой выбор!</p>`;
    }
    
    storyText.innerHTML = mainText + overallText + reportHTML;
    
    showChoices(scene);
}

// --- 4. ЗАПУСК ИГРЫ ---

// Добавляем обработчик для кнопки подсказки
hintButton.onclick = () => handleChoice(currentSceneId, null, true); 

// Добавляем обработчик для быстрого пролистывания по клавише
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); 
        goToNextStoryStep();
    }
});

// ЗАПУСК ИГРЫ
showScene('intro');