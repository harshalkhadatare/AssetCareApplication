/* ===========================================================================
   data/seed.js
   Seeds realistic demo data on first run so every screen has content.
   Only runs when a collection is empty — it never overwrites live edits.
   Structure follows the HVI portal model: vehicles, operators, sites,
   inspections, faults, work orders and upcoming schedule.
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
    const FAULT_PARTS = ['Brake Pads', 'Hydraulic Hose', 'Air Filter', 'Coolant System', 'Track Chain',
        'Engine Oil Leak', 'Battery', 'Tyre Wear', 'Bucket Teeth', 'Alternator'];
    const SEVERITY = ['Low', 'Medium', 'High', 'Critical'];
    const WO_STATUS = ['Open', 'In Progress', 'Completed', 'Pending Approval'];

    function pick(a, i) { return a[i % a.length]; }
    function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
    function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
    function daysAhead(n) { return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10); }

    function seedSites() {
        if (VAC.Storage.get('sites').length) return;
        VAC.Storage.save('sites', SITE_DEFS.map(s => ({ ...s, status: 'Active' })));
    }
    function seedVehicles() {
        if (VAC.Storage.get('vehicles').length) return;
        VAC.Storage.save('vehicles', Array.from({ length: 48 }, (_, i) => ({
            id: 'VPAV' + (260081 + i),
            model: pick(MODELS, i),
            type: pick(VEHICLE_TYPES, i),
            status: pick(STATUSES, i),
            site: pick(SITE_DEFS, i).id,
            regNo: 'MH' + (10 + (i % 40)) + '-' + String.fromCharCode(65 + (i % 26)) + 'X-' + (1000 + i)
        })));
    }
    function seedOperators() {
        if (VAC.Storage.get('operators').length) return;
        VAC.Storage.save('operators', Array.from({ length: 24 }, (_, i) => ({
            id: 'OP' + String(1001 + i),
            name: pick(FIRST, i) + ' ' + pick(LAST, i + 3),
            role: i % 6 === 0 ? 'Supervisor' : 'Operator',
            phone: '+91 9' + (700000000 + i * 137).toString().slice(0, 9),
            site: pick(SITE_DEFS, i).id,
            status: i % 9 === 0 ? 'Inactive' : 'Active'
        })));
    }
    function seedReports() {
        if (VAC.Storage.get('reports').length) return;
        const vehicles = VAC.Storage.get('vehicles');
        const ops = VAC.Storage.get('operators');
        VAC.Storage.save('reports', Array.from({ length: 40 }, (_, i) => {
            const v = vehicles[i % vehicles.length] || {};
            const op = ops[i % ops.length] || {};
            const issues = Math.floor(Math.random() * 5);
            return {
                id: 'INS' + String(1001 + i),
                vehicle: v.id || '—',
                operator: op.name || '—',
                site: v.site || '—',
                date: daysAgo(Math.floor(i * 0.6)),
                issues: issues,
                status: issues > 3 ? 'Rejected' : rand(REPORT_STATUS)
            };
        }));
    }
    function seedFaults() {
        if (VAC.Storage.get('faults').length) return;
        const vehicles = VAC.Storage.get('vehicles');
        VAC.Storage.save('faults', Array.from({ length: 22 }, (_, i) => {
            const v = vehicles[(i * 3) % vehicles.length] || {};
            return {
                id: 'FLT' + String(2001 + i),
                vehicle: v.id || '—',
                part: pick(FAULT_PARTS, i),
                severity: pick(SEVERITY, i + 1),
                site: v.site || '—',
                reported: daysAgo(i),
                status: i % 3 === 0 ? 'Resolved' : 'Open'
            };
        }));
    }
    function seedWorkOrders() {
        if (VAC.Storage.get('workorders').length) return;
        const vehicles = VAC.Storage.get('vehicles');
        const faults = VAC.Storage.get('faults');
        VAC.Storage.save('workorders', Array.from({ length: 18 }, (_, i) => {
            const v = vehicles[(i * 5) % vehicles.length] || {};
            const f = faults[i % faults.length] || {};
            return {
                id: 'WO' + String(3001 + i),
                vehicle: v.id || '—',
                task: 'Repair: ' + (f.part || 'General service'),
                priority: pick(SEVERITY, i),
                assignedTo: pick(FIRST, i) + ' ' + pick(LAST, i),
                due: daysAhead((i % 10) - 3),
                status: pick(WO_STATUS, i)
            };
        }));
    }
    function seedSchedule() {
        if (VAC.Storage.get('schedule').length) return;
        const vehicles = VAC.Storage.get('vehicles');
        VAC.Storage.save('schedule', Array.from({ length: 6 }, (_, i) => {
            const v = vehicles[(i * 7) % vehicles.length] || {};
            return {
                id: 'SCH' + (i + 1),
                vehicle: v.id || '—',
                type: ['PM Service', 'Inspection Due', 'Insurance Renewal', 'Fitness Cert.', 'PM Service', 'Inspection Due'][i],
                date: daysAhead(i + 1)
            };
        }));
    }
    function seedMasters() {
        if (VAC.Storage.get('masters') && VAC.Storage.get('masters').vehicleTypes) return;
        VAC.Storage.save('masters', {
            vehicleTypes: VEHICLE_TYPES.slice(),
            faultCategories: ['Engine', 'Hydraulics', 'Electrical', 'Brakes', 'Tyres', 'Structural', 'Safety'],
            inspectionAreas: ['Engine Bay', 'Cabin', 'Undercarriage', 'Hydraulic System', 'Electrical System', 'Safety Equipment'],
            departments: ['Operations', 'Maintenance', 'Safety & Compliance', 'Administration']
        });
    }

    function seedChecklist() {
        if (VAC.Storage.get('checklist').length) return;
        const items = [
            ['Engine', 'Engine oil level', true],
            ['Engine', 'Coolant level', true],
            ['Engine', 'Fuel level', false],
            ['Engine', 'Unusual noise / vibration', true],
            ['Brakes', 'Service brake operation', true],
            ['Brakes', 'Parking brake operation', true],
            ['Hydraulics', 'Hydraulic oil level', true],
            ['Hydraulics', 'Hose / fitting leaks', true],
            ['Tyres / Tracks', 'Tyre pressure / track tension', true],
            ['Tyres / Tracks', 'Visible damage or wear', false],
            ['Electrical', 'Lights and indicators', false],
            ['Electrical', 'Horn / reverse alarm', true],
            ['Safety', 'Seatbelt condition', true],
            ['Safety', 'Fire extinguisher present', true],
            ['Safety', 'First-aid kit present', false],
            ['Cabin', 'Mirrors and glass', false],
            ['Cabin', 'Gauges and warning lamps', true]
        ];
        VAC.Storage.save('checklist', items.map((it, i) => ({
            id: 'CHK' + String(101 + i),
            category: it[0],
            item: it[1],
            responseType: 'Pass / Fail / NA',
            required: it[2] ? 'Yes' : 'No'
        })));
    }

    function seedUsers() {
        if (VAC.Storage.get('users').length) return;
        VAC.Storage.save('users', [
            { id: 'U1', name: 'System Admin', email: 'admin@viesl.com', password: 'admin123', role: 'admin', status: 'Active' },
            { id: 'U2', name: 'Fleet Manager', email: 'manager@viesl.com', password: 'manager123', role: 'manager', status: 'Active' }
        ]);
    }

    return {
        run() {
            VAC.Storage.init();
            seedSites(); seedVehicles(); seedOperators(); seedReports();
            seedFaults(); seedWorkOrders(); seedSchedule();
            seedMasters(); seedChecklist(); seedUsers();
        }
    };
})();
