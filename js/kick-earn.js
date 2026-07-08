// ===== CoinDrop Kick Live Earn =====
const KICK_API = 'https://coindrop-auth.up.railway.app';
const KICK_GREEN = '#53FC18';

let _kickSession = null;
let _kickCountdownId = null;
let _kickScreenshotData = null;

// ── Load active Kick promos ─────────────────────────────────────────────────
async function loadKickLivePromos() {
    const container = document.getElementById('kick-earn-promos');
    if (!container) return;
    try {
        const res = await fetch(`${KICK_API}/api/kick-promos/active`);
        const data = await res.json();
        const promos = data.promos || [];

        if (promos.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                    <span style="font-size:3rem;display:block;margin-bottom:16px;opacity:.4;color:${KICK_GREEN};">▶</span>
                    <h3 style="color:var(--navy);">No Kick Events Right Now</h3>
                    <p style="max-width:360px;margin:8px auto;">Kick flash earn events are created when a featured creator goes live. Check your notifications and come back soon!</p>
                </div>`;
            return;
        }

        container.innerHTML = promos.map(p => `
            <div class="creator-section" style="margin-bottom:20px;padding:20px;border:2px solid ${KICK_GREEN};border-radius:12px;background:linear-gradient(135deg,rgba(83,252,24,.06),transparent);">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                    <div style="background:#0e0e10;border:2px solid ${KICK_GREEN};border-radius:10px;padding:14px;flex-shrink:0;">
                        <span style="font-size:1.8rem;font-weight:900;color:${KICK_GREEN};font-family:sans-serif;">K</span>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <h3 style="margin:0;font-size:1.15rem;">${p.streamerName}</h3>
                            <span style="background:#ef4444;color:#fff;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700;animation:pulse 1.5s infinite;">● LIVE</span>
                        </div>
                        <p style="margin:4px 0 0;color:var(--gray-400);font-size:.85rem;"><a href="${p.kickUrl}" target="_blank" style="color:${KICK_GREEN};">${p.kickUrl}</a></p>
                        <p style="margin:6px 0 0;font-size:.85rem;">Earn <strong style="color:var(--orange);">$${p.rewardPerMin.toFixed(2)}/min</strong> — submit a screenshot every 60 seconds</p>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                        <a href="${p.kickUrl}" target="_blank" class="btn btn-ghost" style="background:#0e0e10;color:${KICK_GREEN};border-color:${KICK_GREEN};">
                            ▶ Watch on Kick
                        </a>
                        <button class="btn btn-primary" onclick="startKickSession('${p.id}','${p.kickUrl}','${p.streamerName.replace(/'/g,"\\'")}',${p.rewardPerMin})">
                            <i class="fas fa-camera"></i> Start Earning
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = `<p class="text-muted"><i class="fas fa-exclamation-circle"></i> Could not load Kick events. Try refreshing.</p>`;
    }
}

// ── Start session ───────────────────────────────────────────────────────────
function startKickSession(promoId, kickUrl, streamerName, rewardPerMin) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.walletAddress) {
        if (confirm('You need a Phantom wallet connected to earn payouts. Set it up now?')) openWalletModal();
        return;
    }
    _kickSession = { promoId, kickUrl, streamerName, rewardPerMin, autoValidate: false, intervalId: null, submissionCount: 0, totalEarned: 0, lastVerifiedAt: null };
    renderKickModal();
}

