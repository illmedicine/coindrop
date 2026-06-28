// ===== CoinDrop Notifications =====

const NOTIF_API = 'https://coindrop-auth.up.railway.app';

function getNotifications() {
    return JSON.parse(localStorage.getItem('coindrop_notifications') || '[]');
}

function saveNotifications(notifs) {
    localStorage.setItem('coindrop_notifications', JSON.stringify(notifs));
    updateNotifBadge();
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    const notifs = getNotifications();
    if (badge) {
        if (notifs.length > 0) {
            badge.style.display = '';
            badge.textContent = notifs.length;
        } else {
            badge.style.display = 'none';
        }
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.toggle('hidden');
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const notifs = getNotifications();
    if (notifs.length === 0) {
        list.innerHTML = '<div style="padding:30px;text-align:center;color:var(--gray-400);"><i class="fas fa-bell-slash" style="font-size:2rem;margin-bottom:8px;display:block;"></i>No notifications</div>';
        return;
    }
    list.innerHTML = notifs.map((n, i) => `
        <div class="notif-item">
            <span class="notif-icon" style="color:${n.color || 'var(--orange)'}"><i class="${n.icon || 'fas fa-info-circle'}"></i></span>
            <div class="notif-text">
                <strong>${n.title}</strong>
                <span style="font-size:0.8rem;color:var(--navy);">${n.message}</span>
                <small>${n.time || ''}</small>
            </div>
            <button class="notif-dismiss" onclick="dismissNotification(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function dismissNotification(index) {
    const notifs = getNotifications();
    notifs.splice(index, 1);
    saveNotifications(notifs);
    renderNotifications();
}

function clearAllNotifications() {
    saveNotifications([]);
    renderNotifications();
}

function addNotification(title, message, icon, color) {
    const notifs = getNotifications();
    notifs.unshift({ title, message, icon: icon || 'fas fa-info-circle', color: color || 'var(--orange)', time: new Date().toLocaleString() });
    saveNotifications(notifs);
}

// Welcome notice for new users
function checkWelcomeNotice() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const welcomed = localStorage.getItem('coindrop_welcomed_' + user.id);
    if (!welcomed) {
        addNotification(
            'Welcome to CoinDrop!',
            'Start earning SOL by completing tasks. Join our <a href="https://discord.gg/847XjyVa3C" target="_blank" style="color:var(--orange);font-weight:600;">Discord server</a> for support and task drops!',
            'fas fa-rocket',
            '#22c55e'
        );
        localStorage.setItem('coindrop_welcomed_' + user.id, 'true');
    }
}

// System announcement - payout notice
function checkPayoutAnnouncement() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const seen = localStorage.getItem('coindrop_payout_notice_20260626_' + user.id);
    if (!seen) {
        addNotification(
            'Retroactive Payouts Issued',
            'As of 6/26/2026 at 7:30 PM EST, all unpaid payouts for completed tasks were issued. If you completed a task in the past 48 hours and have not been paid, please check your Phantom wallet now.',
            'fas fa-coins',
            'var(--orange)'
        );
        localStorage.setItem('coindrop_payout_notice_20260626_' + user.id, 'true');
    }
}

// Community Lead badge notification
function checkBadgeNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const seen = localStorage.getItem('coindrop_badge_notice_20260627_' + user.id);
    if (seen) return;
    const badges = window._userBadges || [];
    const hasBeta = badges.some(b => b.id === 'beta-tester');
    const hasCoin = badges.some(b => b.id === 'coin-collector');
    if (hasBeta && hasCoin) {
        addNotification(
            'You\'ve Been Hired as a COIN-COLLECTOR Community Lead!',
            'Congratulations! You earned the rare <b>Beta Tester</b> and <b>COIN-COLLECTOR</b> prestige badges. These badges are only available until 6/30/2026 and will remain on your profile permanently. <br><br><b>New Hire Bonus:</b> Friend request <b>"illymeds"</b> on Discord and send a screenshot of your badges for a <b>$1 bonus</b>! <a href="https://discord.gg/847XjyVa3C" target="_blank" style="color:var(--orange);font-weight:600;">Join Discord</a>',
            'fas fa-award',
            '#7c3aed'
        );
        localStorage.setItem('coindrop_badge_notice_20260627_' + user.id, 'true');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkWelcomeNotice();
    checkPayoutAnnouncement();
    updateNotifBadge();
});
// Retry after user data loads (badges need time to load from server)
setTimeout(() => { checkWelcomeNotice(); checkPayoutAnnouncement(); checkBadgeNotification(); updateNotifBadge(); }, 3000);
