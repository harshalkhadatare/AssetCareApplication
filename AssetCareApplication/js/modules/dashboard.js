/* ===========================================================================
   modules/dashboard.js
   Interactive HVI Dashboard fully synced with Global Language Translation
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.dashboard = (function () {
    let charts = [];
    let activeRange = 'today'; 
    let customDateRange = { start: '', end: '' };
    let mockData = {};
    let dashSettings = JSON.parse(localStorage.getItem('hvi-dash-settings')) || { showIssue: true, showInspection: true, showFault: true };

    const t = (key) => VAC.translate ? VAC.translate(key) : key; // Local shorthand

    function generateMockData(range) {
        let multiplier = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 1;
        if(range === 'custom' && customDateRange.start && customDateRange.end) {
            const days = Math.max(1, Math.ceil((new Date(customDateRange.end) - new Date(customDateRange.start)) / (1000 * 60 * 60 * 24)));
            multiplier = days;
        }

        const totalIssues = (34 * multiplier) + Math.floor(Math.random() * 10);
        return {
            issues: { total: totalIssues, resolved: Math.floor(totalIssues * 0.4), inProgress: Math.floor(totalIssues * 0.2), pending: totalIssues - Math.floor(totalIssues * 0.4) - Math.floor(totalIssues * 0.2) },
            inspections: { total: (212 * multiplier), approved: (23 * multiplier), pending: (198 * multiplier), working: (186 * multiplier), attention: (23 * multiplier) },
            faults: { faultyVehicles: 23 * (multiplier > 1 ? 2 : 1), repairItems: 20 * (multiplier > 1 ? 3 : 1), replaceItems: 8 * (multiplier > 1 ? 2 : 1) },
            topVehicles: [{ id: 'VISION/R/WL/534', count: multiplier > 1 ? 4 : 1 }, { id: 'VPAV200021', count: multiplier > 1 ? 3 : 1 }, { id: 'VJAW300003', count: multiplier > 1 ? 2 : 1 }],
            topRepairs: [{ item: 'Brake Pads', count: 12 * multiplier }, { item: 'Hydraulic Hose', count: 8 * multiplier }, { item: 'Oil Filter', count: 3 * multiplier }],
            activeVehicles: 236
        };
    }

    function destroyCharts() {
        charts.forEach(c => { try { c.destroy(); } catch (e) {} });
        charts = [];
    }

    function showSettingsModal() {
        const modalHtml = `
            <div id="dash-settings-modal" class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-[slideIn_0.2s_ease-out]">
                    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                        <h3 class="font-bold text-slate-800 dark:text-white">${t('dash_settings')}</h3>
                        <button onclick="document.getElementById('dash-settings-modal').remove()" class="text-slate-400 hover:text-rose-500"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="p-6 space-y-4">
                        <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="chk-issue" ${dashSettings.showIssue ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600"> <span class="dark:text-slate-300">${t('show_issue')}</span></label>
                        <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="chk-insp" ${dashSettings.showInspection ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600"> <span class="dark:text-slate-300">${t('show_inspection')}</span></label>
                        <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="chk-fault" ${dashSettings.showFault ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600"> <span class="dark:text-slate-300">${t('show_fault')}</span></label>
                    </div>
                    <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                        <button onclick="document.getElementById('dash-settings-modal').remove()" class="px-4 py-2 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">${t('cancel')}</button>
                        <button id="save-dash-settings" class="px-4 py-2 rounded bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition">${t('save_changes')}</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('save-dash-settings').addEventListener('click', () => {
            dashSettings.showIssue = document.getElementById('chk-issue').checked;
            dashSettings.showInspection = document.getElementById('chk-insp').checked;
            dashSettings.showFault = document.getElementById('chk-fault').checked;
            localStorage.setItem('hvi-dash-settings', JSON.stringify(dashSettings));
            document.getElementById('dash-settings-modal').remove();
            render(); 
        });
    }

    function showCustomDateModal() {
        const modalHtml = `
            <div id="custom-date-modal" class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 animate-[slideIn_0.2s_ease-out]">
                    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                        <h3 class="font-bold text-slate-800 dark:text-white">${t('select_custom_date')}</h3>
                    </div>
                    <div class="p-6 space-y-4">
                        <div><label class="block text-sm text-slate-600 dark:text-slate-400 mb-1">${t('start_date')}</label><input type="date" id="date-start" class="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none" value="${customDateRange.start}"></div>
                        <div><label class="block text-sm text-slate-600 dark:text-slate-400 mb-1">${t('end_date')}</label><input type="date" id="date-end" class="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none" value="${customDateRange.end}"></div>
                        <div id="date-error" class="text-rose-500 text-sm hidden">Start date must be before End date.</div>
                    </div>
                    <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                        <button onclick="document.getElementById('custom-date-modal').remove()" class="px-4 py-2 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">${t('cancel')}</button>
                        <button id="save-custom-date" class="px-4 py-2 rounded bg-[#0ea5e9] hover:bg-[#0284c7] text-white transition">${t('apply_range')}</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('save-custom-date').addEventListener('click', () => {
            const start = document.getElementById('date-start').value;
            const end = document.getElementById('date-end').value;
            const errorEl = document.getElementById('date-error');
            if(!start || !end || new Date(start) > new Date(end)) { errorEl.classList.remove('hidden'); return; }
            customDateRange = { start, end }; activeRange = 'custom';
            document.getElementById('custom-date-modal').remove();
            render();
        });
    }

    function renderTabs() {
        const tabs = [
            { id: 'today', label: t('today') }, { id: '7d', label: t('last_7_days') }, { id: '30d', label: t('last_30_days') },
            { id: '90d', label: t('last_90_days') }, { id: 'custom', label: activeRange === 'custom' && customDateRange.start ? `${customDateRange.start} - ${customDateRange.end}` : t('custom_date') }
        ];

        return `
            <div class="flex flex-col md:flex-row justify-between items-center bg-transparent mb-6 gap-4">
                <div class="flex gap-2 overflow-x-auto bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                    ${tabs.map(tab => {
                        const activeClasses = activeRange === tab.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent font-medium cursor-pointer';
                        return `<button class="px-5 py-1.5 text-sm rounded-full transition-all ${activeClasses}" data-range="${tab.id}">${tab.label}</button>`;
                    }).join('')}
                </div>
                <div class="flex gap-3">
                    <button id="btn-dash-settings" class="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded shadow-sm text-sm font-semibold flex items-center gap-2"><i class="fas fa-cog"></i> ${t('dash_settings')}</button>
                    <button class="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded shadow-sm text-sm font-semibold flex items-center gap-2"><i class="fas fa-map-marked-alt"></i> ${t('map_view')}</button>
                </div>
            </div>`;
    }

    function template() {
        const d = mockData;
        let topCardsHTML = '';
        
        if(dashSettings.showIssue) topCardsHTML += `
            <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full">
                <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-5">${t('issue_report')}</h3>
                <div class="flex-1 space-y-1">
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-times-square text-slate-400 w-4"></i> ${t('total_issue')}</span><span class="text-rose-600 font-bold text-lg">${d.issues.total} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-check-square text-[#0ea5e9] w-4"></i> ${t('resolved')}</span><span class="text-emerald-500 font-bold text-lg">${d.issues.resolved} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-clock-rotate-left text-[#0ea5e9] w-4"></i> ${t('in_progress')}</span><span class="text-slate-800 dark:text-slate-300 font-bold text-lg">${d.issues.inProgress} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-rotate-right text-slate-400 w-4"></i> ${t('pending')}</span><span class="text-rose-600 font-bold text-lg">${d.issues.pending} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                </div>
            </div>`;

        if(dashSettings.showInspection) topCardsHTML += `
            <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full relative">
                <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-5">${t('inspection_conducted')}</h3>
                <div class="flex-1 space-y-1">
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-search-document text-[#0ea5e9] w-4"></i> ${t('total_inspection')}</span><span class="text-slate-800 dark:text-slate-300 font-bold text-lg">${d.inspections.total} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-file-signature text-[#0ea5e9] w-4"></i> ${t('approved')}</span><span class="text-emerald-500 font-bold text-lg">${d.inspections.approved} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-file-contract text-[#0ea5e9] w-4"></i> ${t('pending_approval')}</span><span class="text-rose-600 font-bold text-lg">${d.inspections.pending} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-check-square text-[#0ea5e9] w-4"></i> ${t('working_condition')}</span><span class="text-emerald-500 font-bold text-lg">${d.inspections.working} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-times-circle text-slate-400 w-4"></i> ${t('need_attention')}</span><span class="text-rose-600 font-bold text-lg">${d.inspections.attention} <i class="fas fa-chevron-right text-[10px] text-slate-300 ml-2"></i></span></div>
                </div>
                <div class="mt-6 relative h-[140px] w-full"><canvas id="inspectionDonut"></canvas></div>
            </div>`;

        if(dashSettings.showFault) topCardsHTML += `
            <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full">
                <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-5">${t('fault_summary')}</h3>
                <div class="flex-1 space-y-1">
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-truck text-slate-400 w-4"></i> ${t('faulty_vehicles')}</span><span class="text-rose-600 font-bold text-xl">${d.faults.faultyVehicles}</span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-check-square text-[#0ea5e9] w-4"></i> ${t('repair_items')}</span><span class="text-[#d97706] font-bold text-xl">${d.faults.repairItems}</span></div>
                    <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700"><span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-times-circle text-slate-400 w-4"></i> ${t('replace_items')}</span><span class="text-rose-600 font-bold text-xl">${d.faults.replaceItems}</span></div>
                </div>
                <div class="mt-6 relative h-[140px] w-full"><canvas id="faultBarChart"></canvas></div>
            </div>`;

        return `
        <div class="max-w-[1600px] mx-auto pb-10">
            ${renderTabs()}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">${topCardsHTML}</div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">${t('top_faulty')}</h3>
                    <div class="pr-2">${d.topVehicles.map(v => `<div class="flex justify-between py-3 border-b border-slate-200 dark:border-slate-700 text-sm"><span class="text-slate-700 dark:text-slate-300">${v.id}</span><span class="text-rose-600 font-bold">${v.count}</span></div>`).join('')}</div>
                </div>
                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">${t('top_repair')}</h3>
                    <div class="pr-2">${d.topRepairs.map(r => `<div class="flex justify-between py-3 border-b border-slate-200 dark:border-slate-700 text-sm"><span class="text-slate-700 dark:text-slate-300">${r.item}</span><span class="text-amber-600 font-bold">${r.count}</span></div>`).join('')}</div>
                </div>
                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 md:col-span-2 lg:col-span-1">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">${t('vehicle_status')}</h3>
                    <div class="relative h-[180px] w-full mt-4"><canvas id="vehicleStatusChart"></canvas></div>
                </div>
            </div>
        </div>
        `;
    }

    function renderCharts() {
        if (typeof Chart === 'undefined') return;
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#64748b'; 
        const gridColor = isDark ? '#334155' : '#e2e8f0'; 
        
        if(dashSettings.showInspection) {
            const ctxDonut = document.getElementById('inspectionDonut');
            if (ctxDonut) charts.push(new Chart(ctxDonut, { type: 'doughnut', data: { labels: [t('good'), t('faulty')], datasets: [{ data: [89, 11], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: isDark ? 2 : 0, borderColor: isDark ? '#0f172a' : '#fff', cutout: '65%' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
        }

        if(dashSettings.showFault) {
            const ctxBar = document.getElementById('faultBarChart');
            if (ctxBar) charts.push(new Chart(ctxBar, { type: 'bar', data: { labels: [t('faulty_vehicles'), t('repair_items'), t('replace_items')], datasets: [{ data: [mockData.faults.faultyVehicles, mockData.faults.repairItems, mockData.faults.replaceItems], backgroundColor: ['#ef4444', '#facc15', '#f472b6'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { color: textColor, usePointStyle: true, boxWidth: 8, font: { size: 10 } } } }, scales: { x: { display: false }, y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor } } } } }));
        }

        const ctxStatus = document.getElementById('vehicleStatusChart');
        if (ctxStatus) {
            let gradient = ctxStatus.getContext('2d').createLinearGradient(0, 0, 0, 400); gradient.addColorStop(0, '#34d399'); gradient.addColorStop(1, '#059669');
            charts.push(new Chart(ctxStatus, { type: 'bar', data: { labels: [t('active')], datasets: [{ data: [mockData.activeVehicles], backgroundColor: gradient, borderRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: gridColor, drawBorder: false }, ticks: { display: false } } } }, plugins: [{ id: 'rightLabel', afterDatasetsDraw: (chart) => { const ctx = chart.ctx; const bar = chart.getDatasetMeta(0).data[0]; if (bar) { ctx.fillStyle = isDark ? '#e2e8f0' : '#333'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'bold 13px Arial'; ctx.fillText(mockData.activeVehicles, bar.x + 10, bar.y); } } }] }));
        }
    }

    function bindActions(container) {
        container.querySelectorAll('[data-range]').forEach(btn => {
            btn.onclick = () => { if(btn.dataset.range === 'custom') showCustomDateModal(); else { activeRange = btn.dataset.range; render(container); } };
        });
        const settingsBtn = document.getElementById('btn-dash-settings');
        if(settingsBtn) settingsBtn.addEventListener('click', showSettingsModal);
    }

    function render(container = document.getElementById('view-container')) {
        destroyCharts();
        mockData = generateMockData(activeRange);
        container.innerHTML = template();
        setTimeout(() => { renderCharts(); bindActions(container); }, 10);
    }

    // Global listener to redraw the dashboard entirely to translate dynamic JS strings instantly
    window.addEventListener('languageChanged', render);
    window.addEventListener('themeChanged', render);

    return { render, destroy: destroyCharts };
})();