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
        if (tab === 'analytics' && typeof loadCreatorAnalytics === 'function') loadCreatorAnalytics();
    });
});

// Handle OAuth callback — auth server redirects here with ?auth= param
const urlParams = new URLSearchParams(window.location.search);
const authData = urlParams.get('auth');
if (authData) {
    try {
        const discordUser = JSON.parse(decodeURIComponent(authData));
        // Set defaults for Discord users
        discordUser.prestige = discordUser.prestige || 'starter';
        discordUser.tasksCompleted = discordUser.tasksCompleted || 0;
        discordUser.totalEarned = discordUser.totalEarned || 0;
        discordUser.activeSubscriptions = discordUser.activeSubscriptions || 0;
        discordUser.activeFollows = discordUser.activeFollows || 0;
        discordUser.authProvider = 'discord';
        // Save immediately to localStorage so dashboard loads
        localStorage.setItem('coindrop_user', JSON.stringify(discordUser));
        window.history.replaceState({}, '', 'dashboard.html');
    } catch (e) {
        console.error('Failed to parse auth data:', e);
    }
}

// Account linking is handled when user signs in with Google (see firebase-config.js)

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

    // Profile dropdown data
    const pdAvatar = document.getElementById('pd-avatar');
    if (pdAvatar) pdAvatar.src = user.avatar;
    const pdName = document.getElementById('pd-name');
    if (pdName) pdName.textContent = user.displayName;
    const pdUsername = document.getElementById('pd-username');
    if (pdUsername) pdUsername.textContent = `@${user.username || user.displayName}`;
    const pdBadge = document.getElementById('pd-badge');
    if (pdBadge) { pdBadge.innerHTML = `<i class="${p.icon}"></i> ${p.label}`; pdBadge.className = `badge ${p.class}`; }
    const pdEarned = document.getElementById('pd-earned');
    if (pdEarned) pdEarned.textContent = `${user.totalEarned} SOL`;
    const pdTasks = document.getElementById('pd-tasks');
    if (pdTasks) pdTasks.textContent = user.tasksCompleted;

    const taskBreakdown = JSON.parse(localStorage.getItem('coindrop_task_breakdown') || '{"views":0,"likes":0,"comments":0,"subs":0}');
    const pdViews = document.getElementById('pd-views');
    if (pdViews) pdViews.textContent = taskBreakdown.views;
    const pdLikes = document.getElementById('pd-likes');
    if (pdLikes) pdLikes.textContent = taskBreakdown.likes;
    const pdComments = document.getElementById('pd-comments');
    if (pdComments) pdComments.textContent = taskBreakdown.comments;
    const pdSubs = document.getElementById('pd-subs');
    if (pdSubs) pdSubs.textContent = (user.activeSubscriptions || 0) + (user.activeFollows || 0);

    // Prestige progress
    const prestigeOrder = ['starter','bronze','silver','gold','platinum','diamond'];
    const currentIdx = prestigeOrder.indexOf(user.prestige || 'starter');
    const progressPct = Math.round(((currentIdx + 1) / prestigeOrder.length) * 100);
    const pdProgress = document.getElementById('pd-progress');
    if (pdProgress) pdProgress.style.width = progressPct + '%';
    document.querySelectorAll('.pd-rank').forEach((el, i) => {
        if (i <= currentIdx) el.classList.add('active');
    });
}

// Profile dropdown toggle
function toggleProfileDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('profile-dropdown');
    const menu = document.getElementById('user-menu-toggle');
    dropdown.classList.toggle('hidden');
    menu.classList.toggle('open');
}

function closeProfileDropdown() {
    document.getElementById('profile-dropdown')?.classList.add('hidden');
    document.getElementById('user-menu-toggle')?.classList.remove('open');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && !dropdown.contains(e.target) && !document.getElementById('user-menu-toggle')?.contains(e.target)) {
        closeProfileDropdown();
    }
});

async function handleLogout() {
    localStorage.removeItem('coindrop_user');
    if (typeof auth !== 'undefined') {
        try { await auth.signOut(); } catch(e) {}
    }
    window.location.href = 'index.html';
}

function switchTab(tabName) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`[data-tab="${tabName}"]`);
    if (link) link.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
    if (tabName === 'analytics' && typeof loadCreatorAnalytics === 'function') loadCreatorAnalytics();
}

