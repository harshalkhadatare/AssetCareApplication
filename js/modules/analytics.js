/* ===========================================================================
   modules/analytics.js  ·  Analytics & Reports
   KPI overview plus date-range report exports, mirroring the HVI analytics
   screen where a start/end date is chosen and reports are exported.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.analytics = (function () {
    let start = '', end = '';

    function inRange(dateStr) {
        if (!dateStr) return true;
        if (start && dateStr < start) return false;
        if (end && dateStr > end) return false;
        return true;
    }

    function filtered() {
        return {
            reports: VAC.Storage.get('reports').filter(r => inRange(r.date)),
            faults: VAC.Storage.get('faults').filter(f => inRange(f.reported)),
            workorders: VAC.Storage.get('workorders').filter(w => inRange(w.due)),
            vehicles: VAC.Storage.get('vehicles')
        };
    }

    function kpiCards(d) {
        const cards = [
            ['Inspections', d.reports.length, 'fa-clipboard-check', 'text-emerald-600'],
            ['Faults', d.faults.length, 'fa-triangle-exclamation', 'text-rose-600'],
            ['Work Orders', d.workorders.length, 'fa-screwdriver-wrench', 'text-amber-600'],
            ['Approval Rate', d.reports.length ? Math.round(d.reports.filter(r => r.status === 'Approved').length / d.reports.length * 100) + '%' : '—', 'fa-thumbs-up', 'text-blue-600']
        ];
        return cards.map(c => `
            <div class="vac-card p-4 flex items-center justify-between">
                <div><p class="text-[11px] uppercase tracking-wide text-gray-400 font-bold">${c[0]}</p>
                <h3 class="text-2xl font-bold text-slate-800 mt-1">${c[1]}</h3></div>
                <i class="fas ${c[2]} ${c[3]} text-2xl opacity-80"></i>
            </div>`).join('');
    }

    function refreshKPIs() {
        document.getElementById('analytics-kpis').innerHTML = kpiCards(filtered());
    }

    return {
        render(container) {
            start = ''; end = '';
            const exports = [
                ['Inspection Report', 'reports', ['id', 'vehicle', 'operator', 'site', 'date', 'issues', 'status'], 'inspection-report.csv'],
                ['Fault Report', 'faults', ['id', 'vehicle', 'part', 'severity', 'site', 'reported', 'status'], 'fault-report.csv'],
                ['Work Order Report', 'workorders', ['id', 'vehicle', 'task', 'priority', 'assignedTo', 'due', 'status'], 'work-order-report.csv'],
                ['Vehicle Report', 'vehicles', ['id', 'model', 'type', 'regNo', 'site', 'status'], 'vehicle-report.csv']
            ];
            container.innerHTML = `
                <div class="mb-6"><h1 class="text-2xl font-bold text-slate-800">Analytics &amp; Reports</h1>
                <p class="text-sm text-gray-500">KPIs and downloadable reports by date range</p></div>

                <div class="vac-card p-4 mb-6">
                    <div class="flex items-end gap-3 flex-wrap">
                        <div><label class="field-label">Start date</label><input type="date" id="an-start" class="field-input"></div>
                        <div><label class="field-label">End date</label><input type="date" id="an-end" class="field-input"></div>
                        <button class="btn btn-primary" id="an-apply"><i class="fas fa-filter"></i> Apply</button>
                        <button class="btn btn-ghost" id="an-clear">Clear</button>
                    </div>
                </div>

                <div id="analytics-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"></div>

                <div class="vac-card p-5">
                    <h4 class="font-bold text-slate-700 mb-4">Export reports</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${exports.map(e => `
                            <button class="btn btn-ghost justify-between w-full" data-export="${e[1]}">
                                <span><i class="fas fa-file-excel text-emerald-600"></i> ${e[0]}</span>
                                <i class="fas fa-download text-gray-400"></i>
                            </button>`).join('')}
                    </div>
                    <p class="text-xs text-gray-400 mt-3">Exports respect the selected date range and download as CSV (opens in Excel).</p>
                </div>`;

            refreshKPIs();

            container.querySelector('#an-apply').onclick = () => {
                start = container.querySelector('#an-start').value;
                end = container.querySelector('#an-end').value;
                refreshKPIs();
                VAC.Toast.info('Date range applied');
            };
            container.querySelector('#an-clear').onclick = () => {
                start = ''; end = '';
                container.querySelector('#an-start').value = '';
                container.querySelector('#an-end').value = '';
                refreshKPIs();
            };
            container.querySelectorAll('[data-export]').forEach(b => b.onclick = () => {
                const cfg = exports.find(e => e[1] === b.dataset.export);
                const d = filtered();
                VAC.Export.toCSV(d[cfg[1]], cfg[2], cfg[3]);
            });
        }
    };
})();
