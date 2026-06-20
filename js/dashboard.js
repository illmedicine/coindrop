// ===== Dashboard JS =====

// Sidebar toggle (mobile)
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// Tab navigation
document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById('sidebar').classList.remove('open');
    });
});

// Load user data
const user = JSON.parse(localStorage.getItem('coindrop_user') || 'null');
if (!user) {
    window.location.href = 'login.html';
}

// Prestige badge map
const PRESTIGE = {
    starter: { label: 'Starter', icon: 'fas fa-seedling', class: 'badge-starter' },
    bronze: { label: 'Bronze', icon: 'fas fa-medal', class: 'badge-bronze' },
    silver: { label: 'Silver', icon: 'fas fa-shield-alt', class: 'badge-silver' },
    gold: { label: 'Gold', icon: 'fas fa-star', class: 'badge-gold' },
    platinum: { label: 'Platinum', icon: 'fas fa-crown', class: 'badge-platinum' },
    diamond: { label: 'Diamond', icon: 'fas fa-gem', class: 'badge-diamond' },
};

if (user) {
    const p = PRESTIGE[user.prestige] || PRESTIGE.starter;
    document.getElementById('user-name').textContent = user.displayName;
    document.getElementById('user-avatar').src = user.avatar;
    document.getElementById('user-badge').innerHTML = `<i class="${p.icon}"></i> ${p.label}`;
    document.getElementById('user-badge').className = `badge ${p.class}`;
    document.getElementById('total-earned').textContent = `${user.totalEarned} SOL`;
    document.getElementById('tasks-done').textContent = user.tasksCompleted;
    document.getElementById('active-subs').textContent = user.activeSubscriptions;
    document.getElementById('active-follows').textContent = user.activeFollows;
}

// Recent activity
const ACTIVITIES = [
    { type: 'yt', action: 'Watched YouTube video', detail: '"Top 10 Crypto Tips"', reward: '+0.001 SOL', time: '5 min ago' },
    { type: 'ig', action: 'Liked Instagram post', detail: '@cryptotrader', reward: '+0.0005 SOL', time: '12 min ago' },
    { type: 'sub', action: 'Subscribed to channel', detail: 'CoinDesk', reward: '+$0.05', time: '1 hr ago' },
    { type: 'yt', action: 'Left a comment', detail: '"Great video, thanks!"', reward: '+0.002 SOL', time: '2 hrs ago' },
    { type: 'payout', action: 'Daily payout received', detail: '14 tasks completed', reward: '+0.024 SOL', time: 'Yesterday' },
    { type: 'ig', action: 'Followed account', detail: '@dailycrypto', reward: '+$0.05', time: 'Yesterday' },
    { type: 'yt', action: 'Watched YouTube video', detail: '"Solana 2025 Guide"', reward: '+0.001 SOL', time: '2 days ago' },
];

const activityList = document.getElementById('activity-list');
if (activityList) {
    ACTIVITIES.forEach(a => {
        activityList.innerHTML += `
            <div class="activity-item">
                <div class="activity-icon ${a.type}"><i class="${a.type === 'yt' ? 'fab fa-youtube' : a.type === 'ig' ? 'fab fa-instagram' : a.type === 'sub' ? 'fas fa-bell' : 'fas fa-wallet'}"></i></div>
                <div class="activity-info">
                    <span>${a.action}</span>
                    <small>${a.detail} · ${a.time}</small>
                </div>
                <span class="activity-reward">${a.reward}</span>
            </div>`;
    });
}

// Mini leaderboard
const LEADERS = [
    { name: 'Kwame G.', seed: 'Kwame', earned: '18.42 SOL' },
    { name: 'Priya S.', seed: 'Priya', earned: '14.88 SOL' },
    { name: 'Ahmed M.', seed: 'Ahmed', earned: '12.03 SOL' },
    { name: 'Maria L.', seed: 'Maria', earned: '9.71 SOL' },
    { name: 'Chen W.', seed: 'Chen', earned: '8.22 SOL' },
];

const miniLb = document.getElementById('mini-leaderboard');
if (miniLb) {
    LEADERS.forEach((l, i) => {
        miniLb.innerHTML += `
            <div class="mini-lb-row">
                <span class="mini-lb-rank">${i + 1}</span>
                <img src="https://api.dicebear.com/7.x/thumbs/svg?seed=${l.seed}" class="mini-lb-avatar" alt="">
                <span class="mini-lb-name">${l.name}</span>
                <span class="mini-lb-earned">${l.earned}</span>
            </div>`;
    });
}

