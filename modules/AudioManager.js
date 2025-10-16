// modules/AudioManager.js - Управление всем аудио в игре

export class AudioManager {
    constructor(settings) {
        this.settings = settings;
        this.currentBGM = null;
        this.isInitialized = false;

        // Создание аудио объектов
        this.typingSound = new Audio('sound/typing.mp3');
        this.transitionSound = new Audio('sound/переход.mp3');
        this.menuClickSound = new Audio('sound/Menu_Click.mp3');
        this.backgroundMusic = new Audio();

        this.init();
    }

    init() {
        if (this.isInitialized) return;

        // Предзагрузка аудио
        this.typingSound.preload = 'auto';
        this.transitionSound.preload = 'auto';
        this.menuClickSound.preload = 'auto';
        this.backgroundMusic.preload = 'auto';

        // Установка начальной громкости
        this.updateVolumes();

        // Загрузка файлов
        this.typingSound.load();
        this.transitionSound.load();
        this.menuClickSound.load();

        this.isInitialized = true;
    }

    updateVolumes() {
        this.typingSound.volume = this.settings.sfxVolume;
        this.transitionSound.volume = this.settings.sfxVolume;
        this.menuClickSound.volume = this.settings.sfxVolume;
        this.backgroundMusic.volume = this.settings.bgmVolume;
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.updateVolumes();
    }

    // === TYPING SOUND ===
    playTyping() {
        try {
            this.typingSound.currentTime = 0;
            this.typingSound.play().catch(e => console.log("Typing sound error:", e));
        } catch (e) {
            console.warn("Failed to play typing sound:", e);
        }
    }

    stopTyping() {
        try {
            this.typingSound.pause();
            this.typingSound.currentTime = 0;
        } catch (e) {
            console.warn("Failed to stop typing sound:", e);
        }
    }

    // === TRANSITION SOUND ===
    playTransition() {
        try {
            this.transitionSound.currentTime = 0;
            this.transitionSound.play().catch(e => console.log("Transition sound error:", e));
        } catch (e) {
            console.warn("Failed to play transition sound:", e);
        }
    }

    // === MENU CLICK SOUND ===
    playMenuClick() {
        try {
            this.menuClickSound.currentTime = 0;
            this.menuClickSound.play().catch(e => console.log("Menu click sound error:", e));
        } catch (e) {
            console.warn("Failed to play menu click sound:", e);
        }
    }

    // === BACKGROUND MUSIC ===
    playBGM(src) {
        if (!src) return;

        if (src === this.currentBGM) {
            // Если та же музыка и на паузе - возобновляем
            if (this.backgroundMusic.paused) {
                this.resumeBGM();
            }
            return;
        }

        this.currentBGM = src;
        this.backgroundMusic.src = src;
        this.backgroundMusic.loop = true;

        this.backgroundMusic.play().catch(e => {
            console.warn("BGM autoplay blocked:", e);
            // Попытка воспроизведения при первом клике
            const playOnClick = () => {
                this.backgroundMusic.play().catch(err => console.error("BGM retry error:", err));
                document.removeEventListener('click', playOnClick);
            };
            document.addEventListener('click', playOnClick, { once: true });
        });
    }

    pauseBGM() {
        try {
            this.backgroundMusic.pause();
        } catch (e) {
            console.warn("Failed to pause BGM:", e);
        }
    }

    resumeBGM() {
        if (this.currentBGM && this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(e => console.log('BGM resume error:', e));
        }
    }

    stopBGM() {
        try {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.currentBGM = null;
        } catch (e) {
            console.warn("Failed to stop BGM:", e);
        }
    }

    getCurrentBGM() {
        return this.currentBGM;
    }

    // Очистка ресурсов
    dispose() {
        this.stopBGM();
        this.stopTyping();
        this.typingSound = null;
        this.transitionSound = null;
        this.menuClickSound = null;
        this.backgroundMusic = null;
    }
}