function renderKickModal() {
    document.getElementById('kick-modal')?.remove();
    const s = _kickSession;
    const modal = document.createElement('div');
    modal.id = 'kick-modal';
    modal.className = 'task-modal-overlay';
    modal.innerHTML = `
        <div class="task-modal" style="max-width:520px;">
            <button class="task-modal-close" onclick="closeKickModal()">&times;</button>
            <div class="task-modal-header" style="background:linear-gradient(135deg,#0e0e10,#1a2a0a);border-radius:12px 12px 0 0;padding:20px 28px;">
                <div class="task-modal-badge subscribe" style="background:${KICK_GREEN};color:#0e0e10;">▶ KICK LIVE EARN</div>
                <h3 style="color:white;margin:8px 0 4px;">${s.streamerName}</h3>
                <p style="color:rgba(255,255,255,.7);margin:0;font-size:.85rem;">Earn <strong style="color:#F7931A;">$${s.rewardPerMin.toFixed(2)}/min</strong> · Submit 1 screenshot per minute</p>
            </div>
            <div style="padding:20px 28px;">
                <div style="display:flex;gap:20px;margin-bottom:20px;padding:14px;background:var(--navy-dark);border-radius:8px;color:white;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:1.4rem;font-weight:700;color:var(--orange);" id="ks-submissions">0</div>
                        <div style="font-size:.72rem;opacity:.7;">Verified</div>
                    </div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:1.4rem;font-weight:700;color:#22c55e;" id="ks-earned">$0.00</div>
                        <div style="font-size:.72rem;opacity:.7;">Earned</div>
                    </div>
                    <div style="text-align:center;flex:1;" id="ks-countdown-block" style="display:none;">
                        <div style="font-size:1.4rem;font-weight:700;" id="ks-countdown" style="color:${KICK_GREEN};">—</div>
                        <div style="font-size:.72rem;opacity:.7;">Next prompt</div>
                    </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(83,252,24,.06);border:1px solid rgba(83,252,24,.3);border-radius:8px;margin-bottom:16px;">
                    <div>
                        <strong style="font-size:.9rem;">Auto-Validation</strong>
                        <p style="margin:2px 0 0;font-size:.78rem;color:var(--gray-400);">Automatically prompts you every 60s to upload a screenshot</p>
                    </div>
                    <label style="display:flex;align-items:center;cursor:pointer;gap:8px;">
                        <div style="position:relative;width:44px;height:24px;">
                            <input type="checkbox" id="kick-auto-toggle" onchange="toggleKickAutoValidate(this.checked)" style="opacity:0;width:0;height:0;position:absolute;">
                            <span id="kick-toggle-track" style="position:absolute;inset:0;background:#ccc;border-radius:12px;transition:.3s;cursor:pointer;" onclick="document.getElementById('kick-auto-toggle').click()"></span>
                            <span id="kick-toggle-thumb" style="position:absolute;left:2px;top:2px;width:20px;height:20px;background:white;border-radius:50%;transition:.3s;pointer-events:none;"></span>
                        </div>
                        <span id="kick-auto-label" style="font-size:.8rem;color:var(--gray-400);">OFF</span>
                    </label>
                </div>

                <div id="kick-upload-area" style="border:2px dashed var(--gray-200);border-radius:10px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s;" onclick="document.getElementById('kick-file-input').click()">
                    <i class="fas fa-camera" style="font-size:1.8rem;color:var(--gray-300);display:block;margin-bottom:8px;"></i>
                    <p style="margin:0;color:var(--gray-400);font-size:.88rem;">Click to upload screenshot<br><small>Show: kick.com URL · LIVE badge · System clock</small></p>
                    <img id="kick-preview" style="display:none;max-width:100%;max-height:160px;margin-top:12px;border-radius:6px;" alt="preview">
                    <input type="file" id="kick-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="handleKickFile(this)">
                </div>

                <div id="kick-result" style="margin-top:12px;display:none;"></div>

                <button id="kick-verify-btn" class="btn btn-primary btn-block" style="margin-top:16px;background:#0e0e10;border-color:${KICK_GREEN};color:${KICK_GREEN};" onclick="submitKickScreenshot()" disabled>
                    ▶ Verify Screenshot — Earn $${s.rewardPerMin.toFixed(2)}
                </button>
                <p style="text-align:center;margin-top:10px;font-size:.75rem;color:var(--gray-400);">
                    <i class="fas fa-info-circle"></i> Each screenshot must show kick.com URL, a LIVE indicator, and your system clock. Each submission must be at least 50 seconds newer than the last.
                </p>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeKickModal(); });
}

function handleKickFile(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { alert('Max 6MB'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        _kickScreenshotData = e.target.result;
        const preview = document.getElementById('kick-preview');
        const area = document.getElementById('kick-upload-area');
        if (preview) { preview.src = _kickScreenshotData; preview.style.display = 'block'; }
        if (area) { area.style.borderColor = KICK_GREEN; area.style.borderStyle = 'solid'; }
        const btn = document.getElementById('kick-verify-btn');
        if (btn) btn.disabled = false;
    };
    reader.readAsDataURL(file);
}

async function submitKickScreenshot() {
    if (!_kickScreenshotData || !_kickSession) return;
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    const btn = document.getElementById('kick-verify-btn');
    const resultDiv = document.getElementById('kick-result');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI Verifying...'; }
    try {
        const res = await fetch(`${KICK_API}/api/verify-kick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ screenshot: _kickScreenshotData, promoId: _kickSession.promoId, userId: user.id, username: user.username || user.displayName || '' }),
        });
        const data = await res.json();
        if (data.verified) {
            _kickSession.submissionCount++;
            _kickSession.totalEarned += data.rewardUSD || _kickSession.rewardPerMin;
            _kickSession.lastVerifiedAt = new Date().toISOString();
            const subEl = document.getElementById('ks-submissions');
            const earnEl = document.getElementById('ks-earned');
            if (subEl) subEl.textContent = _kickSession.submissionCount;
            if (earnEl) earnEl.textContent = `$${_kickSession.totalEarned.toFixed(2)}`;
            if (resultDiv) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `<div style="background:rgba(83,252,24,.1);border:1px solid ${KICK_GREEN};border-radius:8px;padding:12px 16px;color:#15803d;">
                    <i class="fas fa-check-circle"></i> <strong>Verified! +$${(data.rewardUSD || _kickSession.rewardPerMin).toFixed(2)}</strong>
                    ${data.payoutSuccess ? ' — Sent to your wallet!' : ' — Added to payout queue'}
                    <br><small style="opacity:.75;">${data.reason}</small>
                </div>`;
            }
            _kickScreenshotData = null;
            const preview = document.getElementById('kick-preview');
            const area = document.getElementById('kick-upload-area');
            if (preview) preview.style.display = 'none';
            if (area) { area.style.borderColor = 'var(--gray-200)'; area.style.borderStyle = 'dashed'; }
        } else {
            if (resultDiv) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `<div style="background:rgba(239,68,68,.08);border:1px solid #ef4444;border-radius:8px;padding:12px 16px;color:#dc2626;">
                    <i class="fas fa-times-circle"></i> <strong>Not Verified</strong> — ${data.reason}
                    <br><small style="opacity:.75;">Tip: Make sure your system clock, kick.com URL, and LIVE badge are all visible.</small>
                </div>`;
            }
        }
    } catch(e) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `<div style="background:rgba(239,68,68,.08);border:1px solid #ef4444;border-radius:8px;padding:12px 16px;color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> Connection error. Please try again.</div>`;
        }
    }
    if (btn) { btn.disabled = !_kickScreenshotData; btn.innerHTML = `▶ Verify Screenshot — Earn $${_kickSession?.rewardPerMin?.toFixed(2) || '0.02'}`; }
}

