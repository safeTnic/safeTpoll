/**
 * safeTpoll - Block Editor JavaScript
 * Manages the split-panel editor with live preview
 */

const EditorApp = (() => {
    // =========================================================================
    // State
    // =========================================================================
    const state = {
        blocks: [],
        editingBlockId: null,
        editingTextBlockId: null,
        saveTimer: null,
        saveStatus: 'saved', // 'saved' | 'saving' | 'unsaved'
        sortable: null,
    };

    let blockIdCounter = -1; // Negative IDs for new (unsaved) blocks

    function nextTempId() {
        return blockIdCounter--;
    }

    // =========================================================================
    // Init
    // =========================================================================
    function initEditor(blocks) {
        state.blocks = blocks.map(b => ({ ...b }));
        renderBlockList();
        renderPreview();
        setupTitleListener();
        setupSettingsListeners();
        setupDropdownCloseHandler();
    }

    function setupTitleListener() {
        const titleInput = document.getElementById('pollTitleInput');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                scheduleSave();
            });
            titleInput.addEventListener('change', () => {
                saveSettings(true);
            });
        }
    }

    function setupSettingsListeners() {
        const settingIds = [
            'settingStartDate', 'settingEndDate', 'settingQuestionsPerPage',
            'settingCustomId', 'settingAnonymous', 'settingShowVoteCount', 'settingMultipleResponses',
        ];
        settingIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => { /* handled on button click */ });
            }
        });
    }

    function setupDropdownCloseHandler() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('addQuestionDropdown');
            const menu = document.getElementById('questionTypeMenu');
            if (dropdown && menu && !dropdown.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
    }

    // =========================================================================
    // Block management
    // =========================================================================
    function addTextBlock() {
        const block = {
            id: nextTempId(),
            type: 'text',
            page: 1,
            order: state.blocks.length,
            content: '',
        };
        state.blocks.push(block);
        renderBlockList();
        renderPreview();
        // Immediately open text editor
        openTextEditor(block.id);
        scheduleSave();
    }

    function addQuestionBlock(qType) {
        const defaultQuestion = {
            id: null,
            title: '',
            description: '',
            question_type: qType,
            required: true,
            settings: {},
            options: [],
            matrix_rows: [],
            matrix_columns: [],
        };

        // Add default options for choice types
        if (['single_choice', 'multiple_choice', 'ranking'].includes(qType)) {
            defaultQuestion.options = [
                { id: null, text: 'Option 1', order: 0 },
                { id: null, text: 'Option 2', order: 1 },
            ];
        }
        if (qType === 'matrix') {
            defaultQuestion.matrix_rows = [
                { id: null, text: 'Zeile 1', order: 0 },
                { id: null, text: 'Zeile 2', order: 1 },
            ];
            defaultQuestion.matrix_columns = [
                { id: null, text: 'Spalte A', order: 0 },
                { id: null, text: 'Spalte B', order: 1 },
            ];
        }
        if (qType === 'rating') {
            defaultQuestion.settings = { min: 1, max: 5, step: 1 };
        }

        const block = {
            id: nextTempId(),
            type: 'question',
            page: 1,
            order: state.blocks.length,
            question: defaultQuestion,
        };
        state.blocks.push(block);
        renderBlockList();
        renderPreview();
        openQuestionEditor(block.id);
        closeQuestionMenu();
        scheduleSave();
    }

    function deleteBlock(blockId) {
        state.blocks = state.blocks.filter(b => b.id !== blockId);
        renderBlockList();
        renderPreview();
        scheduleSave();
    }

    function deleteCurrentBlock() {
        if (state.editingBlockId !== null) {
            deleteBlock(state.editingBlockId);
        }
        if (state.editingTextBlockId !== null) {
            deleteBlock(state.editingTextBlockId);
        }
        closeQuestionModal();
        closeTextModal();
    }

    function getBlock(blockId) {
        return state.blocks.find(b => b.id === blockId);
    }

    // =========================================================================
    // Render block list (left panel)
    // =========================================================================
    function renderBlockList() {
        const container = document.getElementById('blockList');
        if (!container) return;

        if (state.blocks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <p class="text-sm">Noch keine Blöcke.</p>
                    <p class="text-xs mt-1">Fügen Sie Text oder Fragen hinzu.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = state.blocks.map((block, index) => renderBlockItem(block, index)).join('');

        // Initialize SortableJS
        if (state.sortable) {
            state.sortable.destroy();
        }
        state.sortable = new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: (evt) => {
                const movedBlock = state.blocks.splice(evt.oldIndex, 1)[0];
                state.blocks.splice(evt.newIndex, 0, movedBlock);
                // Update order values
                state.blocks.forEach((b, i) => { b.order = i; });
                renderPreview();
                scheduleSave();
            },
        });
    }

    function renderBlockItem(block, index) {
        const typeLabels = {
            single_choice: 'Einfachauswahl', multiple_choice: 'Mehrfachauswahl',
            text: 'Einzeiliger Text', textarea: 'Mehrzeiliger Text',
            number: 'Zahl', rating: 'Bewertung', ranking: 'Ranking',
            matrix: 'Matrix', date: 'Datum', file: 'Datei-Upload',
        };

        if (block.type === 'text') {
            const preview = (block.content || '').replace(/#{1,6}\s/g, '').replace(/[*_`]/g, '');
            return `
                <div class="editor-block block-appear" data-id="${block.id}">
                    <div class="flex items-center gap-2">
                        <div class="drag-handle flex-shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0" onclick="EditorApp.openTextEditor(${block.id})" style="cursor:pointer">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Text</span>
                            </div>
                            <p class="text-sm text-gray-600 truncate">
                                ${preview ? escapeHtml(preview.substring(0, 60)) + (preview.length > 60 ? '...' : '') : '<em class="text-gray-400">Klicken zum Bearbeiten</em>'}
                            </p>
                        </div>
                        <button onclick="EditorApp.deleteBlock(${block.id})"
                                class="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        } else if (block.type === 'question') {
            const q = block.question || {};
            const typeLabel = typeLabels[q.question_type] || q.question_type;
            return `
                <div class="editor-block block-appear" data-id="${block.id}">
                    <div class="flex items-center gap-2">
                        <div class="drag-handle flex-shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0" onclick="EditorApp.openQuestionEditor(${block.id})" style="cursor:pointer">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="inline-flex items-center text-xs font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                                    ${escapeHtml(typeLabel)}
                                </span>
                                ${q.required ? '<span class="text-xs text-red-500">*</span>' : ''}
                            </div>
                            <p class="text-sm text-gray-700 truncate font-medium">
                                ${q.title ? escapeHtml(q.title.substring(0, 60)) : '<em class="text-gray-400 font-normal">Klicken zum Bearbeiten</em>'}
                            </p>
                        </div>
                        <button onclick="EditorApp.openQuestionEditor(${block.id})"
                                class="flex-shrink-0 text-gray-400 hover:text-brand-600 transition-colors p-1 rounded hover:bg-brand-50">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button onclick="EditorApp.deleteBlock(${block.id})"
                                class="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }
        return '';
    }

    // =========================================================================
    // Preview rendering (right panel)
    // =========================================================================
    function renderPreview() {
        const container = document.getElementById('previewPanel');
        if (!container) return;

        const inner = container.querySelector('.max-w-lg') || container;

        if (state.blocks.length === 0) {
            inner.innerHTML = `
                <div class="text-center py-20 text-gray-300">
                    <svg class="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <p class="text-sm">Vorschau erscheint hier</p>
                </div>
            `;
            return;
        }

        inner.innerHTML = state.blocks.map(block => renderPreviewBlock(block)).join('');
    }

    function renderPreviewBlock(block) {
        if (block.type === 'text') {
            const html = typeof marked !== 'undefined'
                ? marked.parse(block.content || '')
                : `<p>${escapeHtml(block.content || '')}</p>`;
            return `<div class="preview-text-block prose">${html}</div>`;
        } else if (block.type === 'question') {
            const q = block.question || {};
            return renderPreviewQuestion(q);
        }
        return '';
    }

    function renderPreviewQuestion(q) {
        const typeLabels = {
            single_choice: '●', multiple_choice: '☑', text: 'T', textarea: '¶',
            number: '#', rating: '★', ranking: '↕', matrix: '⊞', date: '📅', file: '📎',
        };
        const icon = typeLabels[q.question_type] || '?';
        let body = '';

        if (['single_choice', 'multiple_choice'].includes(q.question_type)) {
            const opts = (q.options || []).map(o =>
                `<div class="preview-option">
                    <input type="${q.question_type === 'single_choice' ? 'radio' : 'checkbox'}"
                           disabled class="w-3.5 h-3.5">
                    <span>${escapeHtml(o.text || 'Option')}</span>
                </div>`
            ).join('');
            body = `<div class="space-y-1">${opts || '<p class="text-xs text-gray-400">Keine Optionen</p>'}</div>`;
        } else if (q.question_type === 'text') {
            body = `<div class="h-8 border border-gray-200 rounded-lg bg-gray-50 px-3 flex items-center text-xs text-gray-400">Einzeilige Texteingabe</div>`;
        } else if (q.question_type === 'textarea') {
            body = `<div class="h-16 border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Mehrzeilige Texteingabe</div>`;
        } else if (q.question_type === 'number') {
            body = `<div class="h-8 border border-gray-200 rounded-lg bg-gray-50 w-24 px-3 flex items-center text-xs text-gray-400">0</div>`;
        } else if (q.question_type === 'rating') {
            const max = (q.settings && q.settings.max) || 5;
            const min = (q.settings && q.settings.min) || 1;
            const stars = Array.from({length: max - min + 1}, (_, i) =>
                `<span class="text-gray-200 text-2xl">★</span>`
            ).join('');
            body = `<div class="flex gap-1">${stars}</div>`;
        } else if (q.question_type === 'ranking') {
            const opts = (q.options || []).map((o, i) =>
                `<div class="preview-option cursor-default">
                    <span class="w-4 h-4 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">${i+1}</span>
                    <span>${escapeHtml(o.text || 'Option')}</span>
                </div>`
            ).join('');
            body = `<div class="space-y-1">${opts}</div>`;
        } else if (q.question_type === 'matrix') {
            const cols = q.matrix_columns || [];
            const rows = q.matrix_rows || [];
            if (rows.length && cols.length) {
                const headerCells = cols.map(c => `<th class="px-2 py-1 text-xs text-gray-500 text-center">${escapeHtml(c.text)}</th>`).join('');
                const bodyRows = rows.map(r => {
                    const cells = cols.map(() => `<td class="px-2 py-1 text-center"><input type="radio" disabled class="w-3 h-3"></td>`).join('');
                    return `<tr><td class="px-2 py-1 text-xs text-gray-600">${escapeHtml(r.text)}</td>${cells}</tr>`;
                }).join('');
                body = `<table class="w-full text-xs border-collapse"><thead><tr><th></th>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
            } else {
                body = `<p class="text-xs text-gray-400">Matrix konfigurieren</p>`;
            }
        } else if (q.question_type === 'date') {
            body = `<div class="h-8 border border-gray-200 rounded-lg bg-gray-50 px-3 flex items-center text-xs text-gray-400">Datum / Uhrzeit</div>`;
        } else if (q.question_type === 'file') {
            body = `<div class="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">Datei hochladen</div>`;
        }

        return `
            <div class="preview-question-block">
                <div class="preview-question-title">
                    ${q.required ? '<span class="text-brand-600 mr-1">*</span>' : ''}
                    ${escapeHtml(q.title || 'Neue Frage')}
                </div>
                ${q.description ? `<p class="text-xs text-gray-500 mb-3">${escapeHtml(q.description)}</p>` : ''}
                ${body}
            </div>
        `;
    }

    // =========================================================================
    // Question editor modal
    // =========================================================================
    function openQuestionEditor(blockId) {
        const block = getBlock(blockId);
        if (!block || block.type !== 'question') return;
        state.editingBlockId = blockId;

        const q = block.question || {};
        document.getElementById('qType').value = q.question_type || 'single_choice';
        document.getElementById('qTitle').value = q.title || '';
        document.getElementById('qDescription').value = q.description || '';
        document.getElementById('qRequired').checked = q.required !== false;

        // Settings
        const settings = q.settings || {};
        if (document.getElementById('ratingMin')) document.getElementById('ratingMin').value = settings.min || 1;
        if (document.getElementById('ratingMax')) document.getElementById('ratingMax').value = settings.max || 5;
        if (document.getElementById('ratingStep')) document.getElementById('ratingStep').value = settings.step || 1;
        if (document.getElementById('ratingLabelMin')) document.getElementById('ratingLabelMin').value = settings.label_min || '';
        if (document.getElementById('ratingLabelMax')) document.getElementById('ratingLabelMax').value = settings.label_max || '';
        if (document.getElementById('fileTypes')) document.getElementById('fileTypes').value = settings.allowed_types || '';

        renderOptionsInModal(q.options || []);
        renderMatrixInModal(q.matrix_rows || [], q.matrix_columns || []);
        onQuestionTypeChange();

        document.getElementById('questionModal').classList.remove('hidden');
        document.getElementById('qTitle').focus();
    }

    function closeQuestionModal() {
        document.getElementById('questionModal').classList.add('hidden');
        state.editingBlockId = null;
    }

    function onQuestionTypeChange() {
        const qType = document.getElementById('qType').value;
        const optionsSection = document.getElementById('optionsSection');
        const matrixSection = document.getElementById('matrixSection');
        const ratingSection = document.getElementById('ratingSection');
        const fileSection = document.getElementById('fileSection');

        optionsSection.classList.toggle('hidden', !['single_choice', 'multiple_choice', 'ranking'].includes(qType));
        matrixSection.classList.toggle('hidden', qType !== 'matrix');
        ratingSection.classList.toggle('hidden', qType !== 'rating');
        fileSection.classList.toggle('hidden', qType !== 'file');
    }

    function renderOptionsInModal(options) {
        const list = document.getElementById('optionsList');
        if (!list) return;
        list.innerHTML = options.map((opt, i) => `
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
                <input type="text" value="${escapeHtml(opt.text || '')}"
                       class="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                       placeholder="Option ${i + 1}"
                       oninput="EditorApp.updateOptionText(${i}, this.value)">
                <button onclick="EditorApp.removeOption(${i})"
                        class="text-gray-300 hover:text-red-500 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    function renderMatrixInModal(rows, cols) {
        const rowsList = document.getElementById('matrixRowsList');
        const colsList = document.getElementById('matrixColumnsList');
        if (rowsList) rowsList.innerHTML = rows.map((r, i) => matrixItemHtml(r.text, i, 'row')).join('');
        if (colsList) colsList.innerHTML = cols.map((c, i) => matrixItemHtml(c.text, i, 'col')).join('');
    }

    function matrixItemHtml(text, i, type) {
        return `
            <div class="flex items-center gap-2">
                <input type="text" value="${escapeHtml(text || '')}"
                       class="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                       oninput="EditorApp.updateMatrix${type === 'row' ? 'Row' : 'Col'}(${i}, this.value)">
                <button onclick="EditorApp.removeMatrix${type === 'row' ? 'Row' : 'Col'}(${i})"
                        class="text-gray-300 hover:text-red-500 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;
    }

    // Option management
    function getCurrentQuestion() {
        if (state.editingBlockId === null) return null;
        const block = getBlock(state.editingBlockId);
        return block ? (block.question || {}) : null;
    }

    function addOption() {
        const q = getCurrentQuestion();
        if (!q) return;
        q.options = q.options || [];
        q.options.push({ id: null, text: '', order: q.options.length });
        renderOptionsInModal(q.options);
    }

    function removeOption(index) {
        const q = getCurrentQuestion();
        if (!q) return;
        q.options.splice(index, 1);
        q.options.forEach((o, i) => { o.order = i; });
        renderOptionsInModal(q.options);
    }

    function updateOptionText(index, value) {
        const q = getCurrentQuestion();
        if (!q || !q.options[index]) return;
        q.options[index].text = value;
    }

    function addMatrixRow() {
        const q = getCurrentQuestion();
        if (!q) return;
        q.matrix_rows = q.matrix_rows || [];
        q.matrix_rows.push({ id: null, text: '', order: q.matrix_rows.length });
        renderMatrixInModal(q.matrix_rows, q.matrix_columns || []);
    }

    function removeMatrixRow(index) {
        const q = getCurrentQuestion();
        if (!q) return;
        q.matrix_rows.splice(index, 1);
        renderMatrixInModal(q.matrix_rows, q.matrix_columns || []);
    }

    function updateMatrixRow(index, value) {
        const q = getCurrentQuestion();
        if (!q || !q.matrix_rows[index]) return;
        q.matrix_rows[index].text = value;
    }

    function addMatrixColumn() {
        const q = getCurrentQuestion();
        if (!q) return;
        q.matrix_columns = q.matrix_columns || [];
        q.matrix_columns.push({ id: null, text: '', order: q.matrix_columns.length });
        renderMatrixInModal(q.matrix_rows || [], q.matrix_columns);
    }

    function removeMatrixCol(index) {
        const q = getCurrentQuestion();
        if (!q) return;
        q.matrix_columns.splice(index, 1);
        renderMatrixInModal(q.matrix_rows || [], q.matrix_columns);
    }

    function updateMatrixCol(index, value) {
        const q = getCurrentQuestion();
        if (!q || !q.matrix_columns[index]) return;
        q.matrix_columns[index].text = value;
    }

    function saveQuestion() {
        if (state.editingBlockId === null) return;
        const block = getBlock(state.editingBlockId);
        if (!block) return;

        const qType = document.getElementById('qType').value;
        const title = document.getElementById('qTitle').value.trim();

        if (!title) {
            document.getElementById('qTitle').focus();
            showToast('Bitte geben Sie einen Fragetitel ein.');
            return;
        }

        const q = block.question || {};
        q.question_type = qType;
        q.title = title;
        q.description = document.getElementById('qDescription').value.trim();
        q.required = document.getElementById('qRequired').checked;

        if (qType === 'rating') {
            q.settings = {
                min: parseInt(document.getElementById('ratingMin').value) || 1,
                max: parseInt(document.getElementById('ratingMax').value) || 5,
                step: parseInt(document.getElementById('ratingStep').value) || 1,
                label_min: document.getElementById('ratingLabelMin').value.trim(),
                label_max: document.getElementById('ratingLabelMax').value.trim(),
            };
        } else if (qType === 'file') {
            q.settings = {
                allowed_types: document.getElementById('fileTypes').value.trim(),
            };
        }

        block.question = q;
        closeQuestionModal();
        renderBlockList();
        renderPreview();
        scheduleSave();
    }

    // =========================================================================
    // Text editor modal
    // =========================================================================
    function openTextEditor(blockId) {
        const block = getBlock(blockId);
        if (!block || block.type !== 'text') return;
        state.editingTextBlockId = blockId;
        document.getElementById('textContent').value = block.content || '';
        document.getElementById('textModal').classList.remove('hidden');
        document.getElementById('textContent').focus();
    }

    function closeTextModal() {
        document.getElementById('textModal').classList.add('hidden');
        state.editingTextBlockId = null;
    }

    function saveTextBlock() {
        if (state.editingTextBlockId === null) return;
        const block = getBlock(state.editingTextBlockId);
        if (!block) return;
        block.content = document.getElementById('textContent').value;
        closeTextModal();
        renderBlockList();
        renderPreview();
        scheduleSave();
    }

    // =========================================================================
    // Save blocks to server
    // =========================================================================
    async function saveBlocks() {
        setSaveStatus('saving');
        const titleInput = document.getElementById('pollTitleInput');
        if (titleInput) {
            await saveSettings(false);
        }

        // Track open modals by list position so IDs survive the server round-trip
        const editingIdx     = state.editingBlockId     !== null
            ? state.blocks.findIndex(b => b.id === state.editingBlockId)     : -1;
        const editingTextIdx = state.editingTextBlockId !== null
            ? state.blocks.findIndex(b => b.id === state.editingTextBlockId) : -1;

        try {
            const response = await fetch(SAVE_BLOCKS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN,
                },
                body: JSON.stringify({ blocks: state.blocks }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'ok') {
                state.blocks = data.blocks;

                // Remap modal editing IDs to the real server IDs
                if (editingIdx >= 0 && data.blocks[editingIdx]) {
                    state.editingBlockId = data.blocks[editingIdx].id;
                }
                if (editingTextIdx >= 0 && data.blocks[editingTextIdx]) {
                    state.editingTextBlockId = data.blocks[editingTextIdx].id;
                }

                renderBlockList();
                setSaveStatus('saved');
                showToast('Gespeichert');
            } else {
                throw new Error(data.error || 'Unbekannter Fehler');
            }
        } catch (err) {
            setSaveStatus('unsaved');
            showToast('Fehler beim Speichern: ' + err.message);
        }
    }

    async function saveSettings(showMsg = true) {
        const titleEl = document.getElementById('pollTitleInput');
        const title = titleEl ? titleEl.value.trim() : null;

        const payload = {};
        if (title) payload.title = title;

        try {
            const response = await fetch(SETTINGS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN,
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (data.status === 'ok' && showMsg) {
                showToast('Titel gespeichert');
            }
        } catch (err) {
            if (showMsg) showToast('Fehler: ' + err.message);
        }
    }

    async function saveSettingsFull() {
        const payload = {
            is_anonymous: document.getElementById('settingAnonymous')?.checked ?? true,
            show_vote_count: document.getElementById('settingShowVoteCount')?.checked ?? true,
            allow_multiple_responses: document.getElementById('settingMultipleResponses')?.checked ?? false,
            questions_per_page: parseInt(document.getElementById('settingQuestionsPerPage')?.value) || 0,
            custom_id: document.getElementById('settingCustomId')?.value.trim() || null,
            start_date: document.getElementById('settingStartDate')?.value || null,
            end_date: document.getElementById('settingEndDate')?.value || null,
        };

        try {
            const response = await fetch(SETTINGS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN,
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (data.status === 'ok') {
                showToast('Einstellungen gespeichert');
            } else {
                showToast('Fehler: ' + (data.error || ''));
            }
        } catch (err) {
            showToast('Fehler: ' + err.message);
        }
    }

    async function publishPoll() {
        const isReopening = document.getElementById('statusBadge')?.textContent.trim() === 'Geschlossen';
        const msg = isReopening
            ? 'Umfrage wieder öffnen? Teilnehmer können erneut abstimmen.'
            : 'Umfrage veröffentlichen? Sie wird dann für Teilnehmer sichtbar.';
        if (!confirm(msg)) return;
        try {
            const response = await fetch(PUBLISH_URL, {
                method: 'POST',
                headers: { 'X-CSRFToken': CSRF_TOKEN, 'Accept': 'application/json' },
            });
            const data = await response.json();
            if (data.status === 'ok') {
                const badge = document.getElementById('statusBadge');
                if (badge) {
                    badge.textContent = 'Aktiv';
                    badge.className = 'status-badge status-active';
                }
                showToast('Umfrage veröffentlicht!');
                setTimeout(() => { location.reload(); }, 1200);
            }
        } catch (err) {
            showToast('Fehler: ' + err.message);
        }
    }

    async function closePoll() {
        if (!confirm('Umfrage schließen? Neue Antworten werden nicht mehr angenommen.')) return;
        try {
            const response = await fetch(CLOSE_URL, {
                method: 'POST',
                headers: { 'X-CSRFToken': CSRF_TOKEN, 'Accept': 'application/json' },
            });
            const data = await response.json();
            if (data.status === 'ok') {
                showToast('Umfrage geschlossen.');
                setTimeout(() => { location.reload(); }, 1200);
            }
        } catch (err) {
            showToast('Fehler: ' + err.message);
        }
    }

    function scheduleSave() {
        setSaveStatus('unsaved');
        if (state.saveTimer) clearTimeout(state.saveTimer);
        state.saveTimer = setTimeout(() => saveBlocks(), 2000);
    }

    function setSaveStatus(status) {
        state.saveStatus = status;
        const indicator = document.getElementById('saveIndicator');
        if (!indicator) return;
        const statusMap = {
            saved: { text: 'Gespeichert', cls: 'text-green-500' },
            saving: { text: 'Wird gespeichert...', cls: 'text-gray-400' },
            unsaved: { text: 'Nicht gespeichert', cls: 'text-amber-500' },
        };
        const info = statusMap[status] || statusMap.saved;
        indicator.textContent = info.text;
        indicator.className = `text-xs ${info.cls} hidden sm:block whitespace-nowrap`;
    }

    // =========================================================================
    // UI helpers
    // =========================================================================
    function toggleQuestionMenu() {
        const menu = document.getElementById('questionTypeMenu');
        if (menu) menu.classList.toggle('hidden');
    }

    function closeQuestionMenu() {
        const menu = document.getElementById('questionTypeMenu');
        if (menu) menu.classList.add('hidden');
    }

    function toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        if (panel) panel.classList.toggle('hidden');
    }

    function copyShareLink() {
        navigator.clipboard.writeText(POLL_URL).then(() => {
            showToast('Link kopiert!');
        }).catch(() => {
            showToast('Link: ' + POLL_URL);
        });
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 2800);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // =========================================================================
    // Public API
    // =========================================================================
    return {
        initEditor,
        addTextBlock,
        addQuestionBlock,
        deleteBlock,
        deleteCurrentBlock,
        openQuestionEditor,
        openTextEditor,
        closeQuestionModal,
        closeTextModal,
        saveQuestion,
        saveTextBlock,
        saveBlocks,
        saveSettings: saveSettingsFull,
        publishPoll,
        closePoll,
        scheduleSave,
        toggleQuestionMenu,
        toggleSettings,
        copyShareLink,
        onQuestionTypeChange,
        addOption,
        removeOption,
        updateOptionText,
        addMatrixRow,
        removeMatrixRow,
        updateMatrixRow,
        addMatrixColumn,
        removeMatrixCol: (i) => removeMatrixCol(i),
        updateMatrixCol,
        renderBlockList,
        renderPreview,
    };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof INITIAL_BLOCKS !== 'undefined') {
        EditorApp.initEditor(INITIAL_BLOCKS);
    }
});
