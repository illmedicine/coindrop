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
        if (tab === 'admin-payouts' && typeof loadUnpaidTasks === 'function') loadUnpaidTasks();
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

// Early declarations needed by renderCreators
var _subscribedCreators = new Set();
var _cooldownCache = {};

// ===== Wallet Management =====
function openWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const input = document.getElementById('wallet-input');
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (user.walletAddress) {
        input.value = user.walletAddress;
        setTimeout(validateWalletInput, 100);
    }
    input.removeEventListener('input', validateWalletInput);
    input.addEventListener('input', validateWalletInput);
}

function closeWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.classList.add('hidden');
}

function validateWalletInput() {
    const input = document.getElementById('wallet-input');
    const status = document.getElementById('wallet-input-status');
    const feedback = document.getElementById('wallet-input-feedback');
    const btn = document.getElementById('save-wallet-btn');
    const val = input.value.trim();

    if (!val) {
        status.textContent = '';
        feedback.textContent = '';
        input.classList.remove('is-valid', 'is-invalid');
        btn.disabled = true;
        return;
    }

    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val)) {
        status.innerHTML = '<i class="fas fa-check-circle"></i>';
        status.className = 'input-status valid';
        feedback.textContent = 'Valid Solana address';
        feedback.style.color = 'var(--success)';
        input.classList.add('is-valid');
        input.classList.remove('is-invalid');
        btn.disabled = false;
    } else {
        status.innerHTML = '<i class="fas fa-times-circle"></i>';
        status.className = 'input-status invalid';
        feedback.textContent = 'Invalid Solana address format';
        feedback.style.color = 'var(--danger)';
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        btn.disabled = true;
    }
}

async function saveWalletAddress() {
    const input = document.getElementById('wallet-input');
    const btn = document.getElementById('save-wallet-btn');
    const resultEl = document.getElementById('wallet-save-result');
    const address = input.value.trim();

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        resultEl.innerHTML = '<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Invalid Solana address.</span>';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    // Update localStorage
    const userData = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    userData.walletAddress = address;
    localStorage.setItem('coindrop_user', JSON.stringify(userData));

    // Save to Firebase
    if (typeof CoinDropDB !== 'undefined' && userData.id) {
        try {
            await CoinDropDB.saveUser(userData.id, { walletAddress: address });
        } catch(e) { console.warn('Wallet Firebase save skipped:', e.message); }
    }

    // Update UI
    updateWalletUI(address);
    const banner = document.getElementById('wallet-required-banner');
    if (banner) banner.classList.add('hidden');

    resultEl.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Wallet connected! You can now earn SOL.</span>';
    btn.innerHTML = '<i class="fas fa-check"></i> Saved!';

    setTimeout(() => {
        closeWalletModal();
        btn.innerHTML = '<i class="fas fa-check"></i> Save Wallet Address';
        btn.disabled = false;
        resultEl.innerHTML = '';
    }, 1500);
}