// Available tasks
const TASKS = [
    { platform: 'youtube', type: 'Watch', title: 'Watch: "Crypto Trading 101"', desc: 'Watch at least 3 minutes of this educational video.', reward: '0.001 SOL' },
    { platform: 'youtube', type: 'Comment', title: 'Comment: "DeFi Explained"', desc: 'Leave a meaningful comment (10+ words).', reward: '0.002 SOL' },
    { platform: 'youtube', type: 'Like', title: 'Like: "Solana vs Ethereum"', desc: 'Like this comparison video.', reward: '0.0005 SOL' },
    { platform: 'youtube', type: 'Subscribe', title: 'Subscribe: CoinDesk', desc: 'Subscribe and earn upfront + monthly residual.', reward: '$0.05', residual: true },
    { platform: 'instagram', type: 'Like', title: 'Like: @cryptodaily post', desc: 'Like the latest post from @cryptodaily.', reward: '0.0005 SOL' },
    { platform: 'instagram', type: 'Follow', title: 'Follow: @solananews', desc: 'Follow and earn upfront + monthly residual.', reward: '$0.05', residual: true },
    { platform: 'youtube', type: 'Watch', title: 'Watch: "NFT Marketplace Tour"', desc: 'Watch the full 5-minute walkthrough.', reward: '0.001 SOL' },
    { platform: 'instagram', type: 'Like', title: 'Like: @web3daily post', desc: 'Like the pinned post from @web3daily.', reward: '0.0005 SOL' },
    { platform: 'youtube', type: 'Favorite', title: 'Favorite: "Top 5 Altcoins"', desc: 'Add this video to your favorites.', reward: '0.0005 SOL' },
];

const tasksGrid = document.getElementById('tasks-grid');
function renderTasks(filter) {
    if (!tasksGrid) return;
    tasksGrid.innerHTML = '';
    TASKS.filter(t => filter === 'all' || t.platform === filter).forEach(t => {
        tasksGrid.innerHTML += `
            <div class="task-card" data-platform="${t.platform}">
                <div class="task-card-header">
                    <div class="task-platform ${t.platform}"><i class="fab fa-${t.platform}"></i></div>
                    <div>
                        <div class="task-title">${t.title}</div>
                        <div class="task-type">${t.type}</div>
                    </div>
                </div>
                <div class="task-card-body">
                    <p>${t.desc}</p>
                    ${t.residual ? '<div class="task-residual-tag"><i class="fas fa-sync-alt"></i> + $0.01/month residual</div>' : ''}
                </div>
                <div class="task-card-footer">
                    <span class="task-reward-tag">${t.reward}</span>
                    <button class="task-action">Start Task</button>
                </div>
            </div>`;
    });
}
renderTasks('all');

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTasks(btn.dataset.filter);
    });
});

// Subscriptions & Follows
const SUBS = [
    { platform: 'yt', name: 'CoinDesk', type: 'Subscription', since: '2025-05-20', months: 2 },
    { platform: 'yt', name: 'Crypto Daily', type: 'Subscription', since: '2025-05-22', months: 2 },
    { platform: 'yt', name: 'Solana Labs', type: 'Subscription', since: '2025-04-10', months: 3 },
    { platform: 'yt', name: 'Coin Bureau', type: 'Subscription', since: '2025-06-01', months: 1 },
    { platform: 'ig', name: '@cryptodaily', type: 'Follow', since: '2025-05-15', months: 2 },
    { platform: 'ig', name: '@solananews', type: 'Follow', since: '2025-06-05', months: 1 },
    { platform: 'ig', name: '@web3daily', type: 'Follow', since: '2025-04-20', months: 3 },
    { platform: 'yt', name: 'Altcoin Daily', type: 'Subscription', since: '2025-03-15', months: 4 },
    { platform: 'yt', name: 'Digital Asset News', type: 'Subscription', since: '2025-06-10', months: 1 },
    { platform: 'ig', name: '@phantomwallet', type: 'Follow', since: '2025-05-01', months: 2 },
];

