// ===== CoinDrop Creator Management (Admin) =====
const CREATORS_API = 'https://coindrop-auth.up.railway.app';

// Snapshot of hardcoded creators BEFORE any filtering (taken at script load time)
const _allHardcodedCreators = window.CREATORS ? [...window.CREATORS] : [];

// ── Boot: filter removed creators, merge managed ones, prime view-count cache ─
async function fetchAndMergeCreators() {
    try {
        const [managedRes, removedRes] = await Promise.all([
            fetch(`${CREATORS_API}/api/creators/managed`),
            fetch(`${CREATORS_API}/api/creators/removed`),
        ]);
        const managed  = ((await managedRes.json()).creators  || []);
        const removedIds = new Set(((await removedRes.json()).removedIds || []));

        // 1. Remove hidden creators from the live CREATORS array (mutate in place)
        for (let i = window.CREATORS.length - 1; i >= 0; i--) {
            if (removedIds.has(window.CREATORS[i].id)) window.CREATORS.splice(i, 1);
        }

        // 2. Merge managed creators that aren't already present and aren't removed
        const existingIds = new Set(window.CREATORS.map(c => c.id));
        let added = 0;
        managed.filter(mc => !removedIds.has(mc.id) && !existingIds.has(mc.id)).forEach(mc => {
            window.CREATORS.push({
                id: mc.id, handle: mc.handle, name: mc.name,
                platform: mc.platform || 'youtube',
                avatar: mc.avatar || 'https://coindrop.in/assets/logo.png',
                channelUrl: mc.channelUrl, about: mc.about || '',
                category: mc.category || 'Entertainment',
                subscribers: mc.subscribers || 'Unknown',
                videos: mc.videos || [],
            });
            added++;
        });

        // 3. Rebuild filter buttons + re-render task browser
        if (typeof buildFilterButtons === 'function') buildFilterButtons();
        if (typeof renderCreators === 'function') {
            const activeBtn = document.querySelector('.filter-btn.active');
            renderCreators(activeBtn?.dataset.filter || 'all');
        }

        // 4. Tell server which handles we have (so it can auto-discover channel IDs + prime cache)
        const handles = window.CREATORS.map(c => c.handle);
        fetch(`${CREATORS_API}/api/creators/register-handles`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handles }),
        }).catch(() => {});

        // 5. Update earnings potential banner to reflect current creator/video counts
        if (typeof updateEarningsBanner === 'function') updateEarningsBanner();

    } catch(e) { console.warn('fetchAndMergeCreators:', e.message); }
}

// ── Lazy view-count update (fires after first render, updates DOM in place) ──
async function lazyLoadViewCounts() {
    try {
        const res = await fetch(`${CREATORS_API}/api/creators/view-counts`);
        const data = await res.json();
        const counts = data.counts || {};
        if (!Object.keys(counts).length) return;
        document.querySelectorAll('.video-task-meta[data-video-id]').forEach(el => {
            const id = el.dataset.videoId;
            if (counts[id] && counts[id] !== '0') el.textContent = counts[id] + ' views';
        });
    } catch(e) {}
}

