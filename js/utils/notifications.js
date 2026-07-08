/* ===========================================================================
   utils/notifications.js
   Lightweight toast notifications. Usage: VAC.Toast.success('Saved');
   ======================================================================== */
window.VAC = window.VAC || {};

VAC.Toast = (function () {
    function _root() {
        let root = document.getElementById('toast-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'toast-root';
            document.body.appendChild(root);
        }
        return root;
    }

    function show(message, type) {
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
        const el = document.createElement('div');
        el.className = 'toast toast-' + (type || 'info');
        el.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
        _root().appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s ease';
            setTimeout(() => el.remove(), 300);
        }, 2800);
    }

    return {
        success: (m) => show(m, 'success'),
        error:   (m) => show(m, 'error'),
        info:    (m) => show(m, 'info')
    };
})();
