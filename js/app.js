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

// Countdown timer to next daily drop (midnight UTC)
function updateDropTimer() {
    const el = document.getElementById('next-drop-timer');
    if (!el) return;
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const diff = utcMidnight - now;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateDropTimer, 1000);
updateDropTimer();

// Simulate live signup popups
const FAKE_SIGNUPS = [
    { name: 'Adebayo O.', country: 'Nigeria' },
    { name: 'Fatima K.', country: 'Bangladesh' },
    { name: 'Carlos R.', country: 'Colombia' },
    { name: 'Amara D.', country: 'Senegal' },
    { name: 'Raj P.', country: 'India' },
    { name: 'Linh T.', country: 'Vietnam' },
    { name: 'Grace M.', country: 'Kenya' },
    { name: 'Juan S.', country: 'Philippines' },
    { name: 'Kofi A.', country: 'Ghana' },
    { name: 'Ana L.', country: 'Brazil' },
    { name: 'Mohamed H.', country: 'Egypt' },
    { name: 'Thiago F.', country: 'Brazil' },
    { name: 'Aisha B.', country: 'Tanzania' },
    { name: 'Diego V.', country: 'Mexico' },
    { name: 'Nkechi U.', country: 'Nigeria' },
];

function showSignupPopup() {
    const popup = document.getElementById('signup-popup');
    const nameEl = document.getElementById('popup-name');
    const countryEl = document.getElementById('popup-country');
    if (!popup || !nameEl || !countryEl) return;

    const person = FAKE_SIGNUPS[Math.floor(Math.random() * FAKE_SIGNUPS.length)];
    nameEl.textContent = person.name;
    countryEl.textContent = ` from ${person.country}`;
    popup.classList.remove('hidden');

    setTimeout(() => popup.classList.add('hidden'), 4000);
}

setTimeout(() => {
    showSignupPopup();
    setInterval(showSignupPopup, 15000 + Math.random() * 10000);
}, 5000);

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
