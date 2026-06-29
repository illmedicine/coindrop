// ===== Landing page animations =====

// Animate stats on scroll
const observerOptions = { threshold: 0.3 };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.step-card, .earn-card, .community-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

document.addEventListener('scroll', () => {
    document.querySelectorAll('.step-card, .earn-card, .community-card').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }
    });
});

// Load real leaderboard
(async function loadLandingLeaderboard() {
    const container = document.getElementById('landing-leaderboard');
    if (!container) return;
    try {
        const res = await fetch('https://coindrop-auth.up.railway.app/api/leaderboard');
        const data = await res.json();
        const leaders = (data.leaders || []).slice(0, 10);
        const header = container.querySelector('.lb-header');
        container.innerHTML = '';
        container.appendChild(header);
        if (leaders.length === 0) {
            container.innerHTML += '<div class="lb-row" style="justify-content:center;padding:30px;color:var(--gray-400);">No earners yet — be the first!</div>';
            return;
        }
        const rankIcons = ['<i class="fas fa-trophy"></i>', '<i class="fas fa-medal"></i>', '<i class="fas fa-award"></i>'];
        const rowClasses = ['gold', 'silver', 'bronze'];
        leaders.forEach((l, i) => {
            const totalTasks = l.tasksCompleted || 0;
            const earnedUSD = (l.totalEarnedUSD || l.totalEarned || 0);
            const prestige = earnedUSD >= 2 ? 'Gold' : earnedUSD >= 1 ? 'Silver' : 'Bronze';
            const badgeClass = prestige.toLowerCase();
            const icon = prestige === 'Gold' ? 'fa-star' : prestige === 'Silver' ? 'fa-shield-alt' : 'fa-medal';
            const avatar = l.avatar || 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + encodeURIComponent(l.name);
            const rankIcon = i < 3 ? rankIcons[i] + ' ' : '';
            const lbBadges = l.badges || [];
            const badgePills = lbBadges.map(function(b) {
                return '<span class="prestige-pill prestige-' + b.id + '" style="--pill-color:' + b.color + ';--pill-bg:' + b.bg + '"><i class="' + b.icon + '"></i> ' + b.label + '</span>';
            }).join(' ');
            const row = document.createElement('div');
            row.className = 'lb-row ' + (rowClasses[i] || '');
            row.innerHTML = '<span class="lb-rank">' + rankIcon + (i + 1) + '</span>' +
                '<span class="lb-member"><img src="' + avatar + '" alt="" class="lb-avatar"> ' + l.name + '</span>' +
                '<span class="lb-tasks">' + totalTasks.toLocaleString() + '</span>' +
                '<span class="lb-earned">$' + earnedUSD.toFixed(2) + '</span>' +
                '<span class="lb-prestige"><span class="badge badge-' + badgeClass + '"><i class="fas fa-' + icon + '"></i> ' + prestige + '</span> ' + badgePills + '</span>';
            container.appendChild(row);
        });
    } catch (e) {
        console.error('Leaderboard load error:', e);
    }
})();

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        nav.style.boxShadow = '0 2px 12px rgba(0,0,0,0.12)';
    } else {
        nav.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }
});

// Load live platform stats
(async function loadLandingStats() {
    try {
        const res = await fetch('https://coindrop-auth.up.railway.app/api/platform-stats');
        const s = await res.json();
        const el = document.getElementById('active-members');
        const paid = document.getElementById('total-paid-usd');
        if (el && s.uniqueUsers) el.textContent = s.uniqueUsers.toLocaleString();
        if (paid && s.totalPaidUSD) paid.textContent = '$' + s.totalPaidUSD.toFixed(2);
        // Update landing ticker with real data
        const track = document.getElementById('landing-ticker-track');
        if (track) {
            const items = [
                `<span class="ticker-item"><i class="fas fa-check-circle"></i> ${s.totalTasksCompleted.toLocaleString()} tasks completed on CoinDrop</span>`,
                `<span class="ticker-item"><i class="fas fa-dollar-sign"></i> $${s.totalPaidUSD.toFixed(2)} total paid out to earners</span>`,
                `<span class="ticker-item"><i class="fas fa-users"></i> ${s.uniqueUsers.toLocaleString()} active earners worldwide</span>`,
                `<span class="ticker-item"><i class="fas fa-clock"></i> $${s.paidLastHourUSD.toFixed(2)} paid in the last hour</span>`,
                `<span class="ticker-item"><i class="fas fa-calendar-day"></i> $${s.paidLast24hUSD.toFixed(2)} paid in the last 24 hours</span>`,
                `<span class="ticker-item"><i class="fas fa-globe"></i> Available in 190+ countries · 100% free to join</span>`,
            ];
            const html = items.join('');
            track.innerHTML = html + html;
        }
    } catch(e) {}
})();

// Load Discord server stats (landing page)
(async function loadDiscordStatsLanding() {
    try {
        const res = await fetch('https://coindrop-auth.up.railway.app/api/discord-stats');
        const data = await res.json();
        const membersEl = document.getElementById('discord-members-landing');
        const onlineEl = document.getElementById('discord-online-landing');
        if (membersEl && data.totalMembers) membersEl.textContent = data.totalMembers.toLocaleString();
        if (onlineEl && data.onlineMembers) onlineEl.textContent = data.onlineMembers.toLocaleString();
    } catch(e) {}
})();
