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

    function summaryStats(list) {
        const approved = list.filter(r => r.status === 'Approved').length;
        const pending = list.filter(r => r.status === 'Pending').length;
        const rejected = list.filter(r => r.status === 'Rejected').length;
        return { total: list.length, approved, pending, rejected };
    }

    function summaryCards(list) {
        const stats = summaryStats(list);
        const cards = [
            { label: 'Total reports', value: stats.total, detail: 'All recorded inspections' },
            { label: 'Approved', value: stats.approved, detail: 'Ready for review' },
            { label: 'Pending', value: stats.pending, detail: 'Awaiting action' },
            { label: 'Rejected', value: stats.rejected, detail: 'Needs correction' }
        ];
        return cards.map(card => `
            <div class="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <div class="text-[11px] uppercase tracking-[0.2em] text-slate-200">${card.label}</div>
                <div class="text-2xl font-semibold mt-1 text-white">${card.value}</div>
                <div class="text-sm text-slate-300 mt-1">${card.detail}</div>
            </div>`).join('');
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
            const list = rows();
            container.innerHTML = `
                <div class="space-y-6">
                    <div class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
                        <div class="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <p class="text-sm uppercase tracking-[0.2em] text-slate-300">Inspection operations</p>
                                <h1 class="text-2xl font-semibold">Inspection Reports</h1>
                                <p class="mt-2 text-sm text-slate-300 max-w-2xl">Track inspection outcomes, review pending submissions, and export the latest field reports.</p>
                            </div>
                            <button class="btn btn-ghost bg-white/10 text-white border-white/20 hover:bg-white/20" id="reports-export"><i class="fas fa-file-csv"></i> Export</button>
                        </div>
                        <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            ${summaryCards(list)}
                        </div>
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
