// ===== Admin Referral Program Dashboard =====
const REFERRAL_API = 'https://coindrop-auth.up.railway.app';

async function loadReferralStats() {
    const container = document.getElementById('referral-stats');
    const eventsContainer = document.getElementById('referral-events-list');
    if (!container || !eventsContainer) return;

    container.innerHTML = '<div style="grid-column:1/-1;"><p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading referral stats...</p></div>';
    eventsContainer.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading referral events...</p>';

    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.email) return;

    try {
        const res = await fetch(`${REFERRAL_API}/api/admin/referrals?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (!data.success) {
            container.innerHTML = `<div style="grid-column:1/-1;color:#ef4444;">Error: ${data.error}</div>`;
            return;
        }

        const stats = data.stats || {};
        const referrals = data.allReferrals || [];

        // Render creator referral cards
        if (Object.keys(stats).length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;"><p class="text-muted">No creators with referral codes yet.</p></div>';
        } else {
            container.innerHTML = Object.entries(stats).map(([creatorId, s]) => `
                <div style="background:var(--navy-dark);border-radius:10px;padding:16px;border:1px solid rgba(247,147,26,.2);">
                    <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:12px;">
                        <div>
                            <strong style="font-size:1rem;color:white;">${s.name}</strong>
                            <div style="color:rgba(255,255,255,.5);font-size:.85rem;">${s.handle}</div>
                        </div>
                        <button class="btn btn-ghost" style="padding:6px 12px;font-size:.8rem;" onclick="copyRefLink('${s.code}')">
                            <i class="fas fa-copy"></i> Copy Link
                        </button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;padding:10px;background:rgba(247,147,26,.08);border-radius:6px;">
                        <div>
                            <div style="font-size:.7rem;color:rgba(255,255,255,.5);text-transform:uppercase;">Link Clicks</div>
                            <div style="font-size:1.4rem;font-weight:700;color:#F7931A;">${s.clicks}</div>
                        </div>
                        <div>
                            <div style="font-size:.7rem;color:rgba(255,255,255,.5);text-transform:uppercase;">Signups</div>
                            <div style="font-size:1.4rem;font-weight:700;color:#22c55e;">${s.signups}</div>
                        </div>
                    </div>
                    <div style="font-size:.8rem;color:rgba(255,255,255,.6);">
                        <strong style="color:#F7931A;">${s.signups}</strong> unpaid signups · <strong style="color:#22c55e;">${s.payoutIssued}</strong> paid
                    </div>
                </div>
            `).join('');
        }

        // Render referral events list
        if (referrals.length === 0) {
            eventsContainer.innerHTML = '<p class="text-muted">No referral events yet.</p>';
        } else {
            const sorted = referrals.sort((a, b) => new Date(b.recordedAt || b.timestamp) - new Date(a.recordedAt || a.timestamp));
            eventsContainer.innerHTML = sorted.slice(0, 100).map(r => {
                const ts = new Date(r.recordedAt || r.timestamp).toLocaleString();
                const badges = {
                    'clicked': '<span style="background:rgba(96,125,255,.2);color:#605dff;padding:2px 8px;border-radius:4px;font-size:.75rem;">Clicked</span>',
                    'signed_up': '<span style="background:rgba(34,197,94,.2);color:#22c55e;padding:2px 8px;border-radius:4px;font-size:.75rem;">Signed Up</span>',
                };
                return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-bottom:1px solid rgba(255,255,255,.1);font-size:.85rem;">
                        <div>
                            <strong style="color:white;">${r.creatorId}</strong><br>
                            <span style="color:rgba(255,255,255,.5);">${r.email || r.userId || 'Unknown'}</span>
                        </div>
                        <div style="text-align:right;">
                            ${badges[r.status] || `<span>${r.status}</span>`}
                            <div style="color:rgba(255,255,255,.4);font-size:.75rem;margin-top:4px;">${ts}</div>
                            ${r.status === 'signed_up' && !r.payoutIssued ? `<button class="btn btn-ghost" style="padding:3px 8px;font-size:.7rem;margin-top:4px;" onclick="markReferralPayout('${r.id}', this)"><i class="fas fa-check"></i> Mark Paid</button>` : ''}
                            ${r.payoutIssued ? '<span style="color:#22c55e;font-size:.75rem;">✓ Payout Issued</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch(e) {
        container.innerHTML = `<div style="grid-column:1/-1;color:#ef4444;">Error: ${e.message}</div>`;
    }
}

// Get referral link for a creator
async function copyRefLink(creatorId) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.email) return;

    try {
        const res = await fetch(`${REFERRAL_API}/api/creators/referral-link/${creatorId}`);
        const data = await res.json();
        if (data.success) {
            navigator.clipboard.writeText(data.referralUrl).then(() => {
                alert(`Referral link copied!\n\n${data.referralUrl}`);
            }).catch(() => {
                prompt('Copy this referral link:', data.referralUrl);
            });
        }
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

// Mark referral as payout-issued
async function markReferralPayout(referralId, btn) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    if (!user.email) return;

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const res = await fetch(`${REFERRAL_API}/api/admin/referrals/mark-payout`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, referralId }),
        });
        const data = await res.json();
        if (data.success) {
            loadReferralStats();
        } else {
            alert('Error: ' + data.error);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Mark Paid'; }
        }
    } catch(e) {
        alert('Error: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Mark Paid'; }
    }
}

// Wire admin tab
document.addEventListener('DOMContentLoaded', () => {
    const referralTab = document.querySelector('[data-tab="admin-referrals"]');
    if (referralTab) referralTab.addEventListener('click', loadReferralStats);
});