const subsList = document.getElementById('subs-list');
if (subsList) {
    SUBS.forEach(s => {
        const totalEarned = (0.05 + s.months * 0.01).toFixed(2);
        subsList.innerHTML += `
            <div class="sub-card">
                <div class="sub-platform ${s.platform}"><i class="fab fa-${s.platform === 'yt' ? 'youtube' : 'instagram'}"></i></div>
                <div class="sub-info">
                    <strong>${s.name}</strong>
                    <small>${s.type} · Since ${s.since}</small>
                </div>
                <div class="sub-meta">
                    <span class="sub-earning">$${totalEarned} earned</span>
                    <span class="sub-duration">${s.months} month${s.months > 1 ? 's' : ''} active</span>
                    <span class="sub-next-payout">Next: Jul 1, 2025</span>
                </div>
            </div>`;
    });
}

// Full leaderboard
const FULL_LB = [
    { rank: 1, name: 'Kwame G.', seed: 'Kwame', tasks: '4,821', earned: '18.42 SOL', prestige: 'diamond' },
    { rank: 2, name: 'Priya S.', seed: 'Priya', tasks: '3,947', earned: '14.88 SOL', prestige: 'platinum' },
    { rank: 3, name: 'Ahmed M.', seed: 'Ahmed', tasks: '3,512', earned: '12.03 SOL', prestige: 'gold' },
    { rank: 4, name: 'Maria L.', seed: 'Maria', tasks: '2,891', earned: '9.71 SOL', prestige: 'gold' },
    { rank: 5, name: 'Chen W.', seed: 'Chen', tasks: '2,445', earned: '8.22 SOL', prestige: 'silver' },
    { rank: 6, name: 'Fatima B.', seed: 'Fatima', tasks: '2,103', earned: '7.05 SOL', prestige: 'silver' },
    { rank: 7, name: 'Carlos R.', seed: 'Carlos', tasks: '1,876', earned: '6.31 SOL', prestige: 'silver' },
    { rank: 8, name: 'Aisha K.', seed: 'Aisha', tasks: '1,544', earned: '5.19 SOL', prestige: 'bronze' },
    { rank: 42, name: 'Demo User (You)', seed: 'Demo', tasks: '247', earned: '1.84 SOL', prestige: 'silver', you: true },
];

const fullLb = document.getElementById('full-leaderboard');
if (fullLb) {
    FULL_LB.forEach(l => {
        const p = PRESTIGE[l.prestige];
        fullLb.innerHTML += `
            <div class="lb-full-row ${l.you ? 'you' : ''}">
                <span class="mini-lb-rank">${l.rank}</span>
                <span class="lb-member"><img src="https://api.dicebear.com/7.x/thumbs/svg?seed=${l.seed}" class="lb-avatar" alt=""> ${l.name}</span>
                <span class="lb-tasks">${l.tasks}</span>
                <span class="lb-earned">${l.earned}</span>
                <span><span class="badge ${p.class}"><i class="${p.icon}"></i> ${p.label}</span></span>
            </div>`;
    });
}

// Payouts history
const PAYOUTS = [
    { date: 'Jun 19, 2025', tasks: 14, amount: '0.024 SOL' },
    { date: 'Jun 18, 2025', tasks: 11, amount: '0.019 SOL' },
    { date: 'Jun 17, 2025', tasks: 18, amount: '0.031 SOL' },
    { date: 'Jun 16, 2025', tasks: 9, amount: '0.015 SOL' },
    { date: 'Jun 15, 2025', tasks: 22, amount: '0.038 SOL' },
    { date: 'Jun 14, 2025', tasks: 16, amount: '0.027 SOL' },
    { date: 'Jun 13, 2025', tasks: 13, amount: '0.022 SOL' },
    { date: 'Jun 1, 2025', tasks: 0, amount: '$0.20', type: 'Residual payout' },
];

const payoutsList = document.getElementById('payouts-list');
if (payoutsList) {
    PAYOUTS.forEach(p => {
        payoutsList.innerHTML += `
            <div class="payout-row">
                <div class="payout-info">
                    <div class="payout-icon"><i class="fas fa-${p.type ? 'sync-alt' : 'wallet'}"></i></div>
                    <div>
                        <div class="payout-date">${p.date}</div>
                        <div class="payout-tasks">${p.type || p.tasks + ' tasks completed'}</div>
                    </div>
                </div>
                <span class="payout-amount">+${p.amount}</span>
            </div>`;
    });
}
