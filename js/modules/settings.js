/* ===========================================================================
   modules/settings.js  ·  System Settings & Administration
   Tabs: General · Company Profile · Account.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.settings = (function () {
    let tab = 'General';

    function generalTab() {
        const s = VAC.Storage.get('settings');
        return `
            <div class="max-w-lg">
                <label class="field-label">Portal theme</label>
                <select class="field-input mb-4" id="set-theme">
                    <option ${s.theme === 'light' ? 'selected' : ''}>light</option>
                    <option ${s.theme === 'dark' ? 'selected' : ''}>dark</option>
                </select>
                <button class="btn btn-primary" id="set-general-save">Save changes</button>

                <hr class="my-6">
                <h4 class="font-bold text-slate-700 mb-1">Demo data</h4>
                <p class="text-sm text-gray-500 mb-3">Reset all local records back to the seeded demo dataset.</p>
                <button class="btn btn-danger" id="set-reset"><i class="fas fa-rotate-left"></i> Reset demo data</button>
            </div>`;
    }

    function companyTab() {
        const s = VAC.Storage.get('settings');
        return `
            <div class="max-w-lg">
                <label class="field-label">Company name</label>
                <input class="field-input mb-4" id="set-company" value="${s.company || ''}">
                <button class="btn btn-primary" id="set-company-save">Save changes</button>
            </div>`;
    }

    function accountTab() {
        const u = VAC.Auth.currentUser() || {};
        return `
            <div class="max-w-lg space-y-3">
                <div><span class="field-label">Name</span><div class="text-slate-700">${u.name || '—'}</div></div>
                <div><span class="field-label">Email</span><div class="text-slate-700">${u.email || '—'}</div></div>
                <div><span class="field-label">Role</span><div class="capitalize text-slate-700">${u.role || '—'}</div></div>
                <button class="btn btn-ghost mt-2" id="set-logout"><i class="fas fa-right-from-bracket"></i> Sign out</button>
            </div>`;
    }

    function renderTab(container) {
        const body = container.querySelector('#settings-body');
        body.innerHTML = tab === 'General' ? generalTab() : tab === 'Company Profile' ? companyTab() : accountTab();

        const g = body.querySelector('#set-general-save');
        if (g) g.onclick = () => {
            const s = VAC.Storage.get('settings');
            s.theme = body.querySelector('#set-theme').value;
            VAC.Storage.save('settings', s);
            VAC.Toast.success('Settings saved');
        };
        const reset = body.querySelector('#set-reset');
        if (reset) reset.onclick = () => VAC.UI.confirm('Reset all data to the demo dataset?', () => {
            VAC.Storage.reset(); VAC.Seed.run(); VAC.Toast.success('Demo data reset');
        });
        const c = body.querySelector('#set-company-save');
        if (c) c.onclick = () => {
            const s = VAC.Storage.get('settings');
            s.company = body.querySelector('#set-company').value.trim();
            VAC.Storage.save('settings', s);
            VAC.Toast.success('Company profile saved');
        };
        const lo = body.querySelector('#set-logout');
        if (lo) lo.onclick = () => VAC.Auth.logout();
    }

    return {
        render(container) {
            tab = 'General';
            const tabs = ['General', 'Company Profile', 'Account'];
            container.innerHTML = `
                <div class="mb-6">
                    <h1 class="text-2xl font-bold text-slate-800">System Settings</h1>
                    <p class="text-sm text-gray-500">Configuration and administration</p>
                </div>
                <div class="flex gap-1 mb-4 border-b">
                    ${tabs.map(t => `<button class="px-4 py-2 text-sm font-semibold border-b-2 ${t === 'General' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}" data-tab="${t}">${t}</button>`).join('')}
                </div>
                <div class="vac-card p-6"><div id="settings-body"></div></div>`;

            container.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
                tab = b.dataset.tab;
                container.querySelectorAll('[data-tab]').forEach(x => {
                    const on = x === b;
                    x.classList.toggle('border-blue-600', on);
                    x.classList.toggle('text-blue-600', on);
                    x.classList.toggle('border-transparent', !on);
                    x.classList.toggle('text-gray-500', !on);
                });
                renderTab(container);
            });
            renderTab(container);
        }
    };
})();
