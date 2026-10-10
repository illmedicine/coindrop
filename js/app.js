// ===== CoinDrop Global JS =====

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('active'));
        links.querySelectorAll('a:not(.btn)').forEach(a => {
            a.addEventListener('click', () => links.classList.remove('active'));
        });
    }
});

// Countdown timer to next hourly content drop
function updateDropTimer() {
    const el = document.getElementById('next-drop-timer');
    if (!el) return;
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    const diff = nextHour - now;
    const m = String(Math.floor(diff / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    el.textContent = `${m}:${s}`;
}
setInterval(updateDropTimer, 1000);
updateDropTimer();

// Live activity popups - real events only (first-time joins, users coming online, users leaving)
(function realActivityPopups() {
    const API = 'https://coindrop-auth.up.railway.app';
    const popup = document.getElementById('signup-popup');
    if (!popup) return;
    const textEl = popup.querySelector('.popup-text');
    if (!textEl) return;

    let cursor = 0;
    const queue = [];
    let showing = false;
    let selfKey = '';

    // Same 8-char key the server derives from the user id, so we never pop up the viewer's own activity
    (async () => {
        try {
            const u = JSON.parse(localStorage.getItem('coindrop_user') || 'null');
            if (!u || !u.id || !window.crypto || !crypto.subtle) return;
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(u.id)));
            selfKey = Array.from(new Uint8Array(buf)).slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {}
    })();

    function render(ev) {
        textEl.textContent = '';
        const strong = document.createElement('strong');
        strong.textContent = ev.name;
        textEl.appendChild(strong);
        if (ev.type === 'joined') {
            textEl.appendChild(document.createTextNode(' just joined CoinDrop!'));
            if (ev.country) {
                const span = document.createElement('span');
                span.textContent = ' from ' + ev.country;
                textEl.appendChild(span);
            }
        } else if (ev.type === 'online') {
            textEl.appendChild(document.createTextNode(' is online now'));
        } else {
            textEl.appendChild(document.createTextNode(' just left'));
        }
    }

    function next() {
        if (showing) return;
        const ev = queue.shift();
        if (!ev) return;
        showing = true;
        render(ev);
        popup.classList.remove('hidden');
        setTimeout(() => {
            popup.classList.add('hidden');
            setTimeout(() => { showing = false; next(); }, 1500);
        }, 4500);
    }

    async function poll() {
        if (document.visibilityState === 'hidden') return;
        try {
            const res = await fetch(`${API}/api/presence/events?since=${cursor}`);
            if (!res.ok) return;
            const data = await res.json();
            cursor = data.cursor || cursor;
            for (const ev of (data.events || [])) {
                if (selfKey && ev.k === selfKey) continue;
                queue.push(ev);
            }
            while (queue.length > 5) queue.shift();
            next();
        } catch (e) {}
    }

    setTimeout(poll, 4000);
    setInterval(poll, 12000);
})();

// Form validation helpers
function validateYouTubeHandle(handle) {
    return /^@[a-zA-Z0-9._-]{3,30}$/.test(handle);
}

function validateSolAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
