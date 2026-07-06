/* ===========================================================================
   data/seed.js
   Seeds realistic demo data on first run so every screen has content.
   Only runs when a collection is empty — it never overwrites live edits.
   ======================================================================== */
window.VAC = window.VAC || {};

VAC.Seed = (function () {
    const VEHICLE_TYPES = ['Excavator', 'Dump Truck', 'Wheel Loader', 'Motor Grader', 'Roller', 'Backhoe'];
    const MODELS = ['Caterpillar 320', 'Volvo A40G', 'JCB 3DX', 'Komatsu PC210', 'L&T 9020', 'Tata Prima'];
    const STATUSES = ['Active', 'Active', 'Active', 'Maintenance', 'Idle'];
    const SITE_DEFS = [
        { id: 'SITE-PUN', name: 'Pune Ring Road', location: 'Pune, MH', manager: 'R. Deshmukh' },
        { id: 'SITE-MUM', name: 'Mumbai Coastal', location: 'Mumbai, MH', manager: 'S. Kulkarni' },
        { id: 'SITE-NAG', name: 'Nagpur Expressway', location: 'Nagpur, MH', manager: 'A. Patil' },
        { id: 'SITE-NAS', name: 'Nashik Bypass', location: 'Nashik, MH', manager: 'V. Jadhav' }
    ];
    const FIRST = ['Amit', 'Rahul', 'Sunil', 'Prakash', 'Vijay', 'Ganesh', 'Nitin', 'Suresh', 'Ramesh', 'Kiran'];
    const LAST = ['Sharma', 'Patil', 'Yadav', 'Gupta', 'Shinde', 'More', 'Pawar', 'Jadhav', 'Kadam', 'Chavan'];
    const REPORT_STATUS = ['Approved', 'Approved', 'Pending', 'Rejected'];

    function pick(a, i) { return a[i % a.length]; }
    function rand(a) { return a[Math.floor(Math.random() * a.length)]; }

    function seedSites() {
        if (VAC.Storage.get('sites').length) return;
        const sites = SITE_DEFS.map(s => ({ ...s, status: 'Active' }));
        VAC.Storage.save('sites', sites);
    }

    function seedVehicles() {
        if (VAC.Storage.get('vehicles').length) return;
        const vehicles = Array.from({ length: 48 }, (_, i) => ({
            id: 'VPAV' + (260081 + i),
            model: pick(MODELS, i),
            type: pick(VEHICLE_TYPES, i),
            status: pick(STATUSES, i),
            site: pick(SITE_DEFS, i).id,
            regNo: 'MH' + (10 + (i % 40)) + '-' + String.fromCharCode(65 + (i % 26)) + 'X-' + (1000 + i)
        }));
        VAC.Storage.save('vehicles', vehicles);
    }

    function seedOperators() {
        if (VAC.Storage.get('operators').length) return;
        const ops = Array.from({ length: 24 }, (_, i) => ({
            id: 'OP' + String(1001 + i),
            name: pick(FIRST, i) + ' ' + pick(LAST, i + 3),
            role: i % 6 === 0 ? 'Supervisor' : 'Operator',
            phone: '+91 9' + (700000000 + i * 137).toString().slice(0, 9),
            site: pick(SITE_DEFS, i).id,
            status: i % 9 === 0 ? 'Inactive' : 'Active'
        }));
        VAC.Storage.save('operators', ops);
    }

    function seedReports() {
        if (VAC.Storage.get('reports').length) return;
        const vehicles = VAC.Storage.get('vehicles');
        const ops = VAC.Storage.get('operators');
        const today = new Date();
        const reports = Array.from({ length: 40 }, (_, i) => {
            const d = new Date(today.getTime() - i * 86400000 * 0.6);
            const v = vehicles[i % vehicles.length] || {};
            const op = ops[i % ops.length] || {};
            const issues = Math.floor(Math.random() * 5);
            return {
                id: 'VIESL' + String(1001 + i),
                vehicle: v.id || '—',
                operator: op.name || '—',
                site: v.site || '—',
                date: d.toISOString().slice(0, 10),
                issues: issues,
                status: issues > 3 ? 'Rejected' : rand(REPORT_STATUS)
            };
        });
        VAC.Storage.save('reports', reports);
    }

    function seedUsers() {
        if (VAC.Storage.get('users').length) return;
        // Default portal users for the local auth demo (see js/auth.js).
        VAC.Storage.save('users', [
            { id: 'U1', name: 'System Admin', email: 'admin@viesl.com', password: 'admin123', role: 'admin' },
            { id: 'U2', name: 'Fleet Manager', email: 'manager@viesl.com', password: 'manager123', role: 'manager' }
        ]);
    }

    return {
        run() {
            VAC.Storage.init();
            seedSites();
            seedVehicles();
            seedOperators();
            seedReports();
            seedUsers();
        }
    };
})();
