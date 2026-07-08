/* ===========================================================================
   modules/checklists.js  ·  Inspection Checklist
   Defines the checklist items operators complete during an inspection,
   grouped by category. Managers/admins can add, edit and remove items.
   ======================================================================== */
window.VAC = window.VAC || {};
VAC.Modules = VAC.Modules || {};

VAC.Modules.checklists = {
    render(container) {
        VAC.UI.crudView(container, {
            key: 'checklist',
            idField: 'id',
            idPrefix: 'CHK',
            title: 'Inspection Checklist',
            singular: 'Checklist Item',
            subtitle: 'Items operators complete during each inspection',
            searchFields: ['id', 'category', 'item', 'responseType', 'required'],
            columns: [
                { field: 'id', label: 'Item ID', bold: true },
                { field: 'category', label: 'Category' },
                { field: 'item', label: 'Inspection Item' },
                { field: 'responseType', label: 'Response Type' },
                { field: 'required', label: 'Required', badge: true }
            ],
            badges: { required: { Yes: 'badge-blue', No: 'badge-gray' } },
            fields: [
                { name: 'id', label: 'Item ID', required: true, placeholder: 'e.g. CHK120' },
                { name: 'category', label: 'Category', type: 'select', options: ['Engine', 'Brakes', 'Hydraulics', 'Tyres / Tracks', 'Electrical', 'Safety', 'Cabin'] },
                { name: 'item', label: 'Inspection Item', required: true, placeholder: 'e.g. Coolant level' },
                { name: 'responseType', label: 'Response Type', type: 'select', options: ['Pass / Fail / NA', 'OK / Not OK', 'Yes / No', 'Numeric reading'] },
                { name: 'required', label: 'Required', type: 'select', options: ['Yes', 'No'] }
            ]
        });
    }
};
