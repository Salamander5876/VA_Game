// script.js - Полный код игровой логики для Визуальной Новеллы "Камертон 2026"

// --- 1. КОНСТАНТЫ И ЭЛЕМЕНТЫ DOM ---
const storyText = document.getElementById('story-text');
const choicesContainer = document.getElementById('choices-container');
const locationText = document.getElementById('location');
const backgroundImage = document.getElementById('background-image');
const spriteArea = document.getElementById('sprite-area');
const hintButton = document.getElementById('hint-button'); 
const speakerName = document.getElementById('speaker-name');
const continuePrompt = document.getElementById('continue-prompt'); 
const transitionOverlay = document.getElementById('transition-overlay'); // НОВЫЙ ЭЛЕМЕНТ ДЛЯ ПЕРЕХОДА

// НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ ЭФФЕКТА ПЕЧАТИ
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

// НОВЫЙ ФЛАГ ДЛЯ ОЖИДАНИЯ КЛИКА ПОСЛЕ ВЫБОРА
let isAwaitingConsequenceClick = false; 

// --- 2. ДАННЫЕ ИГРЫ (ЛЕГКО РАСШИРЯТЬ) ---

const gameData = {
    'intro': {
        location: 'Обучение',
        background: 'url(images/workcamp.jpg)',
        story: [
            { speaker: 'Система', text: 'Привет! Ты — бета-тестер уникальной RPG "Камертон 2026". Твоя задача — принимать решения в ключевых ситуациях, чтобы создать идеальную смену.' },
            { speaker: 'Система', text: 'Жизнь — это увлекательная игра, где ты находишь себя. Начни свой путь!' },
            { action: 'show_choices', text: 'Готовы к игре?' }
        ],
        choices: [
            { text: 'Начать бета-тест (Новая Игра)', nextScene: 'tutorial_start' },
            { text: 'Пропустить обучение и начать Ситуацию 1', nextScene: 'scene1' }
        ]
    },
    'tutorial_start': {
        location: 'Игровая база (Обучение)',
        background: 'url(images/workcamp.jpg)',
        // Использован старый формат sprite:
        sprite: { name: 'Инструктор', src: 'images/workshop.png', position: 'center' },
        story: [
            { speaker: 'Система', text: 'Добро пожаловать в обучающий режим! Все диалоги управляются нажатием на текстовое поле внизу экрана.' },
            { speaker: 'Система', text: 'Нажмите, чтобы увидеть, как текст сменяется. Вы увидите текст "Нажмите, чтобы продолжить..." справа внизу.' },
            { speaker: 'Система', text: 'Имена говорящих отображаются слева вверху текстового поля.' },
            { speaker: 'Инструктор', text: 'Привет, Бета-тестер! Наша игра построена на выборе. Сейчас я покажу, как это работает.' },
            { action: 'show_choices', text: 'Туториал продолжается. Нажмите "Продолжить".' }
        ],
        choices: [
            { text: 'Продолжить обучение', nextScene: 'tutorial_choice' }
        ]
    },
    'tutorial_choice': {
        location: 'Игровая база (Обучение)',
        background: 'url(images/workcamp.jpg)',
        sprite: { name: 'Инструктор', src: 'images/workshop.png', position: 'center' },
        story: [
            { speaker: 'Инструктор', text: 'В ключевые моменты вы увидите кнопки выбора. От них зависит ваш прогресс и концовка.' },
            { speaker: 'Инструктор', text: 'Если вы сомневаетесь, нажмите на **желтую кнопку "Попросить совета (Володя)"**.' },
            { speaker: 'Инструктор', text: 'Это даст вам подсказку от геймдизайнера о том, какой выбор лучше соответствует идеям нашей смены.' },
            { speaker: 'Инструктор', text: 'А теперь сделайте тестовый выбор!' },
            { action: 'show_choices', text: 'Выбери свой путь.' }
        ],
        choices: [
            { text: 'Выбрать путь, соответствующий духу смены (Осознанный выбор)', nextScene: 'tutorial_end' },
            { text: 'Выбрать путь, который мне нравится больше (Личный выбор)', nextScene: 'tutorial_end' }
        ]
    },
    'tutorial_end': {
        location: 'Игровая база (Обучение завершено)',
        background: 'url(images/workcamp.jpg)',
        sprite: { name: 'Инструктор', src: 'images/workshop.png', position: 'center' },
        story: [
            { speaker: 'Инструктор', text: 'Отлично! Вы освоили основы. Ваш тестовый выбор не повлиял на результат.' },
            { speaker: 'Инструктор', text: 'Помните: верный выбор — это не всегда самый легкий, но всегда тот, что способствует **доверию, развитию и осознанности**.' },
            { speaker: 'Система', text: 'Туториал завершен. Начинаем основной Бета-тест!' },
            { action: 'show_choices', text: 'Начать бета-тест (Ситуация 1).' }
        ],
        choices: [
            { text: 'Начать Ситуацию 1', nextScene: 'scene1' }
        ]
    },
    'scene1': {
        location: 'Зона Прокачки (Утро)',
        background: 'url(images/workshop.jpg)',
        // ИЗМЕНЕНО: Добавлен массив 'sprites' для двух спрайтов
        sprites: [ 
            { name: 'Друг', src: 'images/workshop.png', position: 'left' }, // Замените на реальные пути
            { name: 'Ты', src: 'images/workshop.png', position: 'right' }   // Замените на реальные пути
        ],
        hint: 'Задача смены — помочь выразить себя и развить навыки, а также дать опыт осознанного выбора.',
        story: [
            { speaker: 'Ты', text: 'Утро первого дня. Я должен выбрать, что буду "прокачивать" в своей "игровой сборке".' },
            { speaker: 'Друг', text: 'Эй, привет! Я уже записался в Вокал. Там крутая тусовка, давай с нами? Будем петь вместе!' },
            { speaker: 'Ты', text: 'Заманчиво. Но я хотел попробовать Арт-фехтование. Это мой личный интерес.' },
            { speaker: 'Друг', text: 'Да ладно тебе, Арт-фехтование потом, а друзей надо искать сейчас. Что скажешь?' },
            { action: 'show_choices', text: 'Нужно принять решение, что важнее: социализация или личное развитие.' }
        ],
        choices: [
            {
                text: 'Пойти с другом в «Вокал», чтобы сразу найти друзей (Дружба)',
                correct: false,
                consequence: 'Ты отлично проводишь время с другом, но чувствуешь, что Вокал не твое. Выбор был неосознанным. -5% к Вовлеченности.'
            },
            {
                text: 'Выбрать «Арт-фехтование», потому что это твой личный интерес (Осознанный выбор)',
                correct: true,
                consequence: 'Ты делаешь осознанный выбор, который важен для твоего развития. Ты нашёл свою "прокачку".'
            }
        ]
    },
    'scene2': {
        location: 'Башня Гильдий',
        background: 'url(images/guild.jpg)',
        sprite: { name: 'leader', src: 'images/sprite_leader.png', position: 'right' },
        hint: 'Смена учит взаимодействовать и доверять, а в команде должно царить уважение. Конфликты нужно решать до начала работы.',
        story: [
            { speaker: 'Лидер Гильдии', text: 'Нам нужно подготовить выступление, но эти двое опять спорят. Время идет, а мы стоим на месте.' },
            { speaker: 'Участник 1', text: 'Моя идея лучше! А ты, Лидер, вообще молчи, ты тут только недавно!' },
            { speaker: 'Участник 2', text: 'Он прав! Если ты не можешь быть объективным, то я ухожу из проекта!' },
            { speaker: 'Ты', text: 'Ситуация накаляется. Я должен вмешаться, иначе команда распадется.' },
            { action: 'show_choices', text: 'Как решить конфликт в команде?' }
        ],
        choices: [
            {
                text: 'Попросить вожатого убрать спорщиков из команды (Жесткое решение)',
                correct: false,
                consequence: 'Конфликт решен, но ценой отчуждения. Это не способствует доверию и командной работе.'
            },
            {
                text: 'Предложить им взять паузу и спокойно обсудить их общую цель (Диалог)',
                correct: true,
                consequence: 'Ты инициируешь диалог. Проблема решается, и команда становится слаженнее. Успешная работа с конфликтом.'
            }
        ]
    },
    'scene3': {
        location: 'Поляна Следов (День творчества)',
        background: 'url(images/art_festival.jpg)',
        sprite: { name: 'creative', src: 'images/sprite_creative.png', position: 'left' },
        hint: 'Важно, чтобы каждый ребенок чувствовал вклад и гордость за общее дело, и что его идеи поддерживают.',
        story: [
            { speaker: 'Ты', text: 'Началась работа над арт-объектом. Кажется, один из участников расстроен. Его идея не прошла голосование.' },
            { speaker: 'Расстроенный Участник', text: '(Вздыхает) Почему всегда все решают через шутки? Я хотел создать что-то серьезное, что оставит след.' },
            { speaker: 'Ты', text: 'Он прав. Ему нужно почувствовать, что его видение важно.' },
            { action: 'show_choices', text: 'Как поступить, чтобы сохранить вклад участника и общее дело?' }
        ],
        choices: [
            {
                text: 'Сказать, что большинству важнее, пусть не обижается (Подавление)',
                correct: false,
                consequence: 'Ребенок замыкается в себе. Коллективная инсталляция создана, но кто-то оставил в ней грустный след. -10% к Гордости за общее дело.'
            },
            {
                text: 'Предложить ему создать "серьезный" элемент, который станет центральной деталью общей инсталляции (Компромисс)',
                correct: true,
                consequence: 'Ты находишь компромисс. Его вклад становится заметным, он гордится работой, и общий объект выигрывает. Влияние на мир игры учтено.'
            }
        ]
    },
    'scene4': {
        location: 'Темный зал ("500 Огней")',
        background: 'url(images/500_fires.jpg)',
        sprite: { name: 'speaker', src: 'images/sprite_speaker.png', position: 'right' },
        hint: 'Смена — безопасное место, где поддерживают твои идеи и чувства, а главное — где каждый может быть услышан. Сбрось свои страхи.',
        story: [
            { speaker: 'Ведущий', text: 'В зале 500 огней. Кто хочет поделиться своей мыслью или чувством?' },
            { speaker: 'Ты', text: 'Мне страшно, но я хочу сказать то, что чувствую. Этот зал — безопасное место.' },
            { speaker: 'Твои Мысли', text: 'Может быть, просто посидеть и насладиться атмосферой?' },
            { action: 'show_choices', text: 'Что ты выберешь: безопасность или преодоление страха?' }
        ],
        choices: [
            {
                text: 'Молча наслаждаться атмосферой (Пассивный зритель)',
                correct: false,
                consequence: 'Ты остался пассивным зрителем. Ты не смог стать носителем атмосферы, но в зале было тепло. Не сбросил страх.'
            },
            {
                text: 'Взять свою свечу и решиться выступить (Быть собой/Смелость)',
                correct: true,
                consequence: 'Ты выходишь к микрофону. Ты преодолеваешь свой страх и чувствуешь себя смелым и свободным.'
            }
        ]
    },
    'scene5': {
        location: 'База Бета-тестеров (Финал)',
        background: 'url(images/final_day.jpg)',
        sprite: { name: 'engineer', src: 'images/sprite_engineer.png', position: 'left' },
        hint: 'Опыт вторичен, главное — доводить начатое до конца. Команда должна работать слаженно, без перегрузок, но с чувством, что стали частью важного процесса.',
        story: [
            { speaker: 'Инженер', text: 'Мы отловили все основные "баги", команда! Осталась только скучная документация, и можно идти на вечеринку!' },
            { speaker: 'Ты', text: 'Я очень устал, но понимаю, что без документации это незавершенное дело. Нельзя бросать работу на полпути.' },
            { action: 'show_choices', text: 'Что важнее: отдых или доведение работы до конца?' }
        ],
        choices: [
            {
                text: 'Бросить это, в конце концов, это "баг" по документации (Незавершенное дело)',
                correct: false,
                consequence: 'Баг в документации остался. Ты не довел начатое до конца. Конец смены счастливый, но не совсем "счастливая концовка".'
            },
            {
                text: 'Взять задачу на себя и попросить помощи у одного-двух самых ответственных (Довести до конца)',
                correct: true,
                consequence: 'Вы завершаете работу, команда работает слаженно, а ты чувствуешь вклад и гордость за общее дело.'
            }
        ]
    },
    'hint': {
        location: 'Кабинет Дизайнера Игры',
        background: 'url(images/vladimir_anisimov_bg.jpg)',
        sprite: { name: 'volodya', src: 'images/sprite_volodya.png', position: 'center' },
        isHint: true,
        story: [
            { speaker: 'Владимир Анисимов', text: 'Привет! Я Владимир Анисимов, геймдизайнер смены. Я ценю тех, кто не боится ответственности, готов к диалогу и горит своим делом.' },
            { speaker: 'Владимир Анисимов', text: 'Подумай, какой выбор соответствует нашей главной идее: "Жизнь — это увлекательная игра, где ты находишь себя, учишься доверять и открываешь свою уникальность через творчество, приключения и поддержку команды".' },
            { action: 'show_choices', text: 'Вернитесь к решению.' }
        ],
        choices: [
            { text: 'Вернуться и принять решение', nextScene: 'return' }
        ]
    },
    'ending_consequences': {
        location: 'Отчет о последствиях (HAPPY END?)',
        text: 'Бета-тест завершен. Твои решения сформировали мир игры. Вот что произошло на смене:',
        isEnding: true,
        choices: [
            { text: 'Поделиться результатом', nextScene: 'final_share' }
        ]
    },
    'ending_secret': {
        location: 'Секретная концовка: Проект "Камертон 2026"',
        text: '!!! Секретная концовка !!!\n\n**Ваше видение ситуации совпадает с моим. У вас есть "Рейтинг ВОЛОДЯ АНИСИМОВ"**. \n\nВы стремитесь создать смену, где каждый вожатый понимает свою роль, а ребенок чувствует, что его любят и ждут. Спасибо, что прожили этот опыт с открытым сердцем и вниманием.\n\n**Счастливая концовка: HAPPY END!!! Все счастливы!!!**',
        isEnding: true,
        choices: [
            { text: 'Поделиться результатом', nextScene: 'final_share' }
        ]
    },
    'final_share': {
        location: 'ФИНАЛ',
        text: 'Спасибо за игру! Смена "Камертон 2026" ждёт тебя! (Здесь можно поставить ссылку на регистрацию)',
        isEnding: true,
        choices: []
    }
};

