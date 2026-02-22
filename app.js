// app.js - Main Application Logic

let currentViewId = 'dashboard';
let dragCategory = null;
let currentDay = new Date().getDate();
let currentSort = 'date';

document.addEventListener('DOMContentLoaded', () => {
    initGmailGate();
    initApp();
    startClock();
});

document.addEventListener('gmailUnlocked', async () => {
    console.log("Both accounts connected. Fetching emails from last 24 hours...");
    const emails = await fetchAllRecentEmails();
    console.log("Recent Emails:", emails);

    const intelligence = await generateEmailIntelligence(emails);
    if (intelligence) {
        processIntelligence(intelligence);
    }
});

document.addEventListener('firebaseDataChanged', () => {
    navigate(currentViewId);
});

function initApp() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Setup navigation listeners
    const navLinks = document.querySelectorAll('#sidebar a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }

            const targetId = e.currentTarget.getAttribute('href').substring(1);
            currentViewId = targetId;
            navigate(targetId);
        });
    });

    // Default to dashboard
    document.querySelector('a[href="#dashboard"]').classList.add('active');
    navigate('dashboard');
}

function navigate(viewId) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = ''; // Clear current view

    if (viewId === 'dashboard') {
        renderDashboard(mainContent);
    } else if (viewId === 'daily-execution') {
        renderDailyExecution(mainContent);
    } else if (viewId === 'weekly-planner') {
        renderWeeklyPlanner(mainContent);
    } else if (viewId === 'monthly-goals') {
        renderMonthlyGoals(mainContent);
    } else if (viewId === 'analytics') {
        renderAnalytics(mainContent);
    } else {
        const title = viewId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        mainContent.innerHTML = `
            <div class="card">
                <h2 style="margin-bottom: 24px;">${title}</h2>
                <p style="color: var(--text-muted);">This module is currently under construction.</p>
            </div>
        `;
    }
}

// ---------------------------------------------------------
// View Renderers
// ---------------------------------------------------------

function renderDashboard(container) {
    const allMonthly = StorageManager.getMonthlyGoals();
    const allDaily = StorageManager.getDailyTasks();

    const monthlyGoals = allMonthly.filter(g => !g.archived);
    const topMonthly = monthlyGoals.slice(0, 3);
    const weeklyGoals = StorageManager.getWeeklyGoals().filter(g => !g.archived);
    const dailyTasks = allDaily.filter(t => !t.archived);
    const todayTasks = [...dailyTasks].slice(0, 3);
    const streak = calculateStreak(allDaily);

    const monthlyPercent = monthlyGoals.length ? Math.round((monthlyGoals.filter(g => g.completed).length / monthlyGoals.length) * 100) : 0;
    const dailyPercent = todayTasks.length ? Math.round((todayTasks.filter(t => t.completed).length / todayTasks.length) * 100) : 0;

    container.innerHTML = `
        <div style="padding-bottom: 24px;">
            <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 4px; font-weight: 500;">${getGreeting()}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <h2 style="font-size: 2.2rem; margin: 0; line-height: 1.2;">Dashboard</h2>
                <div style="background-color: var(--card-color); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 20px; font-weight: 500; font-family: 'Unbounded', sans-serif; font-size: 0.85rem; white-space: nowrap; flex-shrink: 0;">
                    🔥 <span id="streak-value" style="margin-left: 6px;">0 Day Streak</span>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                <h3 style="color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.05em;">Today's Top Tasks</h3>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-family: 'Unbounded', sans-serif;">${dailyPercent}%</span>
            </div>
            <div class="progress-bar-bg" style="margin-top: -10px; margin-bottom: 20px;">
                <div class="progress-bar-fill" style="width: ${dailyPercent}%;"></div>
            </div>
            <div id="dash-tasks-list">
                ${renderListItems(todayTasks, 'daily', 'No active tasks for today. Go to Daily Execution to plan!')}
            </div>
            <button onclick="document.querySelector('a[href=\\'#daily-execution\\']').click()" style="margin-top: 16px; background: transparent; border: 1px solid var(--border-color); color: var(--text-color);">Go to Tasks</button>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <h3 style="margin-bottom: var(--spacing-md); color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.05em;">Weekly Focus</h3>
                <div id="dash-weekly-list">
                    ${renderListItems(weeklyGoals, 'weekly', 'No weekly focus set yet.')}
                </div>
            </div>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
                    <h3 style="color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.05em;">Monthly Goals (Top 3)</h3>
                    <div class="circular-progress" style="background: conic-gradient(var(--accent-color) ${monthlyPercent}%, rgba(250, 243, 225, 0.05) 0);">
                        <div class="circular-progress-value">${monthlyPercent}%</div>
                    </div>
                </div>
                <div id="dash-monthly-list">
                    ${renderListItems(topMonthly, 'monthly', 'No monthly goals set yet.')}
                </div>
            </div>
        </div>
    `;

    setupDragAndDrop('dash-tasks-list', 'daily');
    setupDragAndDrop('dash-weekly-list', 'weekly');
    setupDragAndDrop('dash-monthly-list', 'monthly');

    // Animate streak
    const streakSpan = document.getElementById('streak-value');
    if (streak > 0) {
        let current = 0;
        const incr = Math.max(1, Math.floor(streak / 15));
        const iv = setInterval(() => {
            current += incr;
            if (current >= streak) {
                current = streak;
                clearInterval(iv);
            }
            streakSpan.innerHTML = `${current} Day Streak`;
        }, 30);
    }
}

