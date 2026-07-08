// ===== CoinDrop Creator Management (Admin) =====
const CREATORS_API = 'https://coindrop-auth.up.railway.app';

// ── Fetch managed creators from server, merge into CREATORS, re-render ──────
async function fetchAndMergeCreators() {
    try {
        const res = await fetch(`${CREATORS_API}/api/creators/managed`);
        const data = await res.json();
        const managed = data.creators || [];
        if (managed.length === 0) return;

        const existingIds = new Set((window.CREATORS || []).map(c => c.id));
        let added = 0;
        managed.forEach(mc => {
            if (!existingIds.has(mc.id)) {
                (window.CREATORS || (window.CREATORS = [])).push({
                    id: mc.id,
                    handle: mc.handle,
                    name: mc.name,
                    platform: mc.platform || 'youtube',
                    avatar: mc.avatar || 'https://coindrop.in/assets/logo.png',
                    channelUrl: mc.channelUrl,
                    about: mc.about || '',
                    category: mc.category || 'Entertainment',
                    subscribers: mc.subscribers || 'Unknown',
                    videos: mc.videos || [],
                });
                added++;
            }
        });

        if (added > 0) {
            // Append new filter buttons
            const filtersContainer = document.getElementById('creator-filters');
            if (filtersContainer) {
                managed.filter(mc => !existingIds.has(mc.id)).forEach(mc => {
                    const btn = document.createElement('button');
                    btn.className = 'filter-btn';
                    btn.dataset.filter = mc.id;
                    btn.dataset.handle = mc.handle;
                    btn.innerHTML = `<i class="fab fa-youtube"></i> ${mc.handle}`;
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        if (typeof renderCreators === 'function') renderCreators(mc.id);
                        window.history.pushState({}, '', '/' + mc.handle);
                    });
                    filtersContainer.appendChild(btn);
                });
            }
            // Re-render the current view to include new creators
            if (typeof renderCreators === 'function') {
                const activeBtn = document.querySelector('.filter-btn.active');
                const currentFilter = activeBtn ? activeBtn.dataset.filter : 'all';
                renderCreators(currentFilter);
            }
        }
    } catch(e) {
        console.warn('fetchAndMergeCreators error:', e.message);
    }
}

// ── Admin panel: load managed creator list ──────────────────────────────────
async function loadManagedCreators() {
    const container = document.getElementById('managed-creators-list');
    if (!container) return;
    container.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading creators...</p>';
    try {
        const res = await fetch(`${CREATORS_API}/api/creators/managed`);
        const data = await res.json();
        const creators = data.creators || [];
        if (creators.length === 0) {
            container.innerHTML = '<p class="text-muted">No managed creators yet. Add one above.</p>';
            return;
        }
        container.innerHTML = creators.map(c => `
            <div style="display:flex;align-items:center;gap:14px;padding:14px;border:1px solid var(--gray-200);border-radius:10px;margin-bottom:10px;flex-wrap:wrap;">
                <img src="${c.avatar || 'https://coindrop.in/assets/logo.png'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.src='https://coindrop.in/assets/logo.png'">
                <div style="flex:1;min-width:0;">
                    <strong>${c.name}</strong> <span style="color:var(--gray-400);font-size:.85rem;">${c.handle}</span>
                    <br>
                    <small class="text-muted">
                        ${c.category} · ${c.subscribers} subs ·
                        <strong style="color:var(--orange);">${(c.videos || []).length} videos</strong>
                        ${c.channelId ? ` · Channel ID: <code>${c.channelId}</code>` : ' · <em>No Channel ID (RSS disabled)</em>'}
                        ${c.lastSynced ? ` · Synced ${new Date(c.lastSynced).toLocaleDateString()}` : ''}
                    </small>
                    <br>
                    <a href="${c.channelUrl}" target="_blank" style="font-size:.8rem;color:var(--orange);">${c.channelUrl}</a>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${c.channelId ? `<button class="btn btn-ghost" style="padding:5px 10px;font-size:.78rem;" onclick="refreshCreatorVideos('${c.id}',this)"><i class="fas fa-sync"></i> Refresh Videos</button>` : ''}
                    <button class="btn btn-ghost" style="color:#ef4444;border-color:#ef4444;padding:5px 10px;font-size:.78rem;" onclick="removeCreator('${c.id}',this)"><i class="fas fa-trash"></i> Remove</button>
                </div>
            </div>`).join('');
    } catch(e) {
        container.innerHTML = `<p class="text-muted">Error loading creators: ${e.message}</p>`;
    }
}