// --- НОВАЯ ФУНКЦИЯ: ЭФФЕКТ ПЕЧАТИ (КОНСОЛЬ) ---

function typeText(text) {
    isTyping = true;
    storyText.textContent = '';
    // Убираем класс, чтобы курсор мигал во время печати (требует CSS)
    document.getElementById('text-box').classList.remove('text-complete'); 

    return new Promise(resolve => {
        currentTypingResolver = resolve;
        let index = 0;

        function printChar() {
            // Проверка на прерывание (Fast-Forward)
            if (!isTyping) { 
                storyText.textContent = text;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block';
                resolve(); // Завершаем Promise
                return;
            }

            if (index < text.length) {
                // Добавляем следующую букву
                storyText.textContent += text.charAt(index);
                index++;
                // Планируем печать следующей буквы
                setTimeout(printChar, TYPING_SPEED);
            } else {
                isTyping = false;
                document.getElementById('text-box').classList.add('text-complete');
                continuePrompt.style.display = 'block'; // Показываем стрелку, когда текст напечатан
                resolve();
            }
        }

        // Запускаем печать
        printChar();
    });
}

// --- НОВАЯ ФУНКЦИЯ: УПРАВЛЕНИЕ ФОКУСОМ СПРАЙТОВ ---

/**
 * Затемняет всех, кроме говорящего персонажа.
 * @param {string} currentSpeakerName Имя говорящего персонажа.
 */
