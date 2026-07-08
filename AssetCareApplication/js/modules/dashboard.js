/* ===========================================================================
   modules/dashboard.js
   HVI-style operations dashboard with KPI cards, fleet status, fault lists,
   and interactive timeframe controls. All figures derive from the existing
   local data store and stay consistent with the portal architecture.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.dashboard = (function () {
    let charts = [];
    let clockTimer = null;
    let activeRange = '30d';

    function destroy() {
        charts.forEach(c => { try { c.destroy(); } catch (e) {} });
        charts = [];
        if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    }

    function counts() {
        const vehicles = VAC.Storage.get('vehicles');
        const reports = VAC.Storage.get('reports');
        const faults = VAC.Storage.get('faults');
        const wos = VAC.Storage.get('workorders');
        const operators = VAC.Storage.get('operators');
        const sites = VAC.Storage.get('sites');
        const schedule = VAC.Storage.get('schedule');
        return { vehicles, reports, faults, wos, operators, sites, schedule };
    }

    function formatDate(value) {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function parseDate(value) {
        if (!value) return null;
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function inRange(value, range) {
        if (!value) return true;
        const now = new Date();
        const d = parseDate(value);
        if (!d) return true;
        const rangeDays = { today: 1, '7d': 7, '30d': 30, '90d': 90, all: 99999 }[range] || 30;
        const start = new Date(now);
        start.setDate(now.getDate() - rangeDays + 1);
        return d >= start && d <= now;
    }

    function filteredData(raw) {
        const reports = raw.reports.filter(r => inRange(r.date, activeRange));
        const faults = raw.faults.filter(f => inRange(f.reported, activeRange));
        const wos = raw.wos.filter(w => inRange(w.due, activeRange));
        return { ...raw, reports, faults, wos };
    }

    function statTiles(c) {
        const activeVehicles = c.vehicles.filter(v => v.status === 'Active').length;
        const activeOperators = c.operators.filter(o => o.status === 'Active').length;
        const openFaults = c.faults.filter(f => f.status === 'Open').length;
        const openWos = c.wos.filter(w => w.status !== 'Completed').length;
        const fleetReadiness = c.vehicles.length ? Math.round((activeVehicles / c.vehicles.length) * 100) : 0;
        const approvedReports = c.reports.filter(r => r.status === 'Approved').length;

        const tiles = [
            { label: 'Active vehicles', val: activeVehicles, sub: `${fleetReadiness}% fleet ready`, icon: 'fa-truck', bg: 'bg-emerald-100', fg: 'text-emerald-600' },
            { label: 'Active operators', val: activeOperators, sub: `${c.operators.length} on roster`, icon: 'fa-user-gear', bg: 'bg-sky-100', fg: 'text-sky-600' },
            { label: 'Open faults', val: openFaults, sub: `${c.faults.length} total flagged`, icon: 'fa-triangle-exclamation', bg: 'bg-rose-100', fg: 'text-rose-600' },
            { label: 'Open work orders', val: openWos, sub: `${approvedReports} inspections approved`, icon: 'fa-screwdriver-wrench', bg: 'bg-amber-100', fg: 'text-amber-600' }
        ];

        return tiles.map(t => `
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="flex h-11 w-11 items-center justify-center rounded-xl ${t.bg} ${t.fg}"><i class="fas ${t.icon}"></i></div>
                    <div class="min-w-0">
                        <div class="text-[22px] font-bold text-slate-800 leading-none">${t.val}</div>
                        <div class="text-xs font-semibold text-slate-500 mt-1">${t.label}</div>
                        <div class="text-[11px] font-medium text-slate-400 mt-1">${t.sub}</div>
                    </div>
                </div>
            </div>`).join('');
    }

    function statusRows(c) {
        const by = s => c.vehicles.filter(v => v.status === s).length;
        const rows = [
            ['Active', by('Active'), 'text-emerald-600'],
            ['In Maintenance', by('Maintenance'), 'text-amber-600'],
            ['Idle', by('Idle'), 'text-slate-500']
        ];
        return rows.map(r => `<div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"><span class="${r[2]}">${r[0]}</span><span class="font-semibold text-slate-700">${r[1]}</span></div>`).join('');
    }

    function inspectionRows(c) {
        const by = s => c.reports.filter(r => r.status === s).length;
        const rows = [
            ['Approved', by('Approved'), 'text-emerald-600'],
            ['Pending', by('Pending'), 'text-amber-600'],
            ['Rejected', by('Rejected'), 'text-rose-600'],
            ['Total', c.reports.length, 'text-slate-700']
        ];
        return rows.map(r => `<div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"><span class="${r[2]}">${r[0]}</span><span class="font-semibold text-slate-700">${r[1]}</span></div>`).join('');
    }

    function workOrderRows(c) {
        const by = s => c.wos.filter(w => w.status === s).length;
        const rows = [
            ['Open', by('Open'), 'text-blue-600'],
            ['In Progress', by('In Progress'), 'text-amber-600'],
            ['Pending Approval', by('Pending Approval'), 'text-indigo-600'],
            ['Completed', by('Completed'), 'text-emerald-600']
        ];
        return rows.map(r => `<div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"><span class="${r[2]}">${r[0]}</span><span class="font-semibold text-slate-700">${r[1]}</span></div>`).join('');
    }

    function scheduleRows(c) {
        const items = c.schedule || [];
        if (!items.length) {
            return '<div class="py-2 text-sm text-slate-500">No upcoming maintenance items.</div>';
        }
        return items.slice(0, 6).map(s => `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span>
                    <span class="text-slate-700 font-medium">${s.vehicle}</span>
                    <span class="text-gray-400 text-xs ml-1">${s.type}</span>
                </span>
                <span class="text-xs text-slate-500">${s.date}</span>
            </div>`).join('');
    }

    function topFaultyVehicles(c) {
        const counts = Object.entries(c.faults.reduce((acc, fault) => { acc[fault.vehicle] = (acc[fault.vehicle] || 0) + 1; return acc; }, {}));
        return counts.sort((a, b) => b[1] - a[1]).slice(0, 6).map(([vehicle, count]) => `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span class="text-slate-700 font-medium">${vehicle}</span>
                <span class="text-sm text-slate-500">${count} issues</span>
            </div>`).join('');
    }

    function topParts(c, severeOnly) {
        const counts = Object.entries(c.faults.reduce((acc, fault) => {
            const part = fault.part || 'General';
            if (!severeOnly || ['High', 'Critical'].includes(fault.severity)) {
                acc[part] = (acc[part] || 0) + 1;
            }
            return acc;
        }, {}));
        return counts.sort((a, b) => b[1] - a[1]).slice(0, 6).map(([part, count]) => `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span class="text-slate-700 font-medium">${part}</span>
                <span class="text-sm text-slate-500">${count} item${count > 1 ? 's' : ''}</span>
            </div>`).join('');
    }

    function logbookCard(c) {
        const noLogbook = c.vehicles.filter(v => !v.logbook).slice(0, 6);
        if (!noLogbook.length) {
            return `<div class="py-3 text-sm text-slate-500">No vehicles flagged for missing logbook data.</div>`;
        }
        return noLogbook.map(v => `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span class="text-slate-700 font-medium">${v.id}</span>
                <span class="text-sm text-slate-500">${v.model}</span>
            </div>`).join('');
    }

    function card(title, icon, color, body, action, subtitle) {
        return `<div class="vac-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2.5 text-slate-700 font-semibold">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
                        <i class="fas ${icon} ${color}"></i>
                    </div>
                    <div>
                        <div>${title}</div>
                        ${subtitle ? `<div class="text-[11px] font-medium text-slate-400">${subtitle}</div>` : ''}
                    </div>
                </div>
                ${action || ''}
            </div>
            ${body}
        </div>`;
    }

    function rangeSwitcher() {
        const options = [
            ['today', 'Today'],
            ['7d', 'Weekly'],
            ['30d', 'Monthly'],
            ['90d', 'Quarterly'],
            ['all', 'All']
        ];
        return `<div class="flex flex-wrap gap-2">${options.map(([value, label]) => `<button class="btn ${activeRange === value ? 'btn-primary' : 'btn-ghost'} py-2 px-3 text-sm" data-range="${value}">${label}</button>`).join('')}</div>`;
    }

    function template(c) {
        const lang = (VAC.App && VAC.App.currentLanguage) ? VAC.App.currentLanguage() : 'en';
        const heroTitle = lang === 'hi' ? 'वाहन संचालन अवलोकन' : 'Fleet operations overview';
        const heroText = lang === 'hi'
            ? 'एक ही डैशबोर्ड से निरीक्षण, खराबी और रखरखाव गतिविधियों को ट्रैक करें।'
            : 'Track inspections, faults, and maintenance priorities across all active sites from a single, executive-ready dashboard.';
        return `
        <div class="space-y-6">
            <div class="rounded-[28px] bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-6 text-white shadow-sm border border-white/10">
                <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <p class="text-sm uppercase tracking-[0.2em] text-blue-200">Vision Infra</p>
                        <h1 class="text-[26px] font-semibold">${heroTitle}</h1>
                        <p class="mt-2 text-sm text-blue-100 max-w-2xl">${heroText}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button class="btn btn-ghost bg-white/10 text-white border-white/20 hover:bg-white/20" data-dashboard-action="reports"><i class="fas fa-clipboard-check"></i> Review reports</button>
                        <button class="btn btn-ghost bg-white/10 text-white border-white/20 hover:bg-white/20" data-dashboard-action="workorders"><i class="fas fa-screwdriver-wrench"></i> Manage work orders</button>
                    </div>
                </div>
                <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                        <div class="text-[11px] uppercase tracking-[0.2em] text-blue-100">Inspection coverage</div>
                        <div class="text-xl font-semibold mt-1">${c.reports.length} records</div>
                    </div>
                    <div class="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                        <div class="text-[11px] uppercase tracking-[0.2em] text-blue-100">Site activity</div>
                        <div class="text-xl font-semibold mt-1">${c.sites.length} operating sites</div>
                    </div>
                    <div class="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                        <div class="text-[11px] uppercase tracking-[0.2em] text-blue-100">Maintenance backlog</div>
                        <div class="text-xl font-semibold mt-1">${c.wos.filter(w => w.status !== 'Completed').length} active tasks</div>
                    </div>
                </div>
                <div class="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div class="flex flex-wrap gap-2">${rangeSwitcher()}</div>
                    <div class="flex flex-wrap gap-2">
                        <button class="btn btn-ghost bg-white/10 text-white border-white/20 hover:bg-white/20" data-export-dashboard="true"><i class="fas fa-file-export"></i> Export</button>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 class="text-xl font-semibold text-slate-800">Operational snapshot</h2>
                    <p class="text-sm text-slate-500">Live overview of the current fleet and inspection health.</p>
                </div>
                <span id="live-clock" class="text-sm font-mono text-slate-500"></span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">${statTiles(c)}</div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                ${card('Vehicle Status', 'fa-truck', 'text-blue-600', `<div class="space-y-1">${statusRows(c)}</div>`, '', 'Fleet readiness snapshot') }
                ${card('Inspection Summary', 'fa-clipboard-check', 'text-emerald-600', `<div class="space-y-1">${inspectionRows(c)}</div>`, '', 'Inspection completion overview') }
                ${card('Work Order Summary', 'fa-screwdriver-wrench', 'text-amber-600', `<div class="space-y-1">${workOrderRows(c)}</div>`, '', 'Maintenance queue status') }
                ${card('Upcoming Schedule', 'fa-calendar-check', 'text-indigo-600', `<div class="space-y-1">${scheduleRows(c)}</div>`, '', 'Planned service calendar') }
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-semibold text-slate-700">Inspection status</h4>
                        <span class="text-xs text-slate-400">${activeRange === 'today' ? 'Today' : activeRange === '7d' ? 'Last 7 days' : activeRange === '30d' ? 'Last 30 days' : activeRange === '90d' ? 'Last 90 days' : 'All records'}</span>
                    </div>
                    <div class="h-[190px]">
                        <canvas id="statusChart" class="w-full h-full"></canvas>
                    </div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-semibold text-slate-700">Fault severity</h4>
                        <span class="text-xs text-slate-400">By severity</span>
                    </div>
                    <div class="h-[190px]">
                        <canvas id="faultChart" class="w-full h-full"></canvas>
                    </div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-semibold text-slate-700">Inspections by site</h4>
                        <span class="text-xs text-slate-400">Coverage view</span>
                    </div>
                    <div class="h-[190px]">
                        <canvas id="siteChart" class="w-full h-full"></canvas>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                ${card('Top Faulty Vehicles', 'fa-list-ol', 'text-indigo-600', `<div class="space-y-1">${topFaultyVehicles(c)}</div>`)}
                ${card('Top Repair Items', 'fa-screwdriver-wrench', 'text-amber-600', `<div class="space-y-1">${topParts(c, false)}</div>`)}
                ${card('Vehicle with 0 Logbook', 'fa-file-circle-xmark', 'text-slate-500', `<div class="space-y-1">${logbookCard(c)}</div>`)}
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="font-semibold text-slate-800">Recent activity</h3>
                        <p class="text-sm text-slate-500">Latest inspections, faults, and maintenance follow-ups</p>
                    </div>
                    <button class="btn btn-ghost" data-dashboard-action="reports"><i class="fas fa-list-check"></i> Review reports</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="vac-table">
                        <thead><tr><th>Activity</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                        <tbody>${activityRows(c)}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }

    function activityRows(c) {
        const items = [
            ...c.reports.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4).map(r => ({ type: 'Inspection', ref: r.id, status: r.status, date: r.date, section: 'reports' })),
            ...c.faults.filter(f => f.status === 'Open').slice(0, 3).map(f => ({ type: 'Fault', ref: f.id, status: f.status, date: f.reported, section: 'faults' })),
            ...c.wos.filter(w => w.status !== 'Completed').slice(0, 3).map(w => ({ type: 'Work Order', ref: w.id, status: w.status, date: w.due, section: 'workorders' }))
        ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);

        return items.map(item => {
            const badge = item.status === 'Approved' || item.status === 'Completed' || item.status === 'Resolved'
                ? 'badge-green' : item.status === 'Pending' || item.status === 'Open' || item.status === 'In Progress'
                    ? 'badge-yellow' : 'badge-red';
            return `<tr>
                <td><span class="font-semibold text-slate-700">${item.type}</span><div class="text-xs text-slate-400">${item.ref}</div></td>
                <td><span class="badge ${badge}">${item.status}</span></td>
                <td>${formatDate(item.date)}</td>
                <td><button class="btn btn-ghost py-1 px-2 text-xs" data-open-row="${item.section}"><i class="fas fa-arrow-up-right-from-square"></i> Open</button></td>
            </tr>`;
        }).join('');
    }

    function renderCharts(c) {
        if (typeof Chart === 'undefined') return;
        const statusCounts = ['Approved', 'Pending', 'Rejected'].map(s => c.reports.filter(r => r.status === s).length);
        charts.push(new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: { labels: ['Approved', 'Pending', 'Rejected'], datasets: [{ data: statusCounts, backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        }));

        const sevLabels = ['Low', 'Medium', 'High', 'Critical'];
        const sevCounts = sevLabels.map(s => c.faults.filter(f => f.severity === s).length);
        charts.push(new Chart(document.getElementById('faultChart'), {
            type: 'bar',
            data: { labels: sevLabels, datasets: [{ data: sevCounts, backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        }));

        const sites = c.sites;
        charts.push(new Chart(document.getElementById('siteChart'), {
            type: 'bar',
            data: { labels: sites.map(s => s.name.split(' ')[0]), datasets: [{ data: sites.map(s => c.reports.filter(r => r.site === s.id).length), backgroundColor: '#2563eb' }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }
        }));
    }

    function startClock() {
        const tick = () => { const el = document.getElementById('live-clock'); if (el) el.textContent = new Date().toLocaleString(); };
        tick(); clockTimer = setInterval(tick, 1000);
    }

    function bindActions(container) {
        container.querySelectorAll('[data-range]').forEach(btn => btn.onclick = () => {
            activeRange = btn.dataset.range;
            render(container);
        });
        container.querySelectorAll('[data-export-dashboard]').forEach(btn => btn.onclick = () => {
            const base = counts();
            const data = filteredData(base);
            VAC.Export.toCSV(data.reports, ['id', 'vehicle', 'operator', 'site', 'date', 'issues', 'status'], 'dashboard-report.csv');
        });
        container.querySelectorAll('[data-dashboard-action]').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.dashboardAction;
                if (action === 'reports') VAC.App.navigate('reports');
                else if (action === 'workorders') VAC.App.navigate('workorders');
                else if (action === 'sites') VAC.App.navigate('sites');
                else if (action === 'settings') VAC.App.navigate('settings');
            };
        });
        container.querySelectorAll('[data-open-row]').forEach(btn => {
            btn.onclick = () => {
                const section = btn.dataset.openRow;
                VAC.App.navigate(section);
            };
        });
    }

    function render(container) {
        destroy();
        const raw = counts();
        const c = filteredData(raw);
        container.innerHTML = template(c);
        renderCharts(c);
        startClock();
        bindActions(container);
    }

    return { render, destroy };
})();
