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
            container.innerHTML = `
                <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div><h1 class="text-2xl font-bold text-slate-800">Work Orders</h1>
                    <p class="text-sm text-gray-500">Maintenance requests and their status</p></div>
                    <button class="btn btn-ghost" id="wo-export"><i class="fas fa-file-csv"></i> Export</button>
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
