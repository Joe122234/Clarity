import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: ["AIzaSyBIwZj2xsj0H3", "jxW2elIGBOuDOvUXnflgI"].join(''),
    authDomain: "clarity-4fd0b.firebaseapp.com",
    projectId: "clarity-4fd0b",
    storageBucket: "clarity-4fd0b.firebasestorage.app",
    messagingSenderId: "1052301838442",
    appId: "1:1052301838442:web:63762013df6aa23d8ea213",
    measurementId: "G-BN4DC5NMTC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Global sync push function hooked into LocalStorage save
window.syncToFirebase = async function (key, data) {
    if (window._isFirebaseSyncing) return;
    try {
        await setDoc(doc(db, 'clarity_storage', key), { payload: JSON.stringify(data) }, { merge: true });
    } catch (e) {
        console.error('Firebase save error:', e);
    }
};

// Keys to sync matching storage.js definitions
const keysToSync = ['clarity_monthly_goals', 'clarity_weekly_goals', 'clarity_daily_tasks', 'clarity_reflections', 'clarity_dismissed_notifications'];

// Listen for remote drops
keysToSync.forEach(key => {
    onSnapshot(doc(db, 'clarity_storage', key), (docSnap) => {
        if (docSnap.exists()) {
            const remoteData = docSnap.data().payload;
            const localData = localStorage.getItem(key);

            if (remoteData && remoteData !== localData) {
                window._isFirebaseSyncing = true;
                localStorage.setItem(key, remoteData);
                window._isFirebaseSyncing = false;

                // Blast event so the UI re-renders cleanly
                document.dispatchEvent(new Event('firebaseDataChanged'));
            }
        }
    });
});
