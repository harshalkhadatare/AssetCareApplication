/* ===========================================================================
   app.js
   Portal bootstrap: guards the page, renders the shell (collapsible sidebar +
   header with account menu), routes between modules, and provides shared UI
   helpers (modal, confirm, and a generic CRUD table engine).
   ======================================================================== */
window.VAC = window.VAC || {};

/* ---------------------------------------------------------------------------
   Shared UI helpers
   ------------------------------------------------------------------------ */
VAC.UI = (function () {
    function closeModal() { const m = document.getElementById('vac-modal'); if (m) m.remove(); }

    function modal(title, bodyHTML, onSubmit, submitLabel) {
        closeModal();
        const wrap = document.createElement('div');
        wrap.id = 'vac-modal';
        wrap.className = 'modal-backdrop';
        wrap.innerHTML = `
            <div class="modal-box">
                <div class="flex items-center justify-between px-5 py-4 border-b">
                    <h3 class="font-bold text-slate-800">${title}</h3>
                    <button id="vac-modal-x" class="text-gray-400 hover:text-gray-700"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="p-5" id="vac-modal-body">${bodyHTML}</div>
                <div class="flex justify-end gap-2 px-5 py-4 border-t bg-slate-50 rounded-b-xl">
                    <button class="btn btn-ghost" id="vac-modal-cancel">Cancel</button>
                    <button class="btn btn-primary" id="vac-modal-ok">${submitLabel || 'Save'}</button>
                </div>
            </div>`;
        document.body.appendChild(wrap);
        wrap.querySelector('#vac-modal-x').onclick = closeModal;
        wrap.querySelector('#vac-modal-cancel').onclick = closeModal;
        wrap.addEventListener('mousedown', e => { if (e.target === wrap) closeModal(); });
        wrap.querySelector('#vac-modal-ok').onclick = () => onSubmit && onSubmit();
    }

    function confirm(message, onYes) {
        modal('Please confirm', `<p class="text-sm text-gray-600">${message}</p>`,
            () => { closeModal(); onYes && onYes(); }, 'Confirm');
        const ok = document.getElementById('vac-modal-ok');
        ok.classList.remove('btn-primary'); ok.classList.add('btn-danger');
    }

    /* -------- Generic CRUD view (vehicles / operators / sites / users) ----- */
    function crudView(container, cfg) {
        const editRoles = cfg.editRoles || ['admin', 'manager'];
        const canEdit = VAC.Auth.hasRole.apply(VAC.Auth, editRoles);

        function badgeFor(field, value) {
            const map = (cfg.badges && cfg.badges[field]) || {};
            return `<span class="badge ${map[value] || 'badge-gray'}">${value}</span>`;
        }
        function currentRows(term) {
            let rows = VAC.Storage.get(cfg.key);
            if (term) {
                const t = term.toLowerCase();
                rows = rows.filter(r => cfg.searchFields.some(f => String(r[f] || '').toLowerCase().includes(t)));
            }
            return rows;
        }
        function renderRows(term) {
            const rows = currentRows(term);
            const tbody = container.querySelector('#crud-body');
            if (!rows.length) { tbody.innerHTML = `<tr><td colspan="${cfg.columns.length + 1}" class="text-center text-gray-400 py-8">No records found</td></tr>`; return; }
            tbody.innerHTML = rows.map(r => {
                const cells = cfg.columns.map(col => {
                    let v = r[col.field];
                    if (col.badge) v = badgeFor(col.field, v);
                    else if (col.map) v = col.map(r[col.field], r);
                    return `<td class="${col.bold ? 'font-semibold text-blue-600' : ''}">${v === undefined || v === null ? '—' : v}</td>`;
                }).join('');
                const actions = canEdit ? `
                    <td class="text-right whitespace-nowrap">
                        <button class="text-slate-500 hover:text-blue-600 px-2" data-edit="${r.id}"><i class="fas fa-pen"></i></button>
                        <button class="text-slate-500 hover:text-rose-600 px-2" data-del="${r.id}"><i class="fas fa-trash"></i></button>
                    </td>` : '<td></td>';
                return `<tr>${cells}${actions}</tr>`;
            }).join('');
            tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(b.dataset.edit));
            tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () => removeRow(b.dataset.del));
        }
        function formHTML(record) {
            return cfg.fields.map(f => {
                const val = record ? (record[f.name] || '') : (f.default || '');
                if (f.type === 'select') {
                    const opts = f.options.map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('');
                    return `<div class="mb-3"><label class="field-label">${f.label}</label><select class="field-input" data-field="${f.name}">${opts}</select></div>`;
                }
                const ro = (f.name === cfg.idField && record) ? 'readonly' : '';
                return `<div class="mb-3"><label class="field-label">${f.label}${f.required ? ' *' : ''}</label>
                        <input class="field-input" data-field="${f.name}" value="${val}" ${ro} placeholder="${f.placeholder || ''}"></div>`;
            }).join('');
        }
        function collect() {
            const data = {};
            document.querySelectorAll('#vac-modal-body [data-field]').forEach(el => { data[el.dataset.field] = el.value.trim(); });
            return data;
        }
        function openForm(id) {
            const record = id ? VAC.Storage.find(cfg.key, id) : null;
            VAC.UI.modal((record ? 'Edit ' : 'Add ') + cfg.singular, formHTML(record), () => {
                const data = collect();
                const rules = {};
                cfg.fields.filter(f => f.required).forEach(f => { rules[f.name] = [{ test: VAC.Validate.required, message: 'Required' }]; });
                const { valid, errors } = VAC.Validate.form(data, rules);
                if (!valid) {
                    document.querySelectorAll('#vac-modal-body [data-field]').forEach(el => el.classList.toggle('field-error', !!errors[el.dataset.field]));
                    VAC.Toast.error('Please fill the required fields');
                    return;
                }
                if (!record && !data[cfg.idField]) data[cfg.idField] = cfg.idPrefix + Date.now().toString().slice(-6);
                VAC.Storage.upsert(cfg.key, record ? { ...record, ...data } : data);
                VAC.UI.closeModal();
                VAC.Toast.success(cfg.singular + (record ? ' updated' : ' added'));
                renderRows(container.querySelector('#crud-search').value);
            }, record ? 'Save changes' : 'Add');
        }
        function removeRow(id) {
            VAC.UI.confirm('Delete <b>' + id + '</b>? This cannot be undone.', () => {
                VAC.Storage.remove(cfg.key, id);
                VAC.Toast.success(cfg.singular + ' deleted');
                renderRows(container.querySelector('#crud-search').value);
            });
        }

        container.innerHTML = `
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div><h1 class="text-2xl font-bold text-slate-800">${cfg.title}</h1>
                <p class="text-sm text-gray-500">${cfg.subtitle}</p></div>
                <div class="flex gap-2">
                    <button class="btn btn-ghost" id="crud-export"><i class="fas fa-file-csv"></i> Export</button>
                    ${canEdit ? `<button class="btn btn-primary" id="crud-add"><i class="fas fa-plus"></i> Add ${cfg.singular}</button>` : ''}
                </div>
            </div>
            <div class="vac-card p-4">
                <div class="relative mb-4 max-w-sm">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input id="crud-search" class="field-input pl-9" placeholder="Search ${cfg.title.toLowerCase()}...">
                </div>
                <div class="overflow-x-auto"><table class="vac-table">
                    <thead><tr>${cfg.columns.map(c => `<th>${c.label}</th>`).join('')}<th class="text-right">Actions</th></tr></thead>
                    <tbody id="crud-body"></tbody>
                </table></div>
            </div>`;
        container.querySelector('#crud-search').addEventListener('input', e => renderRows(e.target.value));
        const addBtn = container.querySelector('#crud-add');
        if (addBtn) addBtn.onclick = () => openForm(null);
        container.querySelector('#crud-export').onclick = () =>
            VAC.Export.toCSV(currentRows(container.querySelector('#crud-search').value), cfg.columns.map(c => c.field), cfg.key + '.csv');
        renderRows('');
    }

    return { modal, closeModal, confirm, crudView };
})();

