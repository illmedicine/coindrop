// ===== CoinDrop Firebase Configuration =====

const firebaseConfig = {
    apiKey: "AIzaSyCiDPW1rGWSbL1ozIFIVh3B_IaA8nReeI8",
    authDomain: "coindrop-e39de.firebaseapp.com",
    projectId: "coindrop-e39de",
    storageBucket: "coindrop-e39de.firebasestorage.app",
    messagingSenderId: "908591498193",
    appId: "1:908591498193:web:ae4b67e9d13d41e49f16f0",
    measurementId: "G-WT35ZRWJG0"
};

let db, auth;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    // Enable offline persistence — serves cached reads locally, reduces Firestore reads
    db.enablePersistence({ synchronizeTabs: true }).catch(e => {
        console.warn('Persistence not enabled:', e.code);
    });
    auth = firebase.auth();
} catch(e) {
    console.warn('Firebase init error (non-fatal):', e.message);
}

// ===== CoinDrop Database API =====
const CoinDropDB = {

    async getUser(userId) {
        const doc = await db.collection('users').doc(userId).get();
        return doc.exists ? doc.data() : null;
    },

    async saveUser(userId, userData) {
        await db.collection('users').doc(userId).set(userData, { merge: true });
    },

    async isOnCooldown(userId, videoId, taskType) {
        const key = `${videoId}_${taskType}`;
        const doc = await db.collection('cooldowns').doc(userId).get();
        if (!doc.exists) return false;
        const last = doc.data()[key];
        if (!last) return false;
        const lastTime = last.toMillis ? last.toMillis() : last;
        return (Date.now() - lastTime) < 24 * 60 * 60 * 1000;
    },

    async setCooldown(userId, videoId, taskType) {
        const key = `${videoId}_${taskType}`;
        await db.collection('cooldowns').doc(userId).set({
            [key]: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },

    async getCooldowns(userId) {
        const doc = await db.collection('cooldowns').doc(userId).get();
        return doc.exists ? doc.data() : {};
    },

    async logTask(userId, taskData) {
        await db.collection('tasks').add({
            userId,
            ...taskData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async getTaskHistory(userId, limit = 50) {
        const snap = await db.collection('tasks')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async getTaskBreakdown(userId) {
        const doc = await db.collection('stats').doc(userId).get();
        return doc.exists ? doc.data() : { views: 0, likes: 0, comments: 0, subs: 0, totalEarned: 0, tasksCompleted: 0 };
    },

    async incrementTaskStat(userId, taskType, rewardSOL) {
        const statField = { watch: 'views', like: 'likes', comment: 'comments', subscribe: 'subs', follow: 'subs' }[taskType] || 'views';
        await db.collection('stats').doc(userId).set({
            [statField]: firebase.firestore.FieldValue.increment(1),
            tasksCompleted: firebase.firestore.FieldValue.increment(1),
            totalEarned: firebase.firestore.FieldValue.increment(rewardSOL),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },

    async getLeaderboard(limit = 20) {
        const snap = await db.collection('stats')
            .orderBy('totalEarned', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map(d => ({ userId: d.id, ...d.data() }));
    },

    async addSubscription(userId, subData) {
        await db.collection('subscriptions').add({
            userId,
            ...subData,
            active: true,
            startDate: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async getSubscriptions(userId) {
        const snap = await db.collection('subscriptions')
            .where('userId', '==', userId)
            .where('active', '==', true)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
};

// ===== Google Sign-In =====
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const gUser = result.user;

    const userData = {
        id: gUser.uid,
        displayName: gUser.displayName,
        username: gUser.email.split('@')[0],
        email: gUser.email,
        avatar: gUser.photoURL,
        authProvider: 'google',
        prestige: 'starter',
        joinDate: new Date().toISOString().split('T')[0],
        walletAddress: '',
        tasksCompleted: 0,
        totalEarned: 0,
        activeSubscriptions: 0,
        activeFollows: 0,
        lastLogin: new Date().toISOString(),
    };

    // Try to load existing profile and stats from Firestore (non-blocking)
    try {
        const existing = await CoinDropDB.getUser(gUser.uid);
        if (existing) {
            userData.prestige = existing.prestige || 'starter';
            userData.joinDate = existing.joinDate || userData.joinDate;
            userData.walletAddress = existing.walletAddress || '';
        }
        await CoinDropDB.saveUser(gUser.uid, userData);
        const stats = await CoinDropDB.getTaskBreakdown(gUser.uid);
        userData.tasksCompleted = stats.tasksCompleted || 0;
        userData.totalEarned = stats.totalEarned || 0;
        userData.activeSubscriptions = stats.subs || 0;
    } catch (dbErr) {
        console.warn('Firestore sync skipped (will retry on dashboard):', dbErr.message);
    }

    localStorage.setItem('coindrop_user', JSON.stringify(userData));
    return userData;
}

// Restore session on page load
if (auth) auth.onAuthStateChanged(async (gUser) => {
    if (gUser && !localStorage.getItem('coindrop_user')) {
        const existing = await CoinDropDB.getUser(gUser.uid);
        if (existing) {
            const stats = await CoinDropDB.getTaskBreakdown(gUser.uid);
            existing.tasksCompleted = stats.tasksCompleted || 0;
            existing.totalEarned = stats.totalEarned || 0;
            existing.activeSubscriptions = stats.subs || 0;
            existing.activeFollows = 0;
            localStorage.setItem('coindrop_user', JSON.stringify(existing));
        }
    }
});
