// ===== CoinDrop Twitch Live Earn =====
const TWITCH_API = 'https://coindrop-auth.up.railway.app';

let _twitchSession = null; // { promoId, twitchUrl, streamerName, rewardPerMin, autoValidate, intervalId, submissionCount, totalEarned, lastVerifiedAt }
let _twitchCountdownId = null;

// ── Load active promos into the Live Earn tab ──────────────────────────────
async function loadLivePromos() {
    const container = document.getElementById('live-earn-promos');
    if (!container) return;
    try {
        const res = await fetch(`${TWITCH_API}/api/twitch-promos/active`);
        const data = await res.json();
        const promos = data.promos || [];

        if (promos.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                    <i class="fab fa-twitch" style="font-size:3rem;color:#9146FF;opacity:.4;display:block;margin-bottom:16px;"></i>
                    <h3 style="color:var(--navy);">No Live Events Right Now</h3>
                    <p style="max-width:360px;margin:8px auto;">Flash earn events are created by the CoinDrop team when a featured creator goes live. Check back soon or watch your notifications!</p>
                </div>`;
            return;
        }

        container.innerHTML = promos.map(p => `
            <div class="creator-section" style="margin-bottom:20px;padding:20px;border:2px solid #9146FF;border-radius:12px;background:linear-gradient(135deg,rgba(145,70,255,.06),transparent);">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                    <div style="background:#9146FF;border-radius:10px;padding:14px;flex-shrink:0;">
                        <i class="fab fa-twitch" style="font-size:2rem;color:white;"></i>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <h3 style="margin:0;font-size:1.15rem;">${p.streamerName}</h3>
                            <span style="background:#ef4444;color:#fff;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700;animation:pulse 1.5s infinite;">● LIVE</span>
                        </div>
                        <p style="margin:4px 0 0;color:var(--gray-400);font-size:.85rem;"><a href="${p.twitchUrl}" target="_blank" style="color:#9146FF;">${p.twitchUrl}</a></p>
                        <p style="margin:6px 0 0;font-size:.85rem;">Earn <strong style="color:var(--orange);">$${p.rewardPerMin.toFixed(2)}/min</strong> — submit a screenshot every 60 seconds</p>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                        <a href="${p.twitchUrl}" target="_blank" class="btn btn-ghost" style="background:#9146FF;color:white;border-color:#9146FF;">
                            <i class="fab fa-twitch"></i> Watch Live
                        </a>
                        <button class="btn btn-primary" onclick="startTwitchSession('${p.id}','${p.twitchUrl}','${p.streamerName.replace(/'/g,"\\'")}',${p.rewardPerMin})">
                            <i class="fas fa-camera"></i> Start Earning
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = `<p class="text-muted"><i class="fas fa-exclamation-circle"></i> Could not load live events. Try refreshing.</p>`;
    }
}

// ── Open Twitch earning session ────────────────────────────────────────────
function startTwitchSession(promoId, twitchUrl, streamerName, rewardPerMin) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.walletAddress) {
        if (confirm('You need a Phantom wallet connected to earn payouts. Set it up now?')) openWalletModal();
        return;
    }

    _twitchSession = { promoId, twitchUrl, streamerName, rewardPerMin, autoValidate: false, intervalId: null, submissionCount: 0, totalEarned: 0, lastVerifiedAt: null };
    renderTwitchModal();
}