function updateWalletUI(address) {
    const statusEl = document.getElementById('pd-wallet-status');
    const btnText = document.getElementById('pd-wallet-btn-text');
    if (address) {
        const short = address.substring(0, 4) + '...' + address.substring(address.length - 4);
        if (statusEl) {
            statusEl.className = 'pd-wallet-status is-set';
            statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Wallet: <span class="pd-wallet-addr">${short}</span>`;
        }
        if (btnText) btnText.textContent = 'Change Wallet';
    } else {
        if (statusEl) {
            statusEl.className = 'pd-wallet-status not-set';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No wallet connected';
        }
        if (btnText) btnText.textContent = 'Set Up Phantom Wallet';
    }
}

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

function renderBadgePills(badges) {
    if (!badges || !badges.length) return '';
    return badges.map(b =>
        `<span class="prestige-pill prestige-${b.id}" style="--pill-color:${b.color};--pill-bg:${b.bg}"><i class="${b.icon}"></i> ${b.label}</span>`
    ).join(' ');
}

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

    // Wallet UI — show banner if no wallet, never auto-open modal
    updateWalletUI(user.walletAddress || '');
    if (!user.walletAddress) {
        const banner = document.getElementById('wallet-required-banner');
        if (banner) banner.classList.remove('hidden');
    } else {
        const banner = document.getElementById('wallet-required-banner');
        if (banner) banner.classList.add('hidden');
    }
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
    if (tabName === 'admin-payouts' && typeof loadUnpaidTasks === 'function') loadUnpaidTasks();
}

// Recent activity — from Firebase
function timeAgo(date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return date.toLocaleDateString();
}

async function loadRecentActivity() {
    const el = document.getElementById('activity-list');
    if (!el) return;
    const tasks = window._serverTasks || [];
    if (!tasks.length) { el.innerHTML = '<p class="text-muted" style="font-size:0.85rem">Complete tasks to see your activity.</p>'; return; }
    const icons = { watch: 'yt', like: 'yt', comment: 'yt', subscribe: 'sub', follow: 'ig' };
    const cls = { yt: 'fab fa-youtube', ig: 'fab fa-instagram', sub: 'fas fa-bell' };
    const labels = { watch: 'Watched video', like: 'Liked video', comment: 'Left a comment', subscribe: 'Subscribed', follow: 'Followed' };
    el.innerHTML = tasks.slice(0, 10).map(t => {
        const type = icons[t.taskType] || 'yt';
        const ts = t.timestamp ? new Date(t.timestamp) : new Date();
        return `<div class="activity-item">
            <div class="activity-icon ${type}"><i class="${cls[type]}"></i></div>
            <div class="activity-info"><span>${labels[t.taskType] || t.taskType}</span><small>${(t.videoTitle||'').substring(0,35)} · ${timeAgo(ts)}</small></div>
            <span class="activity-reward">+$${(t.rewardUSD || 0.01).toFixed(3)}</span>
        </div>`;
    }).join('');
}

// Mini leaderboard — from Firebase (global top earners)
async function loadMiniLeaderboard() {
    const el = document.getElementById('mini-leaderboard');
    if (!el) return;
    try {
        const resp = await fetch(`${API_URL}/api/leaderboard`);
        const data = await resp.json();
        const leaders = data.leaders || [];
        if (!leaders.length) { el.innerHTML = '<p class="text-muted" style="font-size:0.85rem">No earners yet. Be the first!</p>'; return; }
        el.innerHTML = leaders.slice(0, 5).map((l, i) => `<div class="mini-lb-row">
            <span class="mini-lb-rank">${i+1}</span>
            <img src="${l.avatar || 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + l.userId}" class="mini-lb-avatar" alt="">
            <span class="mini-lb-name">${l.name}</span>
            <span class="mini-lb-earned">$${(l.totalEarnedUSD||l.totalEarned||0).toFixed(2)}</span>
        </div>`).join('');
    } catch(e) { el.innerHTML = '<p class="text-muted" style="font-size:0.85rem">No earners yet. Be the first!</p>'; }
}

// Activity and leaderboard loaded after syncFromServer completes

// CREATORS array is loaded from creators-data.js (included before this file)

// 24h cooldown tracking — uses cached cooldowns from Firebase
// _cooldownCache declared at top of file

// Cooldowns loaded from server in syncFromServer()

function isOnCooldown(videoId, taskType) {
    const key = `${videoId}_${taskType}`;
    const last = _cooldownCache[key];
    if (!last) return false;
    const lastTime = typeof last === 'number' ? last : (last.toMillis ? last.toMillis() : (last.seconds ? last.seconds * 1000 : last));
    return (Date.now() - lastTime) < 24 * 60 * 60 * 1000;
}

function cooldownRemaining(videoId, taskType) {
    const key = `${videoId}_${taskType}`;
    const last = _cooldownCache[key];
    if (!last) return '';
    const lastTime = typeof last === 'number' ? last : (last.toMillis ? last.toMillis() : (last.seconds ? last.seconds * 1000 : last));
    const remaining = (24 * 60 * 60 * 1000) - (Date.now() - lastTime);
    if (remaining <= 0) return '';
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return `${h}h ${m}m`;
}

// Load stats from server API (works for ALL auth types)
const API_URL = 'https://coindrop-auth.up.railway.app';

async function syncFromServer() {
    if (!user || !user.id) return;
    try {
        // Restore wallet from server profile if not in localStorage
        if (!user.walletAddress) {
            try {
                const profileResp = await fetch(`${API_URL}/api/user-profile/${user.id}`);
                const profileData = await profileResp.json();
                if (profileData.profile && profileData.profile.walletAddress) {
                    user.walletAddress = profileData.profile.walletAddress;
                    localStorage.setItem('coindrop_user', JSON.stringify(user));
                    updateWalletUI(user.walletAddress);
                    const banner = document.getElementById('wallet-required-banner');
                    if (banner) banner.classList.add('hidden');
                }
            } catch(e) {}
        }

        const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : '';
        const resp = await fetch(`${API_URL}/api/user-stats/${user.id}${emailParam}`);
        const data = await resp.json();
        const stats = data.stats || {};

        user.tasksCompleted = stats.tasksCompleted || 0;
        user.totalEarned = stats.totalEarned || 0;
        user.activeSubscriptions = stats.subs || 0;
        user.activeFollows = 0;

        // Update overview cards
        document.getElementById('total-earned').textContent = `$${user.totalEarned.toFixed(3)}`;
        document.getElementById('tasks-done').textContent = user.tasksCompleted;
        document.getElementById('active-subs').textContent = user.activeSubscriptions;
        document.getElementById('active-follows').textContent = '0';

        // Update profile dropdown
        if (document.getElementById('pd-earned')) document.getElementById('pd-earned').textContent = `$${user.totalEarned.toFixed(3)}`;
        if (document.getElementById('pd-tasks')) document.getElementById('pd-tasks').textContent = user.tasksCompleted;
        if (document.getElementById('pd-views')) document.getElementById('pd-views').textContent = stats.views || 0;
        if (document.getElementById('pd-likes')) document.getElementById('pd-likes').textContent = stats.likes || 0;
        if (document.getElementById('pd-comments')) document.getElementById('pd-comments').textContent = stats.comments || 0;
        if (document.getElementById('pd-subs')) document.getElementById('pd-subs').textContent = stats.subs || 0;

        // Update residual income card
        const subs = stats.subs || 0;
        const residualAmt = (subs * 0.01).toFixed(2);
        if (document.getElementById('residual-total')) document.getElementById('residual-total').textContent = `$${residualAmt}`;
        if (document.getElementById('residual-breakdown-text')) document.getElementById('residual-breakdown-text').textContent = `${subs} subscription${subs !== 1 ? 's' : ''} × $0.01/mo`;
        if (document.getElementById('residual-subs-count')) document.getElementById('residual-subs-count').textContent = `${subs} active`;
        if (document.getElementById('residual-subs-amount')) document.getElementById('residual-subs-amount').textContent = `$${residualAmt}/mo`;
        if (document.getElementById('next-residual-date')) {
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            document.getElementById('next-residual-date').textContent = nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }

        localStorage.setItem('coindrop_user', JSON.stringify(user));

        // Display prestige badges
        const userBadges = data.badges || [];
        const badgeContainer = document.getElementById('user-badges-row');
        if (badgeContainer) badgeContainer.innerHTML = renderBadgePills(userBadges);
        const pdBadgeContainer = document.getElementById('pd-badges-row');
        if (pdBadgeContainer) pdBadgeContainer.innerHTML = renderBadgePills(userBadges);
        window._userBadges = userBadges;

        // Load cooldowns from server
        _cooldownCache = {};
        if (data.cooldowns) {
            for (const [key, ms] of Object.entries(data.cooldowns)) {
                _cooldownCache[key] = ms;
            }
        }

        // Cache server tasks for activity/payouts
        window._serverTasks = data.tasks || [];

        // Refresh all sections with fresh data
        loadRecentActivity();
        loadMiniLeaderboard();
        loadPayoutsHistory();
        loadSubsAndCooldowns();
        if (typeof loadEarningsSummary === 'function') loadEarningsSummary();
        // Re-render creators to reflect cooldowns/subscribed state
        const activeFilter = document.querySelector('.filter-btn.active');
        renderCreators(activeFilter ? activeFilter.dataset.filter : 'all');
    } catch (e) { console.error('Server sync error:', e); }
}

syncFromServer();

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
                ? `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`
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
                        <span class="vta-reward">$0.01</span>
                        ${watchCd
                            ? `<span class="task-cooldown"><i class="fas fa-clock"></i> ${watchCdText}</span>`
                            : `<button class="task-action-sm" onclick="openTaskModal('${v.id}','${safeTitle}','${safeCreatorName}','watch','${creator.platform}',${!!v.short})">Go</button>`
                        }
                    </div>
                    <div class="vta-row">
                        <span class="vta-label"><i class="fas fa-thumbs-up"></i> Like</span>
                        <span class="vta-reward">$0.005</span>
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

// ===== Earnings Potential Banner (server-side, highest value persists) =====
async function updateEarningsBanner() {
    const ebDaily = document.getElementById('eb-daily');
    const ebSub = document.getElementById('eb-sub-onetime');
    const ebResidual = document.getElementById('eb-residual');
    const ebNetwork = document.getElementById('eb-network');

    function applyData(data) {
        if (ebDaily) ebDaily.textContent = `$${data.daily.toFixed(2)} USD`;
        if (ebSub) ebSub.textContent = `$${data.sub.toFixed(2)}`;
        if (ebResidual) ebResidual.textContent = `$${data.residual.toFixed(2)}/mo`;
        if (ebNetwork) ebNetwork.textContent = data.network;
    }

    // First: fetch server-cached value for instant display
    try {
        const res = await fetch('https://coindrop-auth.up.railway.app/api/earnings-potential');
        const data = await res.json();
        applyData(data);
    } catch (e) {}

    // Then: if CREATORS loaded, report actual counts to server (updates highest value)
    if (typeof CREATORS !== 'undefined' && CREATORS.length > 0) {
        let totalVideos = 0;
        CREATORS.forEach(c => totalVideos += c.videos.length);
        try {
            const res = await fetch('https://coindrop-auth.up.railway.app/api/earnings-potential/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalVideos, totalCreators: CREATORS.length }),
            });
            const data = await res.json();
            applyData(data);
        } catch (e) {}
    }
}
updateEarningsBanner();
setTimeout(updateEarningsBanner, 3000);

// ===== Subscriptions & Cooldowns (server-driven) =====
async function loadSubsAndCooldowns() {
    const subsList = document.getElementById('subs-list');
    const cooldownsList = document.getElementById('cooldowns-list');

    // Fetch subscriptions from server (deduplicated, with 30-day countdown)
    if (subsList && user) {
        try {
            const resp = await fetch(`${API_URL}/api/user-subscriptions/${user.id}`);
            const data = await resp.json();
            const subs = data.subscriptions || [];
            const noSubsMsg = document.getElementById('no-subs-msg');
            if (subs.length > 0) {
                if (noSubsMsg) noSubsMsg.style.display = 'none';
                subs.forEach(s => {
                    CREATORS.forEach(c => { if (c.name === s.creatorName) _subscribedCreators.add(c.id); });
                });
                subsList.innerHTML = subs.map(s => {
                    const subDate = new Date(s.subscribedAt);
                    const paidLabel = s.paid ? '<i class="fas fa-check-circle" style="color:#22c55e"></i> $0.05 paid' : '<i class="fas fa-clock" style="color:var(--orange)"></i> $0.05 pending';
                    let residualLabel;
                    if (s.residualDue) {
                        residualLabel = '<span style="color:#22c55e;"><i class="fas fa-coins"></i> Residual due ($0.01)</span>';
                    } else {
                        const d = s.daysUntilResidual;
                        const h = Math.floor((d % 1) * 24);
                        residualLabel = `<i class="fas fa-hourglass-half"></i> Residual in ${d}d`;
                    }
                    return `<div class="sub-card">
                        <div class="sub-platform yt"><i class="fab fa-youtube"></i></div>
                        <div class="sub-info">
                            <strong>${s.creatorName}</strong>
                            <small>Subscribed ${subDate.toLocaleDateString()}</small>
                        </div>
                        <div class="sub-meta">
                            <span class="sub-earning">${paidLabel}</span>
                            <span class="sub-next-payout">${residualLabel}</span>
                        </div>
                    </div>`;
                }).join('');
            }
        } catch(e) { console.warn('Subs fetch error:', e.message); }
    }

    // Show active cooldowns from _cooldownCache
    if (cooldownsList) {
        const cd = _cooldownCache;
        const activeItems = [];
        for (const [key, val] of Object.entries(cd)) {
            const lastTime = typeof val === 'number' ? val : new Date(val).getTime();
            const remaining = (24 * 60 * 60 * 1000) - (Date.now() - lastTime);
            if (remaining > 0) {
                const parts = key.split('_');
                const taskType = parts.pop();
                const creatorOrVideoId = parts.join('_');
                const h = Math.floor(remaining / 3600000);
                const m = Math.floor((remaining % 3600000) / 60000);
                let label = creatorOrVideoId;
                CREATORS.forEach(c => { if (c.id === creatorOrVideoId) label = c.name; c.videos.forEach(v => { if (v.id === creatorOrVideoId) label = v.title; }); });
                activeItems.push(`<div class="sub-card">
                    <div class="sub-platform yt"><i class="fas fa-${taskType === 'watch' ? 'play' : taskType === 'like' ? 'thumbs-up' : taskType === 'comment' ? 'comment' : 'bell'}"></i></div>
                    <div class="sub-info">
                        <strong>${label.substring(0, 50)}</strong>
                        <small>${taskType} · Completed</small>
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
    }
}

// Subs/cooldowns loaded after syncFromServer via the sync chain

// Full leaderboard — from Firebase
async function loadFullLeaderboard() {
    const el = document.getElementById('full-leaderboard');
    if (!el) return;
    try {
        const resp = await fetch(`${API_URL}/api/leaderboard`);
        const data = await resp.json();
        const leaders = data.leaders || [];
        if (!leaders.length) { el.innerHTML = '<p class="text-muted" style="padding:20px;text-align:center">No earners yet. Complete tasks to appear on the leaderboard!</p>'; return; }
        el.innerHTML = leaders.map((l, i) => {
            const tc = l.tasksCompleted || 0;
            let prestige = 'starter';
            if (tc >= 500) prestige = 'diamond';
            else if (tc >= 300) prestige = 'platinum';
            else if (tc >= 150) prestige = 'gold';
            else if (tc >= 50) prestige = 'silver';
            else if (tc >= 10) prestige = 'bronze';
            const pb = PRESTIGE[prestige];
            const isYou = user && l.userId === user.id;
            const lbBadges = l.badges || [];
            return `<div class="lb-full-row ${isYou ? 'you' : ''}">
                <span class="mini-lb-rank">${i+1}</span>
                <span class="lb-member"><img src="${l.avatar || 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + l.userId}" class="lb-avatar" alt=""> ${l.name}${isYou ? ' (You)' : ''}</span>
                <span class="lb-tasks">${tc}</span>
                <span class="lb-earned">$${(l.totalEarnedUSD||l.totalEarned||0).toFixed(2)}</span>
                <span class="lb-badges-col"><span class="badge ${pb.class}"><i class="${pb.icon}"></i> ${pb.label}</span>${lbBadges.length ? ' ' + renderBadgePills(lbBadges) : ''}</span>
            </div>`;
        }).join('');
    } catch(e) { el.innerHTML = '<p class="text-muted" style="padding:20px;text-align:center">Leaderboard loading failed.</p>'; }
}

loadFullLeaderboard();

// Payouts history — from Firebase task history
function loadPayoutsHistory() {
    const el = document.getElementById('payouts-list');
    if (!el) return;
    const tasks = window._serverTasks || [];
    if (!tasks.length) { el.innerHTML = '<p class="text-muted" style="font-size:0.85rem">No payouts yet. Complete tasks to earn!</p>'; return; }
    const labels = { watch: 'View task', like: 'Like task', comment: 'Comment task', subscribe: 'Subscribe task', follow: 'Follow task' };
    el.innerHTML = tasks.map(t => {
        const ts = t.timestamp ? new Date(t.timestamp) : new Date();
        return `<div class="payout-row">
            <div class="payout-info">
                <div class="payout-icon"><i class="fas fa-wallet"></i></div>
                <div>
                    <div class="payout-date">${ts.toLocaleDateString()}</div>
                    <div class="payout-tasks">${labels[t.taskType] || t.taskType} · ${(t.videoTitle||'').substring(0,30)}</div>
                </div>
            </div>
            <span class="payout-amount">+$${(t.rewardUSD || 0.01).toFixed(3)}</span>
        </div>`;
    }).join('');
}

// Payouts loaded after syncFromServer completes

// Populate earnings summary from synced user data
function loadEarningsSummary() {
    if (!user) return;
    const tt = document.getElementById('earn-total-tasks');
    const tu = document.getElementById('earn-total-usd');
    if (tt) tt.textContent = user.tasksCompleted || 0;
    if (tu) tu.textContent = '$' + (user.totalEarned || 0).toFixed(3);
    // Views/likes/comments/subs come from pd- elements already set by syncFromServer
    const ev = document.getElementById('earn-views');
    const eo = document.getElementById('earn-other');
    if (ev) ev.textContent = document.getElementById('pd-views')?.textContent || '0';
    if (eo) eo.textContent = `${document.getElementById('pd-likes')?.textContent || 0} / ${document.getElementById('pd-comments')?.textContent || 0} / ${document.getElementById('pd-subs')?.textContent || 0}`;
}

// ===== Platform Stats Ticker =====
async function loadPlatformStats() {
    const track = document.getElementById('stats-ticker-track');
    if (!track) return;
    try {
        const res = await fetch('https://coindrop-auth.up.railway.app/api/platform-stats');
        const s = await res.json();
        const items = [
            `<span class="ticker-item"><i class="fas fa-check-circle"></i> ${s.totalTasksCompleted.toLocaleString()} tasks completed</span>`,
            `<span class="ticker-item"><i class="fas fa-dollar-sign"></i> $${s.totalPaidUSD.toFixed(2)} total paid out</span>`,
            `<span class="ticker-item"><i class="fas fa-users"></i> ${s.uniqueUsers.toLocaleString()} unique earners</span>`,
            `<span class="ticker-item"><i class="fas fa-clock"></i> $${s.paidLastHourUSD.toFixed(2)} paid in the last hour</span>`,
            `<span class="ticker-item"><i class="fas fa-calendar-day"></i> $${s.paidLast24hUSD.toFixed(2)} paid in the last 24 hours</span>`,
        ];
        const html = items.join('');
        track.innerHTML = html + html;
    } catch (e) { console.warn('Stats ticker error:', e); }
}
loadPlatformStats();
setInterval(loadPlatformStats, 60000);
