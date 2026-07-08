/* ===========================================================================
   modules/workorders.js  ·  Work Orders (Requests)
   Maintenance work orders. Managers/admins approve or reject those that are
   pending approval, mirroring the HVI work-order request flow.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.workorders = (function () {
    let term = '', filter = 'All';

    function prio(p) {
        const cls = { Low: 'dot-low', Medium: 'dot-medium', High: 'dot-high', Critical: 'dot-critical' };
        return `<span class="dot ${cls[p] || 'dot-low'}"></span>${p}`;
    }
    function statusBadge(s) {
        const map = { Open: 'badge-blue', 'In Progress': 'badge-yellow', 'Pending Approval': 'badge-gray', Completed: 'badge-green' };
        return `<span class="badge ${map[s] || 'badge-gray'}">${s}</span>`;
    }

    function rows() {
        let list = VAC.Storage.get('workorders');
        if (filter !== 'All') list = list.filter(w => w.status === filter);
        if (term) {
            const t = term.toLowerCase();
            list = list.filter(w => [w.id, w.vehicle, w.task, w.assignedTo].some(v => String(v || '').toLowerCase().includes(t)));
        }
        return list;
    }

    function summaryStats(list) {
        return {
            total: list.length,
            open: list.filter(w => w.status === 'Open').length,
            inProgress: list.filter(w => w.status === 'In Progress').length,
            pending: list.filter(w => w.status === 'Pending Approval').length,
            completed: list.filter(w => w.status === 'Completed').length
        };
    }

    function summaryCards(list) {
        const stats = summaryStats(list);
        const cards = [
            { label: 'Total work orders', value: stats.total, detail: 'All active requests' },
            { label: 'Open', value: stats.open, detail: 'Pending dispatch' },
            { label: 'In progress', value: stats.inProgress, detail: 'Under execution' },
            { label: 'Pending approval', value: stats.pending, detail: 'Awaiting review' }
        ];
        return cards.map(card => `
            <div class="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <div class="text-[11px] uppercase tracking-[0.2em] text-slate-200">${card.label}</div>
                <div class="text-2xl font-semibold mt-1 text-white">${card.value}</div>
                <div class="text-sm text-slate-300 mt-1">${card.detail}</div>
            </div>`).join('');
    }

    function setStatus(id, status) {
        const w = VAC.Storage.find('workorders', id);
        if (!w) return;
        VAC.Storage.upsert('workorders', { ...w, status });
        VAC.Toast.success('Work order ' + status.toLowerCase());
        renderBody();
    }

    function renderBody() {
        const tbody = document.getElementById('wo-body');
        const canReview = VAC.Auth.hasRole('admin', 'manager');
        const list = rows();
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-400 py-8">No work orders found</td></tr>'; return; }
        tbody.innerHTML = list.map(w => {
            const actions = (canReview && w.status === 'Pending Approval') ? `
                <button class="text-emerald-600 hover:text-emerald-700 px-2" data-approve="${w.id}" title="Approve"><i class="fas fa-check"></i></button>
                <button class="text-rose-600 hover:text-rose-700 px-2" data-reject="${w.id}" title="Reject"><i class="fas fa-xmark"></i></button>` :
                (canReview && w.status !== 'Completed'
                    ? `<button class="text-blue-600 hover:text-blue-700 px-2" data-done="${w.id}" title="Mark completed"><i class="fas fa-flag-checkered"></i></button>` : '');
            return `<tr>
                <td class="font-semibold text-blue-600">${w.id}</td>
                <td>${w.vehicle}</td>
                <td>${w.task}</td>
                <td>${prio(w.priority)}</td>
                <td>${w.assignedTo}</td>
                <td>${w.due}</td>
                <td>${statusBadge(w.status)}</td>
                <td class="text-right whitespace-nowrap">${actions}</td>
            </tr>`;
        }).join('');
        tbody.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => setStatus(b.dataset.approve, 'In Progress'));
        tbody.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => setStatus(b.dataset.reject, 'Open'));
        tbody.querySelectorAll('[data-done]').forEach(b => b.onclick = () => setStatus(b.dataset.done, 'Completed'));
    }

    return {
        render(container) {
            term = ''; filter = 'All';
            const filters = ['All', 'Open', 'In Progress', 'Pending Approval', 'Completed'];
            const list = rows();
            container.innerHTML = `
                <div class="space-y-6">
                    <div class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
                        <div class="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <p class="text-sm uppercase tracking-[0.2em] text-slate-300">Maintenance operations</p>
                                <h1 class="text-2xl font-semibold">Work Orders</h1>
                                <p class="mt-2 text-sm text-slate-300 max-w-2xl">Manage maintenance requests, prioritize urgent tasks, and track status through completion.</p>
                            </div>
                            <button class="btn btn-ghost bg-white/10 text-white border-white/20 hover:bg-white/20" id="wo-export"><i class="fas fa-file-csv"></i> Export</button>
                        </div>
                        <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            ${summaryCards(list)}
                        </div>
                    </div>
                    <div class="vac-card p-4">
                        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                            <div class="relative max-w-sm w-full">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                <input id="wo-search" class="field-input pl-9" placeholder="Search work orders...">
                            </div>
                            <div class="flex gap-1 flex-wrap">${filters.map(f => `<button class="btn ${f === 'All' ? 'btn-primary' : 'btn-ghost'}" data-filter="${f}">${f}</button>`).join('')}</div>
                        </div>
                        <div class="overflow-x-auto"><table class="vac-table">
                            <thead><tr><th>WO ID</th><th>Vehicle</th><th>Task</th><th>Priority</th><th>Assigned To</th><th>Due</th><th>Status</th><th class="text-right">Action</th></tr></thead>
                            <tbody id="wo-body"></tbody>
                        </table></div>
                    </div>
                </div>`;
            container.querySelector('#wo-search').addEventListener('input', e => { term = e.target.value; renderBody(); });
            container.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
                filter = b.dataset.filter;
                container.querySelectorAll('[data-filter]').forEach(x => { x.classList.toggle('btn-primary', x === b); x.classList.toggle('btn-ghost', x !== b); });
                renderBody();
            });
            container.querySelector('#wo-export').onclick = () =>
                VAC.Export.toCSV(rows(), ['id', 'vehicle', 'task', 'priority', 'assignedTo', 'due', 'status'], 'work-orders.csv');
            renderBody();
        }
    };
})();