// Recent activity
const ACTIVITIES = [
    { type: 'yt', action: 'Watched YouTube video', detail: '"Top 10 Crypto Tips"', reward: '+0.001 SOL', time: '5 min ago' },
    { type: 'ig', action: 'Liked Instagram post', detail: '@cryptotrader', reward: '+0.0005 SOL', time: '12 min ago' },
    { type: 'sub', action: 'Subscribed to channel', detail: 'CoinDesk', reward: '+$0.05', time: '1 hr ago' },
    { type: 'yt', action: 'Left a comment', detail: '"Great video, thanks!"', reward: '+0.002 SOL', time: '2 hrs ago' },
    { type: 'payout', action: 'Daily payout received', detail: '14 tasks completed', reward: '+0.008 SOL', time: 'Yesterday' },
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
    { name: 'Kwame G.', seed: 'Kwame', earned: '2.84 SOL' },
    { name: 'Priya S.', seed: 'Priya', earned: '2.31 SOL' },
    { name: 'Ahmed M.', seed: 'Ahmed', earned: '1.97 SOL' },
    { name: 'Maria L.', seed: 'Maria', earned: '1.58 SOL' },
    { name: 'Chen W.', seed: 'Chen', earned: '1.22 SOL' },
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

// CREATORS array is loaded from creators-data.js (included before this file)

// 24h cooldown tracking — uses cached cooldowns from Firebase
let _cooldownCache = {};

async function loadCooldowns() {
    if (typeof CoinDropDB !== 'undefined' && user && user.id) {
        _cooldownCache = await CoinDropDB.getCooldowns(user.id);
    }
}

function isOnCooldown(videoId, taskType) {
    const key = `${videoId}_${taskType}`;
    const last = _cooldownCache[key];
    if (!last) return false;
    const lastTime = last.toMillis ? last.toMillis() : (last.seconds ? last.seconds * 1000 : last);
    return (Date.now() - lastTime) < 24 * 60 * 60 * 1000;
}

function cooldownRemaining(videoId, taskType) {
    const key = `${videoId}_${taskType}`;
    const last = _cooldownCache[key];
    if (!last) return '';
    const lastTime = last.toMillis ? last.toMillis() : (last.seconds ? last.seconds * 1000 : last);
    const remaining = (24 * 60 * 60 * 1000) - (Date.now() - lastTime);
    if (remaining <= 0) return '';
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return `${h}h ${m}m`;
}

// Load Firebase stats into dashboard on page load
async function syncFromFirebase() {
    if (typeof CoinDropDB === 'undefined' || !user || !user.id) return;
    try {
        const stats = await CoinDropDB.getTaskBreakdown(user.id);
        if (stats.tasksCompleted > 0 || stats.totalEarned > 0) {
            user.tasksCompleted = stats.tasksCompleted || 0;
            user.totalEarned = stats.totalEarned || 0;
            user.activeSubscriptions = stats.subs || 0;
            document.getElementById('total-earned').textContent = `${user.totalEarned.toFixed(4)} SOL`;
            document.getElementById('tasks-done').textContent = user.tasksCompleted;
            document.getElementById('active-subs').textContent = user.activeSubscriptions;
            if (document.getElementById('pd-earned')) document.getElementById('pd-earned').textContent = `${user.totalEarned.toFixed(4)} SOL`;
            if (document.getElementById('pd-tasks')) document.getElementById('pd-tasks').textContent = user.tasksCompleted;
            if (document.getElementById('pd-views')) document.getElementById('pd-views').textContent = stats.views || 0;
            if (document.getElementById('pd-likes')) document.getElementById('pd-likes').textContent = stats.likes || 0;
            if (document.getElementById('pd-comments')) document.getElementById('pd-comments').textContent = stats.comments || 0;
            if (document.getElementById('pd-subs')) document.getElementById('pd-subs').textContent = stats.subs || 0;
            localStorage.setItem('coindrop_user', JSON.stringify(user));
        }
        await loadCooldowns();
    } catch (e) { console.error('Firebase sync error:', e); }
}

syncFromFirebase();

const creatorsContainer = document.getElementById('creators-list');

function renderCreators(filter) {
    if (!creatorsContainer) return;
    creatorsContainer.innerHTML = '';

    const filtered = filter === 'all' ? CREATORS : CREATORS.filter(c => c.id === filter);

    filtered.forEach(creator => {
        const safeCreatorName = creator.name.replace(/'/g, "\\'");
        const videoCards = creator.videos.map(v => {
            const watchUrl = v.short
                ? `https://www.youtube.com/shorts/${v.id}`
                : `https://www.youtube.com/watch?v=${v.id}`;
            const thumbUrl = v.short
                ? `https://img.youtube.com/vi/${v.id}/oar2.jpg`
                : `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;
            const badge = v.short ? '<span class="short-badge">SHORT</span>' : '';
            const safeTitle = v.title.replace(/'/g, "\\'").replace(/`/g, '');
            const watchCd = isOnCooldown(v.id, 'watch');
            const likeCd = isOnCooldown(v.id, 'like');
            const commentCd = isOnCooldown(v.id, 'comment');
            const watchCdText = watchCd ? cooldownRemaining(v.id, 'watch') : '';
            const likeCdText = likeCd ? cooldownRemaining(v.id, 'like') : '';
            const commentCdText = commentCd ? cooldownRemaining(v.id, 'comment') : '';
            return `
            <div class="video-task-card ${v.short ? 'is-short' : ''}">
                <a href="${watchUrl}" target="_blank" class="video-thumb ${v.short ? 'video-thumb-short' : ''}">
                    <img src="${thumbUrl}" alt="${v.title}" class="video-thumb-img" onerror="this.src='https://img.youtube.com/vi/${v.id}/hqdefault.jpg'">
                    ${badge}
                </a>
                <div class="video-task-info">
                    <div class="video-task-title">${v.title}</div>
                    <div class="video-task-meta">${v.views} views</div>
                </div>
                <div class="video-task-actions">
                    <div class="vta-row">
                        <span class="vta-label"><i class="fas fa-play"></i> Watch</span>
                        <span class="vta-reward">0.001 SOL</span>
                        ${watchCd
                            ? `<span class="task-cooldown"><i class="fas fa-clock"></i> ${watchCdText}</span>`
                            : `<button class="task-action-sm" onclick="openTaskModal('${v.id}','${safeTitle}','${safeCreatorName}','watch','${creator.platform}',${!!v.short})">Go</button>`
                        }
                    </div>
                    <div class="vta-row">
                        <span class="vta-label"><i class="fas fa-thumbs-up"></i> Like</span>
                        <span class="vta-reward">0.0005 SOL</span>
                        ${likeCd
                            ? `<span class="task-cooldown"><i class="fas fa-clock"></i> ${likeCdText}</span>`
                            : `<button class="task-action-sm" onclick="openTaskModal('${v.id}','${safeTitle}','${safeCreatorName}','like','${creator.platform}',${!!v.short})">Go</button>`
                        }
                    </div>
                    <div class="vta-row">
                        <span class="vta-label"><i class="fas fa-comment"></i> Comment</span>
                        <span class="vta-reward">$0.02</span>
                        ${commentCd
                            ? `<span class="task-cooldown"><i class="fas fa-clock"></i> ${commentCdText}</span>`
                            : `<button class="task-action-sm" onclick="openTaskModal('${v.id}','${safeTitle}','${safeCreatorName}','comment','${creator.platform}',${!!v.short})">Go</button>`
                        }
                    </div>
                </div>
            </div>
        `;}).join('');

        creatorsContainer.innerHTML += `
            <div class="creator-section" data-creator="${creator.id}">
                <div class="creator-header">
                    <div class="creator-profile">
                        <img src="${creator.avatar}" alt="${creator.name}" class="creator-avatar">
                        <div class="creator-info">
                            <div class="creator-name-row">
                                <h3>${creator.name}</h3>
                                <span class="creator-handle">${creator.handle}</span>
                                <span class="creator-category-tag">${creator.category}</span>
                            </div>
                            <p class="creator-about">${creator.about}</p>
                            <div class="creator-stats-row">
                                <span><i class="fab fa-youtube"></i> ${creator.subscribers} subscribers</span>
                                <span><i class="fas fa-video"></i> ${creator.videos.length} videos</span>
                                <span class="creator-platform-tag"><i class="fab fa-${creator.platform}"></i> ${creator.platform === 'youtube' ? 'YouTube' : 'Instagram'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="creator-subscribe-action">
                        <a href="${creator.channelUrl}" target="_blank" class="btn-visit"><i class="fas fa-external-link-alt"></i> Visit Channel</a>
                        ${_subscribedCreators.has(creator.id)
                            ? `<button class="task-action subscribe-btn disabled"><i class="fas fa-check"></i> Subscribed</button>`
                            : `<button class="task-action subscribe-btn" onclick="openTaskModal('${creator.id}','${safeCreatorName} Channel','${safeCreatorName}','subscribe','${creator.platform}',false)"><i class="fas fa-bell"></i> Subscribe — $0.05 + $0.01/mo</button>`
                        }
                    </div>
                </div>
                <div class="creator-videos-grid">
                    ${videoCards}
                </div>
            </div>
        `;
    });
}

// Build filter buttons dynamically from CREATORS
const filtersContainer = document.getElementById('creator-filters');
if (filtersContainer) {
    filtersContainer.innerHTML = '<button class="filter-btn active" data-filter="all">All Creators</button>' +
        CREATORS.map(c => `<button class="filter-btn" data-filter="${c.id}"><i class="fab fa-youtube"></i> ${c.handle}</button>`).join('');
}

renderCreators('all');

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCreators(btn.dataset.filter);
    });
});

