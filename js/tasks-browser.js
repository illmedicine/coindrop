// ===== CoinDrop Tasks Browser — Creator Card Hero Layout =====
const TASKS_BROWSER_API = 'https://coindrop-auth.up.railway.app';

let _tbFeaturedIds = new Set();
let _tbShuffledCreators = [];
let _tbAutoShuffleTimer = null;
let _tbCurrentDetailId = null;
let _tbInitialized = false;

// ── Public: initialize the card browser (fetches featured IDs then renders) ──
async function initTaskBrowser() {
    // Render immediately with whatever creators we have (no spinner wait)
    _tbShuffledCreators = _tbShuffle([...(CREATORS || [])]);
    _tbRenderCardBrowser();

    // Then fetch featured IDs and re-render with badges
    try {
        const res = await fetch(`${TASKS_BROWSER_API}/api/creators/featured`);
        const data = await res.json();
        _tbFeaturedIds = new Set(data.featuredIds || []);
        _tbRenderCardBrowser();
    } catch(e) {}

    if (!_tbInitialized) {
        _tbStartAutoShuffle();
        _tbInitialized = true;
    }
}

// Called by admin-creators.js after CREATORS array changes — always re-renders
function refreshTaskBrowser() {
    const detailView = document.getElementById('creator-detail-view');
    const detailVisible = detailView && detailView.style.display !== 'none';
    if (detailVisible && _tbCurrentDetailId) {
        if (typeof renderCreators === 'function') renderCreators(_tbCurrentDetailId);
        return;
    }
    const creators = CREATORS || [];
    if (!creators.length) return;
    _tbShuffledCreators = _tbShuffle([...creators]);
    _tbRenderCardBrowser();
    if (!_tbInitialized) {
        _tbStartAutoShuffle();
        _tbInitialized = true;
    }
}

// ── Card browser rendering ───────────────────────────────────────────────────
function _tbRenderCardBrowser() {
    const featured = (CREATORS || []).filter(c => _tbFeaturedIds.has(c.id));
    const all = _tbShuffledCreators.length ? _tbShuffledCreators : (CREATORS || []);

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

    const allScroll = document.getElementById('all-creators-scroll');
    const countLabel = document.getElementById('creator-count-label');
    const totalTasks = (CREATORS || []).reduce((n, c) => n + (c.videos || []).length, 0);
    if (countLabel) countLabel.textContent = `${all.length} creator${all.length !== 1 ? 's' : ''} · ${totalTasks} tasks`;
    if (allScroll) allScroll.innerHTML = all.length
        ? all.map(c => _tbMakeCard(c, _tbFeaturedIds.has(c.id))).join('')
        : '<div style="padding:40px;color:var(--gray-400);text-align:center;width:100%;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i><p style="margin-top:12px;">Loading creators…</p></div>';
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
            <p class="cc-about">${aboutSnip || 'YouTube content creator on CoinDrop.'}</p>
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

function shuffleAllCreators() {
    _tbShuffledCreators = _tbShuffle([...(CREATORS || [])]);
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
    const creator = (CREATORS || []).find(c => c.id === creatorId);
    if (!creator) return;
    _tbCurrentDetailId = creatorId;

    document.getElementById('creator-card-browser').style.display = 'none';
    document.getElementById('creator-detail-view').style.display = '';

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
    // Wire Tasks tab click
    const tasksNavBtn = document.querySelector('[data-tab="tasks"]');
    if (tasksNavBtn) {
        tasksNavBtn.addEventListener('click', () => {
            if (!_tbInitialized) initTaskBrowser();
            else {
                // Re-render on every tab visit so new creators show up
                _tbShuffledCreators = _tbShuffle([...(CREATORS || [])]);
                _tbRenderCardBrowser();
            }
        });
    }
    // Auto-init if tasks tab is already active on load (deep-link / default tab)
    setTimeout(() => {
        const tasksTab = document.getElementById('tab-tasks');
        if (tasksTab && tasksTab.classList.contains('active')) {
            if (!_tbInitialized) initTaskBrowser();
        }
    }, 600);
});
