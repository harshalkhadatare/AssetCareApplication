/* ===========================================================================
   modules/dashboard.js
   HVI-style landing dashboard: quick stat tiles + four summary cards
   (Vehicle Status, Inspection Summary, Work Order Summary, Upcoming Schedule)
   plus supporting charts. All figures derive from live store data.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.dashboard = (function () {
    let charts = [];
    let clockTimer = null;

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
        return { vehicles, reports, faults, wos, operators };
    }

    function statTiles(c) {
        const tiles = [
            { label: 'Total Vehicles', val: c.vehicles.length, icon: 'fa-truck', bg: 'bg-blue-100', fg: 'text-blue-600' },
            { label: 'Active Operators', val: c.operators.filter(o => o.status === 'Active').length, icon: 'fa-user-gear', bg: 'bg-indigo-100', fg: 'text-indigo-600' },
            { label: 'Open Faults', val: c.faults.filter(f => f.status === 'Open').length, icon: 'fa-triangle-exclamation', bg: 'bg-rose-100', fg: 'text-rose-600' },
            { label: 'Open Work Orders', val: c.wos.filter(w => w.status !== 'Completed').length, icon: 'fa-screwdriver-wrench', bg: 'bg-amber-100', fg: 'text-amber-600' }
        ];
        return tiles.map(t => `
            <div class="stat-tile">
                <div class="stat-icon ${t.bg} ${t.fg}"><i class="fas ${t.icon}"></i></div>
                <div>
                    <div class="text-2xl font-bold text-slate-800 leading-none">${t.val}</div>
                    <div class="text-xs text-gray-500 mt-1">${t.label}</div>
                </div>
            </div>`).join('');
    }

    function vehicleStatusCard(c) {
        const by = s => c.vehicles.filter(v => v.status === s).length;
        const rows = [
            ['Active', by('Active'), 'text-emerald-600'],
            ['In Maintenance', by('Maintenance'), 'text-amber-600'],
            ['Idle', by('Idle'), 'text-slate-500']
        ];
        return card('Vehicle Status', 'fa-truck', 'text-blue-600',
            rows.map(r => `<div class="summary-row"><span class="${r[2]}">${r[0]}</span><span class="val">${r[1]}</span></div>`).join(''));
    }

    function inspectionCard(c) {
        const by = s => c.reports.filter(r => r.status === s).length;
        const rows = [
            ['Approved', by('Approved'), 'text-emerald-600'],
            ['Pending', by('Pending'), 'text-amber-600'],
            ['Rejected', by('Rejected'), 'text-rose-600'],
            ['Total', c.reports.length, 'text-slate-700']
        ];
        return card('Inspection Summary', 'fa-clipboard-check', 'text-emerald-600',
            rows.map(r => `<div class="summary-row"><span class="${r[2]}">${r[0]}</span><span class="val">${r[1]}</span></div>`).join(''));
    }

    function workOrderCard(c) {
        const by = s => c.wos.filter(w => w.status === s).length;
        const rows = [
            ['Open', by('Open'), 'text-blue-600'],
            ['In Progress', by('In Progress'), 'text-amber-600'],
            ['Pending Approval', by('Pending Approval'), 'text-indigo-600'],
            ['Completed', by('Completed'), 'text-emerald-600']
        ];
        return card('Work Order Summary', 'fa-screwdriver-wrench', 'text-amber-600',
            rows.map(r => `<div class="summary-row"><span class="${r[2]}">${r[0]}</span><span class="val">${r[1]}</span></div>`).join(''));
    }

    function scheduleCard() {
        const items = VAC.Storage.get('schedule');
        const body = items.length ? items.map(s => `
            <div class="summary-row">
                <span><span class="text-slate-700 font-medium">${s.vehicle}</span>
                <span class="text-gray-400 text-xs ml-1">${s.type}</span></span>
                <span class="val text-xs">${s.date}</span>
            </div>`).join('') : '<div class="summary-row text-gray-400">Nothing scheduled</div>';
        return card('Upcoming Schedule', 'fa-calendar-check', 'text-indigo-600', body);
    }

    function card(title, icon, color, body) {
        return `<div class="summary-card">
            <div class="summary-card-head"><i class="fas ${icon} ${color}"></i>${title}</div>
            ${body}
        </div>`;
    }

    function template(c) {
        return `
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Dashboard</h1>
                <p class="text-sm text-gray-500">Fleet overview for Vision Infra Equipment Solutions</p>
            </div>
            <span id="live-clock" class="text-sm font-mono text-gray-500"></span>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">${statTiles(c)}</div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
            ${vehicleStatusCard(c)}
            ${inspectionCard(c)}
            ${workOrderCard(c)}
            ${scheduleCard()}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="vac-card p-5">
                <h4 class="font-bold text-slate-700 mb-3">Inspection Status</h4>
                <canvas id="statusChart" height="190"></canvas>
            </div>
            <div class="vac-card p-5">
                <h4 class="font-bold text-slate-700 mb-3">Fault Severity</h4>
                <canvas id="faultChart" height="190"></canvas>
            </div>
            <div class="vac-card p-5">
                <h4 class="font-bold text-slate-700 mb-3">Inspections by Site</h4>
                <canvas id="siteChart" height="190"></canvas>
            </div>
        </div>`;
    }

    function renderCharts(c) {
        if (typeof Chart === 'undefined') return;
        const statusCounts = ['Approved', 'Pending', 'Rejected'].map(s => c.reports.filter(r => r.status === s).length);
        charts.push(new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: { labels: ['Approved', 'Pending', 'Rejected'], datasets: [{ data: statusCounts, backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }] },
            options: { plugins: { legend: { position: 'bottom' } } }
        }));

        const sevLabels = ['Low', 'Medium', 'High', 'Critical'];
        const sevCounts = sevLabels.map(s => c.faults.filter(f => f.severity === s).length);
        charts.push(new Chart(document.getElementById('faultChart'), {
            type: 'bar',
            data: { labels: sevLabels, datasets: [{ data: sevCounts, backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'] }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        }));

        const sites = VAC.Storage.get('sites');
        charts.push(new Chart(document.getElementById('siteChart'), {
            type: 'bar',
            data: { labels: sites.map(s => s.name.split(' ')[0]), datasets: [{ data: sites.map(s => c.reports.filter(r => r.site === s.id).length), backgroundColor: '#2563eb' }] },
            options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
        }));
    }

    function startClock() {
        const tick = () => { const el = document.getElementById('live-clock'); if (el) el.textContent = new Date().toLocaleString(); };
        tick(); clockTimer = setInterval(tick, 1000);
    }

    return {
        render(container) {
            destroy();
            const c = counts();
            container.innerHTML = template(c);
            renderCharts(c);
            startClock();
        },
        destroy
    };
})();
