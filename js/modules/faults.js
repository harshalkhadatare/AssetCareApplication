/* ===========================================================================
   modules/faults.js  ·  Fault List
   Faults flagged during inspections. Managers/admins can mark them resolved.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.faults = (function () {
    let term = '', filter = 'All';

    function sevBadge(s) {
        const cls = { Low: 'dot-low', Medium: 'dot-medium', High: 'dot-high', Critical: 'dot-critical' };
        return `<span class="dot ${cls[s] || 'dot-low'}"></span>${s}`;
    }
    function statusBadge(s) {
        return `<span class="badge ${s === 'Resolved' ? 'badge-green' : 'badge-red'}">${s}</span>`;
    }

    function rows() {
        let list = VAC.Storage.get('faults');
        if (filter !== 'All') list = list.filter(f => f.status === filter);
        if (term) {
            const t = term.toLowerCase();
            list = list.filter(f => [f.id, f.vehicle, f.part, f.site].some(v => String(v || '').toLowerCase().includes(t)));
        }
        return list;
    }

    function toggle(id, status) {
        const f = VAC.Storage.find('faults', id);
        if (!f) return;
        VAC.Storage.upsert('faults', { ...f, status });
        VAC.Toast.success('Fault ' + (status === 'Resolved' ? 'resolved' : 'reopened'));
        renderBody();
    }

    function renderBody() {
        const tbody = document.getElementById('faults-body');
        const canEdit = VAC.Auth.hasRole('admin', 'manager');
        const list = rows();
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-400 py-8">No faults found</td></tr>'; return; }
        tbody.innerHTML = list.map(f => {
            const action = canEdit ? (f.status === 'Open'
                ? `<button class="text-emerald-600 hover:text-emerald-700 px-2" data-resolve="${f.id}" title="Mark resolved"><i class="fas fa-check"></i></button>`
                : `<button class="text-slate-500 hover:text-blue-600 px-2" data-reopen="${f.id}" title="Reopen"><i class="fas fa-rotate-left"></i></button>`) : '';
            return `<tr>
                <td class="font-semibold text-blue-600">${f.id}</td>
                <td>${f.vehicle}</td>
                <td>${f.part}</td>
                <td>${sevBadge(f.severity)}</td>
                <td>${f.reported}</td>
                <td>${statusBadge(f.status)}</td>
                <td class="text-right">${action}</td>
            </tr>`;
        }).join('');
        tbody.querySelectorAll('[data-resolve]').forEach(b => b.onclick = () => toggle(b.dataset.resolve, 'Resolved'));
        tbody.querySelectorAll('[data-reopen]').forEach(b => b.onclick = () => toggle(b.dataset.reopen, 'Open'));
    }

    return {
        render(container) {
            term = ''; filter = 'All';
            const filters = ['All', 'Open', 'Resolved'];
            container.innerHTML = `
                <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div><h1 class="text-2xl font-bold text-slate-800">Fault List</h1>
                    <p class="text-sm text-gray-500">Issues flagged during inspections</p></div>
                    <button class="btn btn-ghost" id="faults-export"><i class="fas fa-file-csv"></i> Export</button>
                </div>
                <div class="vac-card p-4">
                    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div class="relative max-w-sm w-full">
                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input id="faults-search" class="field-input pl-9" placeholder="Search faults...">
                        </div>
                        <div class="flex gap-1">${filters.map(f => `<button class="btn ${f === 'All' ? 'btn-primary' : 'btn-ghost'}" data-filter="${f}">${f}</button>`).join('')}</div>
                    </div>
                    <div class="overflow-x-auto"><table class="vac-table">
                        <thead><tr><th>Fault ID</th><th>Vehicle</th><th>Part / Issue</th><th>Severity</th><th>Reported</th><th>Status</th><th class="text-right">Action</th></tr></thead>
                        <tbody id="faults-body"></tbody>
                    </table></div>
                </div>`;
            container.querySelector('#faults-search').addEventListener('input', e => { term = e.target.value; renderBody(); });
            container.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
                filter = b.dataset.filter;
                container.querySelectorAll('[data-filter]').forEach(x => { x.classList.toggle('btn-primary', x === b); x.classList.toggle('btn-ghost', x !== b); });
                renderBody();
            });
            container.querySelector('#faults-export').onclick = () =>
                VAC.Export.toCSV(rows(), ['id', 'vehicle', 'part', 'severity', 'site', 'reported', 'status'], 'fault-list.csv');
            renderBody();
        }
    };
})();
