/* ===========================================================================
   utils/validation.js
   Small validation helpers used by the CRUD forms.
   ======================================================================== */
window.VAC = window.VAC || {};

VAC.Validate = {
    required(value) {
        return value !== undefined && value !== null && String(value).trim() !== '';
    },
    email(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    },
    minLength(value, n) {
        return String(value || '').trim().length >= n;
    },
    /**
     * Validate a plain object against a rules map.
     * rules = { fieldName: [ {test:(v)=>bool, message:'...'} ] }
     * Returns { valid:boolean, errors:{field:message} }
     */
    form(data, rules) {
        const errors = {};
        Object.keys(rules).forEach(field => {
            for (const rule of rules[field]) {
                if (!rule.test(data[field])) {
                    errors[field] = rule.message;
                    break;
                }
            }
        });
        return { valid: Object.keys(errors).length === 0, errors };
    }
};
