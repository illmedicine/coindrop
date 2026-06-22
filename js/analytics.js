// ===== Creator Analytics & Invoice System =====

const ADMIN_EMAILS = ['dwilson@illyrobotic-ai.com', 'demrkuswilsone@gmail.com'];
const PLATFORM_MARKUP = 0.10; // 10%

const TASK_RATES = {
    watch: { sol: 0.001, usd: null, label: 'Views' },
    like: { sol: 0.0005, usd: null, label: 'Likes' },
    comment: { sol: null, usd: 0.02, label: 'Comments' },
    subscribe: { sol: null, usd: 0.05, label: 'Subscribes' },
};

function isAdmin() {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    return ADMIN_EMAILS.includes(user.email);
}

function showAnalyticsNav() {
    if (isAdmin()) {
        const nav = document.getElementById('analytics-nav');
        if (nav) nav.style.display = '';
    }
}

async function loadCreatorAnalytics() {
    const grid = document.getElementById('analytics-grid');
    if (!grid || typeof db === 'undefined') return;

    grid.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading analytics...</p>';

    const analyticsData = [];

    for (const creator of CREATORS) {
        const stats = { views: 0, likes: 0, comments: 0, subscribes: 0 };

        try {
            const snap = await db.collection('tasks')
                .where('creatorName', '==', creator.name)
                .get();

            snap.forEach(doc => {
                const t = doc.data();
                if (t.taskType === 'watch') stats.views++;
                else if (t.taskType === 'like') stats.likes++;
                else if (t.taskType === 'comment') stats.comments++;
                else if (t.taskType === 'subscribe') stats.subscribes++;
            });
        } catch (e) {
            console.error('Analytics fetch error for', creator.name, e);
        }

        const payoutSOL = (stats.views * 0.001) + (stats.likes * 0.0005);
        const payoutUSD = (stats.comments * 0.02) + (stats.subscribes * 0.05);
        const totalTasks = stats.views + stats.likes + stats.comments + stats.subscribes;

        analyticsData.push({ creator, stats, payoutSOL, payoutUSD, totalTasks });
    }

    grid.innerHTML = analyticsData.map(d => {
        const invoiceBtn = isAdmin()
            ? `<button class="btn btn-primary btn-sm" onclick="generateInvoice('${d.creator.id}')"><i class="fas fa-file-invoice-dollar"></i> Generate Invoice</button>`
            : '';

        return `
        <div class="analytics-card">
            <div class="ac-header">
                <img src="${d.creator.avatar}" alt="${d.creator.name}" class="ac-avatar">
                <div class="ac-info">
                    <strong>${d.creator.name}</strong>
                    <span class="ac-handle">${d.creator.handle}</span>
                </div>
                <span class="ac-total-tasks">${d.totalTasks} tasks</span>
            </div>
            <div class="ac-stats">
                <div class="ac-stat">
                    <i class="fas fa-eye"></i>
                    <span class="ac-stat-val">${d.stats.views}</span>
                    <span class="ac-stat-lbl">Views</span>
                </div>
                <div class="ac-stat">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="ac-stat-val">${d.stats.likes}</span>
                    <span class="ac-stat-lbl">Likes</span>
                </div>
                <div class="ac-stat">
                    <i class="fas fa-comment"></i>
                    <span class="ac-stat-val">${d.stats.comments}</span>
                    <span class="ac-stat-lbl">Comments</span>
                </div>
                <div class="ac-stat">
                    <i class="fas fa-bell"></i>
                    <span class="ac-stat-val">${d.stats.subscribes}</span>
                    <span class="ac-stat-lbl">Subs</span>
                </div>
            </div>
            <div class="ac-payout">
                <div class="ac-payout-row">
                    <span>Paid to staffers</span>
                    <strong>${d.payoutSOL.toFixed(4)} SOL + $${d.payoutUSD.toFixed(2)}</strong>
                </div>
                <div class="ac-payout-row markup">
                    <span>Platform fee (10%)</span>
                    <strong>${(d.payoutSOL * PLATFORM_MARKUP).toFixed(4)} SOL + $${(d.payoutUSD * PLATFORM_MARKUP).toFixed(2)}</strong>
                </div>
                <div class="ac-payout-row total">
                    <span>Invoice total</span>
                    <strong>${(d.payoutSOL * (1 + PLATFORM_MARKUP)).toFixed(4)} SOL + $${(d.payoutUSD * (1 + PLATFORM_MARKUP)).toFixed(2)}</strong>
                </div>
            </div>
            <div class="ac-actions">
                ${invoiceBtn}
            </div>
        </div>`;
    }).join('');
}

