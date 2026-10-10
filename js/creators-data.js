// ===== CoinDrop Creators =====
// Creators and their videos are owned by the server (GET /api/catalog), which refreshes them from
// YouTube on a schedule. This file only loads and caches that catalog, so every visitor sees the same data
// and nothing hardcoded can go stale.

const CREATORS = []; // mutated in place: other scripts hold a reference to this array

const CATALOG_URL = 'https://coindrop-auth.up.railway.app/api/catalog';
const CATALOG_CACHE_KEY = 'coindrop_catalog_v1';
let _catalogSig = '';

function _applyCatalog(list) {
    CREATORS.splice(0, CREATORS.length, ...list.map(c => ({ ...c, videos: Array.isArray(c.videos) ? c.videos : [] })));
}

// Instant first paint from the last catalog the server gave us (never a hardcoded list)
try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
    if (cached && Array.isArray(cached.creators) && cached.creators.length) {
        _applyCatalog(cached.creators);
        _catalogSig = JSON.stringify(cached.creators);
    }
} catch (e) {}

function _runCatalogHooks() {
    if (typeof buildFilterButtons === 'function') buildFilterButtons();
    if (typeof resolveInitialCreator === 'function') resolveInitialCreator();
    if (typeof refreshTaskBrowser === 'function') {
        refreshTaskBrowser();
    } else if (typeof renderCreators === 'function') {
        const activeBtn = document.querySelector('.filter-btn.active');
        renderCreators(activeBtn ? activeBtn.dataset.filter : 'all');
    }
    if (typeof updateEarningsBanner === 'function') updateEarningsBanner();
}

// Fetch the catalog (conditional request: 304 when nothing changed). Re-renders only if the data changed.
async function loadCatalog() {
    try {
        const res = await fetch(CATALOG_URL, { cache: 'no-cache' });
        if (!res.ok) return false;
        const data = await res.json();
        if (!Array.isArray(data.creators) || (!data.creators.length && CREATORS.length)) return false; // never blank a working page
        const sig = JSON.stringify(data.creators);
        if (sig === _catalogSig) return true;
        _catalogSig = sig;
        _applyCatalog(data.creators);
        try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ creators: data.creators })); } catch (e) {}
        _runCatalogHooks();
        return true;
    } catch (e) {
        console.warn('Catalog load skipped:', e.message);
        return false;
    }
}

if (document.readyState === 'complete') loadCatalog();
else window.addEventListener('load', () => loadCatalog());

// Pick up new videos / creators without a reload (cheap: usually a 304)
setInterval(() => { if (document.visibilityState === 'visible') loadCatalog(); }, 10 * 60 * 1000);
