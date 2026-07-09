// ===== CoinDrop Tasks Browser — Creator Card Hero Layout =====
const TASKS_BROWSER_API = 'https://coindrop-auth.up.railway.app';

let _tbFeaturedIds = new Set();
let _tbShuffledCreators = [];
let _tbAutoShuffleTimer = null;
let _tbCurrentDetailId = null;
let _tbInitialized = false;

// ── Public: initialize or re-render the card browser ────────────────────────
async function initTaskBrowser() {
    try {
        const res = await fetch(`${TASKS_BROWSER_API}/api/creators/featured`);
        const data = await res.json();
        _tbFeaturedIds = new Set(data.featuredIds || []);
    } catch(e) {}
    _tbShuffledCreators = _tbShuffle([...(window.CREATORS || [])]);
    _tbRenderCardBrowser();
    _tbStartAutoShuffle();
    _tbInitialized = true;
}

// Called by admin-creators.js after CREATORS array changes
function refreshTaskBrowser() {
    const detailView = document.getElementById('creator-detail-view');
    const detailVisible = detailView && detailView.style.display !== 'none';
    if (detailVisible && _tbCurrentDetailId) {
        // Re-render the current creator's task list
        if (typeof renderCreators === 'function') renderCreators(_tbCurrentDetailId);
    } else if (_tbInitialized) {
        // Refresh the card browser rows
        _tbShuffledCreators = _tbShuffle([...(window.CREATORS || [])]);
        _tbRenderCardBrowser();
    }
}

// ── Card browser rendering ───────────────────────────────────────────────────
function _tbRenderCardBrowser() {
    const featured = (window.CREATORS || []).filter(c => _tbFeaturedIds.has(c.id));
    const all = _tbShuffledCreators;

    // Featured row
    const featuredSection = document.getElementById('featured-row-section');
    const featuredScroll = document.getElementById('featured-creators-scroll');
    if (featuredSection && featuredScroll) {
        if (featured.length > 0) {
            featuredSection.style.display = '';
            featuredScroll.innerHTML = featured.map(c => _tbMakeCard(c, true)).join('');
        } else {
            featuredSection.style.display = 'none';
        }
    }

    // All creators row
    const allScroll = document.getElementById('all-creators-scroll');
    const countLabel = document.getElementById('creator-count-label');
    const totalTasks = (window.CREATORS || []).reduce((n, c) => n + (c.videos || []).length, 0);
    if (countLabel) countLabel.textContent = `${all.length} creator${all.length !== 1 ? 's' : ''} · ${totalTasks} tasks`;
    if (allScroll) allScroll.innerHTML = all.map(c => _tbMakeCard(c, _tbFeaturedIds.has(c.id))).join('');
}

function _tbMakeCard(creator, isFeatured) {
    const videos = (creator.videos || []).length;
    const earn = ((videos * 0.01) + (videos * 0.005) + (videos * 0.05) + 0.05).toFixed(2);
    const aboutSnip = (creator.about || '').substring(0, 88) + ((creator.about || '').length > 88 ? '…' : '');
    const avatar = creator.avatar || 'https://coindrop.in/assets/logo.png';
    const joinBadge = creator.addedAt ? 'Partner' : 'Beta Partner';

    return `<div class="cc-card${isFeatured ? ' cc-featured' : ''}" onclick="openCreatorDetail('${creator.id}')">
        <div class="cc-bg" style="background-image:url('${avatar}')"></div>
        <div class="cc-overlay"></div>
        ${isFeatured ? '<div class="cc-featured-badge"><i class="fas fa-star"></i> Featured</div>' : ''}
        <div class="cc-body">
            <div class="cc-avatar-ring${isFeatured ? ' cc-avatar-glow' : ''}">
                <img class="cc-avatar-img" src="${avatar}" alt="${creator.name}"
                     onerror="this.src='https://coindrop.in/assets/logo.png'">
            </div>
            <div class="cc-name">${creator.name}</div>
            <div class="cc-handle">${creator.handle}</div>
            <div class="cc-cat">${creator.category || 'Content Creator'}</div>
            <p class="cc-about">${aboutSnip}</p>
            <div class="cc-stats-row">
                <div class="cc-stat"><span class="cc-stat-n">${videos}</span><span class="cc-stat-l">Tasks</span></div>
                <div class="cc-stat-sep"></div>
                <div class="cc-stat"><span class="cc-stat-n">${creator.subscribers || '—'}</span><span class="cc-stat-l">Subs</span></div>
                <div class="cc-stat-sep"></div>
                <div class="cc-stat"><span class="cc-stat-n">$${earn}</span><span class="cc-stat-l">Earn</span></div>
            </div>
            <div class="cc-join-badge">${joinBadge}</div>
            <button class="cc-cta-btn">Explore Tasks <i class="fas fa-arrow-right"></i></button>
        </div>
    </div>`;
}

