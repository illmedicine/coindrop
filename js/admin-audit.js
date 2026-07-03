// ===== Admin Leaderboard Audit + AI Fraud Detection =====

const AUDIT_API = 'https://coindrop-auth.up.railway.app';
let _auditAllTasks = [];

const FLAG_META = {
    DUPLICATE_SUBSCRIBE:  { label: 'Duplicate Subscribe',   color: '#ef4444', icon: 'fa-repeat' },
    SAME_DAY_DUPLICATE:   { label: 'Same-Day Duplicate',    color: '#f97316', icon: 'fa-clone' },
    HIGH_VOLUME_BOT_RISK: { label: 'Bot Risk (50+ tasks/day)', color: '#7c3aed', icon: 'fa-robot' },
};

async function loadAuditTasks() {
    const container = document.getElementById('audit-tasks-list');
    const summary   = document.getElementById('audit-summary');
    if (!container) return;
    if (!(await guardAdminTab('audit-tasks-list'))) return;

    container.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading all tasks from Firestore...</p>';
    const email = getUserEmail();

    try {
        const res  = await fetch(`${AUDIT_API}/api/admin/all-tasks?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.error) { container.innerHTML = `<p style="color:var(--danger);">${data.error}</p>`; return; }

        _auditAllTasks = data.tasks || [];
        if (summary) summary.innerHTML =
            `<strong>${data.total}</strong> total tasks &mdash; ` +
            `<strong style="color:#ef4444;">${data.flagged}</strong> flagged &mdash; ` +
            `<strong style="color:#22c55e;">${_auditAllTasks.filter(t => t.payoutSuccess).length}</strong> paid`;

        renderAuditTable(_auditAllTasks);
    } catch (err) {
        container.innerHTML = `<p style="color:var(--danger);"><i class="fas fa-exclamation-circle"></i> ${err.message}</p>`;
    }
}

function applyAuditFilter() {
    const filter = document.getElementById('audit-filter')?.value || 'all';
    const search = (document.getElementById('audit-search')?.value || '').toLowerCase();
    let tasks = _auditAllTasks;
    if (filter === 'flagged') tasks = tasks.filter(t => t.flags.length > 0);
    else if (filter === 'paid')    tasks = tasks.filter(t => t.payoutSuccess);
    else if (filter === 'unpaid')  tasks = tasks.filter(t => !t.payoutSuccess);
    if (search) tasks = tasks.filter(t =>
        (t.username || '').toLowerCase().includes(search) ||
        (t.creatorName || '').toLowerCase().includes(search) ||
        (t.videoTitle || '').toLowerCase().includes(search) ||
        (t.walletAddress || '').toLowerCase().includes(search)
    );
    renderAuditTable(tasks);
}

function renderAuditTable(tasks) {
    const container = document.getElementById('audit-tasks-list');
    if (!container) return;
    if (tasks.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400);"><i class="fas fa-check-circle" style="font-size:2rem;color:#22c55e;display:block;margin-bottom:8px;"></i>No tasks match this filter.</div>';
        return;
    }

    const taskTypeColor = { watch:'#3b82f6', like:'#ec4899', comment:'#f59e0b', subscribe:'#22c55e', follow:'#8b5cf6' };

    let html = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
    <thead><tr style="background:var(--navy);color:white;text-align:left;">
        <th style="padding:10px 8px;">Time</th>
        <th style="padding:10px 8px;">User</th>
        <th style="padding:10px 8px;">Task</th>
        <th style="padding:10px 8px;">Creator</th>
        <th style="padding:10px 8px;max-width:180px;">Content</th>
        <th style="padding:10px 8px;">Reward</th>
        <th style="padding:10px 8px;">Payout</th>
        <th style="padding:10px 8px;">Flags</th>
    </tr></thead><tbody>`;

    for (const t of tasks) {
        const flagged = t.flags.length > 0;
        const rowBg   = flagged ? 'rgba(239,68,68,0.06)' : '';
        const ts      = t.timestamp ? new Date(t.timestamp).toLocaleString() : '—';
        const txShort = t.txSignature ? t.txSignature.slice(0,8) + '…' : '';
        const typeColor = taskTypeColor[t.taskType] || '#888';
        const flagBadges = t.flags.map(f => {
            const m = FLAG_META[f] || { label: f, color: '#888', icon: 'fa-flag' };
            return `<span style="display:inline-flex;align-items:center;gap:4px;background:${m.color};color:white;padding:2px 7px;border-radius:4px;font-size:0.7rem;font-weight:600;margin:1px;"><i class="fas ${m.icon}"></i>${m.label}</span>`;
        }).join('');

        html += `<tr style="border-bottom:1px solid var(--gray-100);background:${rowBg};">
            <td style="padding:8px;white-space:nowrap;color:var(--gray-400);font-size:0.72rem;">${ts}</td>
            <td style="padding:8px;font-weight:600;">${t.username || t.userId.slice(0,8)}</td>
            <td style="padding:8px;"><span style="background:${typeColor};color:#fff;padding:2px 7px;border-radius:4px;font-size:0.72rem;font-weight:700;">${t.taskType.toUpperCase()}</span></td>
            <td style="padding:8px;">${t.creatorName || '—'}</td>
            <td style="padding:8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.videoTitle}">${t.videoTitle || '—'}</td>
            <td style="padding:8px;color:var(--orange);font-weight:600;white-space:nowrap;">$${(t.rewardUSD||0).toFixed(3)}</td>
            <td style="padding:8px;">
                ${t.payoutSuccess
                    ? `<span style="color:#22c55e;font-weight:600;font-size:0.75rem;"><i class="fas fa-check"></i> Paid${txShort ? `<br><span style="font-family:monospace;opacity:0.6;">${txShort}</span>` : ''}</span>`
                    : `<span style="color:var(--gray-400);font-size:0.75rem;"><i class="fas fa-clock"></i> Pending</span>`}
            </td>
            <td style="padding:8px;">${flagBadges || '<span style="color:var(--gray-300);font-size:0.72rem;">—</span>'}</td>
        </tr>`;
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function runAIAnalysis() {
    const btn    = document.getElementById('run-ai-btn');
    const report = document.getElementById('audit-ai-report');
    if (!_auditAllTasks.length) { alert('Load tasks first.'); return; }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...'; }

    await new Promise(r => setTimeout(r, 400)); // let UI breathe

    // Pattern analysis entirely client-side
    const users = {};
    for (const t of _auditAllTasks) {
        if (!users[t.userId]) users[t.userId] = { username: t.username, tasks: [] };
        users[t.userId].tasks.push(t);
    }

    const dupeSubs       = [];  // userId saw same creator subscribe >1
    const sameDayDupes   = [];  // same video+taskType on same day
    const highVolume     = [];  // >50 tasks in a single calendar day
    const unpaidFlagged  = [];  // flagged tasks that are still unpaid

    const subMap  = {};
    const dayMap  = {};
    for (const t of _auditAllTasks) {
        if (t.taskType === 'subscribe') {
            const k = `${t.userId}:${t.creatorName}`;
            subMap[k] = (subMap[k] || 0) + 1;
        }
        if (t.taskType === 'watch' || t.taskType === 'like') {
            const date = (t.timestamp||'').slice(0,10);
            const k = `${t.userId}:${t.videoId}:${t.taskType}:${date}`;
            dayMap[k] = (dayMap[k] || 0) + 1;
        }
    }

    const userDayCounts = {};
    for (const t of _auditAllTasks) {
        const date = (t.timestamp||'').slice(0,10);
        const k = `${t.userId}:${date}`;
        userDayCounts[k] = (userDayCounts[k] || 0) + 1;
    }

    const seenSubAlert = new Set(), seenDayAlert = new Set(), seenVolAlert = new Set();
    for (const t of _auditAllTasks) {
        if (t.taskType === 'subscribe') {
            const k = `${t.userId}:${t.creatorName}`;
            if ((subMap[k]||0) > 1 && !seenSubAlert.has(k)) {
                seenSubAlert.add(k);
                dupeSubs.push({ user: t.username||t.userId, creator: t.creatorName, count: subMap[k] });
            }
        }
        if (t.taskType === 'watch' || t.taskType === 'like') {
            const date = (t.timestamp||'').slice(0,10);
            const k = `${t.userId}:${t.videoId}:${t.taskType}:${date}`;
            if ((dayMap[k]||0) > 1 && !seenDayAlert.has(k)) {
                seenDayAlert.add(k);
                sameDayDupes.push({ user: t.username||t.userId, task: t.taskType, title: t.videoTitle, date, count: dayMap[k] });
            }
        }
        const date = (t.timestamp||'').slice(0,10);
        const bk = `${t.userId}:${date}`;
        if ((userDayCounts[bk]||0) > 50 && !seenVolAlert.has(bk)) {
            seenVolAlert.add(bk);
            highVolume.push({ user: t.username||t.userId, date, count: userDayCounts[bk] });
        }
        if (t.flags.length > 0 && !t.payoutSuccess) unpaidFlagged.push(t);
    }

    const totalFlagged = _auditAllTasks.filter(t => t.flags.length > 0).length;
    const clean = _auditAllTasks.length - totalFlagged;

    let html = `<div style="font-size:0.9rem;line-height:1.7;">
        <h3 style="margin:0 0 12px;font-size:1.1rem;color:var(--orange);"><i class="fas fa-robot"></i> AI Fraud Analysis Report</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">
            <div style="background:rgba(255,255,255,0.08);padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;">${_auditAllTasks.length}</div><div style="opacity:0.7;font-size:0.75rem;">Total Tasks</div>
            </div>
            <div style="background:rgba(34,197,94,0.15);padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#22c55e;">${clean}</div><div style="opacity:0.7;font-size:0.75rem;">Clean Tasks</div>
            </div>
            <div style="background:rgba(239,68,68,0.15);padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#ef4444;">${totalFlagged}</div><div style="opacity:0.7;font-size:0.75rem;">Flagged Tasks</div>
            </div>
            <div style="background:rgba(124,58,237,0.15);padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#a78bfa;">${highVolume.length}</div><div style="opacity:0.7;font-size:0.75rem;">Bot Risk Users</div>
            </div>
            <div style="background:rgba(249,115,22,0.15);padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:700;color:#fb923c;">${unpaidFlagged.length}</div><div style="opacity:0.7;font-size:0.75rem;">Unpaid + Flagged</div>
            </div>
        </div>`;

    if (dupeSubs.length > 0) {
        html += `<div style="margin-bottom:12px;"><strong style="color:#ef4444;"><i class="fas fa-repeat"></i> Duplicate Subscribe Violations (${dupeSubs.length})</strong><ul style="margin:6px 0 0 18px;opacity:0.85;">`;
        dupeSubs.forEach(d => { html += `<li>${d.user} subscribed to <em>${d.creator}</em> ${d.count}× — only 1 payout eligible</li>`; });
        html += '</ul></div>';
    }
    if (sameDayDupes.length > 0) {
        html += `<div style="margin-bottom:12px;"><strong style="color:#f97316;"><i class="fas fa-clone"></i> Same-Day Duplicate Watch/Like (${sameDayDupes.length})</strong><ul style="margin:6px 0 0 18px;opacity:0.85;">`;
        sameDayDupes.forEach(d => { html += `<li>${d.user} — ${d.task} on "<em>${d.title}</em>" ${d.count}× on ${d.date}</li>`; });
        html += '</ul></div>';
    }
    if (highVolume.length > 0) {
        html += `<div style="margin-bottom:12px;"><strong style="color:#a78bfa;"><i class="fas fa-robot"></i> Potential Bot Activity — 50+ tasks/day (${highVolume.length} users)</strong><ul style="margin:6px 0 0 18px;opacity:0.85;">`;
        highVolume.forEach(d => { html += `<li>${d.user} — ${d.count} tasks on ${d.date}</li>`; });
        html += '</ul></div>';
    }
    if (dupeSubs.length === 0 && sameDayDupes.length === 0 && highVolume.length === 0) {
        html += `<p style="color:#22c55e;"><i class="fas fa-check-circle"></i> No fraud patterns detected. All tasks appear legitimate.</p>`;
    }

    html += `<p style="margin-top:12px;opacity:0.6;font-size:0.75rem;"><i class="fas fa-info-circle"></i> Flagged tasks are automatically excluded from bulk payout. Paid tasks are never reversed.</p></div>`;

    if (report) { report.innerHTML = html; report.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-robot"></i> Run AI Analysis'; }
}

document.addEventListener('DOMContentLoaded', () => {
    const tab = document.querySelector('[data-tab="admin-audit"]');
    if (tab) tab.addEventListener('click', () => { if (!_auditAllTasks.length) loadAuditTasks(); });
});