function toggleKickAutoValidate(enabled) {
    if (!_kickSession) return;
    _kickSession.autoValidate = enabled;
    const track = document.getElementById('kick-toggle-track');
    const thumb = document.getElementById('kick-toggle-thumb');
    const label = document.getElementById('kick-auto-label');
    const countdownBlock = document.getElementById('ks-countdown-block');
    if (track) track.style.background = enabled ? KICK_GREEN : '#ccc';
    if (thumb) thumb.style.left = enabled ? '22px' : '2px';
    if (label) { label.textContent = enabled ? 'ON' : 'OFF'; label.style.color = enabled ? KICK_GREEN : 'var(--gray-400)'; }
    if (countdownBlock) countdownBlock.style.display = enabled ? '' : 'none';
    clearInterval(_kickCountdownId);
    if (enabled) startKickAutoValidateCountdown();
}

function startKickAutoValidateCountdown() {
    if (!_kickSession?.autoValidate) return;
    let secs = 60;
    const countEl = document.getElementById('ks-countdown');
    const update = () => {
        if (!_kickSession?.autoValidate) return;
        if (countEl) countEl.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
        if (secs <= 0) { clearInterval(_kickCountdownId); pulseKickUploadArea(); secs = 60; _kickCountdownId = setInterval(update, 1000); }
        else secs--;
    };
    _kickCountdownId = setInterval(update, 1000);
}

