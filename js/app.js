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
