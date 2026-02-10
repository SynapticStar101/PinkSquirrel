/* ============================================
   NoteKeeper - Main Application
   Handwritten notes → Todo list
   ============================================ */

(function () {
    'use strict';

    // ─── State ───────────────────────────────────────────
    const STATE_KEY = 'notekeeper_tasks';
    const ONBOARDED_KEY = 'notekeeper_onboarded';
    const API_KEY_KEY = 'notekeeper_api_key';

    let tasks = loadTasks();
    let currentFilter = 'all';
    let currentSort = 'priority';
    let editingTaskId = null;
    let pendingConfirmTasks = [];

    // ─── DOM References ──────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        // Overlays
        onboardingOverlay: $('#onboarding-overlay'),
        processingOverlay: $('#processing-overlay'),
        confirmOverlay: $('#confirm-overlay'),
        priorityOverlay: $('#priority-overlay'),
        editOverlay: $('#edit-overlay'),
        helpOverlay: $('#help-overlay'),
        settingsOverlay: $('#settings-overlay'),

        // Processing
        processingTitle: $('#processing-title'),
        processingMessage: $('#processing-message'),
        processingProgress: $('#processing-progress'),
        processingPercent: $('#processing-percent'),

        // Confirm
        confirmTasksList: $('#confirm-tasks-list'),
        confirmAddInput: $('#confirm-add-input'),

        // Priority
        priorityTasksList: $('#priority-tasks-list'),

        // Edit
        editTaskText: $('#edit-task-text'),
        editTaskDate: $('#edit-task-date'),
        editTaskNotes: $('#edit-task-notes'),
        editPriorityButtons: $('#edit-priority-buttons'),

        // Settings
        settingsApiKey: $('#settings-api-key'),
        settingsStatus: $('#settings-status'),

        // Main
        uploadArea: $('#upload-area'),
        cameraInput: $('#camera-input'),
        fileInput: $('#file-input'),
        filterBar: $('#filter-bar'),
        taskList: $('#task-list'),
        emptyState: $('#empty-state'),
        quickAddInput: $('#quick-add-input'),
        greetingText: $('#greeting-text'),

        // Stats
        statTotal: $('#stat-total'),
        statDone: $('#stat-done'),
        statOverdue: $('#stat-overdue'),
    };

    // ─── Initialise ──────────────────────────────────────
    function init() {
        updateGreeting();
        bindEvents();
        render();

        // Show onboarding for first-time users
        if (!localStorage.getItem(ONBOARDED_KEY)) {
            showOverlay(dom.onboardingOverlay);
        }
    }

    // ─── Greeting ────────────────────────────────────────
    function updateGreeting() {
        const hour = new Date().getHours();
        let greeting;
        if (hour < 12) greeting = 'Good morning!';
        else if (hour < 17) greeting = 'Good afternoon!';
        else greeting = 'Good evening!';

        const taskCount = tasks.filter(t => !t.completed).length;
        if (taskCount === 0) {
            greeting += ' No tasks pending.';
        } else if (taskCount === 1) {
            greeting += ' You have 1 task to do.';
        } else {
            greeting += ` You have ${taskCount} tasks to do.`;
        }

        dom.greetingText.textContent = greeting;
    }

    // ─── Events ──────────────────────────────────────────
    function bindEvents() {
        // Onboarding
        $('#onboarding-start').addEventListener('click', () => {
            localStorage.setItem(ONBOARDED_KEY, 'true');
            hideOverlay(dom.onboardingOverlay);
        });

        // Help
        $('#help-btn').addEventListener('click', () => showOverlay(dom.helpOverlay));
        $('#help-close').addEventListener('click', () => hideOverlay(dom.helpOverlay));

        // Settings
        $('#settings-btn').addEventListener('click', openSettings);
        $('#settings-save').addEventListener('click', saveSettings);
        $('#settings-close').addEventListener('click', () => hideOverlay(dom.settingsOverlay));

        // File inputs
        dom.cameraInput.addEventListener('change', handleFileSelect);
        dom.fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop
        dom.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dom.uploadArea.classList.add('drag-over');
        });
        dom.uploadArea.addEventListener('dragleave', () => {
            dom.uploadArea.classList.remove('drag-over');
        });
        dom.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dom.uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                processImage(file);
            }
        });

        // FAB
        $('#fab-upload').addEventListener('click', () => {
            dom.uploadArea.scrollIntoView({ behavior: 'smooth' });
        });

        // Confirm overlay
        $('#confirm-add-btn').addEventListener('click', addConfirmTask);
        dom.confirmAddInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addConfirmTask();
        });
        $('#confirm-accept').addEventListener('click', acceptConfirmedTasks);
        $('#confirm-cancel').addEventListener('click', () => {
            pendingConfirmTasks = [];
            hideOverlay(dom.confirmOverlay);
        });

        // Priority overlay
        $('#priority-accept').addEventListener('click', acceptPriorities);
        $('#priority-back').addEventListener('click', () => {
            hideOverlay(dom.priorityOverlay);
            showOverlay(dom.confirmOverlay);
        });

        // Edit overlay
        $('#edit-save').addEventListener('click', saveEditedTask);
        $('#edit-cancel').addEventListener('click', () => {
            editingTaskId = null;
            hideOverlay(dom.editOverlay);
        });

        // Edit priority buttons
        dom.editPriorityButtons.querySelectorAll('.priority-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                dom.editPriorityButtons.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Filters
        $$('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                render();
            });
        });

        // Sort
        $('#sort-select').addEventListener('change', (e) => {
            currentSort = e.target.value;
            render();
        });

        // Quick add
        $('#quick-add-btn').addEventListener('click', quickAddTask);
        dom.quickAddInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') quickAddTask();
        });

        // Close overlays on background click
        [dom.helpOverlay, dom.editOverlay, dom.settingsOverlay].forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    hideOverlay(overlay);
                    editingTaskId = null;
                }
            });
        });
    }

    // ─── File Handling ───────────────────────────────────
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            processImage(file);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    }

    // ─── Image Preparation ────────────────────────────────
    function prepareImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const MAX_SIZE = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_SIZE || height > MAX_SIZE) {
                        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    const base64 = dataUrl.split(',')[1];
                    resolve({ base64: base64, mediaType: 'image/jpeg' });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ─── AI-Powered Recognition (Claude Vision) ────────
    async function recognizeWithAI(imageBase64, mediaType, apiKey) {
        const body = { image: imageBase64, mediaType: mediaType };
        if (apiKey) {
            body.apiKey = apiKey;
        }

        const response = await fetch('/api/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'api_error');
        }

        const result = await response.json();
        return result.text || '';
    }

    // ─── Tesseract Fallback ─────────────────────────────
    async function recognizeWithTesseract(file) {
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract not available');
        }

        updateProgress(10, 'Using basic text reader (for better results, add your API key in Settings)...');

        const worker = await Tesseract.createWorker('eng', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round(m.progress * 100);
                    updateProgress(pct, 'Reading your handwriting...');
                } else if (m.status === 'loading language traineddata') {
                    updateProgress(10, 'Getting ready to read...');
                }
            }
        });

        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        return text;
    }

    // ─── OCR Processing ──────────────────────────────────
    async function processImage(file) {
        showOverlay(dom.processingOverlay);
        updateProgress(0, 'Preparing your image...');

        try {
            const apiKey = localStorage.getItem(API_KEY_KEY) || '';
            let text = '';
            let usedAI = false;

            // Try AI-powered recognition first
            try {
                updateProgress(20, 'Reading your notes with AI...');
                const prepared = await prepareImage(file);
                updateProgress(40, 'AI is reading your handwriting...');
                text = await recognizeWithAI(prepared.base64, prepared.mediaType, apiKey);
                usedAI = true;
                updateProgress(90, 'Almost done...');
            } catch (aiError) {
                console.error('AI recognition failed:', aiError.message);
                // Show the actual error so the user knows what went wrong
                const hasKey = apiKey && apiKey.length > 0;
                if (!hasKey) {
                    updateProgress(0, 'No API key set. Go to Settings to add your Anthropic API key.');
                } else {
                    updateProgress(0, 'AI error: ' + aiError.message + ' — Falling back to basic OCR...');
                }
                // Fall back to Tesseract
                try {
                    text = await recognizeWithTesseract(file);
                } catch (tessError) {
                    console.error('Tesseract also failed:', tessError);
                }
            }

            updateProgress(100, 'Done!');

            if (!text || text.trim().length === 0) {
                hideOverlay(dom.processingOverlay);
                alert("I couldn't read any text from that image. Please try a clearer photo with good lighting.");
                return;
            }

            // Parse lines into tasks
            const rawLines = text.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 2)
                .filter(line => !/^[\-\.\*\#\=\~]+$/.test(line));

            if (rawLines.length === 0) {
                hideOverlay(dom.processingOverlay);
                alert("I couldn't read any text from that image. Please try a clearer photo with good lighting.");
                return;
            }

            // Clean up lines - remove common list prefixes
            const cleanedLines = rawLines.map(line => {
                return line
                    .replace(/^[\d]+[\.\)\-\:]\s*/, '')
                    .replace(/^[\-\*\•\·\○\●\□\■\☐\☑]\s*/, '')
                    .replace(/^\[[\s\x]?\]\s*/, '')
                    .trim();
            }).filter(line => line.length > 1);

            pendingConfirmTasks = cleanedLines.map(text => ({
                text: text,
                keep: true
            }));

            hideOverlay(dom.processingOverlay);
            showConfirmOverlay();

        } catch (error) {
            hideOverlay(dom.processingOverlay);
            console.error('OCR Error:', error);
            alert("Something went wrong reading that image. Please try again with a different photo.");
        }
    }

    function updateProgress(percent, message) {
        dom.processingProgress.style.width = percent + '%';
        dom.processingPercent.textContent = percent + '%';
        if (message) {
            dom.processingMessage.textContent = message;
        }
    }

    // ─── Confirm Tasks Overlay ───────────────────────────
    function showConfirmOverlay() {
        renderConfirmTasks();
        showOverlay(dom.confirmOverlay);
    }

    function renderConfirmTasks() {
        dom.confirmTasksList.innerHTML = '';
        pendingConfirmTasks.forEach((task, index) => {
            const item = document.createElement('div');
            item.className = 'confirm-task-item';
            item.innerHTML = `
                <span class="confirm-task-number">${index + 1}</span>
                <input type="text" class="confirm-task-input" value="${escapeHtml(task.text)}" data-index="${index}">
                <button class="confirm-task-remove" data-index="${index}" title="Remove this task" aria-label="Remove task">✕</button>
            `;
            dom.confirmTasksList.appendChild(item);
        });

        // Bind events for dynamic elements
        dom.confirmTasksList.querySelectorAll('.confirm-task-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                pendingConfirmTasks[idx].text = e.target.value;
            });
        });

        dom.confirmTasksList.querySelectorAll('.confirm-task-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                pendingConfirmTasks.splice(idx, 1);
                renderConfirmTasks();
            });
        });
    }

    function addConfirmTask() {
        const text = dom.confirmAddInput.value.trim();
        if (text) {
            pendingConfirmTasks.push({ text, keep: true });
            dom.confirmAddInput.value = '';
            renderConfirmTasks();
        }
    }

    function acceptConfirmedTasks() {
        if (pendingConfirmTasks.length === 0) {
            alert('Please add at least one task.');
            return;
        }
        hideOverlay(dom.confirmOverlay);
        showPriorityOverlay();
    }

    // ─── Priority Overlay ────────────────────────────────
    function showPriorityOverlay() {
        renderPriorityTasks();
        showOverlay(dom.priorityOverlay);
    }

    function renderPriorityTasks() {
        dom.priorityTasksList.innerHTML = '';

        // Set a sensible default due date (1 week from now)
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        const defaultDateStr = formatDateForInput(defaultDate);

        pendingConfirmTasks.forEach((task, index) => {
            const item = document.createElement('div');
            item.className = 'priority-task-item';
            item.innerHTML = `
                <div class="priority-task-name">${index + 1}. ${escapeHtml(task.text)}</div>
                <div class="priority-buttons" data-index="${index}">
                    <button class="priority-btn priority-high" data-priority="high">🔴 Urgent</button>
                    <button class="priority-btn priority-medium selected" data-priority="medium">🟡 Soon</button>
                    <button class="priority-btn priority-low" data-priority="low">🟢 When Possible</button>
                </div>
                <div class="priority-date-row">
                    <span class="priority-date-label">📅 Due by:</span>
                    <input type="date" class="priority-date-input" data-index="${index}" value="${defaultDateStr}">
                </div>
            `;
            dom.priorityTasksList.appendChild(item);

            // Set default priority
            task.priority = task.priority || 'medium';
            task.dueDate = task.dueDate || defaultDateStr;

            // Priority button events
            item.querySelectorAll('.priority-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    item.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    task.priority = btn.dataset.priority;
                });
            });

            // Date input event
            item.querySelector('.priority-date-input').addEventListener('change', (e) => {
                task.dueDate = e.target.value;
            });
        });
    }

    function acceptPriorities() {
        const now = Date.now();
        const newTasks = pendingConfirmTasks.map((task, index) => ({
            id: generateId(),
            text: task.text,
            priority: task.priority || 'medium',
            dueDate: task.dueDate || '',
            notes: '',
            completed: false,
            createdAt: now + index, // Preserve order
        }));

        tasks = [...tasks, ...newTasks];
        saveTasks();
        pendingConfirmTasks = [];
        hideOverlay(dom.priorityOverlay);
        render();
        showCelebration('🎉');
    }

    // ─── Edit Task ───────────────────────────────────────
    function openEditOverlay(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        editingTaskId = taskId;
        dom.editTaskText.value = task.text;
        dom.editTaskDate.value = task.dueDate || '';
        dom.editTaskNotes.value = task.notes || '';

        // Set priority
        dom.editPriorityButtons.querySelectorAll('.priority-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.priority === task.priority);
        });

        showOverlay(dom.editOverlay);
        dom.editTaskText.focus();
    }

    function saveEditedTask() {
        const task = tasks.find(t => t.id === editingTaskId);
        if (!task) return;

        const text = dom.editTaskText.value.trim();
        if (!text) {
            alert('Please enter a task name.');
            return;
        }

        task.text = text;
        task.dueDate = dom.editTaskDate.value || '';
        task.notes = dom.editTaskNotes.value.trim();

        // Get selected priority
        const selectedBtn = dom.editPriorityButtons.querySelector('.priority-btn.selected');
        if (selectedBtn) {
            task.priority = selectedBtn.dataset.priority;
        }

        saveTasks();
        editingTaskId = null;
        hideOverlay(dom.editOverlay);
        render();
    }

    // ─── Task Actions ────────────────────────────────────
    function toggleTaskComplete(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;

        if (task.completed) {
            task.completedAt = Date.now();
            showCelebration('✅');
        } else {
            delete task.completedAt;
        }

        saveTasks();
        render();
    }

    function deleteTask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const confirmed = confirm(`Delete "${task.text}"?\n\nThis cannot be undone.`);
        if (confirmed) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            render();
        }
    }

    function quickAddTask() {
        const text = dom.quickAddInput.value.trim();
        if (!text) return;

        tasks.push({
            id: generateId(),
            text: text,
            priority: 'medium',
            dueDate: '',
            notes: '',
            completed: false,
            createdAt: Date.now(),
        });

        dom.quickAddInput.value = '';
        saveTasks();
        render();
    }

    // ─── Rendering ───────────────────────────────────────
    function render() {
        renderTaskList();
        renderStats();
        updateGreeting();
        updateVisibility();
    }

    function updateVisibility() {
        const hasTasks = tasks.length > 0;
        dom.filterBar.classList.toggle('hidden', !hasTasks);
        dom.emptyState.classList.toggle('hidden', hasTasks);
        $('#stats-bar').classList.toggle('hidden', !hasTasks);
    }

    function renderTaskList() {
        const filtered = getFilteredTasks();
        const sorted = getSortedTasks(filtered);

        dom.taskList.innerHTML = '';

        if (sorted.length === 0 && tasks.length > 0) {
            dom.taskList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No tasks match this filter</h3>
                    <p>Try selecting a different filter above.</p>
                </div>
            `;
            dom.emptyState.classList.add('hidden');
            return;
        }

        sorted.forEach(task => {
            const card = createTaskCard(task);
            dom.taskList.appendChild(card);
        });
    }

    function createTaskCard(task) {
        const card = document.createElement('div');
        const isOverdue = isTaskOverdue(task);

        let classes = 'task-card';
        if (task.priority) classes += ` priority-${task.priority}`;
        if (task.completed) classes += ' completed';
        if (isOverdue) classes += ' overdue';
        card.className = classes;

        const priorityLabels = {
            high: '🔴 Urgent',
            medium: '🟡 Soon',
            low: '🟢 When Possible'
        };

        const dueDateDisplay = task.dueDate ? formatDateForDisplay(task.dueDate) : '';
        const dueDateLabel = isOverdue ? `⚠️ Overdue: ${dueDateDisplay}` : (dueDateDisplay ? `📅 ${dueDateDisplay}` : '');

        card.innerHTML = `
            <div class="task-checkbox" data-id="${task.id}" title="${task.completed ? 'Mark as not done' : 'Mark as done'}">
                <span class="task-checkbox-icon">✓</span>
            </div>
            <div class="task-body" data-id="${task.id}">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="task-priority-badge ${task.priority}">${priorityLabels[task.priority] || ''}</span>
                    ${dueDateLabel ? `<span class="task-due-date">${dueDateLabel}</span>` : ''}
                    ${task.notes ? '<span class="task-notes-indicator">📝 Notes</span>' : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn edit-btn" data-id="${task.id}" title="Edit task" aria-label="Edit task">✏️</button>
                <button class="task-action-btn delete-btn" data-id="${task.id}" title="Delete task" aria-label="Delete task">🗑️</button>
            </div>
        `;

        // Bind card events
        card.querySelector('.task-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskComplete(task.id);
        });

        card.querySelector('.task-body').addEventListener('click', () => {
            openEditOverlay(task.id);
        });

        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditOverlay(task.id);
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        return card;
    }

    function renderStats() {
        const total = tasks.length;
        const done = tasks.filter(t => t.completed).length;
        const overdue = tasks.filter(t => isTaskOverdue(t)).length;

        dom.statTotal.textContent = total;
        dom.statDone.textContent = done;
        dom.statOverdue.textContent = overdue;
    }

    // ─── Filtering & Sorting ─────────────────────────────
    function getFilteredTasks() {
        switch (currentFilter) {
            case 'active':
                return tasks.filter(t => !t.completed);
            case 'completed':
                return tasks.filter(t => t.completed);
            case 'overdue':
                return tasks.filter(t => isTaskOverdue(t));
            default:
                return [...tasks];
        }
    }

    function getSortedTasks(taskList) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };

        return [...taskList].sort((a, b) => {
            // Completed tasks always go to the bottom
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            switch (currentSort) {
                case 'priority':
                    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
                case 'date':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'created':
                    return (b.createdAt || 0) - (a.createdAt || 0);
                case 'alpha':
                    return a.text.localeCompare(b.text);
                default:
                    return 0;
            }
        });
    }

    // ─── Persistence ─────────────────────────────────────
    function saveTasks() {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(tasks));
        } catch (e) {
            console.error('Failed to save tasks:', e);
        }
    }

    function loadTasks() {
        try {
            const data = localStorage.getItem(STATE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load tasks:', e);
            return [];
        }
    }

    // ─── Helpers ─────────────────────────────────────────
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function isTaskOverdue(task) {
        if (task.completed || !task.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate + 'T00:00:00');
        return due < today;
    }

    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateForDisplay(dateStr) {
        try {
            const date = new Date(dateStr + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (date.getTime() === today.getTime()) return 'Today';
            if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

            const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
            if (diff > 0 && diff <= 7) {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return days[date.getDay()];
            }

            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
            });
        } catch {
            return dateStr;
        }
    }

    function showOverlay(overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function hideOverlay(overlay) {
        overlay.classList.add('hidden');
        // Only restore scrolling if no other overlays are visible
        const anyVisible = [
            dom.onboardingOverlay, dom.processingOverlay, dom.confirmOverlay,
            dom.priorityOverlay, dom.editOverlay, dom.helpOverlay, dom.settingsOverlay
        ].some(o => !o.classList.contains('hidden'));
        if (!anyVisible) {
            document.body.style.overflow = '';
        }
    }

    // ─── Settings ──────────────────────────────────────
    function openSettings() {
        const savedKey = localStorage.getItem(API_KEY_KEY) || '';
        dom.settingsApiKey.value = savedKey;
        dom.settingsStatus.textContent = savedKey ? 'API key is saved.' : 'No API key set. Basic OCR will be used (less accurate for handwriting).';
        dom.settingsStatus.className = 'settings-status' + (savedKey ? ' status-ok' : ' status-warn');
        showOverlay(dom.settingsOverlay);
    }

    function saveSettings() {
        const key = dom.settingsApiKey.value.trim();
        if (key) {
            localStorage.setItem(API_KEY_KEY, key);
            dom.settingsStatus.textContent = 'API key saved! AI-powered handwriting recognition is now active.';
            dom.settingsStatus.className = 'settings-status status-ok';
        } else {
            localStorage.removeItem(API_KEY_KEY);
            dom.settingsStatus.textContent = 'API key removed. Basic OCR will be used.';
            dom.settingsStatus.className = 'settings-status status-warn';
        }
        setTimeout(() => hideOverlay(dom.settingsOverlay), 1200);
    }

    function showCelebration(emoji) {
        const el = document.createElement('div');
        el.className = 'celebration';
        el.textContent = emoji;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    // ─── Start ───────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);
})();
