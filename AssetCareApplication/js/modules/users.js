/* ===========================================================================
   modules/users.js  ·  User Management (admin only)
   Add, update, delete and view portal users and their roles.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.users = {
    render(container) {
        if (!VAC.Auth.hasRole('admin')) {
            container.innerHTML = `
                <div class="vac-card p-12 text-center">
                    <i class="fas fa-lock text-3xl text-gray-300 mb-3"></i>
                    <h3 class="text-lg font-bold text-slate-700">Restricted</h3>
                    <p class="text-sm text-gray-500">Only administrators can manage users.</p>
                </div>`;
            return;
        }
        VAC.UI.crudView(container, {
            key: 'users',
            idField: 'id',
            idPrefix: 'U',
            title: 'User Management',
            singular: 'User',
            subtitle: 'Portal users, roles and access',
            editRoles: ['admin'],
            searchFields: ['id', 'name', 'email', 'role', 'status'],
            columns: [
                { field: 'id', label: 'User ID', bold: true },
                { field: 'name', label: 'Name' },
                { field: 'email', label: 'Email' },
                { field: 'role', label: 'Role' },
                { field: 'status', label: 'Status', badge: true }
            ],
            badges: { status: { Active: 'badge-green', Inactive: 'badge-gray' } },
            fields: [
                { name: 'id', label: 'User ID', required: true, placeholder: 'e.g. U3' },
                { name: 'name', label: 'Full Name', required: true },
                { name: 'email', label: 'Email', required: true, placeholder: 'user@viesl.com' },
                { name: 'password', label: 'Password', required: true },
                { name: 'role', label: 'Role', type: 'select', options: ['admin', 'manager', 'operator'] },
                { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
            ]
        });
    }
};