// ── Admin panel: load ALL creators (hardcoded + managed) with status ─────────
async function loadManagedCreators() {
    const container = document.getElementById('managed-creators-list');
    if (!container) return;
    container.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading creators...</p>';
    try {
        const [managedRes, removedRes] = await Promise.all([
            fetch(`${CREATORS_API}/api/creators/managed`),
            fetch(`${CREATORS_API}/api/creators/removed`),
        ]);
        const managedCreators = ((await managedRes.json()).creators || []);
        const removedIds = new Set(((await removedRes.json()).removedIds || []));
        const managedIds = new Set(managedCreators.map(c => c.id));

        // Combine: all hardcoded + all managed (deduped by id)
        const hardcodedWithStatus = _allHardcodedCreators.map(c => ({ ...c, isManaged: false }));
        const managedOnly = managedCreators.filter(mc => !_allHardcodedCreators.find(h => h.id === mc.id)).map(mc => ({ ...mc, isManaged: true }));
        const allCreators = [...hardcodedWithStatus, ...managedOnly];

        if (!allCreators.length) {
            container.innerHTML = '<p class="text-muted">No creators found.</p>';
            return;
        }

        container.innerHTML = allCreators.map(c => {
            const isRemoved = removedIds.has(c.id);
            const videoCount = (c.videos || []).length;
            return `
            <div style="display:flex;align-items:center;gap:14px;padding:14px;border:1px solid ${isRemoved ? '#fca5a5' : 'var(--gray-200)'};border-radius:10px;margin-bottom:10px;flex-wrap:wrap;opacity:${isRemoved ? '.6' : '1'};background:${isRemoved ? 'rgba(239,68,68,.04)' : ''};">
                <img src="${c.avatar || 'https://coindrop.in/assets/logo.png'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.src='https://coindrop.in/assets/logo.png'">
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <strong>${c.name}</strong>
                        <span style="color:var(--gray-400);font-size:.85rem;">${c.handle}</span>
                        <span style="font-size:.72rem;padding:2px 8px;border-radius:12px;background:${c.isManaged ? 'rgba(247,147,26,.12)' : 'rgba(59,130,246,.12)'};color:${c.isManaged ? '#F7931A' : '#3b82f6'};">${c.isManaged ? 'Managed' : 'Built-in'}</span>
                        ${isRemoved ? '<span style="font-size:.72rem;padding:2px 8px;border-radius:12px;background:rgba(239,68,68,.12);color:#ef4444;">Hidden</span>' : ''}
                    </div>
                    <small class="text-muted">
                        ${c.category || ''} · ${c.subscribers || '?'} subs ·
                        <strong style="color:${videoCount > 0 ? 'var(--orange)' : 'var(--gray-400)'};">${videoCount} videos</strong>
                    </small>
                    <br>
                    <a href="${c.channelUrl}" target="_blank" style="font-size:.8rem;color:var(--orange);">${c.channelUrl}</a>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    ${c.isManaged && !isRemoved ? `<button class="btn btn-ghost" style="padding:5px 10px;font-size:.78rem;" onclick="refreshCreatorVideos('${c.id}',this)"><i class="fas fa-sync"></i> Refresh</button>` : ''}
                    ${isRemoved
                        ? `<button class="btn btn-ghost" style="color:#22c55e;border-color:#22c55e;padding:5px 10px;font-size:.78rem;" onclick="restoreCreator('${c.id}',this)"><i class="fas fa-undo"></i> Restore</button>`
                        : `<button class="btn btn-ghost" style="color:#ef4444;border-color:#ef4444;padding:5px 10px;font-size:.78rem;" onclick="removeCreatorAdmin('${c.id}',${c.isManaged},this)"><i class="fas fa-eye-slash"></i> Remove</button>`
                    }
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        container.innerHTML = `<p class="text-muted">Error loading creators: ${e.message}</p>`;
    }
}

// ── Add creator ──────────────────────────────────────────────────────────────
async function addCreator() {
    const handle      = document.getElementById('new-creator-handle')?.value?.trim();
    const name        = document.getElementById('new-creator-name')?.value?.trim();
    const channelUrl  = document.getElementById('new-creator-url')?.value?.trim();
    const channelId   = document.getElementById('new-creator-channel-id')?.value?.trim();
    const avatar      = document.getElementById('new-creator-avatar')?.value?.trim();
    const about       = document.getElementById('new-creator-about')?.value?.trim();
    const category    = document.getElementById('new-creator-category')?.value?.trim();
    const subscribers = document.getElementById('new-creator-subscribers')?.value?.trim();
    const btn    = document.getElementById('add-creator-btn');
    const result = document.getElementById('add-creator-result');
    if (!handle || !name || !channelUrl) { alert('Handle, Name, and Channel URL are required.'); return; }
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...'; }
    if (result) result.innerHTML = '';
    try {
        const res = await fetch(`${CREATORS_API}/api/admin/add-creator`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, handle, name, channelUrl, channelId, avatar, about, category, subscribers }),
        });
        const data = await res.json();
        if (data.success) {
            const videoMsg = data.videosFound > 0 ? ` ${data.videosFound} videos imported!` : channelId ? ' No videos found — check Channel ID.' : ' Add a Channel ID to auto-import videos.';
            if (result) result.innerHTML = `<div style="background:rgba(34,197,94,.1);border:1px solid #22c55e;border-radius:8px;padding:12px 16px;color:#15803d;margin-top:12px;"><i class="fas fa-check-circle"></i> <strong>Creator added!</strong>${videoMsg}</div>`;
            ['new-creator-handle','new-creator-name','new-creator-url','new-creator-channel-id','new-creator-avatar','new-creator-about','new-creator-subscribers'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            loadManagedCreators();
            fetchAndMergeCreators();
        } else {
            if (result) result.innerHTML = `<div style="color:#dc2626;padding:10px;background:rgba(239,68,68,.08);border-radius:8px;margin-top:10px;">Error: ${data.error}</div>`;
        }
    } catch(e) {
        if (result) result.innerHTML = `<div style="color:#dc2626;padding:10px;background:rgba(239,68,68,.08);border-radius:8px;margin-top:10px;">Network error: ${e.message}</div>`;
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Add Creator'; }
}

// ── Remove creator (hardcoded or managed) ────────────────────────────────────
async function removeCreatorAdmin(creatorId, isManaged, btn) {
    if (!confirm(`Hide "${creatorId}" from CoinDrop? All their tasks will disappear. You can restore them anytime.`)) return;
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const res = await fetch(`${CREATORS_API}/api/admin/remove-creator`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, creatorId, isManaged }),
        });
        const data = await res.json();
        if (data.success) {
            // Remove from live CREATORS array in place
            for (let i = window.CREATORS.length - 1; i >= 0; i--) {
                if (window.CREATORS[i].id === creatorId) window.CREATORS.splice(i, 1);
            }
            if (typeof buildFilterButtons === 'function') buildFilterButtons();
            if (typeof renderCreators === 'function') renderCreators('all');
            if (typeof updateEarningsBanner === 'function') updateEarningsBanner();
            loadManagedCreators();
        } else {
            alert('Error: ' + data.error);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-eye-slash"></i> Remove'; }
        }
    } catch(e) {
        alert('Network error: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-eye-slash"></i> Remove'; }
    }
}

// ── Restore a hidden creator ─────────────────────────────────────────────────
async function restoreCreator(creatorId, btn) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const res = await fetch(`${CREATORS_API}/api/admin/restore-creator`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, creatorId }),
        });
        const data = await res.json();
        if (data.success) {
            loadManagedCreators();
            fetchAndMergeCreators(); // re-adds the restored creator to live CREATORS
        } else {
            alert('Error: ' + data.error);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-undo"></i> Restore'; }
        }
    } catch(e) {
        alert('Network error: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-undo"></i> Restore'; }
    }
}

// ── Refresh videos for a managed creator ────────────────────────────────────
async function refreshCreatorVideos(creatorId, btn) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const res = await fetch(`${CREATORS_API}/api/admin/refresh-creator-videos`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, creatorId }),
        });
        const data = await res.json();
        if (data.success) {
            alert(`Refreshed! ${data.videosFound} videos imported.`);
            fetchAndMergeCreators();
            loadManagedCreators();
        } else { alert('Error: ' + data.error); }
    } catch(e) { alert('Network error: ' + e.message); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Refresh'; }
}

// ── Boot sequence ────────────────────────────────────────────────────────────
// 1. Filter removed / merge managed (runs after dashboard.js initial render)
fetchAndMergeCreators().then(() => {
    // 2. Lazy-update stale view counts in the background — no blocking, no spinners
    setTimeout(lazyLoadViewCounts, 1500);
});

// Wire admin tab
document.addEventListener('DOMContentLoaded', () => {
    const creatorsTab = document.querySelector('[data-tab="admin-creators"]');
    if (creatorsTab) creatorsTab.addEventListener('click', loadManagedCreators);
});