function pulseKickUploadArea() {
    const area = document.getElementById('kick-upload-area');
    if (!area) return;
    area.style.borderColor = KICK_GREEN;
    area.style.borderStyle = 'solid';
    area.style.boxShadow = `0 0 0 4px rgba(83,252,24,.3)`;
    const resultDiv = document.getElementById('kick-result');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<div style="background:rgba(83,252,24,.1);border:1px solid ${KICK_GREEN};border-radius:8px;padding:10px 14px;color:#15803d;font-weight:600;">
            <i class="fas fa-camera fa-pulse"></i> ⏱ Time to submit your next screenshot! Upload now to earn $${_kickSession?.rewardPerMin?.toFixed(2) || '0.02'}.
        </div>`;
    }
    setTimeout(() => { if (area) { area.style.borderStyle = 'dashed'; area.style.boxShadow = ''; } }, 3000);
}

function closeKickModal() {
    clearInterval(_kickCountdownId);
    _kickSession = null;
    _kickScreenshotData = null;
    document.getElementById('kick-modal')?.remove();
}

// ── Admin: Kick Flash Promo management ─────────────────────────────────────
function autoFillKickStreamerName() {
    const urlInput = document.getElementById('flash-kick-url');
    const nameInput = document.getElementById('flash-kick-streamer-name');
    if (!urlInput || !nameInput) return;
    try {
        const url = new URL(urlInput.value.trim());
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) nameInput.value = parts[0];
    } catch(e) {}
}

async function createKickFlashPromo() {
    const kickUrl = document.getElementById('flash-kick-url')?.value?.trim();
    const streamerName = document.getElementById('flash-kick-streamer-name')?.value?.trim();
    const rewardPerMin = parseFloat(document.getElementById('flash-kick-reward')?.value) || 0.02;
    const btn = document.getElementById('create-kick-promo-btn');
    const result = document.getElementById('flash-kick-promo-result');
    if (!kickUrl || !streamerName) { alert('Please enter a Kick URL and streamer name.'); return; }
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Launching...'; }
    try {
        const res = await fetch(`${KICK_API}/api/admin/create-kick-promo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, kickUrl, streamerName, rewardPerMin }),
        });
        const data = await res.json();
        if (data.success) {
            if (result) result.innerHTML = `<div style="background:rgba(83,252,24,.1);border:1px solid ${KICK_GREEN};border-radius:8px;padding:12px 16px;color:#15803d;"><i class="fas fa-check-circle"></i> <strong>Kick Flash Event Launched!</strong> Discord alert sent. Users notified on next dashboard load.</div>`;
            loadAdminKickPromos();
        } else {
            if (result) result.innerHTML = `<div style="color:#dc2626;padding:10px;">Error: ${data.error}</div>`;
        }
    } catch(e) {
        if (result) result.innerHTML = `<div style="color:#dc2626;padding:10px;">Network error: ${e.message}</div>`;
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '▶ Launch Kick Flash Event'; }
}

async function loadAdminKickPromos() {
    const container = document.getElementById('admin-active-kick-promos');
    if (!container) return;
    try {
        const res = await fetch(`${KICK_API}/api/kick-promos/active`);
        const data = await res.json();
        const promos = data.promos || [];
        if (promos.length === 0) { container.innerHTML = '<p class="text-muted">No active Kick promos.</p>'; return; }
        const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
        container.innerHTML = promos.map(p => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--gray-200);border-radius:8px;margin-bottom:8px;">
                <span style="font-size:1.2rem;font-weight:900;color:${KICK_GREEN};">K</span>
                <div style="flex:1;">
                    <strong>${p.streamerName}</strong> — $${p.rewardPerMin.toFixed(2)}/min
                    <br><small class="text-muted"><a href="${p.kickUrl}" target="_blank">${p.kickUrl}</a> · Created ${new Date(p.createdAt).toLocaleTimeString()}</small>
                </div>
                <button class="btn btn-ghost" style="color:#ef4444;border-color:#ef4444;padding:4px 10px;font-size:.78rem;" onclick="deactivateKickPromo('${p.id}')">
                    <i class="fas fa-stop"></i> End
                </button>
            </div>`).join('');
    } catch(e) { container.innerHTML = '<p class="text-muted">Could not load Kick promos.</p>'; }
}

async function deactivateKickPromo(promoId) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    await fetch(`${KICK_API}/api/admin/deactivate-kick-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, promoId }),
    });
    loadAdminKickPromos();
    loadKickLivePromos();
}

// ── Wire up tabs ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const kickTab = document.querySelector('[data-tab="kick-live"]');
    if (kickTab) kickTab.addEventListener('click', loadKickLivePromos);
    const kickFlashTab = document.querySelector('[data-tab="admin-kick"]');
    if (kickFlashTab) kickFlashTab.addEventListener('click', loadAdminKickPromos);
});
