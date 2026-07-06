/* ===========================================================================
   modules/dashboard.js
   KPI cards + charts + recent activity, all derived from live store data.
   (This replaces the stray initDashboard() that used to sit in style.css.)
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

    function kpis() {
        const vehicles = VAC.Storage.get('vehicles');
        const operators = VAC.Storage.get('operators');
        const reports = VAC.Storage.get('reports');
        return [
            { label: 'Vehicles',        val: vehicles.length, icon: 'fa-truck',          color: 'text-blue-600' },
            { label: 'Operators',       val: operators.length, icon: 'fa-user-gear',      color: 'text-indigo-600' },
            { label: 'Inspections',     val: reports.length, icon: 'fa-clipboard-check',  color: 'text-emerald-600' },
            { label: 'Pending',         val: reports.filter(r => r.status === 'Pending').length,  icon: 'fa-hourglass-half', color: 'text-amber-600' },
            { label: 'Rejected',        val: reports.filter(r => r.status === 'Rejected').length, icon: 'fa-triangle-exclamation', color: 'text-rose-600' },
            { label: 'In Maintenance',  val: vehicles.filter(v => v.status === 'Maintenance').length, icon: 'fa-screwdriver-wrench', color: 'text-slate-600' }
        ];
    }

    function template() {
        const cards = kpis().map(k => `
            <div class="vac-card p-4 flex items-center justify-between">
                <div>
                    <p class="text-[11px] uppercase tracking-wide text-gray-400 font-bold">${k.label}</p>
                    <h3 class="text-2xl font-bold text-slate-800 mt-1">${k.val}</h3>
                </div>
                <i class="fas ${k.icon} ${k.color} text-2xl opacity-80"></i>
            </div>`).join('');

        return `
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Dashboard</h1>
                <p class="text-sm text-gray-500">Fleet overview at a glance</p>
            </div>
            <span id="live-clock" class="text-sm font-mono text-gray-500"></span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">${cards}</div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="vac-card p-5">
                <h4 class="font-bold text-slate-700 mb-3">Inspection Status</h4>
                <canvas id="statusChart" height="180"></canvas>
            </div>
            <div class="vac-card p-5">
                <h4 class="font-bold text-slate-700 mb-3">Vehicle Fleet Status</h4>
                <canvas id="fleetChart" height="180"></canvas>
            </div>
            <div class="vac-card p-5">
                <h4 class="font-bold text-slate-700 mb-3">Inspections by Site</h4>
                <canvas id="siteChart" height="180"></canvas>
            </div>
        </div>

        <div class="vac-card p-5">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold text-slate-700">Recent Inspections</h4>
                <a href="#" onclick="VAC.App.navigate('reports');return false;" class="text-sm text-blue-600 font-semibold">View all</a>
            </div>
            <div class="overflow-x-auto">
                <table class="vac-table">
                    <thead><tr><th>Report ID</th><th>Vehicle</th><th>Operator</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody id="recent-reports-body"></tbody>
                </table>
            </div>
        </div>`;
    }

    function badge(status) {
        const map = { Approved: 'badge-green', Pending: 'badge-yellow', Rejected: 'badge-red' };
        return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
    }

    function renderRecent() {
        const body = document.getElementById('recent-reports-body');
        const reports = VAC.Storage.get('reports').slice(0, 6);
        body.innerHTML = reports.map(r => `
            <tr>
                <td class="font-semibold text-blue-600">${r.id}</td>
                <td>${r.vehicle}</td>
                <td>${r.operator}</td>
                <td>${r.date}</td>
                <td>${badge(r.status)}</td>
            </tr>`).join('') || '<tr><td colspan="5" class="text-center text-gray-400 py-6">No inspections yet</td></tr>';
    }

    function renderCharts() {
        if (typeof Chart === 'undefined') return;
        const reports = VAC.Storage.get('reports');
        const vehicles = VAC.Storage.get('vehicles');
        const sites = VAC.Storage.get('sites');

        const statusCounts = ['Approved', 'Pending', 'Rejected'].map(s => reports.filter(r => r.status === s).length);
        charts.push(new Chart(document.getElementById('statusChart'), {
            type: 'doughnut',
            data: { labels: ['Approved', 'Pending', 'Rejected'],
                datasets: [{ data: statusCounts, backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }] },
            options: { plugins: { legend: { position: 'bottom' } } }
        }));

        const fleetLabels = ['Active', 'Maintenance', 'Idle'];
        const fleetCounts = fleetLabels.map(s => vehicles.filter(v => v.status === s).length);
        charts.push(new Chart(document.getElementById('fleetChart'), {
            type: 'bar',
            data: { labels: fleetLabels,
                datasets: [{ data: fleetCounts, backgroundColor: ['#3b82f6', '#64748b', '#eab308'] }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        }));

        const siteLabels = sites.map(s => s.name.split(' ')[0]);
        const siteCounts = sites.map(s => reports.filter(r => r.site === s.id).length);
        charts.push(new Chart(document.getElementById('siteChart'), {
            type: 'bar',
            data: { labels: siteLabels,
                datasets: [{ data: siteCounts, backgroundColor: '#2563eb' }] },
            options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
        }));
    }

    function startClock() {
        const tick = () => {
            const c = document.getElementById('live-clock');
            if (c) c.textContent = new Date().toLocaleString();
        };
        tick();
        clockTimer = setInterval(tick, 1000);
    }

    return {
        render(container) {
            destroy();
            container.innerHTML = template();
            renderRecent();
            renderCharts();
            startClock();
        },
        destroy
    };
})();
