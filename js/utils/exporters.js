/* ===========================================================================
   utils/exporters.js
   Export a collection of records to a downloadable CSV file.
   Usage: VAC.Export.toCSV(rows, ['id','name','status'], 'vehicles.csv');
   ======================================================================== */
window.VAC = window.VAC || {};

VAC.Export = {
    toCSV(rows, columns, filename) {
        if (!rows || !rows.length) {
            VAC.Toast && VAC.Toast.info('Nothing to export');
            return;
        }
        const cols = columns || Object.keys(rows[0]);
        const esc = (v) => {
            const s = v === undefined || v === null ? '' : String(v);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const header = cols.join(',');
        const body = rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n');
        const csv = header + '\n' + body;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        VAC.Toast && VAC.Toast.success('Exported ' + rows.length + ' rows');
    }
};
