// modules/ResourceLoader.js - Lazy loading ресурсов с кешированием

export class ResourceLoader {
    constructor() {
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
        this.failedAssets = new Set();
    }

    // Загрузить ресурс с кешированием
    async load(url) {
        if (!url) return null;

        // Проверяем кеш
        if (this.loadedAssets.has(url)) {
            return this.loadedAssets.get(url);
        }

        // Если уже загружается - возвращаем промис
        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }

        // Если ранее была ошибка - не пытаемся снова
        if (this.failedAssets.has(url)) {
            return null;
        }

        const promise = this._loadAsset(url);
        this.loadingPromises.set(url, promise);

        try {
            const asset = await promise;
            this.loadedAssets.set(url, asset);
            this.loadingPromises.delete(url);
            return asset;
        } catch (error) {
            this.failedAssets.add(url);
            this.loadingPromises.delete(url);
            console.warn(`Failed to load: ${url}`, error);
            return null;
        }
    }

    // Внутренняя функция загрузки
    _loadAsset(url) {
        return new Promise((resolve, reject) => {
            if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.ogg')) {
                // Аудио
                const audio = new Audio(url);
                audio.oncanplaythrough = () => resolve(audio);
                audio.onerror = () => reject(new Error(`Audio load failed: ${url}`));
                audio.load();
            } else if (url.endsWith('.mp4') || url.endsWith('.webm')) {
                // Видео
                const video = document.createElement('video');
                video.onloadeddata = () => resolve(video);
                video.onerror = () => reject(new Error(`Video load failed: ${url}`));
                video.src = url;
                video.load();
            } else {
                // Изображение
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Image load failed: ${url}`));
                img.src = url;
            }
        });
    }

    // Загрузить массив ресурсов параллельно
    async loadMultiple(urls) {
        const promises = urls.map(url => this.load(url));
        return Promise.all(promises);
    }

    // Предзагрузить ресурсы для сцены
    async preloadScene(scene) {
        if (!scene) return;

        const urls = [];

        // BGM
        if (scene.bgm) {
            urls.push(scene.bgm);
        }

        // Background
        if (scene.background && scene.background.startsWith('url(')) {
            const url = scene.background.slice(4, -1).replace(/['"]/g, '');
            urls.push(url);
        }

        // Sprites
        if (scene.sprites && Array.isArray(scene.sprites)) {
            scene.sprites.forEach(spriteData => {
                this._addSpriteUrls(spriteData, urls);
            });
        }

        if (scene.sprite) {
            this._addSpriteUrls(scene.sprite, urls);
        }

        // Story sprites
        if (scene.story) {
            scene.story.forEach(step => {
                if (step.spriteSrc) {
                    for (let i = 1; i <= 6; i++) {
                        urls.push(`${step.spriteSrc}/${i}.webp`);
                    }
                }
            });
        }

        // Загружаем все параллельно
        await this.loadMultiple(urls);
    }

    // Вспомогательная функция для добавления URL спрайтов
    _addSpriteUrls(spriteData, urls) {
        if (spriteData.baseSrc && spriteData.frames) {
            for (let i = 1; i <= spriteData.frames; i++) {
                urls.push(`${spriteData.baseSrc}/${i}.webp`);
            }
        } else if (spriteData.src) {
            urls.push(spriteData.src);
        }
    }

    // Предзагрузить ВСЕ ресурсы игры сразу (полная загрузка вместо lazy loading)
    async preloadCritical() {
        const allAssets = [
            // Звуки
            'sound/typing.mp3',
            'sound/переход.mp3',
            'sound/Menu_Click.mp3',
            'sound/BGmusic.mp3',
            'sound/night.mp3',
            'sound/hint.mp3',

            // Музыка для сцен
            'sound/scene1/part1.mp3',
            'sound/scene1/part2.mp3',
            'sound/scene1/part3.mp3',
            'sound/scene2/part1.mp3',
            'sound/scene2/part2.mp3',
            'sound/scene2/part3.mp3',
            'sound/scene3/part1.mp3',
            'sound/scene4/part1.mp3',
            'sound/scene5/part1.mp3',
            'sound/scene6/part1.mp3',
            'sound/scene7/part1.mp3',
            'sound/scene8/part1.mp3',
            'sound/scene9/part1.mp3',
            'sound/scene9/part2.mp3',
            'sound/scene9/part3.mp3',
            'sound/scene9/part4.mp3',
            'sound/scene9/part5.mp3',

            // Музыка для финала
            'sound/sceneEnd/part1.mp3',
            'sound/sceneEnd/part2.mp3',
            'sound/sceneEnd/part3.mp3',

            // Фоны
            'images/background/night.webp',
            'images/background/front_of_the_dining.webp',
            'images/background/lab.webp',

            // Простые спрайты
            'images/bibikov.webp',
            'images/vitaly.webp',

            // Анимированные спрайты Володи (volodya_1)
            'images/sprites/volodya_1/1.webp',
            'images/sprites/volodya_1/2.webp',
            'images/sprites/volodya_1/3.webp',
            'images/sprites/volodya_1/4.webp',
            'images/sprites/volodya_1/5.webp',
            'images/sprites/volodya_1/6.webp',

            // Анимированные спрайты Володи (volodya_2)
            'images/sprites/volodya_2/1.webp',
            'images/sprites/volodya_2/2.webp',
            'images/sprites/volodya_2/3.webp',
            'images/sprites/volodya_2/4.webp',
            'images/sprites/volodya_2/5.webp',
            'images/sprites/volodya_2/6.webp',

            // Анимированные спрайты Володи (volodya_3)
            'images/sprites/volodya_3/1.webp',
            'images/sprites/volodya_3/2.webp',
            'images/sprites/volodya_3/3.webp',
            'images/sprites/volodya_3/4.webp',
            'images/sprites/volodya_3/5.webp',
            'images/sprites/volodya_3/6.webp',

            // Анимированные спрайты для финала (volodya_bye)
            'images/sprites/volodya_bye/volodya_bye.gif',
            


        ];

        console.log('🔄 Загрузка всех ресурсов игры...');
        const startTime = performance.now();

        const results = await this.loadMultiple(allAssets);

        const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Все ресурсы загружены за ${loadTime}с`);
        console.log(`📊 Загружено: ${this.loadedAssets.size}, Ошибок: ${this.failedAssets.size}`);

        return results;
    }

    // Получить статистику
    getStats() {
        return {
            loaded: this.loadedAssets.size,
            failed: this.failedAssets.size,
            loading: this.loadingPromises.size,
            cacheSize: this._calculateCacheSize()
        };
    }

    // Рассчитать примерный размер кеша
    _calculateCacheSize() {
        let size = 0;
        this.loadedAssets.forEach((asset, url) => {
            // Примерная оценка
            size += url.length * 2; // URL в памяти
            if (asset instanceof Image) {
                size += asset.width * asset.height * 4; // RGBA
            }
        });
        return (size / 1024 / 1024).toFixed(2) + ' MB';
    }

    // Очистить кеш
    clearCache() {
        this.loadedAssets.clear();
        this.failedAssets.clear();
        console.log('Resource cache cleared');
    }

    // Очистить неиспользуемые ресурсы
    clearUnused(keepUrls = []) {
        const keepSet = new Set(keepUrls);

        for (const [url, asset] of this.loadedAssets.entries()) {
            if (!keepSet.has(url)) {
                this.loadedAssets.delete(url);
            }
        }

        console.log(`Cleared unused resources. Kept: ${keepSet.size}, Total: ${this.loadedAssets.size}`);
    }

    // Проверить, загружен ли ресурс
    isLoaded(url) {
        return this.loadedAssets.has(url);
    }

    // Получить загруженный ресурс
    get(url) {
        return this.loadedAssets.get(url) || null;
    }

    // Очистка при уничтожении
    dispose() {
        this.clearCache();
        this.loadingPromises.clear();
    }
}
