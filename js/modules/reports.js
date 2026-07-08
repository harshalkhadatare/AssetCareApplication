/* ===========================================================================
   modules/reports.js  ·  Inspection Reports (search + filter + export)
   Managers/admins can approve or reject pending reports.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.reports = (function () {
    let term = '';
    let filter = 'All';

    function badge(status) {
        const map = { Approved: 'badge-green', Pending: 'badge-yellow', Rejected: 'badge-red' };
        return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
    }

    function rows() {
        let list = VAC.Storage.get('reports');
        if (filter !== 'All') list = list.filter(r => r.status === filter);
        if (term) {
            const t = term.toLowerCase();
            list = list.filter(r => [r.id, r.vehicle, r.operator, r.site].some(v => String(v || '').toLowerCase().includes(t)));
        }
        return list;
    }

    function setStatus(id, status) {
        const r = VAC.Storage.find('reports', id);
        if (!r) return;
        VAC.Storage.upsert('reports', { ...r, status });
        VAC.Toast.success('Report ' + status.toLowerCase());
        renderBody();
    }

    function renderBody() {
        const tbody = document.getElementById('reports-body');
        const canReview = VAC.Auth.hasRole('admin', 'manager');
        const list = rows();
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-400 py-8">No reports match your filter</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(r => {
            const actions = (canReview && r.status === 'Pending') ? `
                <button class="text-emerald-600 hover:text-emerald-700 px-2" data-approve="${r.id}" title="Approve"><i class="fas fa-check"></i></button>
                <button class="text-rose-600 hover:text-rose-700 px-2" data-reject="${r.id}" title="Reject"><i class="fas fa-xmark"></i></button>` : '';
            return `<tr>
                <td class="font-semibold text-blue-600">${r.id}</td>
                <td>${r.vehicle}</td>
                <td>${r.operator}</td>
                <td>${r.site}</td>
                <td>${r.date}</td>
                <td>${badge(r.status)}</td>
                <td class="text-right whitespace-nowrap">${actions}</td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => setStatus(b.dataset.approve, 'Approved'));
        tbody.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => setStatus(b.dataset.reject, 'Rejected'));
    }

    return {
        render(container) {
            term = ''; filter = 'All';
            const filters = ['All', 'Approved', 'Pending', 'Rejected'];
            container.innerHTML = `
                <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-800">Inspection Reports</h1>
                        <p class="text-sm text-gray-500">Review and manage field inspection reports</p>
                    </div>
                    <button class="btn btn-ghost" id="reports-export"><i class="fas fa-file-csv"></i> Export</button>
                </div>
                <div class="vac-card p-4">
                    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div class="relative max-w-sm w-full">
                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input id="reports-search" class="field-input pl-9" placeholder="Search by ID, vehicle, operator...">
                        </div>
                        <div class="flex gap-1" id="reports-filters">
                            ${filters.map(f => `<button class="btn ${f === 'All' ? 'btn-primary' : 'btn-ghost'}" data-filter="${f}">${f}</button>`).join('')}
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="vac-table">
                            <thead><tr>
                                <th>Report ID</th><th>Vehicle</th><th>Operator</th>
                                <th>Site</th><th>Date</th><th>Status</th><th class="text-right">Review</th>
                            </tr></thead>
                            <tbody id="reports-body"></tbody>
                        </table>
                    </div>
                </div>`;

            container.querySelector('#reports-search').addEventListener('input', e => { term = e.target.value; renderBody(); });
            container.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
                filter = b.dataset.filter;
                container.querySelectorAll('[data-filter]').forEach(x => {
                    x.classList.toggle('btn-primary', x === b);
                    x.classList.toggle('btn-ghost', x !== b);
                });
                renderBody();
            });
            container.querySelector('#reports-export').onclick = () =>
                VAC.Export.toCSV(rows(), ['id', 'vehicle', 'operator', 'site', 'date', 'issues', 'status'], 'inspection-reports.csv');

            renderBody();
        }
    };
})();
