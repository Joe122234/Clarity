// storage.js - LocalStorage functions for Clarity

const StorageKeys = {
    MONTHLY: 'clarity_monthly_goals',
    WEEKLY: 'clarity_weekly_goals',
    DAILY: 'clarity_daily_tasks',
    REFLECTION: 'clarity_reflections'
};

const StorageManager = {
    // Generic Operations
    _save: function (key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            if (window.syncToFirebase) {
                window.syncToFirebase(key, data);
            }
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    },

    _get: function (key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return [];
        }
    },

    // Category Specific Retrievers
    getMonthlyGoals: function () { return this._get(StorageKeys.MONTHLY); },
    getWeeklyGoals: function () { return this._get(StorageKeys.WEEKLY); },
    getDailyTasks: function () { return this._get(StorageKeys.DAILY); },
    getReflections: function () { return this._get(StorageKeys.REFLECTION); },

    // Add new items
    addMonthlyGoal: function (goalData) {
        const goals = this.getMonthlyGoals();
        const newGoal = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...goalData };
        goals.push(newGoal);
        return this._save(StorageKeys.MONTHLY, goals) ? newGoal : null;
    },

    addWeeklyGoal: function (goalData) {
        const goals = this.getWeeklyGoals();
        const newGoal = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...goalData };
        goals.push(newGoal);
        return this._save(StorageKeys.WEEKLY, goals) ? newGoal : null;
    },

    addDailyTask: function (taskData) {
        const tasks = this.getDailyTasks();
        const newTask = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...taskData };
        tasks.push(newTask);
        return this._save(StorageKeys.DAILY, tasks) ? newTask : null;
    },

    addReflection: function (reflectionData) {
        const reflections = this.getReflections();
        const newReflection = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...reflectionData };
        reflections.push(newReflection);
        return this._save(StorageKeys.REFLECTION, reflections) ? newReflection : null;
    },

    // Update existing items
    updateItem: function (categoryKey, id, updateData) {
        const items = this._get(categoryKey);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updateData, updatedAt: new Date().toISOString() };
            return this._save(categoryKey, items);
        }
        return false;
    },

    // Reorder items
    reorderItems: function (categoryKey, newOrderIds) {
        const items = this._get(categoryKey);
        const reordered = newOrderIds.map(id => items.find(item => item.id === id)).filter(Boolean);
        const missed = items.filter(item => !newOrderIds.includes(item.id));
        return this._save(categoryKey, [...reordered, ...missed]);
    },

    // Delete existing items
    deleteItem: function (categoryKey, id) {
        let items = this._get(categoryKey);
        const originalLength = items.length;
        items = items.filter(item => item.id !== id);

        if (items.length < originalLength) {
            return this._save(categoryKey, items);
        }
        return false;
    }
};
