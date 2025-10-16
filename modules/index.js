// modules/index.js - Главный экспорт всех модулей

export { AudioManager } from './AudioManager.js';
export { StorageManager } from './StorageManager.js';
export { AnimationManager } from './AnimationManager.js';
export { ResourceLoader } from './ResourceLoader.js';
export { GameState } from './GameState.js';
export { AchievementManager } from './AchievementManager.js';
export { Utils } from './Utils.js';

// Создание класса для всей игры (опционально)
export class KamertonEngine {
    constructor(userSettings = {}) {
        // Инициализация всех менеджеров
        this.storage = new StorageManager();
        this.audio = new AudioManager(userSettings);
        this.animation = new AnimationManager();
        this.resources = new ResourceLoader();
        this.gameState = new GameState(this.storage);
        this.achievements = new AchievementManager(this.storage);

        console.log('🎮 Kamerton Engine initialized');
    }

    // Загрузка критических ресурсов
    async preload() {
        console.log('⏳ Preloading critical resources...');
        await this.resources.preloadCritical();
        console.log('✅ Critical resources loaded');
    }

    // Запуск игры
    start() {
        console.log('🚀 Game started');
        // Здесь можно добавить логику запуска
    }

    // Получить статистику
    getStats() {
        return {
            resources: this.resources.getStats(),
            gameState: this.gameState.getProgress(),
            achievements: this.achievements.getProgress(),
            storage: {
                size: this.storage.getTotalSize()
            }
        };
    }

    // Очистка всех ресурсов
    dispose() {
        this.animation.dispose();
        this.audio.dispose();
        this.resources.dispose();
        console.log('🗑️ Engine disposed');
    }
}

export default KamertonEngine;