function updateSpriteEmphasis(currentSpeakerName) {
    // Получаем все спрайты на сцене
    const sprites = spriteArea.querySelectorAll('.sprite');
    
    // Если спрайтов нет или сцены с диалогами, где нет персонажей, просто выходим
    if (sprites.length === 0 || !currentSpeakerName || currentSpeakerName.includes('Система') || currentSpeakerName.includes('РЕШЕНИЕ') || currentSpeakerName.includes('ИТОГ') || currentSpeakerName.includes('Твои Мысли')) {
        // Убеждаемся, что все спрайты в нормальном состоянии
        sprites.forEach(sprite => sprite.classList.remove('dimmed'));
        return;
    }

    // Проходим по всем спрайтам
    sprites.forEach(sprite => {
        // Имя спрайта хранится в атрибуте alt
        const spriteName = sprite.alt;
        
        // Если имя спрайта совпадает с именем говорящего, то снимаем класс dimmed
        if (spriteName === currentSpeakerName) {
            sprite.classList.remove('dimmed');
        } 
        // Иначе, применяем класс dimmed
        else {
            sprite.classList.add('dimmed');
        }
    });
}

// --- 3. ИГРОВАЯ ЛОГИКА ---

// ФУНКЦИЯ, КОТОРАЯ ФИЗИЧЕСКИ РЕНДЕРИТ КОНТЕНТ СЦЕНЫ
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

    // Обновляем локацию и фон
    locationText.textContent = scene.location;
    backgroundImage.style.backgroundImage = scene.background ? scene.background : 'none';

    // =========================================================
    // ОБНОВЛЕННАЯ ЛОГИКА ОТОБРАЖЕНИЯ СПРАЙТОВ (ПОДДЕРЖКА МАССИВА)
    // =========================================================
    spriteArea.innerHTML = '';
    let spritesToRender = [];

    // 1. Проверяем новый формат (массив 'sprites')
    if (scene.sprites && Array.isArray(scene.sprites)) {
        spritesToRender = scene.sprites;
    } 
    // 2. Проверяем старый формат (одиночный объект 'sprite') для обратной совместимости
    else if (scene.sprite) {
        spritesToRender = [scene.sprite];
    }

    // Рендерим все спрайты в массиве
    spritesToRender.forEach(spriteData => {
        const spriteDiv = document.createElement('img');
        spriteDiv.src = spriteData.src;
        spriteDiv.alt = spriteData.name;
        // Добавляем класс 'sprite' и класс позиции ('left', 'right', 'center')
        // В начале сцены все спрайты будут в нормальном состоянии (без dimmed)
        spriteDiv.className = `sprite ${spriteData.position}`; 
        spriteArea.appendChild(spriteDiv);
    });
    // =========================================================


    // Скрываем элементы выбора в начале сцены
    choicesContainer.innerHTML = '';
    choicesContainer.style.pointerEvents = 'none';
    choicesContainer.style.opacity = '0';
    hintButton.style.display = 'none';
    speakerName.style.display = 'none'; 
    continuePrompt.style.display = 'none'; 
    
    if (scene.isEnding) {
        // Убираем затемнение со всех спрайтов в конце
        updateSpriteEmphasis(null);
        generateEnding(sceneId);
        speakerName.style.display = 'none';
        document.getElementById('text-box').onclick = null; 
    } else {
        // Добавляем обработчик клика для прокрутки текста
        document.getElementById('text-box').onclick = goToNextStoryStep;
        goToNextStoryStep();
    }
}