// ── Build the session modal ────────────────────────────────────────────────
function renderTwitchModal() {
    document.getElementById('twitch-modal')?.remove();
    const s = _twitchSession;
    const modal = document.createElement('div');
    modal.id = 'twitch-modal';
    modal.className = 'task-modal-overlay';
    modal.innerHTML = `
        <div class="task-modal" style="max-width:520px;">
            <button class="task-modal-close" onclick="closeTwitchModal()">&times;</button>
            <div class="task-modal-header" style="background:linear-gradient(135deg,#1a0533,#2d1057);border-radius:12px 12px 0 0;padding:20px 28px;">
                <div class="task-modal-badge subscribe" style="background:#9146FF;"><i class="fab fa-twitch"></i> LIVE EARN</div>
                <h3 style="color:white;margin:8px 0 4px;">${s.streamerName}</h3>
                <p style="color:rgba(255,255,255,.7);margin:0;font-size:.85rem;">Earn <strong style="color:#F7931A;">$${s.rewardPerMin.toFixed(2)}/min</strong> · Submit 1 screenshot per minute</p>
            </div>
            <div style="padding:20px 28px;">

                <!-- Stats row -->
                <div style="display:flex;gap:20px;margin-bottom:20px;padding:14px;background:var(--navy-dark);border-radius:8px;color:white;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:1.4rem;font-weight:700;color:var(--orange);" id="ts-submissions">0</div>
                        <div style="font-size:.72rem;opacity:.7;">Verified</div>
                    </div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:1.4rem;font-weight:700;color:#22c55e;" id="ts-earned">$0.00</div>
                        <div style="font-size:.72rem;opacity:.7;">Earned</div>
                    </div>
                    <div style="text-align:center;flex:1;" id="ts-countdown-block" style="display:none;">
                        <div style="font-size:1.4rem;font-weight:700;color:#9146FF;" id="ts-countdown">—</div>
                        <div style="font-size:.72rem;opacity:.7;">Next prompt</div>
                    </div>
                </div>

                <!-- Auto-Validate toggle -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(145,70,255,.08);border:1px solid rgba(145,70,255,.25);border-radius:8px;margin-bottom:16px;">
                    <div>
                        <strong style="font-size:.9rem;">Auto-Validation</strong>
                        <p style="margin:2px 0 0;font-size:.78rem;color:var(--gray-400);">Automatically prompts you every 60s to upload a screenshot</p>
                    </div>
                    <label style="display:flex;align-items:center;cursor:pointer;gap:8px;">
                        <div style="position:relative;width:44px;height:24px;">
                            <input type="checkbox" id="auto-validate-toggle" onchange="toggleAutoValidate(this.checked)" style="opacity:0;width:0;height:0;position:absolute;">
                            <span id="toggle-track" style="position:absolute;inset:0;background:#ccc;border-radius:12px;transition:.3s;cursor:pointer;" onclick="document.getElementById('auto-validate-toggle').click()"></span>
                            <span id="toggle-thumb" style="position:absolute;left:2px;top:2px;width:20px;height:20px;background:white;border-radius:50%;transition:.3s;pointer-events:none;"></span>
                        </div>
                        <span id="auto-label" style="font-size:.8rem;color:var(--gray-400);">OFF</span>
                    </label>
                </div>

                <!-- Upload area -->
                <div id="twitch-upload-area" style="border:2px dashed var(--gray-200);border-radius:10px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s;" onclick="document.getElementById('twitch-file-input').click()">
                    <i class="fas fa-camera" style="font-size:1.8rem;color:var(--gray-300);display:block;margin-bottom:8px;"></i>
                    <p style="margin:0;color:var(--gray-400);font-size:.88rem;">Click to upload screenshot<br><small>Show: Twitch URL · LIVE badge · System clock</small></p>
                    <img id="twitch-preview" style="display:none;max-width:100%;max-height:160px;margin-top:12px;border-radius:6px;" alt="preview">
                    <input type="file" id="twitch-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="handleTwitchFile(this)">
                </div>

                <div id="twitch-result" style="margin-top:12px;display:none;"></div>

                <button id="twitch-verify-btn" class="btn btn-primary btn-block" style="margin-top:16px;background:#9146FF;border-color:#9146FF;" onclick="submitTwitchScreenshot()" disabled>
                    <i class="fas fa-shield-alt"></i> Verify Screenshot — Earn $${s.rewardPerMin.toFixed(2)}
                </button>

                <p style="text-align:center;margin-top:10px;font-size:.75rem;color:var(--gray-400);">
                    <i class="fas fa-info-circle"></i> Each screenshot must show the Twitch URL, a LIVE indicator, and your system clock. Each submission must be at least 50 seconds newer than the last.
                </p>
            </div>
        </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeTwitchModal(); });
}

// ── File handler ───────────────────────────────────────────────────────────
let _twitchScreenshotData = null;
function handleTwitchFile(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { alert('Max 6MB'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        _twitchScreenshotData = e.target.result;
        const preview = document.getElementById('twitch-preview');
        const area = document.getElementById('twitch-upload-area');
        if (preview) { preview.src = _twitchScreenshotData; preview.style.display = 'block'; }
        if (area) { area.style.borderColor = '#9146FF'; area.style.borderStyle = 'solid'; }
        const btn = document.getElementById('twitch-verify-btn');
        if (btn) btn.disabled = false;
    };
    reader.readAsDataURL(file);
}

// ── Submit screenshot ──────────────────────────────────────────────────────
async function submitTwitchScreenshot() {
    if (!_twitchScreenshotData || !_twitchSession) return;
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    const btn = document.getElementById('twitch-verify-btn');
    const resultDiv = document.getElementById('twitch-result');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI Verifying...'; }

    try {
        const res = await fetch(`${TWITCH_API}/api/verify-twitch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                screenshot: _twitchScreenshotData,
                promoId: _twitchSession.promoId,
                userId: user.id,
                username: user.username || user.displayName || '',
            }),
        });
        const data = await res.json();

        if (data.verified) {
            _twitchSession.submissionCount++;
            _twitchSession.totalEarned += data.rewardUSD || _twitchSession.rewardPerMin;
            _twitchSession.lastVerifiedAt = new Date().toISOString();

            // Update stats
            const subEl = document.getElementById('ts-submissions');
            const earnEl = document.getElementById('ts-earned');
            if (subEl) subEl.textContent = _twitchSession.submissionCount;
            if (earnEl) earnEl.textContent = `$${_twitchSession.totalEarned.toFixed(2)}`;

            if (resultDiv) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `<div style="background:rgba(34,197,94,.1);border:1px solid #22c55e;border-radius:8px;padding:12px 16px;color:#15803d;">
                    <i class="fas fa-check-circle"></i> <strong>Verified! +$${(data.rewardUSD || _twitchSession.rewardPerMin).toFixed(2)}</strong>
                    ${data.payoutSuccess ? ' — Sent to your wallet!' : ' — Added to payout queue'}
                    <br><small style="opacity:.75;">${data.reason}</small>
                </div>`;
            }

            // Reset upload area for next screenshot
            _twitchScreenshotData = null;
            const preview = document.getElementById('twitch-preview');
            const area = document.getElementById('twitch-upload-area');
            if (preview) preview.style.display = 'none';
            if (area) { area.style.borderColor = 'var(--gray-200)'; area.style.borderStyle = 'dashed'; }

        } else {
            if (resultDiv) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `<div style="background:rgba(239,68,68,.08);border:1px solid #ef4444;border-radius:8px;padding:12px 16px;color:#dc2626;">
                    <i class="fas fa-times-circle"></i> <strong>Not Verified</strong> — ${data.reason}
                    <br><small style="opacity:.75;">Tip: Make sure your system clock, Twitch URL, and the LIVE badge are all visible.</small>
                </div>`;
            }
        }
    } catch(e) {
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `<div style="background:rgba(239,68,68,.08);border:1px solid #ef4444;border-radius:8px;padding:12px 16px;color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> Connection error. Please try again.</div>`;
        }
    }

    if (btn) {
        btn.disabled = !_twitchScreenshotData;
        btn.innerHTML = `<i class="fas fa-shield-alt"></i> Verify Screenshot — Earn $${_twitchSession.rewardPerMin.toFixed(2)}`;
    }
}

