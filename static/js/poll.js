/**
 * safeTpoll - Poll participant view JavaScript
 * Handles form interaction, pagination, ratings, rankings
 */

const PollApp = (() => {
    // =========================================================================
    // Rating widget
    // =========================================================================
    function initRatingWidgets() {
        document.querySelectorAll('.star-rating-widget').forEach(widget => {
            const qId = widget.dataset.questionId;
            const min = parseInt(widget.dataset.min) || 1;
            const max = parseInt(widget.dataset.max) || 5;
            const container = document.getElementById(`stars_${qId}`);
            const input = document.getElementById(`ratingValue_${qId}`);
            if (!container) return;

            let currentValue = 0;

            // Build rating buttons (numbers or stars)
            const count = max - min + 1;
            const useStars = count <= 5;

            container.innerHTML = '';
            for (let i = min; i <= max; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.value = i;

                if (useStars) {
                    btn.className = 'star';
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>`;
                } else {
                    btn.className = 'rating-number';
                    btn.textContent = i;
                }

                btn.addEventListener('mouseenter', () => highlightUpTo(container, i, min, useStars));
                btn.addEventListener('mouseleave', () => highlightUpTo(container, currentValue, min, useStars));
                btn.addEventListener('click', () => {
                    currentValue = i;
                    if (input) input.value = i;
                    highlightUpTo(container, i, min, useStars);
                });

                container.appendChild(btn);
            }

            // Add min/max labels if applicable
            if (widget.dataset.labelMin || widget.dataset.labelMax) {
                const labelMin = widget.dataset.labelMin;
                const labelMax = widget.dataset.labelMax;
                if (labelMin) {
                    const span = document.createElement('span');
                    span.className = 'text-xs text-gray-400';
                    span.textContent = labelMin;
                    container.parentNode.insertBefore(span, container);
                }
                if (labelMax) {
                    const span = document.createElement('span');
                    span.className = 'text-xs text-gray-400';
                    span.textContent = labelMax;
                    container.parentNode.insertBefore(span, null);
                }
            }
        });
    }

    function highlightUpTo(container, value, min, useStars) {
        container.querySelectorAll('[data-value]').forEach(btn => {
            const v = parseInt(btn.dataset.value);
            if (useStars) {
                btn.classList.toggle('active', v <= value);
            } else {
                btn.classList.toggle('active', v === value);
            }
        });
    }

    // =========================================================================
    // Ranking widget
    // =========================================================================
    function initRankingWidgets() {
        document.querySelectorAll('.ranking-list').forEach(list => {
            const qId = list.id.replace('ranking_', '');
            const input = document.getElementById(`rankingValue_${qId}`);

            const sortable = new Sortable(list, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                onEnd: () => {
                    updateRankingPositions(list, qId, input);
                },
            });

            // Initialize value
            updateRankingPositions(list, qId, input);
        });
    }

    function updateRankingPositions(list, qId, input) {
        const items = list.querySelectorAll('.ranking-item');
        const order = [];
        items.forEach((item, index) => {
            const pos = item.querySelector('.ranking-pos');
            if (pos) pos.textContent = index + 1;
            order.push(item.dataset.id);
        });
        if (input) input.value = JSON.stringify(order);
    }

    // =========================================================================
    // Matrix widget
    // =========================================================================
    function initMatrixWidgets() {
        document.querySelectorAll('[data-matrix-question]').forEach(radio => {
            radio.addEventListener('change', () => {
                const qId = radio.dataset.matrixQuestion;
                const rowId = radio.dataset.row;
                const colValue = radio.value;
                const hiddenInput = document.getElementById(`matrixValue_${qId}`);
                if (!hiddenInput) return;

                let currentVal = {};
                try {
                    currentVal = JSON.parse(hiddenInput.value || '{}');
                } catch(e) {}
                currentVal[rowId] = colValue;
                hiddenInput.value = JSON.stringify(currentVal);
            });
        });
    }

    // =========================================================================
    // File upload preview
    // =========================================================================
    const FILE_TYPE_MAP = {
        pdf:  { label: 'PDF',  bg: '#fee2e2', text: '#dc2626' },
        xlsx: { label: 'XLSX', bg: '#dcfce7', text: '#16a34a' },
        xls:  { label: 'XLS',  bg: '#dcfce7', text: '#16a34a' },
        csv:  { label: 'CSV',  bg: '#dcfce7', text: '#16a34a' },
        docx: { label: 'DOCX', bg: '#dbeafe', text: '#2563eb' },
        doc:  { label: 'DOC',  bg: '#dbeafe', text: '#2563eb' },
        odt:  { label: 'ODT',  bg: '#dbeafe', text: '#2563eb' },
        pptx: { label: 'PPTX', bg: '#ffedd5', text: '#ea580c' },
        ppt:  { label: 'PPT',  bg: '#ffedd5', text: '#ea580c' },
        png:  { label: 'PNG',  bg: '#f3e8ff', text: '#9333ea' },
        jpg:  { label: 'JPG',  bg: '#f3e8ff', text: '#9333ea' },
        jpeg: { label: 'JPG',  bg: '#f3e8ff', text: '#9333ea' },
        gif:  { label: 'GIF',  bg: '#f3e8ff', text: '#9333ea' },
        webp: { label: 'WEBP', bg: '#f3e8ff', text: '#9333ea' },
        zip:  { label: 'ZIP',  bg: '#fef9c3', text: '#ca8a04' },
        rar:  { label: 'RAR',  bg: '#fef9c3', text: '#ca8a04' },
    };

    window.handleFilePreview = function(input, qId) {
        const preview = document.getElementById(`filePreview_${qId}`);
        if (!preview || !input.files.length) return;
        const area = input.closest('.file-upload-area');
        if (area) area.classList.add('has-file');
        const file = input.files[0];
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
        const cfg = FILE_TYPE_MAP[ext] || {
            label: ext.toUpperCase().slice(0, 4) || 'FILE',
            bg: '#f3f4f6',
            text: '#6b7280',
        };
        preview.innerHTML = `
            <div class="flex items-center gap-3 text-left">
                <div style="width:3rem;height:3rem;background:${cfg.bg};border-radius:0.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <span style="font-size:0.65rem;font-weight:700;color:${cfg.text};">${cfg.label}</span>
                </div>
                <div style="min-width:0">
                    <p style="font-size:0.875rem;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">${escapeHtml(file.name)}</p>
                    <p style="font-size:0.75rem;color:#9ca3af;">${sizeMB} MB</p>
                    <p style="font-size:0.75rem;color:#dc2626;margin-top:1px;">Datei ausgewählt ✓</p>
                </div>
            </div>
        `;
    };

    // File drag over
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('drag-over');
        });
        area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            const input = area.querySelector('input[type=file]');
            if (input && e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                const qId = input.id.replace('file_', '');
                handleFilePreview(input, qId);
            }
        });
    });

    // =========================================================================
    // Collect answers from form
    // =========================================================================
    function collectAnswers() {
        const answers = {};

        // Single choice (radio)
        document.querySelectorAll('input[type=radio][name^="q_"]:checked').forEach(input => {
            const qId = input.name.replace('q_', '');
            if (!input.name.startsWith('matrix_')) {
                answers[qId] = input.value;
            }
        });

        // Multiple choice (checkbox)
        document.querySelectorAll('input[type=checkbox][name^="q_"]').forEach(input => {
            if (!input.checked) return;
            const qId = input.name.replace('q_', '');
            if (!answers[qId]) answers[qId] = [];
            answers[qId].push(input.value);
        });

        // Text/textarea/number/date
        document.querySelectorAll('input[name^="q_"]:not([type=radio]):not([type=checkbox]):not([type=hidden]), textarea[name^="q_"]').forEach(input => {
            const qId = input.name.replace('q_', '');
            if (input.value.trim()) {
                answers[qId] = input.value.trim();
            }
        });

        // Rating (hidden inputs)
        document.querySelectorAll('input[type=hidden][id^="ratingValue_"]').forEach(input => {
            const qId = input.id.replace('ratingValue_', '');
            if (input.value) answers[qId] = input.value;
        });

        // Ranking (hidden inputs)
        document.querySelectorAll('input[type=hidden][id^="rankingValue_"]').forEach(input => {
            const qId = input.id.replace('rankingValue_', '');
            if (input.value) {
                try { answers[qId] = JSON.parse(input.value); } catch(e) {}
            }
        });

        // Matrix (hidden inputs)
        document.querySelectorAll('input[type=hidden][id^="matrixValue_"]').forEach(input => {
            const qId = input.id.replace('matrixValue_', '');
            if (input.value) {
                try { answers[qId] = JSON.parse(input.value); } catch(e) {}
            }
        });

        return answers;
    }

    // =========================================================================
    // Submit
    // =========================================================================
    function hasFileUploads() {
        return [...document.querySelectorAll('input[type=file]')].some(f => f.files && f.files.length > 0);
    }

    async function submit() {
        const btn = document.getElementById('submitBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Wird gesendet...`;
        }

        const answers = collectAnswers();

        let fetchOptions;
        if (hasFileUploads()) {
            // Use FormData for multipart submission when files are present
            const fd = new FormData();
            fd.append('current_page', CURRENT_PAGE);
            fd.append('csrfmiddlewaretoken', CSRF_TOKEN);
            Object.entries(answers).forEach(([qId, val]) => {
                fd.append(`answer_${qId}`, typeof val === 'object' ? JSON.stringify(val) : val);
            });
            document.querySelectorAll('input[type=file]').forEach(fileInput => {
                if (fileInput.files && fileInput.files[0]) {
                    const qId = fileInput.id.replace('file_', '');
                    fd.append(`file_${qId}`, fileInput.files[0]);
                }
            });
            fetchOptions = { method: 'POST', headers: { 'X-CSRFToken': CSRF_TOKEN }, body: fd };
        } else {
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF_TOKEN },
                body: JSON.stringify({ current_page: CURRENT_PAGE, answers }),
            };
        }

        try {
            const response = await fetch(POLL_SUBMIT_URL, fetchOptions);
            const data = await response.json();

            if (data.completed) {
                const content = document.getElementById('pollContent');
                const thankYou = document.getElementById('thankYouMsg');
                if (content) content.classList.add('hidden');
                if (thankYou) thankYou.classList.remove('hidden');
            } else if (data.next_page) {
                window.location.href = `?page=${data.next_page}`;
            }
        } catch (err) {
            if (btn) {
                btn.disabled = false;
                btn.textContent = IS_LAST_PAGE ? 'Absenden' : 'Weiter';
            }
            alert('Fehler beim Senden: ' + err.message);
        }
    }

    // =========================================================================
    // Restore existing answers
    // =========================================================================
    function restoreAnswers() {
        if (!EXISTING_ANSWERS || typeof EXISTING_ANSWERS !== 'object') return;

        Object.entries(EXISTING_ANSWERS).forEach(([qId, value]) => {
            if (value === null || value === undefined) return;

            // Radio
            const radio = document.querySelector(`input[type=radio][name="q_${qId}"][value="${value}"]`);
            if (radio) { radio.checked = true; return; }

            // Checkboxes
            if (Array.isArray(value)) {
                value.forEach(v => {
                    const cb = document.querySelector(`input[type=checkbox][name="q_${qId}"][value="${v}"]`);
                    if (cb) cb.checked = true;
                });
                return;
            }

            // Text/textarea/number/date
            const textInput = document.querySelector(`input[name="q_${qId}"]:not([type=hidden]), textarea[name="q_${qId}"]`);
            if (textInput) { textInput.value = value; return; }

            // Rating hidden
            const ratingInput = document.getElementById(`ratingValue_${qId}`);
            if (ratingInput) {
                ratingInput.value = value;
            }
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // =========================================================================
    // Init
    // =========================================================================
    function init() {
        initRatingWidgets();
        if (typeof Sortable !== 'undefined') {
            initRankingWidgets();
        }
        initMatrixWidgets();
        restoreAnswers();
    }

    document.addEventListener('DOMContentLoaded', init);

    return { submit };
})();
