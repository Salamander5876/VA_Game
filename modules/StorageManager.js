// modules/StorageManager.js - Управление localStorage с компрессией

export class StorageManager {
    constructor() {
        this.compressionEnabled = true;
        this.prefix = 'kamerton_';
    }

    // === КОМПРЕССИЯ ===
    compress(str) {
        if (!this.compressionEnabled) return str;
        try {
            return btoa(encodeURIComponent(str));
        } catch (e) {
            console.warn('Compression failed:', e);
            return str;
        }
    }

    decompress(str) {
        if (!this.compressionEnabled) return str;
        try {
            return decodeURIComponent(atob(str));
        } catch (e) {
            console.warn('Decompression failed:', e);
            return str;
        }
    }

    // === ОСНОВНЫЕ ОПЕРАЦИИ ===
    setItem(key, value) {
        try {
            const fullKey = this.prefix + key;
            const jsonString = JSON.stringify(value);
            const compressed = this.compress(jsonString);

            localStorage.setItem(fullKey, compressed);

            // Логируем экономию
            const originalSize = new Blob([jsonString]).size;
            const compressedSize = new Blob([compressed]).size;
            const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);

            console.log(`💾 Saved '${key}': ${originalSize}B → ${compressedSize}B (${savings}% savings)`);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded!');
                this.handleQuotaExceeded();
            } else {
                console.error('Failed to save to localStorage:', e);
            }
            return false;
        }
    }

    getItem(key) {
        try {
            const fullKey = this.prefix + key;
            const compressed = localStorage.getItem(fullKey);

            if (!compressed) return null;

            const decompressed = this.decompress(compressed);
            return JSON.parse(decompressed);
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    }

    removeItem(key) {
        try {
            const fullKey = this.prefix + key;
            localStorage.removeItem(fullKey);
            return true;
        } catch (e) {
            console.error('Failed to remove from localStorage:', e);
            return false;
        }
    }

    hasItem(key) {
        const fullKey = this.prefix + key;
        return localStorage.getItem(fullKey) !== null;
    }

    // === УТИЛИТЫ ===
    getTotalSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key) && key.startsWith(this.prefix)) {
                    total += localStorage[key].length + key.length;
                }
            }
            const totalKB = (total / 1024).toFixed(2);
            console.log(`📊 Total game storage: ${totalKB}KB`);
            return total;
        } catch (e) {
            console.warn('Could not calculate total size:', e);
            return 0;
        }
    }

    clearAll(preserveSettings = true) {
        try {
            const settings = preserveSettings ? this.getItem('settings') : null;
            const achievements = preserveSettings ? this.getItem('achievements') : null;

            // Удаляем все ключи с префиксом
            for (let key in localStorage) {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            }

            // Восстанавливаем настройки и достижения
            if (settings) this.setItem('settings', settings);
            if (achievements) this.setItem('achievements', achievements);

            console.log('🗑️ Game data cleared' + (preserveSettings ? ' (settings preserved)' : ''));
            return true;
        } catch (e) {
            console.error('Failed to clear game data:', e);
            return false;
        }
    }

    // Обработка переполнения
    handleQuotaExceeded() {
        console.warn('Attempting to free up space...');

        // Удаляем старые автосохранения (если есть)
        const autoSaves = [];
        for (let key in localStorage) {
            if (key.startsWith(this.prefix + 'autosave_')) {
                autoSaves.push(key);
            }
        }

        if (autoSaves.length > 0) {
            // Удаляем самое старое автосохранение
            autoSaves.sort();
            localStorage.removeItem(autoSaves[0]);
            console.log('Removed old autosave to free space');
        }
    }

    // Экспорт сохранения в JSON
    exportSave(key) {
        const data = this.getItem(key);
        if (!data) return null;

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        return { blob, url, data };
    }

    // Импорт сохранения из JSON
    importSave(key, jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return this.setItem(key, data);
        } catch (e) {
            console.error('Failed to import save:', e);
            return false;
        }
    }
}
