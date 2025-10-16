// modules/AnimationManager.js - Управление анимацией спрайтов

export class AnimationManager {
    constructor() {
        this.activeSprites = new Set();
        this.animationFrameId = null;
        this.frameDelay = 200; // ms между кадрами
    }

    // Запуск анимации для спрайта
    startAnimation(sprite, baseSrc, frames = 6) {
        if (!sprite || !baseSrc) {
            console.warn('Invalid sprite or baseSrc');
            return;
        }

        // Настройка данных спрайта
        sprite.dataset.baseSrc = baseSrc;
        sprite.dataset.frames = frames;
        sprite.dataset.currentFrame = 1;
        sprite.dataset.lastFrameUpdate = 0;
        sprite.src = `${baseSrc}/1.png`;

        // Добавляем в активные
        this.activeSprites.add(sprite);

        // Запускаем глобальный цикл анимации
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
        }
    }

    // Остановка анимации для конкретного спрайта
    stopAnimation(sprite) {
        this.activeSprites.delete(sprite);

        if (sprite) {
            delete sprite.dataset.baseSrc;
            delete sprite.dataset.frames;
            delete sprite.dataset.currentFrame;
            delete sprite.dataset.lastFrameUpdate;
        }

        // Останавливаем цикл если нет активных спрайтов
        if (this.activeSprites.size === 0 && this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Остановка всех анимаций
    stopAll() {
        this.activeSprites.forEach(sprite => {
            this.stopAnimation(sprite);
        });
        this.activeSprites.clear();

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Главный цикл анимации (оптимизированный)
    animate(timestamp) {
        this.activeSprites.forEach(sprite => {
            const baseSrc = sprite.dataset.baseSrc;
            const frames = parseInt(sprite.dataset.frames);
            const lastUpdate = parseFloat(sprite.dataset.lastFrameUpdate) || 0;

            // Проверяем, нужно ли обновить кадр
            if (timestamp - lastUpdate >= this.frameDelay) {
                let currentFrame = parseInt(sprite.dataset.currentFrame);
                currentFrame = currentFrame >= frames ? 1 : currentFrame + 1;

                sprite.dataset.currentFrame = currentFrame;
                sprite.dataset.lastFrameUpdate = timestamp;

                // Обновляем src только если элемент еще в DOM
                if (sprite.isConnected) {
                    sprite.src = `${baseSrc}/${currentFrame}.png`;
                } else {
                    // Удаляем из активных если не в DOM
                    this.stopAnimation(sprite);
                }
            }
        });

        // Продолжаем цикл если есть активные спрайты
        if (this.activeSprites.size > 0) {
            this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
        } else {
            this.animationFrameId = null;
        }
    }

    // Изменение скорости анимации
    setFrameDelay(delay) {
        this.frameDelay = Math.max(50, Math.min(1000, delay)); // 50-1000ms
    }

    // Получить количество активных анимаций
    getActiveCount() {
        return this.activeSprites.size;
    }

    // Пауза всех анимаций
    pauseAll() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Возобновление всех анимаций
    resumeAll() {
        if (this.activeSprites.size > 0 && !this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
        }
    }

    // Очистка ресурсов
    dispose() {
        this.stopAll();
        this.activeSprites = null;
    }
}