// ── Auto-Validation toggle ─────────────────────────────────────────────────
function toggleAutoValidate(enabled) {
    if (!_twitchSession) return;
    _twitchSession.autoValidate = enabled;

    const track = document.getElementById('toggle-track');
    const thumb = document.getElementById('toggle-thumb');
    const label = document.getElementById('auto-label');
    const countdownBlock = document.getElementById('ts-countdown-block');

    if (track) track.style.background = enabled ? '#9146FF' : '#ccc';
    if (thumb) thumb.style.left = enabled ? '22px' : '2px';
    if (label) { label.textContent = enabled ? 'ON' : 'OFF'; label.style.color = enabled ? '#9146FF' : 'var(--gray-400)'; }
    if (countdownBlock) countdownBlock.style.display = enabled ? '' : 'none';

    clearInterval(_twitchSession.intervalId);
    clearInterval(_twitchCountdownId);

    if (enabled) {
        startAutoValidateCountdown();
    }
}

function startAutoValidateCountdown() {
    if (!_twitchSession?.autoValidate) return;
    let secs = 60;
    const countEl = document.getElementById('ts-countdown');
    const update = () => {
        if (!_twitchSession?.autoValidate) return;
        if (countEl) countEl.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
        if (secs <= 0) {
            clearInterval(_twitchCountdownId);
            pulseUploadArea();
            secs = 60;
            _twitchCountdownId = setInterval(update, 1000);
        } else {
            secs--;
        }
    };
    _twitchCountdownId = setInterval(update, 1000);
}