// ===== Earnings Potential Banner (live calculated from CREATORS) =====
function updateEarningsBanner() {
    let totalVideos = 0;
    let totalCreators = CREATORS.length;
    CREATORS.forEach(c => totalVideos += c.videos.length);

    const dailyWatchSOL = totalVideos * 0.001;
    const dailyLikeSOL = totalVideos * 0.0005;
    const dailyCommentUSD = totalVideos * 0.02;
    const dailyTotalSOL = dailyWatchSOL + dailyLikeSOL;
    const subOnetimeUSD = totalCreators * 0.05;
    const monthlyResidualUSD = totalCreators * 0.01;

    const ebDaily = document.getElementById('eb-daily');
    const ebSub = document.getElementById('eb-sub-onetime');
    const ebResidual = document.getElementById('eb-residual');
    const ebNetwork = document.getElementById('eb-network');

    if (ebDaily) ebDaily.textContent = `${dailyTotalSOL.toFixed(4)} SOL + $${dailyCommentUSD.toFixed(2)}`;
    if (ebSub) ebSub.textContent = `$${subOnetimeUSD.toFixed(2)}`;
    if (ebResidual) ebResidual.textContent = `$${monthlyResidualUSD.toFixed(2)}/mo`;
    if (ebNetwork) ebNetwork.textContent = `${totalCreators} creators · ${totalVideos} videos`;
}
updateEarningsBanner();

