/* ===========================================================================
   modules/vehicles.js  ·  Vehicle Management (CRUD)
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.vehicles = {
    render(container) {
        VAC.UI.crudView(container, {
            key: 'vehicles',
            idField: 'id',
            idPrefix: 'VPAV',
            title: 'Vehicle Management',
            singular: 'Vehicle',
            subtitle: 'Manage the heavy vehicle fleet',
            searchFields: ['id', 'model', 'type', 'regNo', 'status'],
            columns: [
                { field: 'id', label: 'Vehicle ID', bold: true },
                { field: 'model', label: 'Model' },
                { field: 'type', label: 'Type' },
                { field: 'regNo', label: 'Reg. No.' },
                { field: 'site', label: 'Site' },
                { field: 'status', label: 'Status', badge: true }
            ],
            badges: { status: { Active: 'badge-green', Maintenance: 'badge-yellow', Idle: 'badge-gray' } },
            fields: [
                { name: 'id', label: 'Vehicle ID', required: true, placeholder: 'e.g. VPAV260100' },
                { name: 'model', label: 'Model', required: true, placeholder: 'e.g. Caterpillar 320' },
                { name: 'type', label: 'Type', type: 'select', options: ['Excavator', 'Dump Truck', 'Wheel Loader', 'Motor Grader', 'Roller', 'Backhoe'] },
                { name: 'regNo', label: 'Registration No.', placeholder: 'e.g. MH12-AX-1234' },
                { name: 'site', label: 'Site', placeholder: 'e.g. SITE-PUN' },
                { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Maintenance', 'Idle'] }
            ]
        });
    }
};
