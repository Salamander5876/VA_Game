// modules/GameState.js - Управление состоянием игры

export class GameState {
    constructor(storageManager) {
        this.storage = storageManager;
        this.reset();
    }

    // Сброс состояния
    reset() {
        this.currentSceneId = 'welcome_message';
        this.correctChoices = 0;
        this.totalScenes = 0;
        this.consequencesReport = [];
        this.dialogHistory = [];
        this.currentStoryIndex = 0;
        this.autoSaveCounter = 0;
        this.sceneStack = [];

        // Флаги состояния
        this.isAwaitingChoice = false;
        this.isAwaitingConsequenceClick = false;
        this.isAdvancing = false;
        this.isTyping = false;

        // Счетчики для достижений
        this.hintUsedCount = 0;
        this.skipCount = 0;
    }

    // === СОХРАНЕНИЕ/ЗАГРУЗКА ===
    save(isAutoSave = false) {
        const saveData = {
            currentSceneId: this.currentSceneId,
            correctChoices: this.correctChoices,
            totalScenes: this.totalScenes,
            consequencesReport: this.consequencesReport,
            dialogHistory: this.dialogHistory.slice(-100), // Только последние 100
            timestamp: Date.now(),
            version: '1.1'
        };

        const success = this.storage.setItem('save', saveData);

        if (!isAutoSave && success) {
            this._showNotification('Игра сохранена!');
        } else if (!isAutoSave && !success) {
            this._showNotification('Ошибка сохранения!');
        }

        return success;
    }

    load() {
        const saveData = this.storage.getItem('save');

        if (!saveData) return false;

        try {
            this.currentSceneId = saveData.currentSceneId || 'welcome_message';
            this.correctChoices = saveData.correctChoices || 0;
            this.totalScenes = saveData.totalScenes || 0;
            this.consequencesReport = saveData.consequencesReport || [];
            this.dialogHistory = saveData.dialogHistory || [];

            console.log('✅ Game loaded from save:', saveData.timestamp ? new Date(saveData.timestamp).toLocaleString() : 'unknown');
            return true;
        } catch (e) {
            console.error('Failed to parse save data:', e);
            return false;
        }
    }

    hasSave() {
        return this.storage.hasItem('save');
    }

    deleteSave() {
        return this.storage.removeItem('save');
    }

    // === АВТОСОХРАНЕНИЕ ===
    checkAutoSave() {
        if (this.currentSceneId.startsWith('scene')) {
            this.autoSaveCounter++;

            if (this.autoSaveCounter >= 3) {
                this.save(true);
                this.autoSaveCounter = 0;
                console.log('🔄 Auto-saved');
            }
        }
    }

    // === ИСТОРИЯ ДИАЛОГОВ ===
    addToHistory(speaker, text) {
        if (!text) return;

        this.dialogHistory.push({
            speaker: speaker || '',
            text: text,
            timestamp: Date.now()
        });

        // Ограничиваем историю 100 записями
        if (this.dialogHistory.length > 100) {
            this.dialogHistory.shift();
        }
    }

    getHistory() {
        return this.dialogHistory;
    }

    clearHistory() {
        this.dialogHistory = [];
    }

    // === ПОСЛЕДСТВИЯ ВЫБОРОВ ===
    addConsequence(scene, choice, consequence, isCorrect) {
        this.consequencesReport.push({
            scene: scene,
            choice: choice,
            consequence: consequence,
            isCorrect: isCorrect,
            timestamp: Date.now()
        });
    }

    getConsequences() {
        return this.consequencesReport;
    }

    // === ПРОГРЕСС ===
    incrementScenes() {
        this.totalScenes++;
    }

    incrementCorrectChoices() {
        this.correctChoices++;
    }

    getProgress() {
        return {
            totalScenes: this.totalScenes,
            correctChoices: this.correctChoices,
            accuracy: this.totalScenes > 0 ? (this.correctChoices / this.totalScenes * 100).toFixed(1) : 0
        };
    }

    isPerfectRun() {
        return this.totalScenes > 0 && this.correctChoices === this.totalScenes;
    }

    // === СТЕК СЦЕН (для возврата из подсказки) ===
    pushScene(sceneId) {
        this.sceneStack.push(sceneId);
    }

    popScene() {
        return this.sceneStack.pop();
    }

    // === ФЛАГИ СОСТОЯНИЯ ===
    setAwaitingChoice(value) {
        this.isAwaitingChoice = value;
    }

    setAwaitingConsequence(value) {
        this.isAwaitingConsequenceClick = value;
    }

    setAdvancing(value) {
        this.isAdvancing = value;
    }

    setTyping(value) {
        this.isTyping = value;
    }

    // === СЧЕТЧИКИ ДЛЯ ДОСТИЖЕНИЙ ===
    incrementHintUsed() {
        this.hintUsedCount++;
        return this.hintUsedCount;
    }

    incrementSkip() {
        this.skipCount++;
        return this.skipCount;
    }

    // === УТИЛИТЫ ===
    getSceneNumber() {
        const match = this.currentSceneId.match(/scene(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    isInTutorial() {
        return this.currentSceneId.startsWith('tutorial');
    }

    isInEnding() {
        return this.currentSceneId.startsWith('ending');
    }

    // === ЭКСПОРТ/ИМПОРТ ===
    exportToJSON() {
        return {
            ...this.save(),
            exported: new Date().toISOString()
        };
    }

    importFromJSON(data) {
        if (!data || typeof data !== 'object') {
            console.error('Invalid import data');
            return false;
        }

        try {
            this.currentSceneId = data.currentSceneId || 'welcome_message';
            this.correctChoices = data.correctChoices || 0;
            this.totalScenes = data.totalScenes || 0;
            this.consequencesReport = data.consequencesReport || [];
            this.dialogHistory = data.dialogHistory || [];

            console.log('✅ Game state imported');
            return true;
        } catch (e) {
            console.error('Failed to import game state:', e);
            return false;
        }
    }

    // Приватная функция для уведомлений
    _showNotification(text) {
        if (typeof window !== 'undefined' && window.showNotification) {
            window.showNotification(text);
        }
    }
}
