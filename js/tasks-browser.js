// ===== CoinDrop Tasks Browser — Creator Card Hero Layout =====
const TASKS_BROWSER_API = 'https://coindrop-auth.up.railway.app';

let _tbFeaturedIds = new Set();
let _tbShuffledCreators = [];
let _tbAutoShuffleTimer = null;
let _tbCurrentDetailId = null;
let _tbInitialized = false;

// ── URL helpers ───────────────────────────────────────────────────────────────
function _tbCreatorUrl(creatorId) {
    const u = new URL(location.href);
    u.searchParams.set('c', creatorId);
    return u.toString();
}

function _tbPushCreatorUrl(creatorId) {
    history.pushState({ c: creatorId }, '', _tbCreatorUrl(creatorId));
}

function _tbClearCreatorUrl() {
    const u = new URL(location.href);
    u.searchParams.delete('c');
    history.pushState({}, '', u.toString());
}

// ── Public: initialize the card browser (fetches featured IDs then renders) ──
async function initTaskBrowser() {
    _tbShuffledCreators = _tbShuffle([...(CREATORS || [])]);
    _tbRenderCardBrowser();

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

    // If URL already has ?c= when the browser lands on Tasks tab, open that creator
    const initC = new URLSearchParams(location.search).get('c');
    if (initC) openCreatorDetail(initC);
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
    const shareUrl = _tbCreatorUrl(creator.id);

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
            <a class="cc-cta-btn" href="${shareUrl}"
               onclick="event.preventDefault(); openCreatorDetail('${creator.id}')">
                Explore Tasks <i class="fas fa-arrow-right"></i>
            </a>
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

    // Update URL so the page is shareable / bookmarkable
    _tbPushCreatorUrl(creatorId);

    // Make sure the Tasks tab is visible
    const tasksTab = document.getElementById('tab-tasks');
    if (tasksTab && !tasksTab.classList.contains('active')) {
        document.querySelector('[data-tab="tasks"]')?.click();
    }

    document.getElementById('creator-card-browser').style.display = 'none';
    document.getElementById('creator-detail-view').style.display = '';

    const meta = document.getElementById('creator-detail-meta');
    if (meta) {
        const avatar = creator.avatar || 'https://coindrop.in/assets/logo.png';
        const videos = (creator.videos || []).length;
        const isFeatured = _tbFeaturedIds.has(creator.id);
        const shareUrl = _tbCreatorUrl(creatorId);
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
                <button class="btn btn-ghost cdd-share-btn" title="Copy shareable link"
                        onclick="tbCopyLink('${shareUrl}', this)">
                    <i class="fas fa-link"></i> Share
                </button>
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
    _tbClearCreatorUrl();
    document.getElementById('creator-card-browser').style.display = '';
    document.getElementById('creator-detail-view').style.display = 'none';
    const list = document.getElementById('creators-list');
    if (list) list.innerHTML = '';
    _tbStartAutoShuffle();
}

// ── Copy shareable link ───────────────────────────────────────────────────────
function tbCopyLink(url, btn) {
    navigator.clipboard.writeText(url).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.color = '#22c55e';
        setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
    }).catch(() => {
        prompt('Copy this link to share with fans:', url);
    });
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Wire Tasks tab click
    const tasksNavBtn = document.querySelector('[data-tab="tasks"]');
    if (tasksNavBtn) {
        tasksNavBtn.addEventListener('click', () => {
            if (!_tbInitialized) initTaskBrowser();
            else {
                _tbShuffledCreators = _tbShuffle([...(CREATORS || [])]);
                _tbRenderCardBrowser();
                // Re-open creator detail if URL still has ?c=
                const c = new URLSearchParams(location.search).get('c');
                if (c && !_tbCurrentDetailId) openCreatorDetail(c);
            }
        });
    }

    // Browser back/forward: sync detail view with URL
    window.addEventListener('popstate', () => {
        const c = new URLSearchParams(location.search).get('c');
        if (c) {
            openCreatorDetail(c);
        } else if (_tbCurrentDetailId) {
            // Back pressed while in detail view — restore card browser without pushing new state
            _tbCurrentDetailId = null;
            document.getElementById('creator-card-browser').style.display = '';
            document.getElementById('creator-detail-view').style.display = 'none';
            const list = document.getElementById('creators-list');
            if (list) list.innerHTML = '';
            _tbStartAutoShuffle();
        }
    });

    // Auto-init if tasks tab is already active (default tab or deep-link)
    // If ?c= is in URL, switch to Tasks tab and open the creator
    const initC = new URLSearchParams(location.search).get('c');
    if (initC) {
        setTimeout(() => {
            // Navigate to Tasks tab first
            document.querySelector('[data-tab="tasks"]')?.click();
            // If init didn't fire yet, trigger it and it will auto-open on finish
            if (!_tbInitialized) initTaskBrowser();
            else openCreatorDetail(initC);
        }, 700);
    } else {
        setTimeout(() => {
            const tasksTab = document.getElementById('tab-tasks');
            if (tasksTab && tasksTab.classList.contains('active')) {
                if (!_tbInitialized) initTaskBrowser();
            }
        }, 600);
    }
});
