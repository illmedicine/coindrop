// ===== Admin Unpaid Payouts =====

const ADMIN_PAYOUT_EMAILS = ['demarkuswilsone@gmail.com', 'dwilson@illyrobotic-ai.com'];
const API_BASE = 'https://coindrop-auth.up.railway.app';

function isPayoutAdmin() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    return ADMIN_PAYOUT_EMAILS.includes(user.email);
}

function showAdminPayoutsNav() {
    if (isPayoutAdmin()) {
        const nav = document.getElementById('admin-payouts-nav');
        if (nav) nav.style.display = '';
    }
}

async function loadUnpaidTasks() {
    const container = document.getElementById('unpaid-tasks-list');
    const countEl = document.getElementById('unpaid-count');
    if (!container) return;
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    container.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading unpaid tasks...</p>';

    try {
        const res = await fetch(`${API_BASE}/api/admin/unpaid-tasks?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        const unpaid = data.unpaid || [];

        if (countEl) countEl.textContent = unpaid.length + ' unpaid task' + (unpaid.length !== 1 ? 's' : '');

        if (unpaid.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400);"><i class="fas fa-check-circle" style="font-size:3rem;color:#22c55e;margin-bottom:12px;display:block;"></i><h3 style="color:var(--navy);">All Caught Up!</h3><p>No unpaid tasks found. All earners have been paid.</p></div>';
            return;
        }

        let html = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">';
        html += '<thead><tr style="border-bottom:2px solid var(--gray-200);text-align:left;">';
        html += '<th style="padding:10px;">User</th><th style="padding:10px;">Task</th><th style="padding:10px;">Content</th>';
        html += '<th style="padding:10px;">Reward</th><th style="padding:10px;">Wallet</th><th style="padding:10px;">Action</th></tr></thead><tbody>';

        for (const task of unpaid) {
            const wallet = task.walletAddress || '';
            const walletShort = wallet ? wallet.substring(0, 6) + '...' + wallet.substring(wallet.length - 4) : '<span style="color:var(--danger);">No wallet</span>';
            html += `<tr style="border-bottom:1px solid var(--gray-200);" id="row-${task.docId}">`;
            html += `<td style="padding:10px;font-weight:600;">${task.username}</td>`;
            html += `<td style="padding:10px;"><span style="background:var(--orange);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">${task.taskType}</span></td>`;
            html += `<td style="padding:10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${task.videoTitle}">${task.videoTitle}</td>`;
            html += `<td style="padding:10px;color:var(--orange);font-weight:600;">$${(task.rewardUSD || 0).toFixed(3)}<br><small>${(task.rewardSOL || 0).toFixed(6)} SOL</small></td>`;
            html += `<td style="padding:10px;font-family:monospace;font-size:0.75rem;">${walletShort}</td>`;
            if (wallet) {
                html += `<td style="padding:10px;"><button class="btn btn-primary" style="padding:6px 12px;font-size:0.75rem;" onclick="retrySinglePayout('${task.docId}','${wallet}',${task.rewardSOL})"><i class="fas fa-paper-plane"></i> Pay</button></td>`;
            } else {
                html += `<td style="padding:10px;"><span style="color:var(--gray-400);font-size:0.75rem;">No wallet</span></td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Load unpaid error:', err);
        container.innerHTML = '<p style="color:var(--danger);"><i class="fas fa-exclamation-circle"></i> Failed to load unpaid tasks.</p>';
    }
}

async function retrySinglePayout(docId, walletAddress, rewardSOL) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    const btn = document.querySelector(`#row-${docId} button`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const res = await fetch(`${API_BASE}/api/admin/retry-payout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, docId, walletAddress, rewardSOL }),
        });
        const data = await res.json();
        if (data.success) {
            const row = document.getElementById(`row-${docId}`);
            if (row) {
                row.style.background = 'rgba(34,197,94,0.1)';
                row.querySelector('td:last-child').innerHTML = `<span style="color:#22c55e;font-size:0.75rem;"><i class="fas fa-check"></i> Paid</span>`;
            }
        } else {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed'; btn.style.background = 'var(--danger)'; }
            alert('Payout failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Retry'; }
        alert('Network error: ' + err.message);
    }
}

async function retryAllPayouts() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    const btn = document.getElementById('retry-all-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

    try {
        const res = await fetch(`${API_BASE}/api/admin/retry-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        });
        const data = await res.json();
        const results = data.results || [];
        const paid = results.filter(r => r.status === 'paid').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;

        alert(`Batch payout complete:\n${paid} paid\n${failed} failed\n${skipped} skipped (no wallet)`);

        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Pay All Unpaid'; }
        loadUnpaidTasks();
    } catch (err) {
        alert('Batch payout error: ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Pay All Unpaid'; }
    }
}

// Show nav on page load — retry multiple times since user data may load late
document.addEventListener('DOMContentLoaded', showAdminPayoutsNav);
setTimeout(showAdminPayoutsNav, 1000);
setTimeout(showAdminPayoutsNav, 2000);
setTimeout(showAdminPayoutsNav, 4000);
