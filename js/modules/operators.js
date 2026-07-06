/* ===========================================================================
   modules/operators.js  ·  Operator Management (CRUD)
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.operators = {
    render(container) {
        VAC.UI.crudView(container, {
            key: 'operators',
            idField: 'id',
            idPrefix: 'OP',
            title: 'Operator Management',
            singular: 'Operator',
            subtitle: 'Field operators and supervisors',
            searchFields: ['id', 'name', 'role', 'phone', 'site', 'status'],
            columns: [
                { field: 'id', label: 'Operator ID', bold: true },
                { field: 'name', label: 'Name' },
                { field: 'role', label: 'Role' },
                { field: 'phone', label: 'Phone' },
                { field: 'site', label: 'Site' },
                { field: 'status', label: 'Status', badge: true }
            ],
            badges: { status: { Active: 'badge-green', Inactive: 'badge-gray' } },
            fields: [
                { name: 'id', label: 'Operator ID', required: true, placeholder: 'e.g. OP1050' },
                { name: 'name', label: 'Full Name', required: true, placeholder: 'e.g. Amit Sharma' },
                { name: 'role', label: 'Role', type: 'select', options: ['Operator', 'Supervisor'] },
                { name: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                { name: 'site', label: 'Site', placeholder: 'e.g. SITE-PUN' },
                { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
            ]
        });
    }
};
