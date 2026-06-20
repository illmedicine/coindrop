// ===== Registration Form Logic =====

let formState = {
    discordJoined: false,
    youtubeValid: false,
    walletValid: false,
};

function nextStep(step) {
    const current = document.querySelector('.form-step.active');
    const currentStep = parseInt(current.dataset.step);

    if (currentStep === 1) {
        const name = document.getElementById('display-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const country = document.getElementById('country').value;
        if (!name || !validateEmail(email) || !country) {
            shakeElement(current);
            return;
        }
    }

    if (currentStep === 2) {
        if (!formState.discordJoined || !formState.youtubeValid) {
            shakeElement(current);
            return;
        }
    }

    current.classList.remove('active');
    document.querySelector(`[data-step="${step}"]`).classList.add('active');
}

function prevStep(step) {
    document.querySelector('.form-step.active').classList.remove('active');
    document.querySelector(`[data-step="${step}"]`).classList.add('active');
}

function checkDiscord() {
    const cb = document.getElementById('discord-joined');
    formState.discordJoined = cb.checked;
    updateChecklistItem('check-discord', cb.checked);
    updateStep2Button();
}

function verifyYouTube() {
    const input = document.getElementById('youtube-handle');
    const status = document.getElementById('yt-status');
    const feedback = document.getElementById('yt-feedback');
    const val = input.value.trim();

    if (!val) {
        status.textContent = '';
        feedback.textContent = '';
        input.classList.remove('is-valid', 'is-invalid');
        formState.youtubeValid = false;
        updateChecklistItem('check-youtube', false);
        updateStep2Button();
        return;
    }

    if (!val.startsWith('@')) {
        status.textContent = '';
        feedback.textContent = 'Handle must start with @';
        feedback.style.color = 'var(--danger)';
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        formState.youtubeValid = false;
        updateStep2Button();
        return;
    }

    if (validateYouTubeHandle(val)) {
        status.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        status.className = 'input-status loading';

        setTimeout(() => {
            status.innerHTML = '<i class="fas fa-check-circle"></i>';
            status.className = 'input-status valid';
            feedback.textContent = 'YouTube handle verified';
            feedback.style.color = 'var(--success)';
            input.classList.add('is-valid');
            input.classList.remove('is-invalid');
            formState.youtubeValid = true;
            updateChecklistItem('check-youtube', true);
            updateStep2Button();
        }, 1200);
    } else {
        status.innerHTML = '<i class="fas fa-times-circle"></i>';
        status.className = 'input-status invalid';
        feedback.textContent = 'Invalid handle format (use @username)';
        feedback.style.color = 'var(--danger)';
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        formState.youtubeValid = false;
        updateStep2Button();
    }
}

function verifyWallet() {
    const input = document.getElementById('sol-wallet');
    const status = document.getElementById('wallet-status');
    const feedback = document.getElementById('wallet-feedback');
    const val = input.value.trim();

    if (!val) {
        status.textContent = '';
        feedback.textContent = '';
        input.classList.remove('is-valid', 'is-invalid');
        formState.walletValid = false;
        updateChecklistItem('check-wallet', false);
        updateSubmitButton();
        return;
    }

    if (validateSolAddress(val)) {
        status.innerHTML = '<i class="fas fa-check-circle"></i>';
        status.className = 'input-status valid';
        feedback.textContent = 'Valid Solana wallet address';
        feedback.style.color = 'var(--success)';
        input.classList.add('is-valid');
        input.classList.remove('is-invalid');
        formState.walletValid = true;
        updateChecklistItem('check-wallet', true);
    } else {
        status.innerHTML = '<i class="fas fa-times-circle"></i>';
        status.className = 'input-status invalid';
        feedback.textContent = 'Invalid Solana address format';
        feedback.style.color = 'var(--danger)';
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        formState.walletValid = false;
        updateChecklistItem('check-wallet', false);
    }
    updateSubmitButton();
}

function updateChecklistItem(id, completed) {
    const item = document.getElementById(id);
    const icon = item.querySelector('.check-icon');
    if (completed) {
        item.classList.add('completed');
        icon.classList.remove('pending');
        icon.classList.add('done');
    } else {
        item.classList.remove('completed');
        icon.classList.add('pending');
        icon.classList.remove('done');
    }
}

function updateStep2Button() {
    const btn = document.getElementById('step2-next');
    btn.disabled = !(formState.discordJoined && formState.youtubeValid);
}

function updateSubmitButton() {
    const btn = document.getElementById('submit-btn');
    const terms = document.getElementById('terms-agree');
    btn.disabled = !(formState.walletValid && terms.checked);
}

document.getElementById('terms-agree')?.addEventListener('change', updateSubmitButton);

// Form submission
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        displayName: document.getElementById('display-name').value.trim(),
        email: document.getElementById('email').value.trim(),
        country: document.getElementById('country').value,
        youtubeHandle: document.getElementById('youtube-handle').value.trim(),
        solWallet: document.getElementById('sol-wallet').value.trim(),
        timestamp: new Date().toISOString(),
    };

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
        localStorage.setItem('coindrop_application', JSON.stringify(data));

        // Send application via mailto in background iframe to avoid page navigation
        const mailtoBody = encodeURIComponent(
            `New CoinDrop Staffer Application\n\n` +
            `Display Name: ${data.displayName}\n` +
            `Email: ${data.email}\n` +
            `Country: ${data.country}\n` +
            `YouTube: ${data.youtubeHandle}\n` +
            `SOL Wallet: ${data.solWallet}\n` +
            `Submitted: ${data.timestamp}\n`
        );
        const mailtoUrl = `mailto:support@illyrobotic-ai.com?subject=${encodeURIComponent('New CoinDrop Application - ' + data.displayName)}&body=${mailtoBody}`;

        // Open mailto without leaving the page
        const mailFrame = document.createElement('iframe');
        mailFrame.style.display = 'none';
        mailFrame.src = mailtoUrl;
        document.body.appendChild(mailFrame);
        setTimeout(() => mailFrame.remove(), 3000);

        setTimeout(() => {
            document.querySelector('.form-step.active').classList.remove('active');
            document.querySelector('[data-step="success"]').classList.add('active');
        }, 1500);
    } catch (err) {
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Join CoinDrop';
        submitBtn.disabled = false;
        alert('Something went wrong. Please try again.');
    }
});

function shakeElement(el) {
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => el.style.animation = '', 400);
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
}`;
document.head.appendChild(shakeStyle);