// ── Shuffle ──────────────────────────────────────────────────────────────────
function _tbShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Public — wired to Shuffle button in HTML
function shuffleAllCreators() {
    _tbShuffledCreators = _tbShuffle([...(window.CREATORS || [])]);
    const allScroll = document.getElementById('all-creators-scroll');
    if (!allScroll) return;
    allScroll.style.opacity = '0';
    setTimeout(() => {
        allScroll.innerHTML = _tbShuffledCreators.map(c => _tbMakeCard(c, _tbFeaturedIds.has(c.id))).join('');
        allScroll.style.opacity = '1';
    }, 180);
}

function _tbStartAutoShuffle() {
    if (_tbAutoShuffleTimer) clearInterval(_tbAutoShuffleTimer);
    _tbAutoShuffleTimer = setInterval(shuffleAllCreators, 30000);
}

// ── Detail view ──────────────────────────────────────────────────────────────
function openCreatorDetail(creatorId) {
    const creator = (window.CREATORS || []).find(c => c.id === creatorId);
    if (!creator) return;
    _tbCurrentDetailId = creatorId;

    document.getElementById('creator-card-browser').style.display = 'none';
    const detailView = document.getElementById('creator-detail-view');
    detailView.style.display = '';

    // Render mini header
    const meta = document.getElementById('creator-detail-meta');
    if (meta) {
        const avatar = creator.avatar || 'https://coindrop.in/assets/logo.png';
        const videos = (creator.videos || []).length;
        const isFeatured = _tbFeaturedIds.has(creator.id);
        meta.innerHTML = `
            <div class="cdd-header">
                <img class="cdd-avatar" src="${avatar}" alt="${creator.name}"
                     onerror="this.src='https://coindrop.in/assets/logo.png'">
                <div class="cdd-info">
                    <strong class="cdd-name">${creator.name}</strong>
                    <div class="cdd-sub">
                        <span class="cdd-handle">${creator.handle}</span>
                        <span class="cdd-cattag">${creator.category || ''}</span>
                        ${isFeatured ? '<span class="cdd-feat-tag"><i class="fas fa-star"></i> Featured</span>' : ''}
                    </div>
                </div>
                <div class="cdd-counts">
                    <span><strong>${videos}</strong> tasks</span>
                    <span><strong>${creator.subscribers || '?'}</strong> subs</span>
                </div>
                <a href="${creator.channelUrl}" target="_blank" class="btn btn-ghost cdd-ch-btn">
                    <i class="fab fa-youtube"></i> Channel
                </a>
            </div>`;
    }

    if (typeof renderCreators === 'function') renderCreators(creatorId);

    // Scroll main content to top
    const main = document.querySelector('.main-content');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCreatorDetail() {
    _tbCurrentDetailId = null;
    document.getElementById('creator-card-browser').style.display = '';
    document.getElementById('creator-detail-view').style.display = 'none';
    const list = document.getElementById('creators-list');
    if (list) list.innerHTML = '';
    _tbStartAutoShuffle();
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const tasksNavBtn = document.querySelector('[data-tab="tasks"]');
    if (tasksNavBtn) {
        tasksNavBtn.addEventListener('click', () => {
            if (!_tbInitialized) initTaskBrowser();
        });
    }
    // Auto-init if tasks tab is already active on load (e.g. deep link)
    setTimeout(() => {
        const tasksTab = document.getElementById('tab-tasks');
        if (tasksTab && tasksTab.classList.contains('active') && !_tbInitialized) {
            initTaskBrowser();
        }
    }, 500);
});
