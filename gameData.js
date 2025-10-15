// gameData.js - Данные (сцены, диалоги, выборы) для Визуальной Новеллы "Камертон 2026"

export const gameData = {
    'welcome_message': {
        location: 'Приветствие',
        background: 'url(images/background/night.jpg)',
        bgm: 'sound/night.mp3',
        story: [
            { speaker: 'Система', text: 'Привет! Добро пожаловать в проект <span style="color: #ffbf00; font-weight: bold;">"Камертон 2026"</span>.' },
            { speaker: 'Система', text: 'Ты — бета-тестер уникального симулятора, цель которого — прожить ключевые моменты лагерной смены глазами разных людей.' },
            { speaker: 'Система', text: 'Вожатый, оформитель, ребёнок, Старший Вожатый... У каждого своя правда и свой "камертон".' },
            { speaker: 'Система', text: 'Твоя задача — найти свой уникальный путь.' },
            { speaker: 'Система', text: 'Научиться <span style="color: #6abefa; font-weight: bold;">доверять и открыться творчеству</span>, чтобы стать носителем той атмосферы, которую мы хотим создать.' },
            { action: 'show_choices', text: 'Готовы настроить свой Камертон?' }
        ],
        choices: [
            { text: 'Начать бета-тест (Инструктаж)', nextScene: 'tutorial_start' }
        ]
    },
    
    'tutorial_start': {
        location: 'Парапет (Инструктаж)',
        background: 'url(images/background/night.jpg)',
        sprites: [{ name: 'Володя', baseSrc: 'images/sprites/volodya_1', frames: 6, position: 'center' }],
        bgm: 'sound/night.mp3',
        story: [
            { speaker: 'Володя', text: 'Привет! Я <span style="color: #6abefa; font-weight: bold;">Володя Анисимов</span>, кандидат на должность старшего вожатого.' },
            { speaker: 'Володя', text: 'Сейчас я твой наставник по игре. Моя цель - научить тебя смотреть на смену через призму <span style="color: #ffbf00; font-weight: bold;">"осознанности"</span>.' },
            { speaker: 'Володя', text: 'В этом симуляторе твои решения будут влиять на атмосферу: Доверие, Творчество, Отношения.' },
            { speaker: 'Володя', text: 'За каждым выбором — чья-то история.' },
            { speaker: 'Володя', text: 'Сначала технические моменты: все диалоги управляются нажатием на текстовое поле внизу экрана. Жми.' },
            { speaker: 'Система', text: 'Нажмите, чтобы увидеть, как текст сменяется.' },
            { speaker: 'Система', text: 'Вы увидите подсказку <span style="color: #6abefa; font-weight: bold;">"Нажмите, чтобы продолжить..."</span> справа внизу.' },
            { speaker: 'Володя', text: 'Отлично. Начнем с самого важного: выбора.' },
            { speaker: 'Володя', text: 'Здесь ты сам выбираешь, какую атмосферу нести. Жми "Продолжить".' },
            { action: 'show_choices', text: 'Инструктаж продолжается. Нажмите "Продолжить".' }
        ],
        choices: [
            { text: 'Продолжить!', nextScene: 'tutorial_choice' }
        ]
    },
    
    'tutorial_choice': {
        location: 'Парапет (Обучение)',
        background: 'url(images/background/night.jpg)',
        sprites: [{ name: 'Володя', baseSrc: 'images/sprites/volodya_2', frames: 6, position: 'center' }],
        bgm: 'sound/night.mp3',
        story: [
            { speaker: 'Володя', text: 'Смотри. В ключевые моменты ты увидишь кнопки выбора.' },
            { speaker: 'Володя', text: 'Помни: верный выбор - это тот, который резонирует с нашей идеей Смены.' },
            { speaker: 'Володя', text: 'Если сомневаешься, нажимай на <span style="color: #ffbf00; font-weight: bold;">желтую кнопку "Попросить совета (Володя)"</span>.' },
            { speaker: 'Володя', text: 'Я дам тебе подсказку, какой выбор лучше соответствует атмосфере <span style="color: #ffbf00; font-weight: bold;">"Камертона 2026"</span>.' },
            { speaker: 'Володя', text: 'Развитие через доверие и творчество - вот наш путь.' },
            { speaker: 'Володя', text: 'А теперь сделай тестовый выбор — неважно, что выберешь, главное — освоить механику!' },
            { action: 'show_choices', text: 'Выбери свой "Камертон".' }
        ],
        choices: [
            { text: 'Осознанный выбор (Я иду за атмосферой)', nextScene: 'tutorial_end' },
            { text: 'Личный выбор (Я делаю, как мне удобно)', nextScene: 'tutorial_end' }
        ]
    },
    
    'tutorial_end': {
        location: 'Парапет (Обучение завершено)',
        background: 'url(images/background/night.jpg)',
        sprites: [{ name: 'Володя', baseSrc: 'images/sprites/volodya_3', frames: 6, position: 'center' }],
        bgm: 'sound/night.mp3',
        story: [
            { speaker: 'Володя', text: 'Отлично! Вы освоили основы. Ваш тестовый выбор не повлиял на результат.' },
            { speaker: 'Володя', text: 'Помни, здесь нет "правильных" или "неправильных" ответов, есть только разные точки зрения.' },
            { speaker: 'Володя', text: 'Твои решения покажут, сможешь ли ты сбалансировать личные желания с общим благом Смены.' },
            { speaker: 'Володя', text: 'От этого зависит, каким будет твой финал.' },
            { speaker: 'Система', text: 'Туториал завершен. Начинаем основной Бета-тест. Время принимать решения!' },
            { action: 'show_choices', text: 'Начать Ситуацию 1.' }
        ],
        choices: [
            { text: 'Начать Ситуацию 1 (Взгляд Ребёнка)', nextScene: 'scene1' }
        ]
    },

    'scene1': {
        location: 'Ребенок: Выбор мастерской',
        background: 'url(images/background/front_of_the_dining.jpg)',
        bgm: 'sound/scene1.mp3',
        sprites: [ 
            { name: 'Друг', src: 'images/bibikov.png', position: 'left' }, 
            { name: 'Ты', src: 'images/vitaly.png', position: 'right' }      
        ],
        hint: 'Наша смена — про поиск себя и осознанный выбор. Дружба важна, но не должна заглушать твой внутренний голос.',
        story: [
            { speaker: 'Ты', text: 'Утро первого дня. Мне нужно выбрать мастерскую.' },
            { speaker: 'Ты', text: 'Что я буду "прокачивать" в своей "игровой сборке"?' },
            { speaker: 'Друг', text: 'Эй, привет! Я уже записался в Вокал.' },
            { speaker: 'Друг', text: 'Там крутая тусовка, давай с нами? Будем петь вместе!' },
            { speaker: 'Ты', text: 'Заманчиво. Но я хотел попробовать Арт-фехтование.' },
            { speaker: 'Ты', text: 'Это мой личный интерес.' },
            { speaker: 'Друг', text: 'Да ладно тебе, Арт-фехтование потом, а друзей надо искать сейчас. Что скажешь?' },
            { action: 'show_choices', text: 'Что ты выберешь: идти за другом или следовать за своим интересом?' }
        ],
        choices: [
            {
                text: 'Пойти с другом в «Вокал» (Комфорт)',
                correct: false,
                consequence: 'Ты отлично проводишь время с другом, но чувствуешь, что Вокал не твое. Выбор был неосознанным. -5% к Вовлеченности.'
            },
            {
                text: 'Выбрать «Арт-фехтование» (Осознанный выбор)',
                correct: true,
                consequence: 'Ты делаешь осознанный выбор, который важен для твоего развития. Ты нашёл свою "прокачку", друг поймёт позже.'
            },
            {
                text: 'Предложить другу компромисс (Уступка)',
                correct: false,
                consequence: 'Друг расстроен, что ты отказываешь ему. Ты не получил желаемого и испортил отношения. Конфликт не решен.'
            },
            {
                text: 'Пообещать другу пойти в следующий раз (Второй шанс)',
                correct: false,
                consequence: 'Друг доволен обещанием, но ты загнал себя в рамки. Ограничение личной свободы.'
            }
        ]
    },

    'scene2': {
        location: 'Башня Гильдий',
        background: 'url(images/background/lab.jpg)',
        bgm: 'sound/Helynt - Movie Reference.mp3',
        sprites: [
            { name: 'Участник 1', src: 'images/sprites/maniken_left.png', position: 'right' },
            { name: 'Участник 2', src: 'images/sprites/maniken_right.png', position: 'left' }
        ],
        hint: 'Смена учит взаимодействовать и доверять. В команде должно царить уважение. Конфликты нужно решать до начала работы.',
        story: [
            { speaker: 'Лидер', text: 'Нам нужно подготовить выступление, но эти двое опять спорят.' },
            { speaker: 'Лидер', text: 'Время идет, а мы стоим на месте.' },
            { speaker: 'Участник 1', text: 'Моя идея лучше! А ты, Лидер, вообще молчи, ты тут только недавно!' },
            { speaker: 'Участник 2', text: 'Он прав! Если ты не можешь быть объективным, то я ухожу из проекта!' },
            { speaker: 'Ты', text: 'Ситуация накаляется. Я должен вмешаться, иначе команда распадется.' },
            { action: 'show_choices', text: 'Как решить конфликт в команде?' }
        ],
        choices: [
            {
                text: 'Попросить вожатого убрать спорщиков (Жесткое решение)',
                correct: false,
                consequence: 'Конфликт решен, но ценой отчуждения. Это не способствует доверию и командной работе.'
            },
            {
                text: 'Предложить паузу и обсудить общую цель (Диалог)',
                correct: true,
                consequence: 'Ты инициируешь диалог. Проблема решается, и команда становится слаженнее. Успешная работа с конфликтом.'
            }
        ]
    },
    
    'scene3': {
        location: 'Поляна Следов (День творчества)',
        background: 'url(images/background/lab.jpg)',
        bgm: 'sound/Helynt - Potions.mp3',
        sprites: [
            { name: 'Расстроенный Участник', src: 'images/sprites/maniken_left.png', position: 'right' },
            { name: 'Ты', src: 'images/sprites/maniken_right.png', position: 'left' }
        ],
        hint: 'Важно, чтобы каждый ребенок чувствовал вклад и гордость за общее дело. Его идеи должны быть услышаны.',
        story: [
            { speaker: 'Ты', text: 'Началась работа над арт-объектом.' },
            { speaker: 'Ты', text: 'Кажется, один из участников расстроен. Его идея не прошла голосование.' },
            { speaker: 'Расстроенный Участник', text: '(Вздыхает) Почему всегда все решают через шутки?' },
            { speaker: 'Расстроенный Участник', text: 'Я хотел создать что-то серьезное, что оставит след.' },
            { speaker: 'Ты', text: 'Он прав. Ему нужно почувствовать, что его видение важно.' },
            { action: 'show_choices', text: 'Как поступить, чтобы сохранить вклад участника и общее дело?' }
        ],
        choices: [
            {
                text: 'Сказать, что большинству важнее (Подавление)',
                correct: false,
                consequence: 'Ребенок замыкается в себе. Инсталляция создана, но кто-то оставил в ней грустный след. -10% к Гордости.'
            },
            {
                text: 'Предложить создать "серьезный" центральный элемент (Компромисс)',
                correct: true,
                consequence: 'Ты находишь компромисс. Его вклад становится заметным, он гордится работой. Общий объект выигрывает.'
            }
        ]
    },
    
    'scene4': {
        location: 'Темный зал ("500 Огней")',
        background: 'url(images/background/lab.jpg)',
        bgm: 'sound/Midnight Anima - Dead Signal Smile.mp3',
        sprite: { name: 'Ведущий', src: 'images/sprites/maniken_left.png', position: 'center' },
        hint: 'Смена — безопасное место, где поддерживают твои идеи и чувства. Главное — где каждый может быть услышан. Сбрось свои страхи.',
        story: [
            { speaker: 'Ведущий', text: 'В зале 500 огней. Кто хочет поделиться своей мыслью или чувством?' },
            { speaker: 'Ты', text: 'Мне страшно, но я хочу сказать то, что чувствую.' },
            { speaker: 'Ты', text: 'Этот зал — безопасное место.' },
            { speaker: 'Твои Мысли', text: 'Может быть, просто посидеть и насладиться атмосферой?' },
            { action: 'show_choices', text: 'Что ты выберешь: безопасность или преодоление страха?' }
        ],
        choices: [
            {
                text: 'Молча наслаждаться атмосферой (Пассивный зритель)',
                correct: false,
                consequence: 'Ты остался пассивным зрителем. Ты не смог стать носителем атмосферы. Не сбросил страх.'
            },
            {
                text: 'Взять свечу и решиться выступить (Быть собой/Смелость)',
                correct: true,
                consequence: 'Ты выходишь к микрофону. Ты преодолеваешь свой страх и чувствуешь себя смелым и свободным.'
            }
        ]
    },
    
    'scene5': {
        location: 'База Бета-тестеров (Финал)',
        background: 'url(images/background/lab.jpg)',
        bgm: 'sound/Animal Crossing_ New Leaf - 3PM.mp3',
        sprites: [
            { name: 'Инженер', src: 'images/sprites/maniken_left.png', position: 'right' },
            { name: 'Ты', src: 'images/sprites/maniken_right.png', position: 'left' }
        ],
        hint: 'Опыт вторичен, главное — доводить начатое до конца. Команда должна работать слаженно, без перегрузок.',
        story: [
            { speaker: 'Инженер', text: 'Мы отловили все основные "баги", команда!' },
            { speaker: 'Инженер', text: 'Осталась только скучная документация, и можно идти на вечеринку!' },
            { speaker: 'Ты', text: 'Я очень устал, но понимаю, что без документации это незавершенное дело.' },
            { speaker: 'Ты', text: 'Нельзя бросать работу на полпути.' },
            { action: 'show_choices', text: 'Что важнее: отдых или доведение работы до конца?' }
        ],
        choices: [
            {
                text: 'Бросить это, в конце концов это "баг" (Незавершенное дело)',
                correct: false,
                consequence: 'Баг в документации остался. Ты не довел начатое до конца. Конец смены счастливый, но не совсем.'
            },
            {
                text: 'Взять задачу на себя и попросить помощи (Довести до конца)',
                correct: true,
                consequence: 'Вы завершаете работу, команда работает слаженно. Ты чувствуешь вклад и гордость за общее дело.'
            }
        ]
    },
    
    'hint': {
        location: 'Парапет',
        background: 'url(images/background/night.jpg)',
        sprites: [{ name: 'Володя', baseSrc: 'images/sprites/volodya_1', frames: 6, position: 'center' }],
        bgm: 'sound/hint.mp3',
        isHint: true,
        story: [
            { speaker: 'Володя', text: 'Привет! Я Володя Анисимов, кандидат на должность старшего вожатого.' },
            { speaker: 'Володя', text: 'Скажу так, я ценю тех, кто не боится ответственности, готов к диалогу и горит своим делом.' },
            { 
                speaker: 'Володя', 
                text: 'Подумай, какой выбор соответствует концепции:',
                spriteSrc: 'images/sprites/volodya_2'
            },
            { 
                speaker: 'Володя', 
                text: '"Жизнь - это увлекательная игра, где ты находишь себя через творчество, приключения и поддержку."',
                spriteSrc: 'images/sprites/volodya_2'
            },
            {
                speaker: 'Володя', 
                text: 'Самое важное - это то, насколько осознанно ты подходишь к делу.',
                spriteSrc: 'images/sprites/volodya_3'
            },
            {
                speaker: 'Володя', 
                text: 'Насколько глубоко понимаешь, зачем и ради чего это делаешь. Смело возвращайся к решению!',
                spriteSrc: 'images/sprites/volodya_3'
            },
            { action: 'show_choices', text: 'Вернитесь к решению.' }
        ],
        choices: [
            { text: 'Вернуться и принять решение', nextScene: 'return' }
        ]
    },
    
    'ending_consequences': {
        location: 'Отчет о последствиях (HAPPY END?)',
        background: 'url(images/background/night.jpg)',
        sprites: [{ name: 'Володя', baseSrc: 'images/sprites/volodya_3', frames: 6, position: 'center' }],
        bgm: 'sound/hint.mp3',
        text: 'Бета-тест завершен. Твои решения сформировали мир игры. Вот что произошло на смене:',
        isEnding: true,
        choices: [
            { text: 'Продолжить', nextScene: 'final_share' }
        ]
    },
    
    'ending_secret': {
        location: 'Секретная концовка: Тот же Камертон!',
        background: 'url(images/background/night.jpg)',
        sprites: [{ name: 'Володя', baseSrc: 'images/sprites/volodya_3', frames: 6, position: 'center' }],
        bgm: 'sound/hint.mp3',
        story: [
            { speaker: 'Володя', text: '!!! Секретная концовка!!!' },
            { speaker: 'Володя', text: 'Ты настроил свой Камертон на ту же частоту, что и я.' },
            { speaker: 'Володя', text: '<span style="color: #ffbf00; font-weight: bold;">Именно такое видение Смены я хочу воплотить.</span>' },
            { speaker: 'Володя', text: 'Возможно тебе стоит проголосовать за меня на выборах. Ахахаха' },
            { speaker: 'Володя', text: 'Мы с тобой создали идеальную смену, основанную на развитии, доверии и творчестве.' },
            { speaker: 'Володя', text: 'Смену, где каждый вожатый и ребенок чувствует себя на своем месте.' },
            { speaker: 'Система', text: 'Счастливая концовка: ГАРМОНИЯ ДОСТИГНУТА!' },
            { action: 'show_choices', text: 'Узнать больше о концепции "Камертон 2026"' }
        ],
        choices: [
            { text: 'Продолжить', nextScene: 'final_share' }
        ],
        isEnding: true,
    },
    
    'final_share': {
        location: 'ФИНАЛ',
        background: 'url(images/background/night.jpg)',
        sprites: [{ name: 'Володя', baseSrc: 'images/sprites/volodya_3', frames: 6, position: 'center' }],
        bgm: 'sound/hint.mp3',
        story: [
            { speaker: 'Володя', text: 'Спасибо за игру! Твои решения показали, какая смена может получиться в результате действий каждого.' },
            { speaker: 'Система', text: 'Если тебе откликается эта философия и ты хочешь, чтобы Смена "Камертон 2026" стала такой в реальности...' },
            { speaker: 'Система', text: '<span style="color: #ffbf00; font-weight: bold;">То твой голос на выборах Старших Вожатых имеет значение!</span>' },
            { speaker: 'Система', text: 'До скорой встречи - уже на настоящем Камертоне!' }
        ],
        isEnding: true,
        choices: [
            { text: 'Смотреть финальное обращение', nextScene: 'video_ending' }
        ]
    },
    
    'video_ending': {
        location: 'ФИНАЛ: Видеообращение',
        background: 'url(images/background/night.jpg)',
        bgm: null,
        isEnding: true,
        isFinalVideo: true,
        finalText: '<h2 style="color: #6abefa;">Обращение к вожатым</h2><p>Спасибо, что дошли до конца.</p><p>Помните, что <strong>именно ваш вклад</strong> - это тот самый пазл, из которого будет построена атмосфера <span style="color: #ffbf00; font-weight: bold;">«Камертона 2026»</span>.</p><p>Ваш осознанный выбор - это начало большой истории для сотен детей.</p><p>Увидимся на лагере!</p>',
        choices: []
    }
};