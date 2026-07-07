/* ===========================================================================
   modules/masters.js  ·  Master Data
   Central reference data used across the portal: vehicle types, fault
   categories, inspection areas and departments. Managers/admins can add or
   remove entries in each list.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.masters = (function () {
    const TABS = [
        { key: 'vehicleTypes', label: 'Vehicle Types', icon: 'fa-truck' },
        { key: 'faultCategories', label: 'Fault Categories', icon: 'fa-triangle-exclamation' },
        { key: 'inspectionAreas', label: 'Inspection Areas', icon: 'fa-clipboard-list' },
        { key: 'departments', label: 'Departments', icon: 'fa-sitemap' }
    ];
    let activeTab = TABS[0].key;

    function data() { return VAC.Storage.get('masters') || {}; }
    function saveList(key, list) {
        const m = data(); m[key] = list; VAC.Storage.save('masters', m);
    }

    function renderList(container) {
        const canEdit = VAC.Auth.hasRole('admin', 'manager');
        const list = data()[activeTab] || [];
        const box = container.querySelector('#master-list');
        box.innerHTML = list.length ? list.map((v, i) => `
            <div class="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-slate-50">
                <span class="text-sm text-slate-700">${v}</span>
                ${canEdit ? `<button class="text-slate-400 hover:text-rose-600" data-rm="${i}"><i class="fas fa-xmark"></i></button>` : ''}
            </div>`).join('') : '<div class="px-4 py-6 text-center text-gray-400 text-sm">No entries yet</div>';

        box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
            const idx = parseInt(b.dataset.rm, 10);
            const l = (data()[activeTab] || []).slice();
            const removed = l.splice(idx, 1);
            saveList(activeTab, l);
            VAC.Toast.success('Removed "' + removed[0] + '"');
            renderList(container);
        });
    }

    function renderTabBody(container) {
        const canEdit = VAC.Auth.hasRole('admin', 'manager');
        const tab = TABS.find(t => t.key === activeTab);
        container.querySelector('#master-body').innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold text-slate-700"><i class="fas ${tab.icon} text-blue-600 mr-2"></i>${tab.label}</h4>
            </div>
            ${canEdit ? `
            <div class="flex gap-2 mb-4 max-w-md">
                <input id="master-add-input" class="field-input" placeholder="Add new ${tab.label.toLowerCase().replace(/s$/, '')}...">
                <button class="btn btn-primary" id="master-add-btn"><i class="fas fa-plus"></i> Add</button>
            </div>` : ''}
            <div class="border rounded-lg overflow-hidden" id="master-list"></div>`;

        renderList(container);

        const addBtn = container.querySelector('#master-add-btn');
        if (addBtn) {
            const input = container.querySelector('#master-add-input');
            const add = () => {
                const val = input.value.trim();
                if (!val) return;
                const l = (data()[activeTab] || []).slice();
                if (l.some(x => x.toLowerCase() === val.toLowerCase())) { VAC.Toast.error('Already exists'); return; }
                l.push(val); saveList(activeTab, l);
                input.value = '';
                VAC.Toast.success('Added "' + val + '"');
                renderList(container);
            };
            addBtn.onclick = add;
            input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
        }
    }

    return {
        render(container) {
            activeTab = TABS[0].key;
            container.innerHTML = `
                <div class="mb-6"><h1 class="text-2xl font-bold text-slate-800">Master Data</h1>
                <p class="text-sm text-gray-500">Reference lists used across the portal</p></div>
                <div class="flex gap-1 mb-4 border-b flex-wrap">
                    ${TABS.map((t, i) => `<button class="px-4 py-2 text-sm font-semibold border-b-2 ${i === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}" data-mtab="${t.key}">${t.label}</button>`).join('')}
                </div>
                <div class="vac-card p-6"><div id="master-body"></div></div>`;

            container.querySelectorAll('[data-mtab]').forEach(b => b.onclick = () => {
                activeTab = b.dataset.mtab;
                container.querySelectorAll('[data-mtab]').forEach(x => {
                    const on = x === b;
                    x.classList.toggle('border-blue-600', on);
                    x.classList.toggle('text-blue-600', on);
                    x.classList.toggle('border-transparent', !on);
                    x.classList.toggle('text-gray-500', !on);
                });
                renderTabBody(container);
            });
            renderTabBody(container);
        }
    };
})();
