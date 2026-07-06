/* ===========================================================================
   modules/sites.js  ·  Site Management (CRUD)
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.sites = {
    render(container) {
        VAC.UI.crudView(container, {
            key: 'sites',
            idField: 'id',
            idPrefix: 'SITE-',
            title: 'Site Management',
            singular: 'Site',
            subtitle: 'Project sites and their managers',
            searchFields: ['id', 'name', 'location', 'manager', 'status'],
            columns: [
                { field: 'id', label: 'Site ID', bold: true },
                { field: 'name', label: 'Site Name' },
                { field: 'location', label: 'Location' },
                { field: 'manager', label: 'Manager' },
                { field: 'status', label: 'Status', badge: true }
            ],
            badges: { status: { Active: 'badge-green', 'On Hold': 'badge-yellow', Closed: 'badge-gray' } },
            fields: [
                { name: 'id', label: 'Site ID', required: true, placeholder: 'e.g. SITE-PUN' },
                { name: 'name', label: 'Site Name', required: true, placeholder: 'e.g. Pune Ring Road' },
                { name: 'location', label: 'Location', placeholder: 'e.g. Pune, MH' },
                { name: 'manager', label: 'Site Manager', placeholder: 'e.g. R. Deshmukh' },
                { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On Hold', 'Closed'] }
            ]
        });
    }
};