function renderDailyExecution(container) {
    const dailyTasks = StorageManager.getDailyTasks().filter(t => !t.archived);
    const todayTasks = [...dailyTasks];

    // Sorting
    const diffValues = { 'easy': 1, 'medium': 2, 'hard': 3 };
    if (currentSort === 'difficulty') {
        todayTasks.sort((a, b) => (diffValues[b.difficulty || 'easy'] - diffValues[a.difficulty || 'easy']));
    } else {
        todayTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    const hardCount = todayTasks.filter(t => t.difficulty === 'hard').length;
    const mediumCount = todayTasks.filter(t => t.difficulty === 'medium').length;
    const easyCount = todayTasks.filter(t => !t.difficulty || t.difficulty === 'easy').length;

    container.innerHTML = `
        <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Daily Execution</h2>
        <p style="color: var(--text-muted); margin-bottom: var(--spacing-md);">What are your most important tasks for today?</p>
        
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: var(--spacing-lg); font-size: 0.85rem; color: var(--text-muted);">
            <div style="background: rgba(250, 243, 225, 0.03); padding: 8px 16px; border-radius: 12px; border: 1px solid var(--border-color);">Hard tasks today: <span style="color: var(--text-color);">${hardCount}</span></div>
            <div style="background: rgba(250, 243, 225, 0.03); padding: 8px 16px; border-radius: 12px; border: 1px solid var(--border-color);">Medium tasks today: <span style="color: var(--text-color);">${mediumCount}</span></div>
            <div style="background: rgba(250, 243, 225, 0.03); padding: 8px 16px; border-radius: 12px; border: 1px solid var(--border-color);">Easy tasks today: <span style="color: var(--text-color);">${easyCount}</span></div>
        </div>
        
        <div class="card">
            <div class="input-group">
                <input type="text" id="new-task-input" placeholder="Enter a new task..." onkeypress="handleEnter(event, addDailyTask)">
                <select id="task-difficulty" class="minimal-select">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
                <button onclick="addDailyTask()">Add Task</button>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                <select id="task-sort" class="minimal-select" style="padding: 6px 12px; font-size: 0.8rem;" onchange="changeSort(this.value)">
                    <option value="date" ${currentSort === 'date' ? 'selected' : ''}>Sort by Date</option>
                    <option value="difficulty" ${currentSort === 'difficulty' ? 'selected' : ''}>Sort by Difficulty</option>
                </select>
            </div>

            <div id="daily-tasks-list" style="margin-top: 16px;">
                ${renderListItems(todayTasks, 'daily', 'No tasks added yet today. Start by adding one above!')}
            </div>
        </div>
    `;
    setupDragAndDrop('daily-tasks-list', 'daily');
}

function renderWeeklyPlanner(container) {
    const weeklyGoals = StorageManager.getWeeklyGoals().filter(t => !t.archived);

    // Auto-update to show correct dynamic week range instead of an ambiguous ISO week number
    const curr = new Date();
    const first = curr.getDate() - curr.getDay();
    const firstDay = new Date(curr.setDate(first));
    const lastDay = new Date(curr.setDate(first + 6));
    const weekDisplay = `${firstDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = new Date().getDay();
    const daysHtml = days.map((day, i) => `
        <div style="flex: 1; text-align: center; padding: 12px 6px; border-radius: 12px; font-size: 0.8rem; font-family: 'Unbounded', sans-serif; transition: all 0.3s ease; 
            ${i === todayIndex ? 'background: var(--text-color); color: var(--bg-color); box-shadow: 0 4px 12px rgba(250,243,225,0.15);' : 'background: rgba(250,243,225,0.03); border: 1px solid var(--border-color); color: var(--text-muted);'}">
            ${day}
        </div>
    `).join('');

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
            <h2 style="font-size: 2.2rem; margin-bottom: 0;">Weekly Planner</h2>
            <span style="font-family: 'Unbounded', sans-serif; font-size: 0.85rem; color: var(--text-color); padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 16px; background: var(--card-color);">${weekDisplay}</span>
        </div>
        <p style="color: var(--text-muted); margin-bottom: var(--spacing-md);">What is your focus for this week?</p>
        
        <div style="display: flex; gap: 8px; margin-bottom: var(--spacing-lg); overflow-x: auto; padding-bottom: 4px;">
            ${daysHtml}
        </div>
        
        <div class="card">
            <div class="input-group">
                <input type="text" id="new-weekly-input" placeholder="Enter a weekly goal..." onkeypress="handleEnter(event, addWeeklyGoal)">
                <button onclick="addWeeklyGoal()">Add Goal</button>
            </div>
            <div id="weekly-goals-list" style="margin-top: 24px;">
                ${renderListItems(weeklyGoals, 'weekly', 'No weekly goals added yet.')}
            </div>
        </div>
    `;
    setupDragAndDrop('weekly-goals-list', 'weekly');
}

function renderMonthlyGoals(container) {
    const monthlyGoals = StorageManager.getMonthlyGoals().filter(g => !g.archived);

    container.innerHTML = `
        <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Monthly Goals</h2>
        <p style="color: var(--text-muted); margin-bottom: var(--spacing-lg);">What are you aiming to achieve this month?</p>
        
        <div class="card">
            <div class="input-group">
                <input type="text" id="new-monthly-input" placeholder="Enter a monthly goal or focus..." onkeypress="handleEnter(event, addMonthlyGoal)">
                <button onclick="addMonthlyGoal()">Add Goal</button>
            </div>
            <div id="monthly-goals-list" style="margin-top: 24px;">
                ${renderListItems(monthlyGoals, 'monthly', 'No monthly goals added yet.')}
            </div>
        </div>
    `;
    setupDragAndDrop('monthly-goals-list', 'monthly');
}

function renderAnalytics(container) {
    const dailyTasks = StorageManager.getDailyTasks();
    const weeklyGoals = StorageManager.getWeeklyGoals();
    const monthlyGoals = StorageManager.getMonthlyGoals();

    // Calculate last 7 days stats
    const last7Days = [];
    const dailyCounts = [];
    const weeklyCounts = [];
    const monthlyCounts = [];
    let productiveDay = null;
    let maxTasks = -1;
    let totalCompleted = 0;

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toDateString();

        const countDaily = dailyTasks.filter(t => t.completed && new Date(t.updatedAt || t.createdAt).toDateString() === dateStr).length;
        const countWeekly = weeklyGoals.filter(t => t.completed && new Date(t.updatedAt || t.createdAt).toDateString() === dateStr).length;
        const countMonthly = monthlyGoals.filter(t => t.completed && new Date(t.updatedAt || t.createdAt).toDateString() === dateStr).length;
        const totalOnDay = countDaily + countWeekly + countMonthly;

        last7Days.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        dailyCounts.push(countDaily);
        weeklyCounts.push(countWeekly);
        monthlyCounts.push(countMonthly);
        totalCompleted += totalOnDay;

        if (totalOnDay > maxTasks) {
            maxTasks = totalOnDay;
            productiveDay = d.toLocaleDateString(undefined, { weekday: 'long' });
        }
    }

    if (maxTasks === 0) productiveDay = "N/A";

    container.innerHTML = `
        <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Analytics</h2>
        <p style="color: var(--text-muted); margin-bottom: var(--spacing-lg);">Your productivity over the last 7 days.</p>
        
        <div class="dashboard-grid" style="margin-bottom: var(--spacing-lg);">
            <div class="card">
                <h3 style="color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.05em; margin-bottom: 8px;">Tasks Completed (7 Days)</h3>
                <div style="font-size: 2rem; font-family: 'Unbounded', sans-serif;">${totalCompleted}</div>
            </div>
            <div class="card">
                <h3 style="color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.05em; margin-bottom: 8px;">Most Productive Day</h3>
                <div style="font-size: 1.6rem; font-family: 'Unbounded', sans-serif;">${productiveDay}</div>
            </div>
        </div>

        <div class="card" style="margin-bottom: var(--spacing-lg);">
            <h3 style="color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.05em; margin-bottom: 24px;">Completion Chart</h3>
            <canvas id="analyticsChart" width="800" height="300" style="width: 100%; height: auto;"></canvas>
            <div style="display: flex; gap: 16px; justify-content: center; margin-top: 16px; font-size: 0.8rem; color: var(--text-muted);">
                <span style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; background: rgba(250, 243, 225, 0.5); border-radius: 2px;"></div> Daily</span>
                <span style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; background: rgba(250, 243, 225, 0.8); border-radius: 2px;"></div> Weekly</span>
                <span style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; background: rgba(250, 243, 225, 1.0); border-radius: 2px;"></div> Monthly</span>
            </div>
        </div>

        <div class="card">
            <h3 style="color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.05em; margin-bottom: 16px;">${new Date().toLocaleString('default', { month: 'long' })} Consistency</h3>
            <div id="analytics-heatmap" style="max-width: 250px;"></div>
        </div>
    `;

    drawChart('analyticsChart', last7Days, { daily: dailyCounts, weekly: weeklyCounts, monthly: monthlyCounts });
    renderHeatmap('analytics-heatmap', dailyTasks);
}

