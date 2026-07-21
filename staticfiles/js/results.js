/**
 * safeTpoll - Results page JavaScript
 * WebSocket live updates + ChartJS rendering
 */

const ResultsApp = (() => {
    const chartInstances = {};

    // =========================================================================
    // Brand color palette for charts
    // =========================================================================
    const BRAND_COLORS = [
        'rgba(220, 38, 38, 0.8)',   // red-600
        'rgba(239, 68, 68, 0.8)',   // red-500
        'rgba(248, 113, 113, 0.8)', // red-400
        'rgba(252, 165, 165, 0.8)', // red-300
        'rgba(59, 130, 246, 0.8)',  // blue-500
        'rgba(16, 185, 129, 0.8)', // green-500
        'rgba(245, 158, 11, 0.8)', // amber-500
        'rgba(139, 92, 246, 0.8)', // purple-500
        'rgba(236, 72, 153, 0.8)', // pink-500
        'rgba(14, 165, 233, 0.8)', // sky-500
    ];

    const BORDER_COLORS = BRAND_COLORS.map(c => c.replace('0.8', '1'));

    function getColor(index) {
        return BRAND_COLORS[index % BRAND_COLORS.length];
    }

    function getBorderColor(index) {
        return BORDER_COLORS[index % BORDER_COLORS.length];
    }

    // =========================================================================
    // Chart initialization
    // =========================================================================
    function initAllCharts(resultsData) {
        if (!resultsData || !resultsData.questions) return;

        resultsData.questions.forEach(q => {
            const canvasId = `chart_${q.question_id}`;
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            // Destroy existing chart if any
            if (chartInstances[q.question_id]) {
                chartInstances[q.question_id].destroy();
            }

            const chartType = canvas.dataset.type || 'bar';

            if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
                const labels = (q.options || []).map(o => o.text);
                const values = (q.options || []).map(o => o.count);
                chartInstances[q.question_id] = createBarChart(canvas, labels, values);

            } else if (q.question_type === 'rating') {
                const labels = (q.distribution || []).map(d => String(d.value));
                const values = (q.distribution || []).map(d => d.count);
                chartInstances[q.question_id] = createBarChart(canvas, labels, values, '#dc2626');

            } else if (q.question_type === 'ranking') {
                const labels = (q.options || []).map(o => o.text);
                const values = (q.options || []).map(o => o.average_rank || 0);
                chartInstances[q.question_id] = createBarChart(canvas, labels, values, '#b91c1c', true);

            } else if (q.question_type === 'number') {
                // Histogram
                const vals = q.values || [];
                if (vals.length > 0) {
                    const buckets = createHistogramBuckets(vals, 8);
                    chartInstances[q.question_id] = createBarChart(
                        canvas,
                        buckets.labels,
                        buckets.values,
                        '#dc2626'
                    );
                }
            }
        });
    }

    function createBarChart(canvas, labels, values, color = null, reversed = false) {
        const colors = color
            ? labels.map(() => color)
            : labels.map((_, i) => getColor(i));

        const borderColors = color
            ? labels.map(() => color)
            : labels.map((_, i) => getBorderColor(i));

        return new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: values.length > 5 ? 'y' : 'x',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed.y ?? context.parsed.x;
                                return reversed
                                    ? ` Ø Rang: ${val}`
                                    : ` ${val} Antworten`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: '#f3f4f6' },
                        ticks: {
                            font: { family: 'DM Sans', size: 11 },
                            color: '#6b7280',
                            maxRotation: 30,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' },
                        ticks: {
                            font: { family: 'DM Sans', size: 11 },
                            color: '#6b7280',
                            stepSize: 1,
                            precision: reversed ? 1 : 0,
                        },
                    },
                },
            },
        });
    }

    function createHistogramBuckets(values, numBuckets) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        if (min === max) {
            return { labels: [String(min)], values: [values.length] };
        }
        const bucketSize = (max - min) / numBuckets;
        const buckets = Array(numBuckets).fill(0);
        values.forEach(v => {
            const idx = Math.min(Math.floor((v - min) / bucketSize), numBuckets - 1);
            buckets[idx]++;
        });
        const labels = buckets.map((_, i) => {
            const lo = (min + i * bucketSize).toFixed(1);
            const hi = (min + (i + 1) * bucketSize).toFixed(1);
            return `${lo}–${hi}`;
        });
        return { labels, values: buckets };
    }

    // =========================================================================
    // Update charts with new data
    // =========================================================================
    const FILE_TYPE_CLASSES = {
        pdf:     ['bg-red-100',    'text-red-600'],
        excel:   ['bg-green-100',  'text-green-600'],
        word:    ['bg-blue-100',   'text-blue-600'],
        ppt:     ['bg-orange-100', 'text-orange-600'],
        image:   ['bg-purple-100', 'text-purple-600'],
        archive: ['bg-yellow-100', 'text-yellow-600'],
    };

    function updateChartsWithData(resultsData) {
        const totalEl = document.getElementById('statTotal');
        if (totalEl) totalEl.textContent = resultsData.total_responses;

        (resultsData.questions || []).forEach(q => {
            // --- Chart updates (only for questions that have a chart) ---
            const chart = chartInstances[q.question_id];
            if (chart) {
                if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
                    chart.data.datasets[0].data = (q.options || []).map(o => o.count);
                    chart.update('active');
                } else if (q.question_type === 'rating') {
                    chart.data.datasets[0].data = (q.distribution || []).map(d => d.count);
                    chart.update('active');
                } else if (q.question_type === 'ranking') {
                    chart.data.datasets[0].data = (q.options || []).map(o => o.average_rank || 0);
                    chart.update('active');
                } else if (q.question_type === 'number') {
                    const vals = q.values || [];
                    if (vals.length > 0) {
                        const buckets = createHistogramBuckets(vals, 8);
                        chart.data.labels = buckets.labels;
                        chart.data.datasets[0].data = buckets.values;
                        chart.update('active');
                    }
                }
            }

            // --- Matrix cells ---
            if (q.question_type === 'matrix' && q.matrix) {
                const container = document.getElementById(`matrixContainer_${q.question_id}`);
                if (container) {
                    container.querySelectorAll('td[data-row][data-col]').forEach(td => {
                        const rowId = td.dataset.row;
                        const colId = td.dataset.col;
                        const cell = td.querySelector('.matrix-cell');
                        const count = (q.matrix[rowId] || {})[colId] || 0;
                        if (cell) cell.textContent = count;
                    });
                }
            }

            // --- Text / textarea / date responses ---
            if (['text', 'textarea', 'date'].includes(q.question_type)) {
                const container = document.querySelector(`[data-question-id="${q.question_id}"] .space-y-2`);
                if (container) {
                    if (q.responses && q.responses.length > 0) {
                        container.innerHTML = q.responses.map(r =>
                            `<div class="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-100">${escapeHtml(r)}</div>`
                        ).join('');
                    } else {
                        container.innerHTML = '<p class="text-sm text-gray-400 italic">Noch keine Antworten</p>';
                    }
                }
            }

            // --- File cards ---
            if (q.question_type === 'file' && q.files) {
                const container = document.querySelector(`[data-question-id="${q.question_id}"] .flex.flex-wrap`);
                if (container) {
                    if (q.files.length > 0) {
                        container.innerHTML = q.files.map(f => {
                            const [bgCls, txtCls] = FILE_TYPE_CLASSES[f.file_type] || ['bg-gray-200', 'text-gray-600'];
                            return `<a href="${f.url}" target="_blank" rel="noopener"
                                       class="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm transition-all group max-w-xs min-w-0">
                                        <div class="flex-shrink-0">
                                            <div class="w-11 h-11 ${bgCls} rounded-xl flex items-center justify-center">
                                                <span class="text-xs font-bold ${txtCls}">${escapeHtml(f.ext)}</span>
                                            </div>
                                        </div>
                                        <div class="min-w-0">
                                            <p class="text-sm font-medium text-gray-800 truncate group-hover:text-brand-700 max-w-40">${escapeHtml(f.name)}</p>
                                            <p class="text-xs text-gray-400 group-hover:text-brand-500 transition-colors">Öffnen ↗</p>
                                        </div>
                                    </a>`;
                        }).join('');
                    } else {
                        container.innerHTML = '<p class="text-sm text-gray-400 italic">Noch keine Dateien hochgeladen</p>';
                    }
                }
            }

            // --- Answer count badge ---
            const card = document.querySelector(`[data-question-id="${q.question_id}"]`);
            if (card) {
                const countBadge = card.querySelector('.text-xs.bg-gray-100');
                if (countBadge) {
                    countBadge.textContent = `${q.answer_count} Antwort${q.answer_count !== 1 ? 'en' : ''}`;
                }
            }
        });
    }

    // =========================================================================
    // WebSocket
    // =========================================================================
    function connectWebSocket() {
        const indicator = document.getElementById('liveIndicator');
        const liveText = document.getElementById('liveText');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/poll/${POLL_ID}/results/`;

        let ws = null;
        let reconnectTimer = null;
        let reconnectDelay = 2000;

        function connect() {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                if (indicator) {
                    indicator.classList.remove('bg-gray-300', 'bg-red-400');
                    indicator.classList.add('bg-green-500');
                }
                if (liveText) liveText.textContent = 'Live';
                reconnectDelay = 2000;
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    updateChartsWithData(data);
                } catch (e) {
                    console.warn('WS message parse error:', e);
                }
            };

            ws.onclose = () => {
                if (indicator) {
                    indicator.classList.remove('bg-green-500');
                    indicator.classList.add('bg-gray-300');
                }
                if (liveText) liveText.textContent = 'Offline – reconnecting...';
                // Exponential backoff reconnect
                reconnectTimer = setTimeout(() => {
                    reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
                    connect();
                }, reconnectDelay);
            };

            ws.onerror = () => {
                if (indicator) {
                    indicator.classList.remove('bg-green-500');
                    indicator.classList.add('bg-red-400');
                }
                if (liveText) liveText.textContent = 'Verbindungsfehler';
            };
        }

        connect();
    }

    // =========================================================================
    // Delete response
    // =========================================================================
    async function deleteResponse(responseId, pollId) {
        if (!confirm('Abstimmung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

        const url = `/poll/${pollId}/response/${responseId}/delete/`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'X-CSRFToken': CSRF_TOKEN },
            });
            if (res.ok) {
                const row = document.getElementById(`voter_${responseId}`);
                if (row) {
                    row.style.transition = 'opacity 0.2s';
                    row.style.opacity = '0';
                    setTimeout(() => row.remove(), 200);
                }
                // Update voter count badge immediately
                const badge = document.getElementById('voterCountBadge');
                if (badge) {
                    badge.textContent = Math.max(0, (parseInt(badge.textContent) || 0) - 1);
                }
                // Refresh chart data immediately (WebSocket also broadcasts, this is the fallback)
                await refreshData();
            } else {
                alert('Fehler beim Löschen der Abstimmung.');
            }
        } catch (e) {
            alert('Netzwerkfehler: ' + e.message);
        }
    }

    // =========================================================================
    // Toggle allow_multiple_responses
    // =========================================================================
    async function toggleMultipleResponses(btn) {
        const pollId = btn.dataset.pollId;
        const currentlyEnabled = btn.dataset.enabled === 'true';
        const newValue = !currentlyEnabled;

        const track = document.getElementById('multipleToggleTrack');
        const thumb = document.getElementById('multipleToggleThumb');

        if (newValue) {
            track.classList.remove('bg-gray-300');
            track.classList.add('bg-brand-600');
            thumb.classList.remove('left-[2px]');
            thumb.classList.add('left-[18px]');
        } else {
            track.classList.remove('bg-brand-600');
            track.classList.add('bg-gray-300');
            thumb.classList.remove('left-[18px]');
            thumb.classList.add('left-[2px]');
        }
        btn.dataset.enabled = String(newValue);

        try {
            await fetch(`/poll/${pollId}/settings/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN,
                },
                body: JSON.stringify({ allow_multiple_responses: newValue }),
            });
        } catch (e) {
            // Revert on error
            btn.dataset.enabled = String(currentlyEnabled);
            if (currentlyEnabled) {
                track.classList.add('bg-brand-600');
                track.classList.remove('bg-gray-300');
                thumb.classList.add('left-[18px]');
                thumb.classList.remove('left-[2px]');
            } else {
                track.classList.add('bg-gray-300');
                track.classList.remove('bg-brand-600');
                thumb.classList.add('left-[2px]');
                thumb.classList.remove('left-[18px]');
            }
        }
    }

    // =========================================================================
    // Teams meeting export
    // =========================================================================
    async function createTeamsMeeting() {
        const title = document.getElementById('teamsTitle')?.value.trim();
        const description = document.getElementById('teamsDesc')?.value.trim();
        const startRaw = document.getElementById('teamsStart')?.value;
        const endRaw = document.getElementById('teamsEnd')?.value;
        const statusEl = document.getElementById('teamsStatus');

        if (!startRaw || !endRaw) {
            if (statusEl) {
                statusEl.textContent = 'Bitte Start- und Endzeit angeben.';
                statusEl.className = 'text-sm text-red-500';
            }
            return;
        }

        if (statusEl) {
            statusEl.textContent = 'Erstelle Meeting...';
            statusEl.className = 'text-sm text-gray-400';
        }

        try {
            const response = await fetch(TEAMS_EXPORT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CSRF_TOKEN,
                },
                body: JSON.stringify({
                    event_title: title,
                    description: description,
                    start_datetime: startRaw,
                    end_datetime: endRaw,
                }),
            });

            const data = await response.json();

            if (data.status === 'ok') {
                let msg = 'Meeting erfolgreich erstellt!';
                if (data.join_url) {
                    msg += ` <a href="${data.join_url}" target="_blank" class="underline">Beitreten</a>`;
                }
                if (statusEl) {
                    statusEl.innerHTML = msg;
                    statusEl.className = 'text-sm text-green-600';
                }
            } else {
                if (statusEl) {
                    statusEl.textContent = 'Fehler: ' + (data.error || 'Unbekannter Fehler');
                    statusEl.className = 'text-sm text-red-500';
                }
            }
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = 'Netzwerkfehler: ' + err.message;
                statusEl.className = 'text-sm text-red-500';
            }
        }
    }

    // =========================================================================
    // Refresh data manually
    // =========================================================================
    async function refreshData() {
        try {
            const response = await fetch(RESULTS_DATA_URL);
            const data = await response.json();
            updateChartsWithData(data);
        } catch (e) {
            console.warn('Refresh error:', e);
        }
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
        // Wait for Chart.js to load
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }

        // Set default font
        Chart.defaults.font.family = 'DM Sans';

        // Initialize charts with initial data
        if (typeof INITIAL_RESULTS !== 'undefined') {
            initAllCharts(INITIAL_RESULTS);
            // Initialize matrix cells from initial data
            (INITIAL_RESULTS.questions || []).forEach(q => {
                if (q.question_type === 'matrix' && q.matrix) {
                    const container = document.getElementById(`matrixContainer_${q.question_id}`);
                    if (container) {
                        container.querySelectorAll('td[data-row][data-col]').forEach(td => {
                            const rowId = td.dataset.row;
                            const colId = td.dataset.col;
                            const cell = td.querySelector('.matrix-cell');
                            const count = (q.matrix[rowId] || {})[colId] || 0;
                            if (cell) cell.textContent = count;
                        });
                    }
                }
            });
        }

        // Connect WebSocket
        connectWebSocket();

        // Refresh data every 60 seconds as fallback
        setInterval(refreshData, 60000);
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        createTeamsMeeting,
        refreshData,
        deleteResponse,
        toggleMultipleResponses,
    };
})();