// ── Add creator ─────────────────────────────────────────────────────────────
async function addCreator() {
    const handle    = document.getElementById('new-creator-handle')?.value?.trim();
    const name      = document.getElementById('new-creator-name')?.value?.trim();
    const channelUrl = document.getElementById('new-creator-url')?.value?.trim();
    const channelId = document.getElementById('new-creator-channel-id')?.value?.trim();
    const avatar    = document.getElementById('new-creator-avatar')?.value?.trim();
    const about     = document.getElementById('new-creator-about')?.value?.trim();
    const category  = document.getElementById('new-creator-category')?.value?.trim();
    const subscribers = document.getElementById('new-creator-subscribers')?.value?.trim();
    const btn    = document.getElementById('add-creator-btn');
    const result = document.getElementById('add-creator-result');

    if (!handle || !name || !channelUrl) { alert('Handle, Name, and Channel URL are required.'); return; }

    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...'; }
    if (result) result.innerHTML = '';

    try {
        const res = await fetch(`${CREATORS_API}/api/admin/add-creator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, handle, name, channelUrl, channelId, avatar, about, category, subscribers }),
        });
        const data = await res.json();
        if (data.success) {
            const videoMsg = data.videosFound > 0 ? ` — ${data.videosFound} videos imported from YouTube RSS!` : channelId ? ' — No videos found (check Channel ID).' : ' — No Channel ID provided; add one to import videos.';
            if (result) result.innerHTML = `<div style="background:rgba(34,197,94,.1);border:1px solid #22c55e;border-radius:8px;padding:12px 16px;color:#15803d;margin-top:12px;"><i class="fas fa-check-circle"></i> <strong>Creator added!</strong>${videoMsg}</div>`;
            // Clear form
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

// ── Refresh videos ──────────────────────────────────────────────────────────
async function refreshCreatorVideos(creatorId, btn) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const res = await fetch(`${CREATORS_API}/api/admin/refresh-creator-videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, creatorId }),
        });
        const data = await res.json();
        if (data.success) {
            alert(`Refreshed! ${data.videosFound} videos imported.`);
            loadManagedCreators();
            fetchAndMergeCreators();
        } else {
            alert('Error: ' + data.error);
        }
    } catch(e) {
        alert('Network error: ' + e.message);
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Refresh Videos'; }
}

// ── Remove creator ──────────────────────────────────────────────────────────
async function removeCreator(creatorId, btn) {
    if (!confirm(`Remove this creator from CoinDrop? All their tasks will disappear from the platform.`)) return;
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
        const res = await fetch(`${CREATORS_API}/api/admin/remove-creator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, creatorId }),
        });
        const data = await res.json();
        if (data.success) {
            loadManagedCreators();
            // Remove from live CREATORS array too
            if (window.CREATORS) {
                const idx = window.CREATORS.findIndex(c => c.id === creatorId);
                if (idx !== -1) window.CREATORS.splice(idx, 1);
            }
            // Rebuild filter buttons & re-render
            const filtersContainer = document.getElementById('creator-filters');
            if (filtersContainer) {
                const btn = filtersContainer.querySelector(`[data-filter="${creatorId}"]`);
                if (btn) btn.remove();
            }
            if (typeof renderCreators === 'function') renderCreators('all');
        } else {
            alert('Error: ' + data.error);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Remove'; }
        }
    } catch(e) {
        alert('Network error: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Remove'; }
    }
}

// ── Auto-load managed creators on page start ────────────────────────────────
// Runs after dashboard.js has already called renderCreators() with hardcoded data
fetchAndMergeCreators();

// Wire admin tab
document.addEventListener('DOMContentLoaded', () => {
    const creatorsTab = document.querySelector('[data-tab="admin-creators"]');
    if (creatorsTab) creatorsTab.addEventListener('click', loadManagedCreators);
});
