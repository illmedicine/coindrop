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

// Handle OAuth callback — auth server redirects here with ?auth= param
const urlParams = new URLSearchParams(window.location.search);
const authData = urlParams.get('auth');
if (authData) {
    try {
        const userData = JSON.parse(decodeURIComponent(authData));
        localStorage.setItem('coindrop_user', JSON.stringify(userData));
        window.history.replaceState({}, '', 'dashboard.html');
    } catch (e) {
        console.error('Failed to parse auth data:', e);
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

// Creator-based available tasks
const CREATORS = [
    {
        id: 'illmedicine',
        handle: '@illmedicine',
        name: 'ILLMEDICINE',
        platform: 'youtube',
        avatar: 'https://yt3.googleusercontent.com/XSlUYFUKP0xHiFzWK03hJNabH9dsuj5WOWoy164yVGfoGNfGZvfiw21i5PvAZOQvicvc38XRs00=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://youtube.com/@illmedicine',
        about: 'Music, culture, comedy, and creative expression. ILLMEDICINE blends hip-hop, storytelling, hot takes, and digital artistry into compelling video content exploring the intersection of entertainment and technology.',
        category: 'Music & Entertainment',
        subscribers: '1.2K',
        videos: [
            { id: 'a1oreMYT_54', title: 'MINDS THROUGH TIME : EPISODE 4 : CARDI B | AYN RANDT | SEXXY REDD | DR RUTH', views: '7' },
            { id: '6u7Y-fN6QUw', title: 'MINDS THROUGH TIME : EPISODE 3 : 1:1 WITH NICOLA TESLA', views: '1' },
            { id: 'o7kRRVZrmvc', title: 'MINDS THROUGH TIME : EPISODE 2 : TESLA | RAND | DAVINCI | WATTS', views: '6' },
            { id: 'Qke0MUfIsCc', title: 'IMSI Spoof Hacking Explained', views: '3' },
            { id: '0D77Fpm51vY', title: '5 Tips to build lean muscle fast!', views: '10' },
            { id: 'Ln0uOILTgsg', title: 'Charleston White trolls Big Banks over Tekashi69 interview', views: '3,850' },
            { id: 'y3ghN2m11Jg', title: 'when coding with Claude AI goes left', views: '219' },
            { id: 'dmt5gEK1hPU', title: 'Corey Holcomb 5150 SHOW LIVE', views: '307' },
            { id: 'HYRpedXRcx4', title: 'Akademiks starts Beef with Wack 100', views: '456' },
            { id: 'lX5NZ0b0FoQ', title: 'NO JUMPER NEWS', views: '0' },
            { id: 'ypYFDafIWHM', title: 'Illmedicine LIVE', views: '0' },
            { id: 'UQLVWUYCjzk', title: 'Funny stuff while making wings', views: '1' },
            { id: 'tnPkbtUBNs0', title: 'Poker with the boys LIV STREAM', views: '0' },
        ]
    },
    {
        id: 'illmedicineai',
        handle: '@illmedicineai',
        name: 'ILLY LAB ARTV',
        platform: 'youtube',
        avatar: 'https://yt3.googleusercontent.com/e6bQLc5brhyryC0BdwGUAa4kvAPv8G8V0lJ0CRwBwdQZA7M8it8Jn96NuHOhOIjU70rLEqlgcQ=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://youtube.com/@illmedicineai',
        about: 'AI-powered creativity, robotics, and innovation. Exploring AI art, autonomous systems, blockchain tools like DisCryptoBank, and how emerging tech is transforming content creation, automation, and the future of work.',
        category: 'AI & Technology',
        subscribers: '850',
        videos: [
            { id: 'POfwK0S0HNw', title: 'MINDS THROUGH TIME: 1:1 with Nicola Tesla as he discusses his life hardships', views: '23' },
            { id: '6VjTvxy-9ds', title: 'Heated discussion with Ayn Rand, Alan Watts, Nicola Tesla, DaVinci', views: '2' },
            { id: 'hyVhRfySJzQ', title: 'MINDS THROUGH TIME: Tesla / Watts / Rand / DaVinci', views: '12' },
            { id: 'qmhnfbnGZ9s', title: 'Filter from Epson Projector was growing algae', views: '1,262' },
            { id: 'Sw38SrfQe2Q', title: 'VS Code Walkthrough BTS', views: '9' },
            { id: 'gOfLz-3zAEk', title: 'Connect Travel Go Fund Me Commercial', views: '394' },
            { id: 'sV-lfWrxBFA', title: 'Unique Robot Identification Signature (URIS)', views: '28' },
            { id: 'PEUgOiYZdOw', title: 'Exploring FUTOROBOTS', views: '5' },
            { id: 'CZgSIzPuLNg', title: 'TIP.CC is Dead! Try DisCryptoBank (DCB) by Illy Robotics', views: '29' },
            { id: 's59Y1oC9smk', title: 'DOPE Marketing DCB Demo', views: '5' },
            { id: 'iJOXfm3BdwY', title: 'The Reclamation now streaming on illy-ris.com', views: '260' },
            { id: '3xZuaJ2EO-Q', title: 'this is from my real conversation transcript with Claude', views: '151' },
        ]
    },
    {
        id: 'minds_through_time',
        handle: '@MINDS_THROUGH_TIME',
        name: 'MINDS THROUGH TIME',
        platform: 'youtube',
        avatar: 'https://yt3.googleusercontent.com/qMwi1Gd5narppimPoF3D8jaMK8vVNt30S8VRfKGLbpJUzbR0ExDqN58iJ3zY-ofu6GKxOyPI=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://youtube.com/@MINDS_THROUGH_TIME',
        about: 'What if you could sit across the table from the architects of human history and ask them anything? Minds Through Time brings legendary figures together for AI-powered philosophical conversations spanning centuries of human thought.',
        category: 'Philosophy & History',
        subscribers: '106',
        videos: [
            { id: 'bU5Ik5TREho', title: 'The Sexxy Randt Show 1', views: '600' },
            { id: 'U5XeHnzL7qM', title: 'MINDS THROUGH TIME : SAM ALTMAN X OSAMA LADIN', views: '15' },
            { id: 'S4kkj_FQJuU', title: 'MINDS THROUGH TIME CLEOPATRA X KIM K MEET', views: '9' },
            { id: 'TrhfDceCCb0', title: 'MINDS THROUGH TIME ALEX KARP x GENGHIS KHAN', views: '7' },
            { id: 'IzE2sJoNsvU', title: 'Minds Through Time', views: '1' },
            { id: '9DQjShoxcdQ', title: 'Sexyy Rand', views: '114' },
            { id: 'rRpv4qmIvrA', title: 'MINDS THROUGH TIME EPISODE 2 WILSON X TESLA', views: '4' },
            { id: 'NzTlHSL4NUg', title: 'MINDS THROUGH TIME EPISODE 1', views: '8' },
        ]
    }
];

const creatorsContainer = document.getElementById('creators-list');

function renderCreators(filter) {
    if (!creatorsContainer) return;
    creatorsContainer.innerHTML = '';

    const filtered = filter === 'all' ? CREATORS : CREATORS.filter(c => c.id === filter);

    filtered.forEach(creator => {
        const videoCards = creator.videos.map(v => `
            <div class="video-task-card">
                <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" class="video-thumb">
                    <img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" alt="${v.title}" class="video-thumb-img">
                </a>
                <div class="video-task-info">
                    <div class="video-task-title">${v.title}</div>
                    <div class="video-task-meta">${v.views} views</div>
                </div>
                <div class="video-task-actions">
                    <div class="vta-row">
                        <span class="vta-label"><i class="fas fa-play"></i> Watch</span>
                        <span class="vta-reward">0.001 SOL</span>
                        <button class="task-action-sm">Go</button>
                    </div>
                    <div class="vta-row">
                        <span class="vta-label"><i class="fas fa-thumbs-up"></i> Like</span>
                        <span class="vta-reward">0.0005 SOL</span>
                        <button class="task-action-sm">Go</button>
                    </div>
                    <div class="vta-row">
                        <span class="vta-label"><i class="fas fa-comment"></i> Comment</span>
                        <span class="vta-reward">$0.02</span>
                        <button class="task-action-sm">Go</button>
                    </div>
                </div>
            </div>
        `).join('');

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
                        <button class="task-action subscribe-btn">
                            <i class="fas fa-bell"></i> Subscribe — $0.05 + $0.01/mo
                        </button>
                    </div>
                </div>
                <div class="creator-videos-grid">
                    ${videoCards}
                </div>
            </div>
        `;
    });
}

renderCreators('all');

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCreators(btn.dataset.filter);
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
