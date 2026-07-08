/* ===========================================================================
   utils/storage.js
   Local data layer for the VAC portal.

   This is a client-side store backed by localStorage so the portal is fully
   functional out of the box (no backend required to demo). Every module reads
   and writes through this service. When you wire up Cloud Firestore, you can
   replace the internals of get/save/upsert/remove with Firestore calls and the
   rest of the app keeps working unchanged.
   ======================================================================== */
window.VAC = window.VAC || {};

VAC.Storage = (function () {
    const DB_KEY = 'vac_db';

    function _defaults() {
        return {
            vehicles: [],
            operators: [],
            sites: [],
            reports: [],
            users: [],
            settings: { company: 'Vision Infra Equipment Solutions Ltd.', theme: 'light' }
        };
    }

    function _read() {
        try {
            return JSON.parse(localStorage.getItem(DB_KEY)) || _defaults();
        } catch (e) {
            return _defaults();
        }
    }

    function _write(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    return {
        /** Create the DB with default shape if it does not exist yet. */
        init() {
            if (!localStorage.getItem(DB_KEY)) _write(_defaults());
        },

        /** Return an array (or object for settings) for a collection key. */
        get(key) {
            const db = _read();
            return db[key] !== undefined ? db[key] : [];
        },

        /** Replace a whole collection and notify listeners. */
        save(key, data) {
            const db = _read();
            db[key] = data;
            _write(db);
            window.dispatchEvent(new CustomEvent('vac-data-updated', { detail: { key } }));
        },

        /** Insert or update a single record by its `id` field. */
        upsert(key, record) {
            const list = this.get(key);
            const idx = list.findIndex(r => r.id === record.id);
            if (idx >= 0) list[idx] = { ...list[idx], ...record };
            else list.push(record);
            this.save(key, list);
            return record;
        },

        /** Remove a record by id. */
        remove(key, id) {
            const list = this.get(key).filter(r => r.id !== id);
            this.save(key, list);
        },

        /** Find one record by id. */
        find(key, id) {
            return this.get(key).find(r => r.id === id) || null;
        },

        /** Wipe everything (used by "Reset demo data" in Settings). */
        reset() {
            localStorage.removeItem(DB_KEY);
            this.init();
            window.dispatchEvent(new CustomEvent('vac-data-updated', { detail: { key: '*' } }));
        }
    };
})();
