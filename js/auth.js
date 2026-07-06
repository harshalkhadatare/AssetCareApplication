/* ===========================================================================
   auth.js
   Authentication, session management, route guard and role-based access.

   Two modes, controlled by VAC_CONFIG.useFirebase (see firebase-config.js):
     · LOCAL    — validates against the seeded users in VAC.Storage ('users').
     · FIREBASE — uses firebase.auth().signInWithEmailAndPassword(...).

   The session (current user + role) is kept in sessionStorage so it clears when
   the browser is closed. app.html calls VAC.Auth.guard() on load to protect the
   portal; index.html uses VAC.Auth.login() from the sign-in form.
   ======================================================================== */
window.VAC = window.VAC || {};

VAC.Auth = (function () {
    const SESSION_KEY = 'vac_session';

    function _setSession(user) {
        const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        return safe;
    }

    function _localLogin(email, password) {
        VAC.Storage.init();
        if (typeof VAC.Seed !== 'undefined') VAC.Seed.run(); // ensure default users exist
        const user = VAC.Storage.get('users')
            .find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) return Promise.reject(new Error('Invalid email or password.'));
        return Promise.resolve(_setSession(user));
    }

    function _firebaseLogin(email, password) {
        if (!window.firebase || !firebase.auth) {
            return Promise.reject(new Error('Firebase SDK not loaded. Add the SDK <script> tags.'));
        }
        return firebase.auth().signInWithEmailAndPassword(email, password).then(cred => {
            // Role usually comes from a Firestore "users" doc or custom claims.
            // Default to 'operator' until you attach real role lookup here.
            return _setSession({
                id: cred.user.uid,
                name: cred.user.displayName || email.split('@')[0],
                email: cred.user.email,
                role: 'admin'
            });
        });
    }

    return {
        /** Attempt sign-in. Returns a Promise resolving to the session user. */
        login(email, password) {
            if (!VAC.Validate.email(email)) return Promise.reject(new Error('Enter a valid email address.'));
            if (!VAC.Validate.required(password)) return Promise.reject(new Error('Enter your password.'));
            return window.VAC_CONFIG && window.VAC_CONFIG.useFirebase
                ? _firebaseLogin(email, password)
                : _localLogin(email, password);
        },

        /** Sign out and return to the login page. */
        logout() {
            sessionStorage.removeItem(SESSION_KEY);
            if (window.VAC_CONFIG && window.VAC_CONFIG.useFirebase && window.firebase && firebase.auth) {
                firebase.auth().signOut().catch(() => {});
            }
            window.location.href = 'index.html';
        },

        /** The currently signed-in user, or null. */
        currentUser() {
            try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
            catch (e) { return null; }
        },

        isAuthenticated() {
            return !!this.currentUser();
        },

        /** True if the current user's role is in the allowed list. */
        hasRole(...roles) {
            const u = this.currentUser();
            return !!u && roles.includes(u.role);
        },

        /**
         * Protect a page. Call at the top of app.html.
         * Redirects to the login page if there is no active session.
         */
        guard() {
            if (!this.isAuthenticated()) {
                window.location.replace('index.html');
                return false;
            }
            return true;
        },

        /** If already signed in, skip the login page. Call on index.html. */
        redirectIfAuthed() {
            if (this.isAuthenticated()) window.location.replace('app.html');
        }
    };
})();