// ОСНОВНАЯ ФУНКЦИЯ ДЛЯ СМЕНЫ СЦЕН (С ПЕРЕХОДОМ)
function showScene(sceneId) {
    // ... (логика перехода остаётся прежней)
    if (sceneId === currentSceneId && !gameData[sceneId].isHint) {
        renderSceneContent(sceneId);
        return;
    }

    if (transitionOverlay) {
        // 1. Начинаем маскирование (круг расширяется)
        transitionOverlay.classList.add('active');
        
        // 2. Ждем, пока маскирование закончится (0.8с) - СКОРРЕКТИРОВАНО ВРЕМЯ
        setTimeout(() => {
            renderSceneContent(sceneId); // Рендерим новый контент
            
            // 3. Плавно убираем маскирование (круг сужается обратно)
            // Небольшая задержка, чтобы браузер успел обновить контент
            setTimeout(() => {
                transitionOverlay.classList.remove('active');
            }, 50); 
        }, 800); // Время должно соответствовать CSS transition-duration (0.8s)
    } else {
        // Прямой вызов, если элемент перехода не найден
        renderSceneContent(sceneId);
    }
}

// Новая функция для прокрутки диалога
async function goToNextStoryStep() {
    const scene = gameData[currentSceneId];
    
    // *** ЛОГИКА: ОБРАБОТКА КЛИКА ПОСЛЕ ВЫБОРА (для перехода к следующей сцене) ***
    if (isAwaitingConsequenceClick) {
        // Убираем затемнение со всех спрайтов перед переходом
        updateSpriteEmphasis(null);
        
        // Определяем следующую сцену и переходим
        let nextSceneId = 'scene' + (totalScenes + 1);

        isAwaitingConsequenceClick = false; // Сбрасываем флаг

        if (gameData[nextSceneId]) {
            showScene(nextSceneId);
        } else {
            checkEnding(); // Запускаем проверку концовки
        }
        return; 
    }
    // *************************************************

    // 1. ЛОГИКА БЫСТРОЙ ПЕЧАТИ (FAST-FORWARD)
    if (isTyping) {
        isTyping = false; 
        if (currentTypingResolver) {
            currentTypingResolver(); 
        }
        return; 
    }

    if (isAwaitingChoice || !scene.story || currentStoryIndex >= scene.story.length) {
        return;
    }

    const step = scene.story[currentStoryIndex];

    // Проверяем, не является ли этот шаг требованием показать выбор
    if (step.action === 'show_choices') {
        // При показе выбора сбрасываем акцент со спрайтов
        updateSpriteEmphasis(null);
        
        document.getElementById('text-box').onclick = null;
        storyText.textContent = step.text;
        speakerName.textContent = 'РЕШЕНИЕ';
        speakerName.style.display = 'block';
        continuePrompt.style.display = 'none'; 
        showChoices(scene);
        return;
    }

    // Показываем, кто говорит
    if (step.speaker) {
        speakerName.textContent = step.speaker;
        speakerName.style.display = 'block';
        // НОВОЕ: Управление акцентом спрайтов
        updateSpriteEmphasis(step.speaker);
    } else {
        speakerName.style.display = 'none';
        // НОВОЕ: Сбрасываем акцент, если нет конкретного говорящего
        updateSpriteEmphasis(null);
    }
    
    // 2. Отображаем текущую фразу с эффектом печати и ждем
    await typeText(step.text);

    currentStoryIndex++;
}