/* ---------------------------------------------------------------------------
   Router / navigation
   ------------------------------------------------------------------------ */
VAC.App = (function () {
    const TITLES = {
        dashboard: 'Dashboard', analytics: 'Analytics & Reports', vehicles: 'Vehicles',
        operators: 'Operators', sites: 'Sites', reports: 'Inspection Reports',
        checklists: 'Inspection Checklist', faults: 'Fault List', workorders: 'Work Orders',
        masters: 'Master Data', users: 'User Management', settings: 'Settings'
    };
    const ORDER = Object.keys(TITLES);
    const TEXT = {
        en: {
            portalTitle: 'VAC Admin Portal',
            refresh: 'Refresh',
            fullscreen: 'Fullscreen',
            exitFullscreen: 'Exit fullscreen',
            language: 'English',
            profile: 'Profile',
            settings: 'Settings',
            signOut: 'Sign out',
            welcome: user => user.name || 'User',
            role: user => user.role || ''
        },
        hi: {
            portalTitle: 'VAC व्यवस्थापक पोर्टल',
            refresh: 'रीफ्रेश',
            fullscreen: 'पूर्ण स्क्रीन',
            exitFullscreen: 'पूर्ण स्क्रीन बंद करें',
            language: 'हिंदी',
            profile: 'प्रोफ़ाइल',
            settings: 'सेटिंग्स',
            signOut: 'साइन आउट',
            welcome: user => user.name || 'उपयोगकर्ता',
            role: user => user.role ? (user.role === 'admin' ? 'एडमिन' : user.role === 'manager' ? 'मैनेजर' : 'ऑपरेटर') : ''
        }
    };
    let active = null;
    let language = 'en';
    let headerListenersBound = false;
    let fullscreenActive = false;

    function currentText() { return TEXT[language] || TEXT.en; }

    function setLanguage(lang) {
        language = lang === 'hi' ? 'hi' : 'en';
        document.documentElement.lang = language;
        buildHeader();
        if (active && VAC.Modules[active]) {
            const container = document.getElementById('view-container');
            if (container) VAC.Modules[active].render(container);
        }
    }

    function refreshView() {
        if (!active || !VAC.Modules[active]) return;
        const container = document.getElementById('view-container');
        if (container) VAC.Modules[active].render(container);
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            const el = document.documentElement;
            el.requestFullscreen?.();
            fullscreenActive = true;
        } else {
            document.exitFullscreen?.();
            fullscreenActive = false;
        }
    }

    function setActiveNav(name) {
        document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
    }

    function navigate(name) {
        if (!ORDER.includes(name)) name = 'dashboard';
        const prev = VAC.Modules[active];
        if (prev && prev.destroy) prev.destroy();
        const container = document.getElementById('view-container');
        const mod = VAC.Modules[name];
        if (mod && mod.render) {
            mod.render(container);
            active = name;
            setActiveNav(name);
            location.hash = name;
        }
    }

    function toggleSidebar() { document.body.classList.toggle('sidebar-collapsed'); }

    function buildHeader() {
        const user = VAC.Auth.currentUser() || {};
        const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const t = currentText();
        const header = document.getElementById('portal-header');
        header.innerHTML = `
            <button id="sidebar-toggle" class="text-slate-500 hover:text-slate-800 mr-4"><i class="fas fa-bars"></i></button>
            <span class="font-bold text-slate-700">${t.portalTitle}</span>
            <div class="ml-auto flex items-center gap-2 relative">
                <button id="refresh-btn" class="btn btn-ghost py-2 px-3 text-sm" title="${t.refresh}"><i class="fas fa-rotate-right"></i><span class="hidden sm:inline ml-2">${t.refresh}</span></button>
                <button id="fullscreen-btn" class="btn btn-ghost py-2 px-3 text-sm" title="${fullscreenActive ? t.exitFullscreen : t.fullscreen}"><i class="fas fa-expand"></i><span class="hidden sm:inline ml-2">${fullscreenActive ? t.exitFullscreen : t.fullscreen}</span></button>
                <button id="lang-btn" class="btn btn-ghost py-2 px-3 text-sm" title="${t.language}"><i class="fas fa-globe"></i><span class="hidden sm:inline ml-2">${t.language}</span></button>
                <div class="text-right leading-tight hidden sm:block">
                    <div class="text-sm font-semibold text-slate-700">${t.welcome(user)}</div>
                    <div class="text-xs text-gray-400 capitalize">${t.role(user)}</div>
                </div>
                <button id="account-btn" class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">${initials}</button>
                <div id="account-menu" class="account-menu hidden">
                    <div class="px-4 py-3 border-b">
                        <div class="text-sm font-semibold text-slate-700">${t.welcome(user)}</div>
                        <div class="text-xs text-gray-400">${user.email || ''}</div>
                    </div>
                    <a href="#" id="acct-settings"><i class="fas fa-cog text-gray-400"></i> ${t.settings}</a>
                    <a href="#" id="acct-logout"><i class="fas fa-right-from-bracket text-gray-400"></i> ${t.signOut}</a>
                </div>
            </div>`;
        document.getElementById('sidebar-toggle').onclick = toggleSidebar;
        document.getElementById('refresh-btn').onclick = (e) => { e.stopPropagation(); refreshView(); };
        document.getElementById('fullscreen-btn').onclick = (e) => { e.stopPropagation(); toggleFullscreen(); };
        document.getElementById('lang-btn').onclick = (e) => { e.stopPropagation(); setLanguage(language === 'en' ? 'hi' : 'en'); };
        const menu = document.getElementById('account-menu');
        document.getElementById('account-btn').onclick = (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); };
        document.getElementById('acct-settings').onclick = (e) => { e.preventDefault(); navigate('settings'); menu.classList.add('hidden'); };
        document.getElementById('acct-logout').onclick = (e) => { e.preventDefault(); VAC.Auth.logout(); };
        if (!headerListenersBound) {
            document.addEventListener('click', (e) => {
                const btn = document.getElementById('account-btn');
                const menu = document.getElementById('account-menu');
                if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) menu.classList.add('hidden');
            });
            headerListenersBound = true;
        }
    }

    function init() {
        if (!VAC.Auth.guard()) return;
        VAC.Storage.init();
        VAC.Seed.run();
        buildHeader();
        window.addEventListener('vac-data-updated', () => {
            if (active === 'dashboard') VAC.Modules.dashboard.render(document.getElementById('view-container'));
        });
        const start = (location.hash || '').replace('#', '') || 'dashboard';
        navigate(start);
    }

    return { init, navigate, toggleSidebar, setLanguage, currentLanguage: () => language, refreshView, toggleFullscreen };
})();

document.addEventListener('DOMContentLoaded', VAC.App.init);