// ===== Subscriptions & Cooldowns (Firebase-powered) =====
async function loadSubsAndCooldowns() {
    const subsList = document.getElementById('subs-list');
    const cooldownsList = document.getElementById('cooldowns-list');
    if (!subsList || typeof CoinDropDB === 'undefined' || !user || !user.id) return;

    // Load real subscriptions from Firebase
    try {
        const subs = await CoinDropDB.getSubscriptions(user.id);
        const noSubsMsg = document.getElementById('no-subs-msg');
        if (subs.length > 0) {
            if (noSubsMsg) noSubsMsg.style.display = 'none';
            subsList.innerHTML = subs.map(s => {
                const startDate = s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate);
                const months = Math.max(1, Math.floor((Date.now() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
                const totalEarned = (0.05 + months * 0.01).toFixed(2);
                return `<div class="sub-card">
                    <div class="sub-platform yt"><i class="fab fa-youtube"></i></div>
                    <div class="sub-info">
                        <strong>${s.creatorName || 'Unknown'}</strong>
                        <small>Subscribed · Since ${startDate.toLocaleDateString()}</small>
                    </div>
                    <div class="sub-meta">
                        <span class="sub-earning">$${totalEarned} earned</span>
                        <span class="sub-duration">${months} month${months > 1 ? 's' : ''} active</span>
                        <span class="sub-next-payout">$0.01/mo residual</span>
                    </div>
                </div>`;
            }).join('');
        }
    } catch(e) { console.error('Load subs error:', e); }

    // Load cooldowns and show active ones
    if (cooldownsList) {
        try {
            const cd = _cooldownCache;
            const activeItems = [];
            for (const [key, val] of Object.entries(cd)) {
                const lastTime = val.toMillis ? val.toMillis() : (val.seconds ? val.seconds * 1000 : val);
                const remaining = (24 * 60 * 60 * 1000) - (Date.now() - lastTime);
                if (remaining > 0) {
                    const [videoId, taskType] = key.split('_');
                    const h = Math.floor(remaining / 3600000);
                    const m = Math.floor((remaining % 3600000) / 60000);
                    let videoTitle = videoId;
                    CREATORS.forEach(c => c.videos.forEach(v => { if (v.id === videoId) videoTitle = v.title; }));
                    activeItems.push(`<div class="sub-card">
                        <div class="sub-platform yt"><i class="fas fa-${taskType === 'watch' ? 'play' : taskType === 'like' ? 'thumbs-up' : taskType === 'comment' ? 'comment' : 'bell'}"></i></div>
                        <div class="sub-info">
                            <strong>${videoTitle.substring(0, 50)}${videoTitle.length > 50 ? '...' : ''}</strong>
                            <small>${taskType} · Completed today</small>
                        </div>
                        <div class="sub-meta">
                            <span class="sub-next-payout"><i class="fas fa-clock"></i> Resets in ${h}h ${m}m</span>
                        </div>
                    </div>`);
                }
            }
            const nocdMsg = document.getElementById('no-cooldowns-msg');
            if (activeItems.length > 0) {
                if (nocdMsg) nocdMsg.style.display = 'none';
                cooldownsList.innerHTML = activeItems.join('');
            }
        } catch(e) { console.error('Load cooldowns error:', e); }
    }
}

// Track which creators user has subscribed to (for greying out)
let _subscribedCreators = new Set();
async function loadSubscribedCreators() {
    if (typeof CoinDropDB === 'undefined' || !user || !user.id) return;
    try {
        const subs = await CoinDropDB.getSubscriptions(user.id);
        subs.forEach(s => { if (s.creatorId) _subscribedCreators.add(s.creatorId); });
    } catch(e) {}
}

// Run after Firebase sync
setTimeout(async () => {
    await loadSubscribedCreators();
    await loadSubsAndCooldowns();
    renderCreators('all');
}, 1500);

// Full leaderboard
const FULL_LB = [
    { rank: 1, name: 'Kwame G.', seed: 'Kwame', tasks: '1,847', earned: '2.84 SOL', prestige: 'gold' },
    { rank: 2, name: 'Priya S.', seed: 'Priya', tasks: '1,520', earned: '2.31 SOL', prestige: 'gold' },
    { rank: 3, name: 'Ahmed M.', seed: 'Ahmed', tasks: '1,312', earned: '1.97 SOL', prestige: 'silver' },
    { rank: 4, name: 'Maria L.', seed: 'Maria', tasks: '1,045', earned: '1.58 SOL', prestige: 'silver' },
    { rank: 5, name: 'Chen W.', seed: 'Chen', tasks: '814', earned: '1.22 SOL', prestige: 'silver' },
    { rank: 6, name: 'Fatima B.', seed: 'Fatima', tasks: '692', earned: '0.98 SOL', prestige: 'bronze' },
    { rank: 7, name: 'Carlos R.', seed: 'Carlos', tasks: '581', earned: '0.84 SOL', prestige: 'bronze' },
    { rank: 8, name: 'Aisha K.', seed: 'Aisha', tasks: '443', earned: '0.61 SOL', prestige: 'bronze' },
    { rank: 42, name: 'Demo User (You)', seed: 'Demo', tasks: '247', earned: '0.34 SOL', prestige: 'starter', you: true },
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
    { date: 'Jun 19, 2025', tasks: 14, amount: '0.008 SOL' },
    { date: 'Jun 18, 2025', tasks: 11, amount: '0.006 SOL' },
    { date: 'Jun 17, 2025', tasks: 18, amount: '0.012 SOL' },
    { date: 'Jun 16, 2025', tasks: 9, amount: '0.005 SOL' },
    { date: 'Jun 15, 2025', tasks: 22, amount: '0.014 SOL' },
    { date: 'Jun 14, 2025', tasks: 16, amount: '0.009 SOL' },
    { date: 'Jun 13, 2025', tasks: 13, amount: '0.007 SOL' },
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