// Функция для отображения кнопок выбора
function showChoices(scene) {
    // ... (логика показа выбора остается прежней)
    isAwaitingChoice = true;

    choicesContainer.innerHTML = ''; // Очистка
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

    // Показываем кнопку подсказки
    if (!scene.isHint && !currentSceneId.startsWith('tutorial')) {
        hintButton.style.display = 'block';
    }
}


// Обработка выбора игрока
function handleChoice(sceneId, choiceIndex, isHintRequest = false) {
    
    // 1. Обработка запроса подсказки
    if (isHintRequest) {
        // Сбрасываем акцент перед уходом в подсказку
        updateSpriteEmphasis(null);
        currentSceneStack.push(sceneId);
        showScene('hint');
        return;
    }

    const scene = gameData[sceneId];
    const choice = scene.choices[choiceIndex];
    
    // Блокируем ввод и скрываем кнопки
    isAwaitingChoice = false;
    choicesContainer.style.pointerEvents = 'none';
    choicesContainer.style.opacity = '0';
    hintButton.style.display = 'none';
    continuePrompt.style.display = 'none'; 
    document.getElementById('text-box').onclick = null; 

    // 2. Обработка кнопки "Вернуться" после подсказки
    if (choice.nextScene === 'return') {
        const previousSceneId = currentSceneStack.pop();
        showScene(previousSceneId);
        return;
    }

    // 3. Если кнопка имеет только nextScene 
    if (choice.nextScene) {
        showScene(choice.nextScene);
        return;
    }
    
    // НОВОЕ: Сбрасываем акцент, когда выбор сделан
    updateSpriteEmphasis(null);

    // 4. Если это обычный сюжетный выбор
    totalScenes++;
    let consequenceText = '';

    if (choice.correct === true) {
        correctChoices++;
        consequenceText = `${choice.consequence || ''}`;
    } else if (choice.correct === false) {
        consequenceText = `${choice.consequence || 'Ситуация разрешилась без твоего решающего влияния.'}`;
    }

    consequencesReport.push(consequenceText);

    // Показываем последствие в текстовом поле
    speakerName.textContent = 'ИТОГ';
    speakerName.style.display = 'block';
    storyText.innerHTML = `${consequenceText.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}`;
    
    // *** ЛОГИКА ОЖИДАНИЯ КЛИКА ДЛЯ ПЕРЕХОДА ***
    isAwaitingConsequenceClick = true; 
    document.getElementById('text-box').onclick = goToNextStoryStep; 
    continuePrompt.style.display = 'block'; 
}

