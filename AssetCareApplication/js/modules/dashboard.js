/* ===========================================================================
   modules/dashboard.js
   Fully Interactive, Theme-Aware VAC Operations Dashboard Replica.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.dashboard = (function () {
    let charts = [];
    let activeRange = 'today'; 
    let mockData = {};

    // Generate highly realistic mock data that reacts to date ranges
    function generateMockData(range) {
        const multiplier = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 120;
        
        // Exact numbers from screenshot for "today"
        const baseFaultyVehicles = 23;
        const baseRepairItems = 20;
        const baseReplaceItems = 8;
        const totalIssues = (32 * multiplier) + Math.floor(Math.random() * 10);
        
        return {
            issues: {
                total: totalIssues,
                resolved: Math.floor(totalIssues * 0.4),
                inProgress: Math.floor(totalIssues * 0.2),
                pending: totalIssues - Math.floor(totalIssues * 0.4) - Math.floor(totalIssues * 0.2),
            },
            inspections: {
                total: (209 * multiplier) + Math.floor(Math.random() * 20),
                approved: (20 * multiplier) + Math.floor(Math.random() * 5),
                pending: (189 * multiplier) + Math.floor(Math.random() * 15),
                working: (186 * multiplier) + Math.floor(Math.random() * 10),
                attention: (23 * multiplier) + Math.floor(Math.random() * 5),
            },
            faults: {
                faultyVehicles: baseFaultyVehicles * (multiplier > 1 ? 2 : 1),
                repairItems: baseRepairItems * (multiplier > 1 ? 3 : 1),
                replaceItems: baseReplaceItems * (multiplier > 1 ? 2 : 1)
            },
            topVehicles: [
                { id: 'VISION/R/WL/534', count: multiplier > 1 ? 4 : 1 },
                { id: 'VPAV200021', count: multiplier > 1 ? 3 : 1 },
                { id: 'VJAW300003', count: multiplier > 1 ? 2 : 1 },
                { id: 'MH12AB1234', count: 1 }
            ],
            topRepairs: [
                { item: 'Brake Pads', count: 12 * multiplier },
                { item: 'Hydraulic Hose', count: 8 * multiplier },
                { item: 'Headlight Bulb', count: 5 * multiplier },
                { item: 'Oil Filter', count: 3 * multiplier }
            ],
            activeVehicles: 236
        };
    }

    function destroyCharts() {
        charts.forEach(c => { try { c.destroy(); } catch (e) {} });
        charts = [];
    }

    // Modal UI Injector for Dashboard Settings
    function showSettingsModal() {
        const modalHtml = `
            <div id="dash-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                        <h3 class="font-bold text-slate-800 dark:text-white">Dashboard Settings</h3>
                        <button onclick="document.getElementById('dash-modal').remove()" class="text-slate-400 hover:text-rose-500"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="p-6 space-y-4">
                        <label class="flex items-center gap-3"><input type="checkbox" checked class="w-4 h-4 rounded text-blue-600"> <span class="dark:text-slate-300">Show Issue Report</span></label>
                        <label class="flex items-center gap-3"><input type="checkbox" checked class="w-4 h-4 rounded text-blue-600"> <span class="dark:text-slate-300">Show Inspection Conducted</span></label>
                        <label class="flex items-center gap-3"><input type="checkbox" checked class="w-4 h-4 rounded text-blue-600"> <span class="dark:text-slate-300">Show Fault Summary</span></label>
                    </div>
                    <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                        <button onclick="document.getElementById('dash-modal').remove()" class="px-4 py-2 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
                        <button onclick="document.getElementById('dash-modal').remove(); window.showToast('Settings saved successfully');" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">Save Changes</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function renderTabs() {
        const tabs = [
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
            { id: 'custom', label: 'Custom Date' }
        ];

        return `
            <div class="flex flex-col md:flex-row justify-between items-center bg-transparent mb-6 gap-4">
                <div class="flex gap-2 overflow-x-auto bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                    ${tabs.map(t => {
                        const isActive = activeRange === t.id;
                        const activeClasses = isActive 
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 font-semibold shadow-sm' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent font-medium cursor-pointer';
                        return `<button class="px-5 py-1.5 text-sm rounded-full transition-all ${activeClasses}" data-range="${t.id}">${t.label}</button>`;
                    }).join('')}
                </div>
                <div class="flex gap-3">
                    <button id="btn-dash-settings" class="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded shadow-sm text-sm font-semibold flex items-center gap-2 transition-colors">
                        <i class="fas fa-cog"></i> Dashboard Settings
                    </button>
                    <button id="btn-map-view" class="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded shadow-sm text-sm font-semibold flex items-center gap-2 transition-colors">
                        <i class="fas fa-map-marked-alt"></i> Map View
                    </button>
                </div>
            </div>
        `;
    }

    function template() {
        const d = mockData;
        const totalGoodPct = d.inspections.total > 0 ? ((d.inspections.working / d.inspections.total) * 100).toFixed(1) : 0;
        const totalFaultyPct = (100 - totalGoodPct).toFixed(1);
        
        return `
        <div class="max-w-[1600px] mx-auto pb-10">
            ${renderTabs()}

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full transition-colors">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-5">Issue Report</h3>
                    <div class="flex-1 space-y-1">
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering issues: Total Reported')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-times-square text-slate-400 w-4 text-center"></i> Total Issue Reported</span>
                            <span class="text-rose-600 dark:text-rose-500 font-bold text-lg">${d.issues.total} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500 transition-colors"></i></span>
                        </div>
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering issues: Resolved')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-check-square text-[#0ea5e9] w-4 text-center"></i> Resolved</span>
                            <span class="text-emerald-500 dark:text-emerald-400 font-bold text-lg">${d.issues.resolved} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500 transition-colors"></i></span>
                        </div>
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering issues: In Progress')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-clock-rotate-left text-[#0ea5e9] w-4 text-center"></i> In Progress</span>
                            <span class="text-slate-800 dark:text-slate-300 font-bold text-lg">${d.issues.inProgress} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500 transition-colors"></i></span>
                        </div>
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering issues: Pending')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-rotate-right text-slate-400 w-4 text-center"></i> Pending</span>
                            <span class="text-rose-600 dark:text-rose-500 font-bold text-lg">${d.issues.pending} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500 transition-colors"></i></span>
                        </div>
                    </div>
                    <div class="mt-8 w-full bg-slate-200 dark:bg-slate-700 h-4 rounded-sm flex relative overflow-hidden">
                        <div class="bg-rose-600 h-full text-white text-[10px] flex items-center justify-center font-bold relative" style="width: 100%;">100%</div>
                        <div class="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                        <div class="absolute left-1 top-0 bottom-0 w-1 bg-blue-500"></div>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full relative transition-colors">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-5">Inspection Conducted</h3>
                    <div class="flex-1 space-y-1">
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering inspections: Total')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-search-document text-[#0ea5e9] w-4 text-center"></i> Total Inspection</span>
                            <span class="text-slate-800 dark:text-slate-300 font-bold text-lg">${d.inspections.total} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500"></i></span>
                        </div>
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering inspections: Approved')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-file-signature text-[#0ea5e9] w-4 text-center"></i> Approved</span>
                            <span class="text-emerald-500 dark:text-emerald-400 font-bold text-lg">${d.inspections.approved} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500"></i></span>
                        </div>
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering inspections: Pending')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-file-contract text-[#0ea5e9] w-4 text-center"></i> Pending Approval</span>
                            <span class="text-rose-600 dark:text-rose-500 font-bold text-lg">${d.inspections.pending} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500"></i></span>
                        </div>
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering inspections: Working')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-square-check text-[#0ea5e9] w-4 text-center"></i> Working Condition</span>
                            <span class="text-emerald-500 dark:text-emerald-400 font-bold text-lg">${d.inspections.working} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500"></i></span>
                        </div>
                        <div class="group cursor-pointer flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 transition-colors" onclick="window.showToast('Filtering inspections: Need Attention')">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-circle-xmark text-slate-400 w-4 text-center"></i> Need attention</span>
                            <span class="text-rose-600 dark:text-rose-500 font-bold text-lg">${d.inspections.attention} <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 ml-2 group-hover:text-blue-500"></i></span>
                        </div>
                    </div>
                    <div class="mt-6 relative h-[140px] w-full flex justify-center cursor-pointer" onclick="window.showToast('Opening Chart Analytics...')">
                        <canvas id="inspectionDonut"></canvas>
                        <div class="absolute right-0 bottom-4 text-xs space-y-1 dark:text-slate-300">
                            <div class="flex items-center gap-2"><span class="w-3 h-3 bg-[#10b981] rounded-sm"></span> Good</div>
                            <div class="flex items-center gap-2"><span class="w-3 h-3 bg-[#f43f5e] rounded-sm"></span> Faulty</div>
                        </div>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full transition-colors">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-5">Fault Summary</h3>
                    <div class="flex-1 space-y-1">
                        <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 px-2">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-truck-moving text-slate-400 w-4 text-center"></i> Faulty Vehicles</span>
                            <span class="text-rose-600 dark:text-rose-500 font-bold text-xl">${d.faults.faultyVehicles}</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 px-2">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-check-square text-[#0ea5e9] w-4 text-center"></i> Repair Items</span>
                            <span class="text-[#d97706] dark:text-[#fbbf24] font-bold text-xl">${d.faults.repairItems}</span>
                        </div>
                        <div class="flex justify-between items-center py-2.5 border-b border-dashed border-slate-200 dark:border-slate-700 px-2">
                            <span class="text-slate-600 dark:text-slate-400 flex items-center gap-3 text-sm"><i class="fas fa-circle-xmark text-slate-400 w-4 text-center"></i> Replace Items</span>
                            <span class="text-rose-600 dark:text-rose-500 font-bold text-xl">${d.faults.replaceItems}</span>
                        </div>
                    </div>
                    <div class="mt-6 relative h-[140px] w-full">
                         <canvas id="faultBarChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">Top Faulty Vehicles</h3>
                    <div class="pr-2 custom-scrollbar overflow-y-auto max-h-[180px]">
                        ${d.topVehicles.map(v => `
                            <div class="group cursor-pointer flex items-center justify-between py-3 border-b border-dashed border-slate-200 dark:border-slate-700 last:border-0 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded" onclick="window.showToast('Viewing Vehicle: ${v.id}')">
                                <span class="text-slate-700 dark:text-slate-300 font-medium">${v.id}</span>
                                <span class="text-rose-600 dark:text-rose-500 font-bold">${v.count}</span>
                            </div>`).join('')}
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">Top Repair Items</h3>
                    <div class="pr-2 custom-scrollbar overflow-y-auto max-h-[180px]">
                        ${d.topRepairs.map(r => `
                            <div class="group cursor-pointer flex items-center justify-between py-3 border-b border-dashed border-slate-200 dark:border-slate-700 last:border-0 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded" onclick="window.showToast('Filtering by Part: ${r.item}')">
                                <span class="text-slate-700 dark:text-slate-300 font-medium">${r.item}</span>
                                <span class="text-amber-600 dark:text-amber-400 font-bold">${r.count}</span>
                            </div>`).join('')}
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200 dark:border-slate-700 p-6 transition-colors md:col-span-2 lg:col-span-1">
                    <h3 class="text-center text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">Vehicle Status</h3>
                    <div class="relative h-[180px] w-full mt-4 cursor-pointer" onclick="window.showToast('Viewing Active Vehicles list')">
                        <canvas id="vehicleStatusChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function renderCharts() {
        if (typeof Chart === 'undefined') return;
        
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 : slate-500
        const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 : slate-200

        const d = mockData;
        const goodPct = d.inspections.total > 0 ? ((d.inspections.working / d.inspections.total) * 100).toFixed(1) : 89.0;
        const faultyPct = (100 - goodPct).toFixed(1);

        // 1. Inspection Donut Chart
        const ctxDonut = document.getElementById('inspectionDonut');
        if (ctxDonut) {
            charts.push(new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: ['Good', 'Faulty'],
                    datasets: [{
                        data: [goodPct, faultyPct],
                        backgroundColor: ['#10b981', '#f43f5e'],
                        borderWidth: isDark ? 2 : 0,
                        borderColor: isDark ? '#0f172a' : '#fff',
                        cutout: '65%'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    animation: { animateScale: true }
                },
                plugins: [{
                    id: 'textCenter',
                    beforeDraw: function(chart) {
                        var width = chart.width, height = chart.height, ctx = chart.ctx;
                        ctx.restore();
                        ctx.fillStyle = isDark ? "#e2e8f0" : "#333";
                        ctx.font = "11px Arial";
                        ctx.textBaseline = "middle";
                        ctx.fillText(faultyPct + "%", width * 0.15, height * 0.20);
                        ctx.fillText(goodPct + "%", width * 0.65, height * 0.90);
                        ctx.save();
                    }
                }]
            }));
        }

        // 2. Fault Summary Bar Chart
        const ctxBar = document.getElementById('faultBarChart');
        if (ctxBar) {
            charts.push(new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: ['Faulty Vehicles', 'Repair Items', 'Replace Items'],
                    datasets: [{
                        data: [d.faults.faultyVehicles, d.faults.repairItems, d.faults.replaceItems],
                        backgroundColor: ['#ef4444', '#facc15', '#f472b6'],
                        barThickness: 45
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            display: true, position: 'bottom',
                            labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 }, color: textColor }
                        },
                        tooltip: { backgroundColor: isDark ? '#1e293b' : 'rgba(0,0,0,0.8)' }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            max: Math.max(40, d.faults.faultyVehicles + 10),
                            ticks: { stepSize: 20, font: { size: 10 }, color: textColor },
                            grid: { color: gridColor, drawBorder: false }
                        },
                        x: { grid: { display: false }, ticks: { display: false } }
                    }
                },
                plugins: [{
                    id: 'topLabels',
                    afterDatasetsDraw: (chart) => {
                        const ctx = chart.ctx;
                        chart.data.datasets.forEach((dataset, i) => {
                            const meta = chart.getDatasetMeta(i);
                            meta.data.forEach((bar, index) => {
                                const data = dataset.data[index];
                                ctx.fillStyle = isDark ? '#e2e8f0' : '#333';
                                ctx.textAlign = 'center';
                                ctx.font = '12px Arial';
                                ctx.fillText(data, bar.x, bar.y - 8);
                            });
                        });
                    }
                }]
            }));
        }

        // 3. Vehicle Status Chart (Gradient Bar)
        const ctxStatus = document.getElementById('vehicleStatusChart');
        if (ctxStatus) {
            let gradient = ctxStatus.getContext('2d').createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, '#34d399'); 
            gradient.addColorStop(1, '#059669'); 

            charts.push(new Chart(ctxStatus, {
                type: 'bar',
                data: {
                    labels: ['Active'],
                    datasets: [{
                        data: [d.activeVehicles],
                        backgroundColor: gradient,
                        barThickness: 60,
                        borderRadius: 2
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                        x: { display: false, beginAtZero: true },
                        y: { grid: { color: gridColor, drawBorder: false }, ticks: { display: false } }
                    }
                },
                plugins: [{
                    id: 'rightLabel',
                    afterDatasetsDraw: (chart) => {
                        const ctx = chart.ctx;
                        const meta = chart.getDatasetMeta(0);
                        const bar = meta.data[0];
                        if (bar) {
                            ctx.fillStyle = isDark ? '#e2e8f0' : '#333';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.font = 'bold 13px Arial';
                            ctx.fillText(d.activeVehicles, bar.x + 10, bar.y);
                        }
                    }
                }]
            }));
        }
    }

    function bindActions(container) {
        // Timeline Tab Filters
        container.querySelectorAll('[data-range]').forEach(btn => {
            btn.onclick = () => {
                activeRange = btn.dataset.range;
                window.showToast(`Loading data for: ${btn.innerText}`, 'info');
                render(container); 
            };
        });

        // Top Action Buttons
        document.getElementById('btn-dash-settings').addEventListener('click', showSettingsModal);
        document.getElementById('btn-map-view').addEventListener('click', () => {
            window.showToast('Initializing Map View Module...', 'info');
            if(VAC.App) VAC.App.navigate('mapview');
        });
    }

    function render(container = document.getElementById('view-container')) {
        destroyCharts();
        mockData = generateMockData(activeRange);
        container.innerHTML = template();
        
        // Render charts after HTML injection to ensure canvases exist
        setTimeout(() => {
            renderCharts();
            bindActions(container);
        }, 10);
    }

    // Global listener to redraw charts when Dark Mode is toggled
    window.addEventListener('themeChanged', () => {
        if(document.getElementById('inspectionDonut')) {
            render(); // Fast re-render of the current view to update canvas styles
        }
    });

    return { render, destroy: destroyCharts };
})();