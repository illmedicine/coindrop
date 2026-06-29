// ===== Admin Unpaid Payouts (server-verified) =====

const PAYOUT_API = 'https://coindrop-auth.up.railway.app';
const ADMIN_RESTRICTED_MSG = '<div style="text-align:center;padding:60px 20px;"><i class="fas fa-lock" style="font-size:3rem;color:var(--gray-300);margin-bottom:16px;display:block;"></i><h3 style="color:var(--navy);">Administrator Only</h3><p style="color:var(--gray-400);max-width:400px;margin:12px auto;">This section is restricted to CoinDrop administrators. If you need help, please reach out in our <a href="https://discord.gg/847XjyVa3C" target="_blank" style="color:var(--orange);">Discord community</a>.</p></div>';

function getUserEmail() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    return (user.email || '').trim();
}

const LOCAL_ADMIN_EMAILS = ['demarkuswilsone@gmail.com', 'dwilson@illyrobotic-ai.com'];

async function checkIsAdmin() {
    const email = getUserEmail().toLowerCase();
    if (!email) return false;
    // Immediate client-side check as fallback
    if (LOCAL_ADMIN_EMAILS.includes(email)) return true;
    try {
        const res = await fetch(`${PAYOUT_API}/api/admin/check?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        return data.isAdmin === true;
    } catch (e) {
        return LOCAL_ADMIN_EMAILS.includes(email);
    }
}

async function showAdminPayoutsNav() {
    const isAdmin = await checkIsAdmin();
    if (isAdmin) {
        const nav = document.getElementById('admin-payouts-nav');
        if (nav) nav.style.display = '';
        const analyticsNav = document.getElementById('analytics-nav');
        if (analyticsNav) analyticsNav.style.display = '';
    }
}

async function guardAdminTab(containerId) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = ADMIN_RESTRICTED_MSG;
        return false;
    }
    return true;
}

async function loadUnpaidTasks() {
    const container = document.getElementById('unpaid-tasks-list');
    const countEl = document.getElementById('unpaid-count');
    if (!container) return;

    if (!(await guardAdminTab('unpaid-tasks-list'))) return;

    loadTreasuryBalance();
    const email = getUserEmail();
    container.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading unpaid tasks...</p>';

    try {
        const res = await fetch(`${PAYOUT_API}/api/admin/unpaid-tasks?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.error) {
            container.innerHTML = ADMIN_RESTRICTED_MSG;
            return;
        }
        const unpaid = data.unpaid || [];

        const totalOwedUSD = unpaid.reduce((sum, t) => sum + (t.rewardUSD || 0), 0);
        const totalOwedSOL = unpaid.reduce((sum, t) => sum + (t.rewardSOL || 0), 0);
        if (countEl) countEl.innerHTML = `<strong>${unpaid.length}</strong> unpaid task${unpaid.length !== 1 ? 's' : ''} &mdash; Total owed: <strong style="color:var(--orange);">$${totalOwedUSD.toFixed(2)} USD</strong> (<strong>${totalOwedSOL.toFixed(6)} SOL</strong>)`;

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
    const email = getUserEmail();
    const btn = document.querySelector(`#row-${docId} button`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const res = await fetch(`${PAYOUT_API}/api/admin/retry-payout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, docId, walletAddress, rewardSOL }),
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
    const email = getUserEmail();
    const btn = document.getElementById('retry-all-btn');
    const countEl = document.getElementById('unpaid-count');
    let totalPaid = 0, totalFailed = 0, totalSkipped = 0;
    let firstError = null;
    let keepGoing = true;

    if (btn) { btn.disabled = true; }

    while (keepGoing) {
        if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Paying... ${totalPaid} paid so far`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);
            const res = await fetch(`${PAYOUT_API}/api/admin/retry-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, batchSize: 5 }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            const data = await res.json();
            if (data.error) { firstError = data.error; keepGoing = false; break; }
            const results = data.results || [];
            totalPaid += results.filter(r => r.status === 'paid').length;
            totalFailed += results.filter(r => r.status === 'failed').length;
            totalSkipped += results.filter(r => r.status === 'skipped').length;
            if (!firstError) {
                const fe = results.find(r => r.status === 'failed');
                if (fe) firstError = fe.reason;
            }
            if (countEl) countEl.innerHTML = `<strong>${totalPaid}</strong> paid, <strong>${totalFailed}</strong> failed — <strong>${data.remaining || 0}</strong> remaining`;
            if (!data.remaining || data.remaining <= 0 || results.length === 0) {
                keepGoing = false;
            }
            if (results.length > 0 && results.every(r => r.status === 'failed')) {
                keepGoing = false;
            }
            // 3s pause between batches to let Solana RPC cool down
            if (keepGoing) await new Promise(r => setTimeout(r, 3000));
        } catch (err) {
            if (err.name === 'AbortError') {
                firstError = 'Batch timed out (60s) — Solana RPC may be overloaded. Try again in a minute.';
            } else {
                firstError = err.message;
            }
            keepGoing = false;
        }
    }

    let msg = `Batch payout complete:\n${totalPaid} paid\n${totalFailed} failed\n${totalSkipped} skipped (no wallet)`;
    if (firstError) msg += `\n\nNote: ${firstError}`;
    alert(msg);
    loadTreasuryBalance();
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Pay All Unpaid'; }
    loadUnpaidTasks();
}

async function loadTreasuryBalance() {
    const solEl = document.getElementById('treasury-sol');
    const addrEl = document.getElementById('treasury-addr');
    if (!solEl) return;
    const email = getUserEmail();
    try {
        const res = await fetch(`${PAYOUT_API}/api/admin/treasury-balance?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.error && !data.address) {
            solEl.textContent = 'Not configured';
            solEl.style.color = 'var(--danger)';
        } else {
            solEl.textContent = `${data.balance.toFixed(6)} SOL`;
            solEl.style.color = data.balance > 0 ? '#22c55e' : 'var(--danger)';
            if (addrEl && data.address) addrEl.textContent = data.address;
        }
    } catch (e) {
        solEl.textContent = 'Error loading balance';
        solEl.style.color = 'var(--danger)';
    }
}

// Poll for user email then check admin status server-side
function pollAdminNav() {
    const email = getUserEmail();
    if (email) {
        showAdminPayoutsNav();
    } else {
        setTimeout(pollAdminNav, 500);
    }
}
document.addEventListener('DOMContentLoaded', pollAdminNav);