// Проверка на секретную концовку
function checkEnding() {
    if (correctChoices === totalScenes && totalScenes > 0) {
        showScene('ending_secret');
    } else {
        showScene('ending_consequences');
    }
}

// Генерация финального отчета
function generateEnding(sceneId) {
    const scene = gameData[sceneId];

    let mainText = scene.text.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>');
    let reportHTML = '';
    let overallText = '';

    if (sceneId === 'ending_consequences') {
        // Формируем детальный отчет
        reportHTML += '<ul>';
        consequencesReport.forEach((consequence, index) => {
            reportHTML += `<li>**Ситуация ${index + 1}:** ${consequence.replace(/\*\*/g, '<b>').replace(/\*\*/g, '</b>')}</li>`;
        });
        reportHTML += '</ul>';

        // Добавляем общий итог
        overallText = `<p>Ты принял ${correctChoices} из ${totalScenes} решений, соответствующих духу смены.</p><p>Жизнь — это игра, в которой ты учишься. Спасибо за твой выбор!</p>`;
    }
    
    // Обновляем содержимое storyText для всех концовок
    storyText.innerHTML = mainText + overallText + reportHTML;
    
    // Включаем кнопки финальной сцены
    showChoices(scene);
}

// --- 4. ЗАПУСК ИГРЫ ---

// КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Добавляем обработчик для кнопки подсказки
hintButton.onclick = () => handleChoice(currentSceneId, null, true); 

// ЗАПУСК ИГРЫ (через функцию с переходом)
showScene('intro');