// modules/AchievementManager.js - Управление достижениями

export class AchievementManager {
    constructor(storageManager) {
        this.storage = storageManager;

        // Определение всех достижений
        this.achievements = {
            first_choice: {
                title: 'Первый выбор',
                desc: 'Сделайте свой первый выбор',
                icon: '🎯',
                unlocked: false
            },
            perfect_run: {
                title: 'Идеальная гармония',
                desc: 'Пройдите игру без ошибок',
                icon: '🏆',
                unlocked: false
            },
            hint_master: {
                title: 'Мудрый советник',
                desc: 'Используйте подсказку 3 раза',
                icon: '☯',
                unlocked: false
            },
            speed_reader: {
                title: 'Скоростной читатель',
                desc: 'Пропустите текст 10 раз',
                icon: '⚡',
                unlocked: false
            },
            storyteller: {
                title: 'Хранитель историй',
                desc: 'Откройте историю диалогов',
                icon: '📜',
                unlocked: false
            },
            completionist: {
                title: 'Финалист',
                desc: 'Завершите игру',
                icon: '🎬',
                unlocked: false
            },
            explorer: {
                title: 'Исследователь',
                desc: 'Посетите все основные сцены',
                icon: '🗺️',
                unlocked: false
            }
        };

        this.loadFromStorage();
    }

    // Загрузка из localStorage
    loadFromStorage() {
        const saved = this.storage.getItem('achievements');

        if (saved && typeof saved === 'object') {
            Object.keys(saved).forEach(key => {
                if (this.achievements[key]) {
                    this.achievements[key].unlocked = saved[key];
                }
            });
        }
    }

    // Сохранение в localStorage
    saveToStorage() {
        const toSave = {};
        Object.keys(this.achievements).forEach(key => {
            toSave[key] = this.achievements[key].unlocked;
        });

        this.storage.setItem('achievements', toSave);
    }

    // Разблокировать достижение
    unlock(key) {
        if (!this.achievements[key]) {
            console.warn(`Achievement '${key}' not found`);
            return false;
        }

        if (this.achievements[key].unlocked) {
            return false; // Уже разблокировано
        }

        this.achievements[key].unlocked = true;
        this.saveToStorage();
        this._showNotification(this.achievements[key]);

        console.log(`🏆 Achievement unlocked: ${this.achievements[key].title}`);
        return true;
    }

    // Проверить, разблокировано ли достижение
    isUnlocked(key) {
        return this.achievements[key]?.unlocked || false;
    }

    // Получить все достижения
    getAll() {
        return Object.keys(this.achievements).map(key => ({
            key,
            ...this.achievements[key]
        }));
    }

    // Получить разблокированные достижения
    getUnlocked() {
        return this.getAll().filter(ach => ach.unlocked);
    }

    // Получить прогресс (%)
    getProgress() {
        const total = Object.keys(this.achievements).length;
        const unlocked = this.getUnlocked().length;
        return {
            unlocked,
            total,
            percentage: ((unlocked / total) * 100).toFixed(1)
        };
    }

    // Сбросить все достижения
    resetAll() {
        Object.keys(this.achievements).forEach(key => {
            this.achievements[key].unlocked = false;
        });
        this.saveToStorage();
        console.log('🗑️ All achievements reset');
    }

    // Разблокировать все (для отладки)
    unlockAll() {
        Object.keys(this.achievements).forEach(key => {
            this.achievements[key].unlocked = true;
        });
        this.saveToStorage();
        console.log('🎉 All achievements unlocked');
    }

    // Показать уведомление о достижении
    _showNotification(achievement) {
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

    // Экспорт достижений
    export() {
        return {
            achievements: this.achievements,
            progress: this.getProgress(),
            exportedAt: new Date().toISOString()
        };
    }

    // Импорт достижений
    import(data) {
        if (!data || !data.achievements) {
            console.error('Invalid achievement data');
            return false;
        }

        try {
            Object.keys(data.achievements).forEach(key => {
                if (this.achievements[key]) {
                    this.achievements[key].unlocked = data.achievements[key].unlocked;
                }
            });

            this.saveToStorage();
            console.log('✅ Achievements imported');
            return true;
        } catch (e) {
            console.error('Failed to import achievements:', e);
            return false;
        }
    }
}