function pulseUploadArea() {
    const area = document.getElementById('twitch-upload-area');
    if (!area) return;
    // Flash the upload area to alert the user
    area.style.borderColor = '#9146FF';
    area.style.borderStyle = 'solid';
    area.style.boxShadow = '0 0 0 4px rgba(145,70,255,.3)';
    const resultDiv = document.getElementById('twitch-result');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<div style="background:rgba(145,70,255,.1);border:1px solid #9146FF;border-radius:8px;padding:10px 14px;color:#7c3aed;font-weight:600;">
            <i class="fas fa-camera fa-pulse"></i> ⏱ Time to submit your next screenshot! Upload now to earn $${_twitchSession?.rewardPerMin?.toFixed(2) || '0.02'}.
        </div>`;
    }
    setTimeout(() => {
        if (area) { area.style.borderStyle = 'dashed'; area.style.boxShadow = ''; }
    }, 3000);
}

// ── Close modal ────────────────────────────────────────────────────────────
function closeTwitchModal() {
    clearInterval(_twitchSession?.intervalId);
    clearInterval(_twitchCountdownId);
    _twitchSession = null;
    _twitchScreenshotData = null;
    document.getElementById('twitch-modal')?.remove();
}

// ── Admin: create flash promo ──────────────────────────────────────────────
function autoFillStreamerName() {
    const urlInput = document.getElementById('flash-twitch-url');
    const nameInput = document.getElementById('flash-streamer-name');
    if (!urlInput || !nameInput) return;
    try {
        const url = new URL(urlInput.value.trim());
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) nameInput.value = parts[0];
    } catch(e) {}
}

async function createFlashPromo() {
    const twitchUrl = document.getElementById('flash-twitch-url')?.value?.trim();
    const streamerName = document.getElementById('flash-streamer-name')?.value?.trim();
    const rewardPerMin = parseFloat(document.getElementById('flash-reward')?.value) || 0.02;
    const btn = document.getElementById('create-promo-btn');
    const result = document.getElementById('flash-promo-result');

    if (!twitchUrl || !streamerName) { alert('Please enter a Twitch URL and streamer name.'); return; }

    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    const email = user.email || '';

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Launching...'; }

    try {
        const res = await fetch(`${TWITCH_API}/api/admin/create-twitch-promo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, twitchUrl, streamerName, rewardPerMin }),
        });
        const data = await res.json();

        if (data.success) {
            if (result) result.innerHTML = `<div style="background:rgba(34,197,94,.1);border:1px solid #22c55e;border-radius:8px;padding:12px 16px;color:#15803d;">
                <i class="fas fa-check-circle"></i> <strong>Flash Event Launched!</strong> Discord alert sent. Users will see this in their Live Earn tab.
            </div>`;
            loadAdminActivePromos();
        } else {
            if (result) result.innerHTML = `<div style="color:#dc2626;padding:10px;">Error: ${data.error}</div>`;
        }
    } catch(e) {
        if (result) result.innerHTML = `<div style="color:#dc2626;padding:10px;">Network error: ${e.message}</div>`;
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fab fa-twitch"></i> Launch Flash Event'; }
}

async function loadAdminActivePromos() {
    const container = document.getElementById('admin-active-promos');
    if (!container) return;
    try {
        const res = await fetch(`${TWITCH_API}/api/twitch-promos/active`);
        const data = await res.json();
        const promos = data.promos || [];
        if (promos.length === 0) { container.innerHTML = '<p class="text-muted">No active promos.</p>'; return; }
        const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
        container.innerHTML = promos.map(p => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--gray-200);border-radius:8px;margin-bottom:8px;">
                <i class="fab fa-twitch" style="color:#9146FF;font-size:1.2rem;"></i>
                <div style="flex:1;">
                    <strong>${p.streamerName}</strong> — $${p.rewardPerMin.toFixed(2)}/min
                    <br><small class="text-muted"><a href="${p.twitchUrl}" target="_blank">${p.twitchUrl}</a> · Created ${new Date(p.createdAt).toLocaleTimeString()}</small>
                </div>
                <button class="btn btn-ghost" style="color:#ef4444;border-color:#ef4444;padding:4px 10px;font-size:.78rem;" onclick="deactivatePromo('${p.id}')">
                    <i class="fas fa-stop"></i> End
                </button>
            </div>`).join('');
    } catch(e) { container.innerHTML = '<p class="text-muted">Could not load promos.</p>'; }
}

async function deactivatePromo(promoId) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    await fetch(`${TWITCH_API}/api/admin/deactivate-twitch-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, promoId }),
    });
    loadAdminActivePromos();
    loadLivePromos();
}

// ── Wire up tabs ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const liveTab = document.querySelector('[data-tab="live-earn"]');
    if (liveTab) liveTab.addEventListener('click', loadLivePromos);
    const flashTab = document.querySelector('[data-tab="admin-flash"]');
    if (flashTab) flashTab.addEventListener('click', () => { loadAdminActivePromos(); });
});
