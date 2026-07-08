/* ===========================================================================
   firebase-config.js
   Central place to turn on real Firebase.

   By default the portal runs in LOCAL mode: authentication and data are handled
   client-side (localStorage) so everything works with zero setup. When you are
   ready to connect the real backend:

     1. Create a Firebase project and a Web App in the Firebase console.
     2. Paste the config object below.
     3. Set  VAC_CONFIG.useFirebase = true.
     4. Add the Firebase SDK <script> tags to index.html and app.html
        (they are included but commented out at the bottom of each page).

   js/auth.js already branches on VAC_CONFIG.useFirebase, so no other change is
   needed to switch authentication over to Firebase Auth.
   ======================================================================== */
window.VAC_CONFIG = {
    useFirebase: false,

    firebase: {
        apiKey: 'YOUR_API_KEY',
        authDomain: 'YOUR_PROJECT.firebaseapp.com',
        projectId: 'YOUR_PROJECT_ID',
        storageBucket: 'YOUR_PROJECT.appspot.com',
        messagingSenderId: 'YOUR_SENDER_ID',
        appId: 'YOUR_APP_ID'
    }
};

// When useFirebase is true and the SDK is loaded, initialize the app.
(function () {
    if (window.VAC_CONFIG.useFirebase && window.firebase && firebase.initializeApp) {
        try {
            firebase.initializeApp(window.VAC_CONFIG.firebase);
        } catch (e) {
            console.warn('Firebase init skipped:', e.message);
        }
    }
})();
