// ===== Task Verification Workflow =====
const API_BASE = 'https://coindrop-auth.up.railway.app';

function openTaskModal(videoId, videoTitle, creatorName, taskType, platform, isShort, creatorHandle) {
    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');

    // Check wallet before allowing task
    if (!user.walletAddress) {
        if (confirm('You need to connect your Phantom wallet to earn payouts. Set it up now?')) {
            openWalletModal();
        }
        return;
    }

    const watchUrl = isShort
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
    const embedUrl = isShort
        ? `https://www.youtube.com/embed/${videoId}`
        : `https://www.youtube.com/embed/${videoId}?rel=0`;
    const reward = { watch: '$0.01', like: '$0.005', comment: '$0.05', subscribe: '$0.05 + $0.01/mo', follow: '$0.05 + $0.01/mo' }[taskType];
    const actionLabel = { watch: 'Watch the video', like: 'Like the video', comment: 'Leave a comment', subscribe: 'Subscribe to channel', follow: 'Follow account' }[taskType];
    const actionIcon = { watch: 'fa-play', like: 'fa-thumbs-up', comment: 'fa-comment', subscribe: 'fa-bell', follow: 'fa-user-plus' }[taskType];

    // Remove existing modal
    document.getElementById('task-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'task-modal';
    modal.className = 'task-modal-overlay';
    modal.innerHTML = `
        <div class="task-modal">
            <button class="task-modal-close" onclick="closeTaskModal()">&times;</button>
            <div class="task-modal-header">
                <div class="task-modal-badge ${taskType}"><i class="fas ${actionIcon}"></i> ${taskType.toUpperCase()}</div>
                <h3>${videoTitle}</h3>
                <p class="task-modal-creator">by ${creatorName} · Reward: <strong>${reward}</strong></p>
            </div>

            <!-- Step 1: Watch/Engage -->
            <div class="task-step active" id="step-engage">
                <div class="step-indicator"><span class="step-num active">1</span> Engage <span class="step-arrow">→</span> <span class="step-num">2</span> Screenshot <span class="step-arrow">→</span> <span class="step-num">3</span> Verify</div>
                <div class="task-embed-container">
                    <iframe src="${embedUrl}" class="task-embed" allowfullscreen allow="autoplay; encrypted-media"></iframe>
                </div>
                <div class="task-instructions">
                    <p><i class="fas ${actionIcon}"></i> <strong>${actionLabel}</strong>, then take a screenshot showing proof.</p>
                    <a href="${watchUrl}" target="_blank" class="btn-open-yt"><i class="fab fa-youtube"></i> Open on YouTube</a>
                </div>
                <button class="btn btn-primary btn-block" onclick="goToScreenshot()">
                    <i class="fas fa-camera"></i> I've completed the task — Take Screenshot
                </button>
            </div>

            <!-- Step 2: Upload Screenshot -->
            <div class="task-step" id="step-screenshot">
                <div class="step-indicator"><span class="step-num done">✓</span> Engage <span class="step-arrow">→</span> <span class="step-num active">2</span> Screenshot <span class="step-arrow">→</span> <span class="step-num">3</span> Verify</div>
                <div class="screenshot-upload-area" id="upload-area">
                    <div class="upload-placeholder" id="upload-placeholder">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Drop your screenshot here or click to upload</p>
                        <small>PNG, JPG — max 5MB</small>
                    </div>
                    <img id="screenshot-preview" class="screenshot-preview hidden" alt="Screenshot preview">
                    <input type="file" id="screenshot-input" accept="image/png,image/jpeg,image/webp" style="display:none">
                </div>
                <div class="screenshot-actions">
                    <button class="btn btn-ghost" onclick="goToEngage()" style="color:var(--navy)">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-primary" id="verify-btn" onclick="submitVerification('${videoId}','${encodeURIComponent(videoTitle)}','${encodeURIComponent(creatorName)}','${taskType}','${platform}','${user.id}','${user.username || ''}','${encodeURIComponent(creatorHandle || '')}')" disabled>
                        <i class="fas fa-shield-alt"></i> Verify Screenshot
                    </button>
                </div>
            </div>

            <!-- Step 3: Result -->
            <div class="task-step" id="step-result">
                <div class="step-indicator"><span class="step-num done">✓</span> Engage <span class="step-arrow">→</span> <span class="step-num done">✓</span> Screenshot <span class="step-arrow">→</span> <span class="step-num active">3</span> Verify</div>
                <div id="result-content"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeTaskModal(); });

    // Upload handlers
    const input = document.getElementById('screenshot-input');
    const area = document.getElementById('upload-area');
    const preview = document.getElementById('screenshot-preview');
    const placeholder = document.getElementById('upload-placeholder');

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => { if (input.files[0]) handleFile(input.files[0]); });
}

let currentScreenshotData = null;

function handleFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Max 5MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        currentScreenshotData = e.target.result;
        const preview = document.getElementById('screenshot-preview');
        const placeholder = document.getElementById('upload-placeholder');
        preview.src = currentScreenshotData;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        document.getElementById('verify-btn').disabled = false;
    };
    reader.readAsDataURL(file);
}

function goToScreenshot() {
    document.getElementById('step-engage').classList.remove('active');
    document.getElementById('step-screenshot').classList.add('active');
}

function goToEngage() {
    document.getElementById('step-screenshot').classList.remove('active');
    document.getElementById('step-engage').classList.add('active');
}

function closeTaskModal() {
    document.getElementById('task-modal')?.remove();
    currentScreenshotData = null;
}

async function submitVerification(videoId, videoTitleEnc, creatorNameEnc, taskType, platform, userId, username, creatorHandleEnc) {
    const videoTitle = decodeURIComponent(videoTitleEnc);
    const creatorName = decodeURIComponent(creatorNameEnc);
    const creatorHandle = creatorHandleEnc ? decodeURIComponent(creatorHandleEnc) : '';
    const btn = document.getElementById('verify-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI Analyzing Screenshot...';

    const user = JSON.parse(localStorage.getItem('coindrop_user') || '{}');
    const app = JSON.parse(localStorage.getItem('coindrop_application') || '{}');

    try {
        const response = await fetch(`${API_BASE}/api/verify-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                screenshot: currentScreenshotData,
                taskType,
                videoTitle,
                creatorName,
                creatorHandle,
                videoId,
                platform,
                userId,
                username: user.username || username,
                walletAddress: user.walletAddress || app.solWallet || '',
            }),
        });

        const result = await response.json();

        document.getElementById('step-screenshot').classList.remove('active');
        document.getElementById('step-result').classList.add('active');

        const resultDiv = document.getElementById('result-content');

        if (result.success && result.verified) {
            resultDiv.innerHTML = `
                <div class="verify-success">
                    <div class="verify-icon success"><i class="fas fa-check-circle"></i></div>
                    <h3>Verification Passed!</h3>
                    <p class="verify-confidence">Confidence: ${Math.round(result.confidence * 100)}%</p>
                    <p class="verify-reason">${result.reason}</p>
                    <div class="verify-reward">
                        <span class="reward-label">Reward Earned</span>
                        <span class="reward-value">$${(result.rewardUSD || result.reward || 0).toFixed ? (result.rewardUSD || 0).toFixed(3) : result.reward}</span>
                        <span class="reward-sub">${result.rewardSOL || result.reward || 0} SOL @ $${result.solPrice || '?'}</span>
                    </div>
                    ${result.payoutSuccess ? `<p class="verify-tx"><i class="fas fa-check"></i> Payout sent to your wallet</p>` : '<p class="verify-tx pending"><i class="fas fa-clock"></i> Payout will be processed in next daily drop</p>'}
                    <p class="verify-discord"><i class="fab fa-discord"></i> Task posted to CoinDrop Discord</p>
                    <button class="btn btn-primary btn-block" onclick="closeTaskModal()">Done</button>
                </div>
            `;
            // Server already wrote task, stats, and cooldown to Firestore — just update localStorage
            user.tasksCompleted = (user.tasksCompleted || 0) + 1;
            user.totalEarned = (user.totalEarned || 0) + (result.rewardUSD || 0.01);
            localStorage.setItem('coindrop_user', JSON.stringify(user));
        } else if (result.alreadyClaimed) {
            resultDiv.innerHTML = `
                <div class="verify-success" style="border-color:var(--navy);">
                    <div class="verify-icon success" style="color:var(--navy);"><i class="fas fa-check-double"></i></div>
                    <h3 style="color:var(--navy);">Already Claimed</h3>
                    <p class="verify-reason" style="color:var(--gray-600);">${result.reason}</p>
                    <p style="font-size:0.85rem;color:var(--gray-400);margin-top:8px;"><i class="fas fa-info-circle"></i> Your original reward is still in your account.</p>
                    <button class="btn btn-primary btn-block" onclick="closeTaskModal()">Got It</button>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="verify-fail">
                    <div class="verify-icon fail"><i class="fas fa-times-circle"></i></div>
                    <h3>Verification Failed</h3>
                    <p class="verify-reason">${result.reason || result.error || 'Could not verify your screenshot.'}</p>
                    <p class="verify-tip"><i class="fas fa-lightbulb"></i> <strong>Tips:</strong> Make sure your screenshot clearly shows the video title, creator name, or the action you took (like/comment/subscribe button state).</p>
                    <button class="btn btn-primary btn-block" onclick="retryScreenshot()">
                        <i class="fas fa-redo"></i> Try Again with Better Screenshot
                    </button>
                    <button class="btn btn-ghost btn-block" onclick="closeTaskModal()" style="color:var(--gray-500)">Cancel</button>
                </div>
            `;
        }
    } catch (err) {
        console.error('Verification error:', err);
        document.getElementById('step-screenshot').classList.remove('active');
        document.getElementById('step-result').classList.add('active');
        document.getElementById('result-content').innerHTML = `
            <div class="verify-fail">
                <div class="verify-icon fail"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Connection Error</h3>
                <p>Could not reach verification server. Please try again.</p>
                <button class="btn btn-primary btn-block" onclick="retryScreenshot()"><i class="fas fa-redo"></i> Retry</button>
            </div>
        `;
    }
}

function retryScreenshot() {
    currentScreenshotData = null;
    document.getElementById('step-result').classList.remove('active');
    document.getElementById('step-screenshot').classList.add('active');
    document.getElementById('screenshot-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
    document.getElementById('verify-btn').disabled = true;
    document.getElementById('verify-btn').innerHTML = '<i class="fas fa-shield-alt"></i> Verify Screenshot';
}
