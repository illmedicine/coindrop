// ===== CoinDrop Notifications (Firestore-backed for cross-device consistency) =====

const NOTIF_API = 'https://coindrop-auth.up.railway.app';

function getNotifications() {
    return JSON.parse(localStorage.getItem('coindrop_notifications') || '[]');
}

function saveNotificationsLocal(notifs) {
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
                <small>${n.time ? new Date(n.time).toLocaleString() : ''}</small>
            </div>
            <button class="notif-dismiss" onclick="dismissNotification(${i}, '${n.id || ''}')"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function dismissNotification(index, notifId) {
    const notifs = getNotifications();
    notifs.splice(index, 1);
    saveNotificationsLocal(notifs);
    renderNotifications();
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (user.id && notifId) {
        fetch(`${NOTIF_API}/api/notifications/${user.id}/dismiss`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notifId }),
        }).catch(() => {});
    }
}

function clearAllNotifications() {
    saveNotificationsLocal([]);
    renderNotifications();
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (user.id) {
        fetch(`${NOTIF_API}/api/notifications/${user.id}/clear`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
}

function addNotification(title, message, icon, color) {
    const notifs = getNotifications();
    const notif = { title, message, icon: icon || 'fas fa-info-circle', color: color || 'var(--orange)', time: new Date().toISOString(), id: Date.now().toString() };
    notifs.unshift(notif);
    saveNotificationsLocal(notifs);
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (user.id) {
        fetch(`${NOTIF_API}/api/notifications/${user.id}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notif),
        }).catch(() => {});
    }
}

async function syncNotificationsFromServer() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    try {
        const res = await fetch(`${NOTIF_API}/api/notifications/${user.id}`);
        const data = await res.json();
        const serverNotifs = data.notifications || [];
        if (serverNotifs.length > 0) {
            const local = getNotifications();
            const localIds = new Set(local.map(n => n.id).filter(Boolean));
            let merged = [...local];
            for (const sn of serverNotifs) {
                if (sn.id && !localIds.has(sn.id)) {
                    merged.push(sn);
                }
            }
            merged.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
            if (merged.length > 50) merged.length = 50;
            saveNotificationsLocal(merged);
        }
    } catch(e) {}
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
            'Congratulations! You earned the rare <b>Beta Tester</b> and <b>COIN-COLLECTOR</b> prestige badges. These badges are only available until 6/30/2026 and will remain on your profile permanently. <br><br><b>New Hire Bonus:</b> Friend request <b>"illmeds"</b> on Discord and send a screenshot of your badges for a <b>$1 bonus</b>! <a href="https://discord.gg/847XjyVa3C" target="_blank" style="color:var(--orange);font-weight:600;">Join Discord</a>',
            'fas fa-award',
            '#7c3aed'
        );
        localStorage.setItem('coindrop_badge_notice_20260627_' + user.id, 'true');
    }
}

// Google Play Store launch announcement
function checkPlayStoreNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const seen = localStorage.getItem('coindrop_playstore_launch_20260701_' + user.id);
    if (seen) return;
    addNotification(
        'CoinDrop is Now on Google Play!',
        'The CoinDrop Android app is officially live! Download it now for a faster, native experience. <a href="https://play.google.com/store/apps/details?id=in.coindrop&pcampaignid=web_share" target="_blank" style="color:var(--orange);font-weight:600;"><i class="fab fa-google-play"></i> Download on Google Play</a>',
        'fab fa-google-play',
        '#01875f'
    );
    localStorage.setItem('coindrop_playstore_launch_20260701_' + user.id, 'true');
}

// Horse racing cash prize giveaway announcement
function checkHorseRacingNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const seen = localStorage.getItem('coindrop_horse_racing_notice_20260630_' + user.id);
    if (seen) return;
    addNotification(
        'Cash Prize Horse Racing Giveaways!',
        'Pick the right horse and win <b>$1 USD</b> per race! New horse racing giveaways are live in our Discord. <a href="https://discord.gg/U4nR9Mgg9" target="_blank" style="color:var(--orange);font-weight:600;">Join the race in Discord</a>',
        'fas fa-horse',
        '#F7931A'
    );
    localStorage.setItem('coindrop_horse_racing_notice_20260630_' + user.id, 'true');
}

// Comment reward boost announcement
function checkCommentBoostNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const seen = localStorage.getItem('coindrop_comment_boost_20260703_' + user.id);
    if (seen) return;
    addNotification(
        '💬 Comments Now Pay $0.05 — 5× Boost!',
        'Big update: verified comments now earn <b>$0.05 each</b> (up from $0.02)! Comment on every video task daily and earn up to <b>$8.70/day</b> from comments alone — then come back tomorrow and do it all again since comment tasks reset every 24 hours. The more creators we add, the more you can earn. Start commenting on everything now!',
        'fas fa-comment-dollar',
        '#22c55e'
    );
    localStorage.setItem('coindrop_comment_boost_20260703_' + user.id, 'true');
}

// Twitch Live Earn feature launch announcement (one-time, all users)
function checkTwitchEarnLaunchNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const seen = localStorage.getItem('coindrop_twitch_earn_launch_20260706_' + user.id);
    if (seen) return;
    addNotification(
        '⚡ NEW: Earn Money Watching Twitch Live Streams!',
        'CoinDrop just launched <b>Live Earn</b> — earn <b>$0.02 per minute</b> watching featured Twitch streams! When a creator goes live, you\'ll get a flash alert. Open the <b>Live Earn</b> tab in your dashboard, submit a screenshot every 60 seconds, and get paid. Enable <b>Auto-Validation</b> so the app reminds you every minute automatically. Check the Live Earn tab now to see if anyone is live!',
        'fab fa-twitch',
        '#9146FF'
    );
    localStorage.setItem('coindrop_twitch_earn_launch_20260706_' + user.id, 'true');
}

// Kick Live Earn feature launch announcement (one-time, all users)
function checkKickEarnLaunchNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    const seen = localStorage.getItem('coindrop_kick_earn_launch_20260708_' + user.id);
    if (seen) return;
    addNotification(
        '🟢 NEW: Earn Money Watching Kick Live Streams!',
        'CoinDrop now supports <b>Kick Live Earn</b> — earn <b>$0.02 per minute</b> watching featured creators on Kick! Check the <b>Kick Live</b> tab in your dashboard for active flash events. Enable Auto-Validation to get reminded every 60 seconds to submit a screenshot.',
        'fas fa-video',
        '#53FC18'
    );
    localStorage.setItem('coindrop_kick_earn_launch_20260708_' + user.id, 'true');
}

// Kick flash promo announcement (fires per active promo)
async function checkKickPromoNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    try {
        const res = await fetch(`${NOTIF_API}/api/kick-promos/active`);
        const data = await res.json();
        const promos = data.promos || [];
        for (const p of promos) {
            const key = `coindrop_kick_promo_${p.id}_${user.id}`;
            if (localStorage.getItem(key)) continue;
            addNotification(
                `🟢 Flash Live Earn: ${p.streamerName} is LIVE on Kick!`,
                `Earn <b>$${p.rewardPerMin.toFixed(2)}/min</b> watching ${p.streamerName} on Kick right now! Go to the <b>Kick Live</b> tab to start. <a href="${p.kickUrl}" target="_blank" style="color:var(--orange);font-weight:600;">▶ Watch on Kick</a>`,
                'fas fa-video',
                '#53FC18'
            );
            localStorage.setItem(key, 'true');
        }
    } catch(e) {}
}

// Twitch flash promo announcement (fires per active promo)
async function checkTwitchPromoNotification() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.id) return;
    try {
        const res = await fetch(`${NOTIF_API}/api/twitch-promos/active`);
        const data = await res.json();
        const promos = data.promos || [];
        for (const p of promos) {
            const key = `coindrop_twitch_promo_${p.id}_${user.id}`;
            if (localStorage.getItem(key)) continue;
            addNotification(
                `⚡ Flash Live Earn: ${p.streamerName} is LIVE!`,
                `Earn <b>$${p.rewardPerMin.toFixed(2)}/min</b> watching ${p.streamerName} on Twitch right now! Go to the <b>Live Earn</b> tab to start. <a href="${p.twitchUrl}" target="_blank" style="color:var(--orange);font-weight:600;"><i class="fab fa-twitch"></i> Watch on Twitch</a>`,
                'fab fa-twitch',
                '#9146FF'
            );
            localStorage.setItem(key, 'true');
        }
    } catch(e) {}
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkWelcomeNotice();
    syncNotificationsFromServer();
    updateNotifBadge();
});
setTimeout(() => { checkWelcomeNotice(); syncNotificationsFromServer(); checkBadgeNotification(); checkHorseRacingNotification(); checkPlayStoreNotification(); checkCommentBoostNotification(); checkTwitchEarnLaunchNotification(); checkTwitchPromoNotification(); checkKickEarnLaunchNotification(); checkKickPromoNotification(); updateNotifBadge(); }, 3000);