function renderHeatmap(containerId, dailyTasks) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div class="heatmap-container" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; align-items: center; justify-content: center;">';

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayNames.forEach(d => {
        html += `<div style="text-align: center; font-size: 0.65rem; color: var(--text-muted); font-family: 'Unbounded', sans-serif; margin-bottom: 4px;">${d}</div>`;
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const dateStr = d.toDateString();

        const count = dailyTasks.filter(t => t.completed && new Date(t.updatedAt || t.createdAt).toDateString() === dateStr).length;

        let level = count >= 3 ? 3 : count;
        const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        html += `
            <div class="heatmap-day level-${level}" style="width: 100%; height: auto; aspect-ratio: 1; border-radius: 4px;">
                <div class="heatmap-tooltip">${displayDate} - ${count} tasks completed</div>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ---------------------------------------------------------
// Component Rendering & Interactions
// ---------------------------------------------------------

function renderListItems(items, type, emptyMessage) {
    if (items.length === 0) {
        return `<div style="color: var(--text-muted); padding: 12px 0;">${emptyMessage}</div>`;
    }

    return items.map(item => {
        let badgeHtml = '';
        if (type === 'daily' && item.difficulty) {
            badgeHtml = `<span class="diff-badge diff-${item.difficulty}">${item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}</span>`;
        }

        return `
        <div class="list-item ${item.completed ? 'completed' : ''}" draggable="true" data-id="${item.id}" onclick="toggleItem('${type}', '${item.id}', ${!item.completed})">
            <div class="checkbox">
                ${item.completed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-color)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </div>
            <span class="item-text" style="flex: 1; user-select: none; word-break: break-word; line-height: 1.4;">${item.text}</span>
            ${badgeHtml}
            <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;" class="item-actions">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="cursor: grab;" class="drag-handle"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                <button onclick="deleteItem(event, '${type}', '${item.id}')" class="remove-btn" style="padding: 6px 12px; font-size: 0.8rem; background: transparent; border: none; color: var(--text-muted); font-family: 'Montserrat', sans-serif; cursor: pointer;"><span class="remove-text">Remove</span></button>
            </div>
        </div>
        `;
    }).join('');
}

function handleEnter(e, actionFunction) {
    if (e.key === 'Enter') {
        actionFunction();
    }
}

function addDailyTask() {
    const input = document.getElementById('new-task-input');
    const diffSelect = document.getElementById('task-difficulty');
    if (!input || !input.value.trim()) return;
    StorageManager.addDailyTask({
        text: input.value.trim(),
        completed: false,
        difficulty: diffSelect ? diffSelect.value : 'easy'
    });
    input.value = '';
    navigate(currentViewId);
}

function changeSort(val) {
    currentSort = val;
    navigate(currentViewId);
}

function addWeeklyGoal() {
    const input = document.getElementById('new-weekly-input');
    if (!input || !input.value.trim()) return;
    StorageManager.addWeeklyGoal({ text: input.value.trim(), completed: false });
    input.value = '';
    navigate(currentViewId);
}

function addMonthlyGoal() {
    const input = document.getElementById('new-monthly-input');
    if (!input || !input.value.trim()) return;
    StorageManager.addMonthlyGoal({ text: input.value.trim(), completed: false });
    input.value = '';
    navigate(currentViewId);
}

function toggleItem(type, id, completed) {
    const keyMap = { 'daily': StorageKeys.DAILY, 'weekly': StorageKeys.WEEKLY, 'monthly': StorageKeys.MONTHLY };
    StorageManager.updateItem(keyMap[type], id, { completed });
    navigate(currentViewId);
}

function deleteItem(e, type, id) {
    e.stopPropagation();
    const keyMap = { 'daily': StorageKeys.DAILY, 'weekly': StorageKeys.WEEKLY, 'monthly': StorageKeys.MONTHLY };
    // Archive it instead of rigidly destroying it, so it securely maps to our heatmap and analytics 
    StorageManager.updateItem(keyMap[type], id, { archived: true });
    navigate(currentViewId);
}

// ---------------------------------------------------------
// Native Drag and Drop
// ---------------------------------------------------------

function setupDragAndDrop(containerId, type) {
    const list = document.getElementById(containerId);
    if (!list) return;

    let draggedItem = null;

    list.addEventListener('dragstart', e => {
        let el = e.target;
        if (!el.classList.contains('list-item')) {
            el = el.closest('.list-item');
            if (!el) return;
        }
        draggedItem = el;
        setTimeout(() => draggedItem.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        dragCategory = type;

        // Fix for firefox dragging
        if (e.dataTransfer.setData) e.dataTransfer.setData('text/plain', '');
    });

    list.addEventListener('dragend', e => {
        let el = e.target;
        if (!el.classList.contains('list-item')) {
            el = el.closest('.list-item');
        }
        if (el) el.classList.remove('dragging');
        draggedItem = null;

        // Save new order via id
        const itemEls = Array.from(list.querySelectorAll('.list-item'));
        const newOrderIds = itemEls.map(element => element.dataset.id).filter(Boolean);

        const keyMap = { 'daily': StorageKeys.DAILY, 'weekly': StorageKeys.WEEKLY, 'monthly': StorageKeys.MONTHLY };
        StorageManager.reorderItems(keyMap[type], newOrderIds);
    });

    list.addEventListener('dragover', e => {
        e.preventDefault();
        if (dragCategory !== type) return;

        const afterElement = getDragAfterElement(list, e.clientY);
        const currentDraggable = document.querySelector('.dragging');
        if (!currentDraggable) return;

        if (afterElement == null) {
            list.appendChild(currentDraggable);
        } else {
            list.insertBefore(currentDraggable, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.list-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ---------------------------------------------------------
// Utilities & Drawing
// ---------------------------------------------------------

function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();

    // Updates UI dynamically
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        let h = now.getHours();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12; // '0' should be '12'

        const hStr = h.toString().padStart(2, '0');
        const mStr = now.getMinutes().toString().padStart(2, '0');
        const sStr = now.getSeconds().toString().padStart(2, '0');
        clockEl.textContent = `${hStr}:${mStr}:${sStr} ${ampm}`;
    }

    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString(undefined, options);
    }

    // Midnight rollover logic
    if (now.getDate() !== currentDay) {
        currentDay = now.getDate();
        navigate(currentViewId);
    }
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning.';
    if (hour >= 12 && hour < 18) return 'Good afternoon.';
    return 'Good evening.';
}

function getISOWeekNumber(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function calculateStreak(tasks) {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return 0;

    const completedDates = new Set(completedTasks.map(t => new Date(t.createdAt).toDateString()));
    let streak = 0;
    let checkDate = new Date();

    if (!completedDates.has(checkDate.toDateString())) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (completedDates.has(checkDate.toDateString())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
}

function isToday(dateString) {
    // Deprecated filter to allow real-time cross-device sync regardless of timezone skips
    return true;
}

function drawChart(canvasId, labels, dataObj) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.clearRect(0, 0, width, height);

    const totals = labels.map((_, i) => dataObj.daily[i] + dataObj.weekly[i] + dataObj.monthly[i]);
    const maxVal = Math.max(...totals, 5); // Minimum scale of 5

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / labels.length - 20;

    // Draw bars
    labels.forEach((label, i) => {
        const valDaily = dataObj.daily[i];
        const valWeekly = dataObj.weekly[i];
        const valMonthly = dataObj.monthly[i];
        const totalVal = totals[i];

        const barHeightDaily = (valDaily / maxVal) * chartHeight;
        const barHeightWeekly = (valWeekly / maxVal) * chartHeight;
        const barHeightMonthly = (valMonthly / maxVal) * chartHeight;

        const x = padding + i * (chartWidth / labels.length) + 10;
        let startY = height - padding;

        // Draw animated or static background
        ctx.fillStyle = totalVal > 0 ? 'rgba(250, 243, 225, 0.05)' : 'transparent';
        ctx.fillRect(x, height - padding - chartHeight, barWidth, chartHeight);

        // Daily
        if (valDaily > 0) {
            startY -= barHeightDaily;
            ctx.fillStyle = 'rgba(250, 243, 225, 0.5)';
            ctx.fillRect(x, startY, barWidth, barHeightDaily);
        }

        // Weekly
        if (valWeekly > 0) {
            startY -= barHeightWeekly;
            ctx.fillStyle = 'rgba(250, 243, 225, 0.8)';
            ctx.fillRect(x, startY, barWidth, barHeightWeekly);
        }

        // Monthly
        if (valMonthly > 0) {
            startY -= barHeightMonthly;
            ctx.fillStyle = 'rgba(250, 243, 225, 1.0)';
            ctx.fillRect(x, startY, barWidth, barHeightMonthly);
        }

        // Label
        ctx.fillStyle = '#FAF3E1';
        ctx.font = "12px 'Montserrat', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(label, x + barWidth / 2, height - padding + 20);

        // Value Text
        if (totalVal > 0) {
            ctx.fillText(totalVal, x + barWidth / 2, height - padding - (totalVal / maxVal) * chartHeight - 10);
        }
    });

    // Draw baseline
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.strokeStyle = 'rgba(250, 243, 225, 0.12)';
    ctx.stroke();
}