async function generateInvoice(creatorId) {
    const creator = CREATORS.find(c => c.id === creatorId);
    if (!creator) return;

    const stats = { views: 0, likes: 0, comments: 0, subscribes: 0 };

    try {
        const snap = await db.collection('tasks')
            .where('creatorName', '==', creator.name)
            .get();
        snap.forEach(doc => {
            const t = doc.data();
            if (t.taskType === 'watch') stats.views++;
            else if (t.taskType === 'like') stats.likes++;
            else if (t.taskType === 'comment') stats.comments++;
            else if (t.taskType === 'subscribe') stats.subscribes++;
        });
    } catch (e) {
        console.error('Invoice data error:', e);
    }

    const viewsSOL = stats.views * 0.001;
    const likesSOL = stats.likes * 0.0005;
    const commentsUSD = stats.comments * 0.02;
    const subsUSD = stats.subscribes * 0.05;
    const subtotalSOL = viewsSOL + likesSOL;
    const subtotalUSD = commentsUSD + subsUSD;
    const markupSOL = subtotalSOL * PLATFORM_MARKUP;
    const markupUSD = subtotalUSD * PLATFORM_MARKUP;
    const totalSOL = subtotalSOL + markupSOL;
    const totalUSD = subtotalUSD + markupUSD;

    const invoiceNum = `CD-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const content = document.getElementById('invoice-content');
    content.innerHTML = `
        <div class="invoice-print" id="invoice-print">
            <div class="inv-header">
                <div class="inv-logo">
                    <img src="assets/logo.svg" alt="CoinDrop" class="inv-logo-img">
                    <div>
                        <strong class="inv-brand">COINDROP</strong>
                        <span class="inv-tagline">Watch. Engage. Earn.</span>
                    </div>
                </div>
                <div class="inv-meta">
                    <h2>INVOICE</h2>
                    <div class="inv-meta-row"><span>Invoice #</span><strong>${invoiceNum}</strong></div>
                    <div class="inv-meta-row"><span>Date</span><strong>${today}</strong></div>
                </div>
            </div>

            <div class="inv-parties">
                <div class="inv-from">
                    <strong>From:</strong><br>
                    CoinDrop Platform<br>
                    support@illyrobotic-ai.com<br>
                    coindrop.in
                </div>
                <div class="inv-to">
                    <strong>Bill To:</strong><br>
                    ${creator.name}<br>
                    ${creator.handle}<br>
                    ${creator.channelUrl}
                </div>
            </div>

            <div class="inv-desc">
                <strong>Description:</strong> CoinDrop Promoted Engagement Services — paid social media engagement campaign including verified views, likes, comments, and subscriber acquisitions for ${creator.name} YouTube channel.
            </div>

            <table class="inv-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><i class="fas fa-eye"></i> Verified Views</td>
                        <td>${stats.views}</td>
                        <td>0.001 SOL</td>
                        <td>${viewsSOL.toFixed(4)} SOL</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-thumbs-up"></i> Verified Likes</td>
                        <td>${stats.likes}</td>
                        <td>0.0005 SOL</td>
                        <td>${likesSOL.toFixed(4)} SOL</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-comment"></i> Verified Comments</td>
                        <td>${stats.comments}</td>
                        <td>$0.02</td>
                        <td>$${commentsUSD.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-bell"></i> Subscriber Acquisitions</td>
                        <td>${stats.subscribes}</td>
                        <td>$0.05</td>
                        <td>$${subsUSD.toFixed(2)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="inv-subtotal">
                        <td colspan="3">Subtotal (Paid to CoinDrop Staffers)</td>
                        <td>${subtotalSOL.toFixed(4)} SOL + $${subtotalUSD.toFixed(2)}</td>
                    </tr>
                    <tr class="inv-markup">
                        <td colspan="3">Platform Promotion Fee (10%)</td>
                        <td>${markupSOL.toFixed(4)} SOL + $${markupUSD.toFixed(2)}</td>
                    </tr>
                    <tr class="inv-total">
                        <td colspan="3"><strong>TOTAL DUE</strong></td>
                        <td><strong>${totalSOL.toFixed(4)} SOL + $${totalUSD.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <div class="inv-footer">
                <p><strong>Payment Terms:</strong> Due upon receipt. SOL payments accepted to CoinDrop treasury wallet. USD payments via invoice.</p>
                <p class="inv-thank">Thank you for choosing CoinDrop for your social media promotion needs.</p>
            </div>
        </div>
    `;

    document.getElementById('invoice-modal').classList.remove('hidden');
}

function closeInvoice() {
    document.getElementById('invoice-modal').classList.add('hidden');
}

function printInvoice() {
    const printContent = document.getElementById('invoice-print').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>CoinDrop Invoice</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1F2937; }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #F7931A; padding-bottom: 20px; }
        .inv-logo { display: flex; align-items: center; gap: 12px; }
        .inv-logo-img { height: 48px; }
        .inv-brand { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; display: block; color: #1B2A4A; }
        .inv-tagline { font-size: 0.75rem; color: #9CA3AF; }
        .inv-meta h2 { font-family: 'Space Grotesk', sans-serif; color: #1B2A4A; font-size: 1.8rem; text-align: right; }
        .inv-meta-row { display: flex; justify-content: flex-end; gap: 12px; font-size: 0.85rem; color: #6B7280; margin-top: 4px; }
        .inv-parties { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .inv-from, .inv-to { font-size: 0.85rem; color: #4B5563; line-height: 1.6; }
        .inv-desc { background: #F9FAFB; padding: 14px 18px; border-radius: 8px; font-size: 0.85rem; color: #4B5563; margin-bottom: 24px; line-height: 1.5; }
        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .inv-table th { background: #1B2A4A; color: white; padding: 10px 14px; text-align: left; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .inv-table td { padding: 10px 14px; border-bottom: 1px solid #E5E7EB; font-size: 0.85rem; }
        .inv-table i { color: #F7931A; margin-right: 6px; }
        .inv-subtotal td { border-top: 2px solid #E5E7EB; font-size: 0.85rem; color: #6B7280; }
        .inv-markup td { font-size: 0.85rem; color: #F7931A; }
        .inv-total td { border-top: 2px solid #1B2A4A; font-size: 1rem; }
        .inv-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; }
        .inv-footer p { font-size: 0.8rem; color: #9CA3AF; margin-bottom: 8px; }
        .inv-thank { font-style: italic; color: #F7931A; }
        @media print { body { padding: 20px; } }
    </style></head><body>${printContent}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

// Initialize analytics on tab switch
document.addEventListener('DOMContentLoaded', () => {
    showAnalyticsNav();
});

setTimeout(showAnalyticsNav, 2000);
