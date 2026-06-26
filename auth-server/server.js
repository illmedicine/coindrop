const express = require('express');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');
// Firestore REST API (no service account needed)
const FIREBASE_PROJECT = 'coindrop-e39de';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
const FIREBASE_API_KEY = 'AIzaSyCiDPW1rGWSbL1ozIFIVh3B_IaA8nReeI8';

const firestore = {
    async getDoc(collection, docId) {
        try {
            const data = await httpGet(`${FIRESTORE_URL}/${collection}/${docId}?key=${FIREBASE_API_KEY}`);
            const parsed = JSON.parse(data);
            if (parsed.error) return null;
            return parseFirestoreDoc(parsed.fields || {});
        } catch { return null; }
    },
    async setDoc(collection, docId, fields) {
        const body = JSON.stringify({ fields: toFirestoreFields(fields) });
        return httpPatch(`${FIRESTORE_URL}/${collection}/${docId}?key=${FIREBASE_API_KEY}`, body);
    },
    async addDoc(collection, fields) {
        const body = JSON.stringify({ fields: toFirestoreFields(fields) });
        return httpPostJson(`${FIRESTORE_URL}/${collection}?key=${FIREBASE_API_KEY}`, body);
    },
    async query(collection, field, op, value, orderBy, limit) {
        const body = JSON.stringify({
            structuredQuery: {
                from: [{ collectionId: collection }],
                where: field ? { fieldFilter: { field: { fieldPath: field }, op, value: toFirestoreValue(value) } } : undefined,
                orderBy: orderBy ? [{ field: { fieldPath: orderBy }, direction: 'DESCENDING' }] : undefined,
                limit: limit || 20,
            }
        });
        const data = await httpPostJson(`${FIRESTORE_URL.replace('/documents', '')}:runQuery?key=${FIREBASE_API_KEY}`, body);
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(r => r.document).map(r => ({
            id: r.document.name.split('/').pop(),
            ...parseFirestoreDoc(r.document.fields || {})
        }));
    }
};

function toFirestoreValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    return { stringValue: String(v) };
}

function toFirestoreFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === '__serverTimestamp__') {
            fields[k] = { timestampValue: new Date().toISOString() };
        } else {
            fields[k] = toFirestoreValue(v);
        }
    }
    return fields;
}

function parseFirestoreDoc(fields) {
    const result = {};
    for (const [k, v] of Object.entries(fields)) {
        if (v.stringValue !== undefined) result[k] = v.stringValue;
        else if (v.integerValue !== undefined) result[k] = parseInt(v.integerValue);
        else if (v.doubleValue !== undefined) result[k] = v.doubleValue;
        else if (v.booleanValue !== undefined) result[k] = v.booleanValue;
        else if (v.timestampValue !== undefined) result[k] = v.timestampValue;
        else if (v.nullValue !== undefined) result[k] = null;
        else result[k] = null;
    }
    return result;
}

function httpPatch(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
        req.on('error', reject); req.write(body); req.end();
    });
}

function httpPostJson(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
        req.on('error', reject); req.write(body); req.end();
    });
}

const app = express();
app.use(cors({ origin: ['https://coindrop.in', 'http://localhost:4200'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://coindrop-auth.up.railway.app/auth/discord/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://coindrop.in';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TREASURY_PRIVATE_KEY_ENCRYPTED = process.env.TREASURY_PRIVATE_KEY_ENCRYPTED;
const TREASURY_ENCRYPTION_KEY = process.env.TREASURY_ENCRYPTION_KEY;

const DISCORD_WEBHOOKS = {
    views: process.env.DISCORD_WEBHOOK_VIEWS,
    likes: process.env.DISCORD_WEBHOOK_LIKES,
    comments: process.env.DISCORD_WEBHOOK_COMMENTS,
    subscriber: process.env.DISCORD_WEBHOOK_SUBSCRIBER,
};

// All rewards in USD cents — converted to SOL at payout time
const TASK_REWARDS_USD = {
    watch: 0.01,
    like: 0.005,
    comment: 0.02,
    subscribe: 0.05,
    follow: 0.05,
};

// Fetch live SOL/USD price
let _solPriceCache = { price: 150, timestamp: 0 };
async function getSolPrice() {
    if (Date.now() - _solPriceCache.timestamp < 60000) return _solPriceCache.price;
    try {
        const data = await httpGet('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const parsed = JSON.parse(data);
        _solPriceCache = { price: parsed.solana.usd, timestamp: Date.now() };
        return parsed.solana.usd;
    } catch (e) {
        console.error('SOL price fetch error:', e.message);
        return _solPriceCache.price;
    }
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// SOL price endpoint for frontend
app.get('/api/sol-price', async (req, res) => {
    const price = await getSolPrice();
    res.json({ price, timestamp: Date.now() });
});

// ===== Discord OAuth =====
app.get('/auth/discord', (req, res) => {
    const params = querystring.stringify({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds email',
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}/login.html?error=no_code`);

    try {
        const tokenData = await discordPost('/oauth2/token', querystring.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
        }), 'application/x-www-form-urlencoded');

        if (tokenData.error) {
            console.error('Token error:', tokenData);
            return res.redirect(`${FRONTEND_URL}/login.html?error=auth_failed`);
        }

        const user = await discordGet('/users/@me', tokenData.access_token);
        const guilds = await discordGet('/users/@me/guilds', tokenData.access_token);

        const userData = {
            id: user.id,
            displayName: user.global_name || user.username,
            username: user.username,
            avatar: user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000,
            email: user.email || null,
            guilds: guilds.map(g => ({ id: g.id, name: g.name })),
            joinDate: new Date().toISOString().split('T')[0],
            prestige: 'starter',
            tasksCompleted: 0,
            totalEarned: 0,
            activeSubscriptions: 0,
            activeFollows: 0,
        };

        // Save user profile to Firestore (avatar, displayName)
        try {
            await firestore.setDoc('users', user.id, {
                displayName: userData.displayName,
                username: userData.username,
                avatar: userData.avatar,
                authProvider: 'discord',
                lastLogin: '__serverTimestamp__',
            });
        } catch(e) { console.warn('User profile save skipped:', e.message); }

        const encodedUser = encodeURIComponent(JSON.stringify(userData));
        res.redirect(`${FRONTEND_URL}/dashboard.html?auth=${encodedUser}`);
    } catch (err) {
        console.error('OAuth error:', err.message || err);
        res.redirect(`${FRONTEND_URL}/login.html?error=auth_failed`);
    }
});

// ===== Screenshot Verification =====
app.post('/api/verify-task', async (req, res) => {
    try {
        const { screenshot, taskType, videoTitle, creatorName, videoId, platform, userId, username, walletAddress } = req.body;

        if (!screenshot || !taskType || !videoTitle || !userId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Server-side cooldown check (24h per video per task type)
        try {
            const cdData = await firestore.getDoc('cooldowns', userId);
            if (cdData) {
                const cdKey = `${videoId}_${taskType}`;
                const lastTime = cdData[cdKey];
                if (lastTime) {
                    const lastMs = typeof lastTime === 'string' ? new Date(lastTime).getTime() : lastTime;
                    if (Date.now() - lastMs < 24 * 60 * 60 * 1000) {
                        const remaining = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - lastMs)) / 3600000);
                        return res.json({ success: false, verified: false, reason: `You already completed this ${taskType} task. Cooldown resets in ~${remaining} hours.` });
                    }
                }
            }
        } catch(cdErr) { console.warn('Cooldown check skipped:', cdErr.message); }

        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const mediaType = screenshot.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';

        const taskRules = {
            watch: `WATCH VERIFICATION — ALL 3 conditions must be met:
1. VIDEO TITLE MATCH: The video title "${videoTitle}" (or a recognizable portion of it) must be visible on screen. Partial matches are OK (e.g. "MINDS THROUGH TIME" matching "MINDS THROUGH TIME : EPISODE 4 : CARDI B...").
2. CHANNEL NAME VISIBLE: The creator/channel name "${creatorName}" (or a close variant like their YouTube handle) must be visible somewhere on screen — below the video, in the header, or in the URL.
3. ACTIVE PLAYBACK: Evidence the video was watched — look for ANY of: a red progress bar on the video timeline showing elapsed time, a pause button visible (meaning video is playing), visible timestamp showing elapsed time (e.g. "0:15 / 7:55"), or the video player in fullscreen/theater mode.

PASS if all 3 conditions are met. FAIL if the title doesn't match, channel name isn't visible, or there's no evidence of playback.`,

            like: `LIKE VERIFICATION — ALL 3 conditions must be met:
1. VIDEO TITLE MATCH: The video title "${videoTitle}" (or a recognizable portion) must be visible.
2. CHANNEL NAME VISIBLE: The creator "${creatorName}" must be visible.
3. LIKE BUTTON ACTIVE: The thumbs-up/like button must appear FILLED or SOLID. On YouTube dark mode, a LIKED video shows a SOLID WHITE filled thumb — this IS the active/liked state and PASSES. On YouTube light mode, it shows solid blue or black. On Instagram, a red filled heart. The ONLY state that FAILS is a clearly HOLLOW/OUTLINE-ONLY thumb with no fill (just a thin border with empty/transparent interior). If the thumb is solid white, solid blue, solid black, or any solid fill — that means LIKED and PASSES. A white filled thumb on a dark background is NOT an outline — it is the active liked state.

PASS if the like button has ANY solid fill (white, blue, black, colored). FAIL ONLY if the thumb is a thin hollow outline with clearly empty interior.`,

            comment: `COMMENT VERIFICATION — ALL 4 conditions must be met:
1. VIDEO TITLE MATCH: The video title "${videoTitle}" (or a recognizable portion) must be visible on screen.
2. CHANNEL NAME VISIBLE: The creator/channel "${creatorName}" must be visible on screen.
3. FRESH COMMENT VISIBLE: The comments section must be visible and show a recently posted comment with a timestamp of "0 seconds ago", "just now", or "1 minute ago". Comments showing "2 minutes ago" or older FAIL. The comment must contain actual text (not empty).
4. COMMENTER IDENTITY MATCH: The profile avatar/icon next to the most recent comment (the one showing "0 seconds ago") should match the profile avatar shown in the "Add a comment..." input row above the comments. This confirms the logged-in user is the one who left the comment. If the same profile picture appears in both the "Add a comment" prompt and the newest comment, this confirms the commenter is the logged-in user.

PASS if all 4 conditions are met: matching title, visible channel name, a comment posted within the last minute (0 seconds to 1 minute ago), and the commenter's profile matches the "Add a comment" row.
FAIL if: comment is 2+ minutes old, no comment visible, title/channel don't match, or the commenter profile doesn't match the "Add a comment" row.`,

            subscribe: `SUBSCRIBE VERIFICATION — ALL 2 conditions must be met:
1. CHANNEL NAME VISIBLE: The creator/channel name "${creatorName}" (or a recognizable variant like "Just Clips" for "@JustClipsone") must be visible on screen.
2. SUBSCRIBED STATE: Look for ANY of these indicators that the user is already subscribed:
   - A bell/notification icon next to the channel name (with or without a dropdown arrow) — this means "Subscribed" and the subscribe button has been replaced by the bell
   - A gray "Subscribed" button
   - The word "Join" visible instead of "Subscribe" (YouTube shows "Join" when already subscribed)
   - The ABSENCE of a red/colored "Subscribe" button — if there is no subscribe button visible and instead there is a bell icon, the user IS subscribed

   If a RED "Subscribe" button is still visible, the user has NOT subscribed — FAIL.
   If the subscribe button is gone and replaced by a bell icon or notification icon, the user HAS subscribed — PASS.

PASS if bell icon is present or subscribe button shows subscribed state. FAIL only if red Subscribe button is still visible.`,

            follow: `FOLLOW VERIFICATION — ALL 2 conditions must be met:
1. ACCOUNT NAME VISIBLE: The creator "${creatorName}" must be visible.
2. FOLLOWING STATE: The follow button must show "Following" rather than "Follow". If it still says "Follow", the user hasn't followed — FAIL.`
        };

        const verificationPrompt = `You are a strict screenshot verification AI for CoinDrop. Analyze this screenshot for proof of task completion.

TASK: ${taskType.toUpperCase()}
VIDEO/CONTENT: "${videoTitle}"
CREATOR: ${creatorName}
PLATFORM: ${platform}

${taskRules[taskType] || taskRules.watch}

IMPORTANT RULES:
- Check EACH condition independently. Do not assume — look carefully at the actual screenshot.
- IGNORE ALL WATERMARKS: Videos may contain AI-generation watermarks (Sora, Runway, Kling, Pika, Midjourney, OpenAI, Google DeepMind, Stability AI, HiDream, Seedance, Higgsfield, etc.). These watermarks are part of the video content itself and are NOT relevant to verification. Do NOT fail or reduce confidence because of watermarks visible in the video player or on the video content.
- IGNORE overlays, badges, or text burned into the video content — only evaluate the YouTube/Instagram UI elements (title, channel name, like button state, comments, progress bar).
- If you cannot clearly see a REQUIRED UI element (title, channel name, or action state), FAIL the verification.

Respond with EXACTLY this JSON (no other text):
{"verified": true/false, "confidence": 0.0-1.0, "reason": "brief explanation of what you found/didn't find"}`;

        const claudeResponse = await anthropicRequest({
            model: 'claude-sonnet-4-6',
            max_tokens: 200,
            messages: [{
                role: 'user',
                content: [
                    { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
                    { type: 'text', text: verificationPrompt }
                ]
            }]
        });

        const responseText = claudeResponse.content[0].text.trim();
        let verification;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            verification = JSON.parse(jsonMatch[0]);
        } catch {
            console.error('Failed to parse Claude response:', responseText);
            return res.json({ success: false, error: 'Verification service error. Please try again.', raw: responseText });
        }

        if (!verification.verified) {
            return res.json({
                success: false,
                verified: false,
                reason: verification.reason,
                confidence: verification.confidence,
            });
        }

        // Verification passed — convert USD reward to SOL at live rate
        const rewardUSD = TASK_REWARDS_USD[taskType] || 0.01;
        const solPrice = await getSolPrice();
        const rewardSOL = parseFloat((rewardUSD / solPrice).toFixed(9));
        let payoutSuccess = false;
        let txSignature = null;

        console.log(`PAYOUT CHECK: wallet="${walletAddress}", treasury=${!!TREASURY_PRIVATE_KEY_ENCRYPTED}, encKey=${!!TREASURY_ENCRYPTION_KEY}`);
        if (TREASURY_PRIVATE_KEY_ENCRYPTED && TREASURY_ENCRYPTION_KEY && walletAddress) {
            try {
                const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);
                txSignature = await sendSolPayment(treasuryKey, walletAddress, rewardSOL);
                payoutSuccess = true;
            } catch (payErr) {
                console.error('Payout error:', payErr.message);
            }
        }

        // Post to Discord
        const webhookMap = {
            watch: DISCORD_WEBHOOKS.views,
            like: DISCORD_WEBHOOKS.likes,
            comment: DISCORD_WEBHOOKS.comments,
            subscribe: DISCORD_WEBHOOKS.subscriber,
            follow: DISCORD_WEBHOOKS.subscriber,
        };

        const webhookUrl = webhookMap[taskType];
        if (webhookUrl) {
            await postToDiscord(webhookUrl, {
                username: 'CoinDrop Bot',
                avatar_url: 'https://coindrop.in/assets/logo.svg',
                embeds: [{
                    color: 0xF7931A,
                    title: `✅ Task Completed`,
                    description: `**@${username}** completed a **${taskType}** task!`,
                    fields: [
                        { name: '📺 Content', value: videoTitle, inline: true },
                        { name: '🎬 Creator', value: creatorName, inline: true },
                        { name: '💰 Reward', value: `$${rewardUSD.toFixed(3)} (${rewardSOL} SOL @ $${solPrice})`, inline: true },
                        { name: '🔗 Platform', value: platform === 'youtube' ? 'YouTube' : 'Instagram', inline: true },
                        ...(txSignature ? [{ name: '📋 Transaction', value: `[View on Solscan](https://solscan.io/tx/${txSignature})` }] : []),
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { text: 'CoinDrop • Watch. Engage. Earn.' },
                }]
            });
        }

        // Server-side Firestore writes (works for all auth types via REST API)
        try {
            // Ensure user profile exists with displayName for leaderboard
            const existingUser = await firestore.getDoc('users', userId);
            if (!existingUser || !existingUser.displayName) {
                await firestore.setDoc('users', userId, {
                    displayName: username || userId.substring(0, 8),
                    lastActivity: '__serverTimestamp__',
                });
            }

            const statField = { watch: 'views', like: 'likes', comment: 'comments', subscribe: 'subs', follow: 'subs' }[taskType] || 'views';

            // Log completed task
            await firestore.addDoc('tasks', {
                userId, videoId, videoTitle, creatorName, taskType, platform,
                rewardUSD, rewardSOL: rewardSOL || 0, txSignature: txSignature || '',
                payoutSuccess: payoutSuccess,
                walletAddress: walletAddress || '',
                username: username || '',
                timestamp: '__serverTimestamp__'
            });

            // Update user stats (read-modify-write since REST doesn't support increment)
            const existingStats = await firestore.getDoc('stats', userId) || {};
            await firestore.setDoc('stats', userId, {
                [statField]: (existingStats[statField] || 0) + 1,
                tasksCompleted: (existingStats.tasksCompleted || 0) + 1,
                totalEarned: (existingStats.totalEarned || 0) + rewardUSD,
                lastActivity: '__serverTimestamp__'
            });

            // Set cooldown
            const existingCd = await firestore.getDoc('cooldowns', userId) || {};
            existingCd[`${videoId}_${taskType}`] = new Date().toISOString();
            await firestore.setDoc('cooldowns', userId, existingCd);

            console.log(`TASK LOGGED: ${username} (${userId}) — ${taskType} — ${videoTitle} — $${rewardUSD}`);
        } catch(dbErr) {
            console.error('Firestore write error:', dbErr.message);
        }

        res.json({
            success: true,
            verified: true,
            confidence: verification.confidence,
            reason: verification.reason,
            rewardUSD,
            rewardSOL,
            solPrice,
            payoutSuccess,
            txSignature,
            taskType,
        });

    } catch (err) {
        console.error('Verify error:', err.message || err);
        res.status(500).json({ success: false, error: 'Server error. Please try again.' });
    }
});

// ===== Treasury Key Management =====
app.post('/api/set-treasury-key', async (req, res) => {
    const { adminKey, privateKey } = req.body;
    if (adminKey !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const encKey = crypto.randomBytes(32).toString('hex');
    const encrypted = encryptPrivateKey(privateKey, encKey);
    res.json({
        message: 'Set these as Railway env vars:',
        TREASURY_PRIVATE_KEY_ENCRYPTED: encrypted,
        TREASURY_ENCRYPTION_KEY: encKey,
    });
});

function encryptPrivateKey(key, encryptionKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decryptPrivateKey(encryptedData, encryptionKey) {
    const [ivHex, encrypted] = encryptedData.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// ===== Solana Payout =====
async function sendSolPayment(privateKeyBase58, recipientAddress, amountSOL) {
    const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
    const bs58 = require('bs58');

    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const secretKey = bs58.decode(privateKeyBase58);
    const payer = Keypair.fromSecretKey(secretKey);
    const recipient = new PublicKey(recipientAddress);
    const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient, lamports })
    );

    const signature = await connection.sendTransaction(transaction, [payer]);
    await connection.confirmTransaction(signature, 'confirmed');
    console.log(`PAYOUT: ${amountSOL} SOL to ${recipientAddress} — tx: ${signature}`);
    return signature;
}

// ===== Admin: Unpaid Tasks =====
const ADMIN_EMAILS = ['demarkuswilsone@gmail.com', 'dwilson@illyrobotic-ai.com'];

app.get('/api/admin/unpaid-tasks', async (req, res) => {
    const email = req.query.email;
    if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const listData = await httpGet(`${FIRESTORE_URL}/tasks?key=${FIREBASE_API_KEY}&pageSize=300`);
        const parsed = JSON.parse(listData);
        if (!parsed.documents) return res.json({ unpaid: [] });
        const unpaid = [];
        for (const doc of parsed.documents) {
            const data = parseFirestoreDoc(doc.fields || {});
            const docId = doc.name.split('/').pop();
            if (!data.txSignature && !data.payoutSuccess) {
                const userDoc = await firestore.getDoc('users', data.userId);
                const wallet = userDoc ? userDoc.walletAddress : data.walletAddress;
                unpaid.push({
                    docId,
                    userId: data.userId,
                    username: data.username || (userDoc && userDoc.displayName) || data.userId.substring(0, 8),
                    walletAddress: wallet || data.walletAddress || '',
                    taskType: data.taskType,
                    videoTitle: data.videoTitle,
                    creatorName: data.creatorName,
                    rewardUSD: data.rewardUSD || 0,
                    rewardSOL: data.rewardSOL || 0,
                    timestamp: data.timestamp,
                });
            }
        }
        unpaid.sort((a, b) => (b.timestamp || '') < (a.timestamp || '') ? -1 : 1);
        res.json({ unpaid });
    } catch (err) {
        console.error('Admin unpaid error:', err.message);
        res.status(500).json({ error: 'Failed to fetch unpaid tasks' });
    }
});

app.post('/api/admin/retry-payout', async (req, res) => {
    const { email, docId, walletAddress, rewardSOL } = req.body;
    if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!walletAddress || !rewardSOL || !docId) {
        return res.status(400).json({ error: 'Missing walletAddress, rewardSOL, or docId' });
    }
    try {
        if (!TREASURY_PRIVATE_KEY_ENCRYPTED || !TREASURY_ENCRYPTION_KEY) {
            return res.status(400).json({ error: 'Treasury key not configured' });
        }
        const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);
        const txSignature = await sendSolPayment(treasuryKey, walletAddress, parseFloat(rewardSOL));
        // Update the task doc with the tx
        const TASKS_URL = `${FIRESTORE_URL}/tasks/${docId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=txSignature&updateMask.fieldPaths=payoutSuccess&updateMask.fieldPaths=retryTimestamp`;
        const patchData = JSON.stringify({
            fields: {
                txSignature: { stringValue: txSignature },
                payoutSuccess: { booleanValue: true },
                retryTimestamp: { stringValue: new Date().toISOString() },
            }
        });
        await new Promise((resolve, reject) => {
            const url = new URL(TASKS_URL);
            const patchReq = https.request({
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(patchData) },
            }, (patchRes) => {
                let body = '';
                patchRes.on('data', c => body += c);
                patchRes.on('end', () => resolve(body));
            });
            patchReq.on('error', reject);
            patchReq.write(patchData);
            patchReq.end();
        });
        res.json({ success: true, txSignature });
    } catch (err) {
        console.error('Retry payout error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/retry-all', async (req, res) => {
    const { email } = req.body;
    if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        const listData = await httpGet(`${FIRESTORE_URL}/tasks?key=${FIREBASE_API_KEY}&pageSize=300`);
        const parsed = JSON.parse(listData);
        if (!parsed.documents) return res.json({ results: [], total: 0 });
        const results = [];
        for (const doc of parsed.documents) {
            const data = parseFirestoreDoc(doc.fields || {});
            const docId = doc.name.split('/').pop();
            if (!data.txSignature && !data.payoutSuccess) {
                const userDoc = await firestore.getDoc('users', data.userId);
                const wallet = userDoc ? userDoc.walletAddress : data.walletAddress;
                if (!wallet) {
                    results.push({ docId, status: 'skipped', reason: 'No wallet address' });
                    continue;
                }
                try {
                    const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);
                    const txSig = await sendSolPayment(treasuryKey, wallet, parseFloat(data.rewardSOL || 0));
                    const TASKS_URL = `${FIRESTORE_URL}/tasks/${docId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=txSignature&updateMask.fieldPaths=payoutSuccess&updateMask.fieldPaths=retryTimestamp`;
                    const patchData = JSON.stringify({
                        fields: {
                            txSignature: { stringValue: txSig },
                            payoutSuccess: { booleanValue: true },
                            retryTimestamp: { stringValue: new Date().toISOString() },
                        }
                    });
                    await new Promise((resolve, reject) => {
                        const url = new URL(TASKS_URL);
                        const patchReq = https.request({
                            hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(patchData) },
                        }, (patchRes) => { let b = ''; patchRes.on('data', c => b += c); patchRes.on('end', () => resolve(b)); });
                        patchReq.on('error', reject);
                        patchReq.write(patchData);
                        patchReq.end();
                    });
                    results.push({ docId, status: 'paid', txSignature: txSig });
                } catch (payErr) {
                    results.push({ docId, status: 'failed', reason: payErr.message });
                }
            }
        }
        res.json({ results, total: results.length });
    } catch (err) {
        console.error('Retry-all error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===== Anthropic API =====
function anthropicRequest(body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(data),
            },
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.error) reject(new Error(parsed.error.message));
                    else resolve(parsed);
                } catch { reject(new Error(body)); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// ===== Discord Helpers =====
function discordGet(path, token) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'discord.com', path: `/api/v10${path}`, method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error(data)); } });
        });
        req.on('error', reject);
        req.end();
    });
}

function discordPost(path, body, contentType) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'discord.com', path: `/api/v10${path}`, method: 'POST',
            headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error(data)); } });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function postToDiscord(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const data = JSON.stringify(payload);
        const req = https.request({
            hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// API: Get user profile (wallet, displayName, avatar)
app.get('/api/user-profile/:userId', async (req, res) => {
    try {
        const profile = await firestore.getDoc('users', req.params.userId);
        res.json({ profile: profile || {} });
    } catch(e) { res.json({ profile: {} }); }
});

// API: Get user stats and task history
app.get('/api/user-stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const stats = await firestore.getDoc('stats', userId) || { views: 0, likes: 0, comments: 0, subs: 0, tasksCompleted: 0, totalEarned: 0 };

        // Get tasks via structured query
        let tasks = [];
        try {
            tasks = await firestore.query('tasks', 'userId', 'EQUAL', userId, 'timestamp', 20);
        } catch(e) { console.warn('Task query error:', e.message); }

        const cdData = await firestore.getDoc('cooldowns', userId) || {};
        const cooldowns = {};
        for (const [key, val] of Object.entries(cdData)) {
            const ms = typeof val === 'string' ? new Date(val).getTime() : val;
            if (Date.now() - ms < 24 * 60 * 60 * 1000) {
                cooldowns[key] = ms;
            }
        }

        res.json({ stats, tasks, cooldowns });
    } catch(e) {
        console.error('User stats error:', e.message);
        res.json({ stats: {}, tasks: [], cooldowns: {} });
    }
});

// API: Get global leaderboard (list all stats docs, sort server-side)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const listData = await httpGet(`${FIRESTORE_URL}/stats?key=${FIREBASE_API_KEY}&pageSize=50`);
        const parsed = JSON.parse(listData);
        if (!parsed.documents || !Array.isArray(parsed.documents)) {
            return res.json({ leaders: [] });
        }
        const leaders = [];
        for (const doc of parsed.documents) {
            const userId = doc.name.split('/').pop();
            const data = parseFirestoreDoc(doc.fields || {});
            let name = userId.substring(0, 8);
            let avatar = null;
            const userDoc = await firestore.getDoc('users', userId);
            if (userDoc) {
                name = userDoc.displayName || name;
                avatar = userDoc.avatar || null;
            }
            leaders.push({ userId, name, avatar, ...data });
        }
        leaders.sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0));
        res.json({ leaders: leaders.slice(0, 20) });
    } catch(e) {
        console.error('Leaderboard error:', e.message);
        res.json({ leaders: [] });
    }
});

// API: Sync videos from YouTube RSS for all channels
const CHANNEL_IDS = {
    illmedicine: 'UCQ2Ney0SvxUPoHoX02BceHQ',
    illmedicineai: 'UCh34RFo87Gwv-EQVahAWOnQ',
    minds_through_time: 'UC3FYd7y8djrVRT_zlqCOJGQ',
    justclipsone: 'UCqVHfAvgtpn6B0qHERm1RrQ',
    moralsovermoneytv: 'UCMBIDWq7efSB2LiFZL0XUhw',
    bombogames: 'UCcMx_LVWwCybB4K5tbaDgSQ',
    dreathevirgo: 'UC7GWIFunfT4kChX3iKt0M3A',
    cheese2hii: 'UCbR4n4b9zb88HeIodeMgKuw',
    pamelaward: 'UC0mcmm5yP4y-likQ8Mik5Rw',
    adayinla: 'UCkx_vZFl8IOIWYydz2rDOcQ',
    sage_elohi: 'UC678gv8uMqF3L6Mm-99KHvw',
    errorbyhuman: 'UCJmtTy5DUZyiKog_7sAgJDw',
    dykeasaurus420: 'UC8JLWD1lPpYNJWY2qMGQwAQ',
    cameronrandall: 'UC3AVknoW_7nfuUGGAL5_r2Q',
    nadiivlogs: 'UCjwgYp_qk8v_4FlNw1iESuA',
    jreycash: 'UCpu4oacM0CPZW4H-BgZPkKA',
    shanshanuptopar: 'UChPtNXx4_6RW-4O4hZWJN7w',
};

app.get('/api/sync-videos', async (req, res) => {
    try {
        const results = {};
        for (const [creatorId, channelId] of Object.entries(CHANNEL_IDS)) {
            try {
                // Get videos from RSS (has titles + view counts for recent 15)
                const xml = await httpGet(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
                const rssVideos = {};
                const entries = xml.split('<entry>').slice(1);
                for (const entry of entries) {
                    const vidMatch = entry.match(/<yt:videoId>([^<]+)/);
                    const titleMatch = entry.match(/<title>([^<]+)/);
                    const viewsMatch = entry.match(/views="(\d+)"/);
                    if (vidMatch && titleMatch) {
                        rssVideos[vidMatch[1]] = {
                            id: vidMatch[1],
                            title: titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                            views: viewsMatch ? viewsMatch[1] : '0',
                        };
                    }
                }

                // Get ALL video IDs from videos tab
                const handle = Object.keys(CHANNEL_IDS).find(k => CHANNEL_IDS[k] === channelId);
                let allVideoIds = new Set(Object.keys(rssVideos));
                try {
                    const channelHandles = { illmedicine: 'illmedicine', illmedicineai: 'illmedicineai', minds_through_time: 'MINDS_THROUGH_TIME', justclipsone: 'JustClipsone', moralsovermoneytv: 'MoralsOverMoneyTV', bombogames: 'BomboGames', dreathevirgo: 'Dreathevirgo', cheese2hii: 'Cheese2hii', pamelaward: 'pamelaward7657', adayinla: 'adayinlapodcast', sage_elohi: 'Sage_elohi', errorbyhuman: 'errorbyhuman', dykeasaurus420: 'Dykeasaurus420', nadiivlogs: 'Nadiivlogs', jreycash: 'JreyCash', cameronrandall: null, shanshanuptopar: 'ShanShanUptopar' };
                    const ytHandle = channelHandles[creatorId];
                    if (ytHandle) {
                        const vidPage = await httpGet(`https://www.youtube.com/@${ytHandle}/videos`);
                        const vidIds = vidPage.match(/"videoId":"([^"]+)"/g) || [];
                        vidIds.forEach(m => { const id = m.match(/"videoId":"([^"]+)"/)[1]; allVideoIds.add(id); });
                        const shortPage = await httpGet(`https://www.youtube.com/@${ytHandle}/shorts`);
                        const shortMatches = shortPage.match(/"reelWatchEndpoint":\{"videoId":"([^"]+)"/g) || [];
                        shortMatches.forEach(m => { const id = m.match(/"videoId":"([^"]+)"/)[1]; allVideoIds.add(id); });
                    }
                } catch(e) {}

                // For IDs not in RSS, fetch title via oEmbed
                const videos = [];
                for (const id of allVideoIds) {
                    if (rssVideos[id]) {
                        videos.push(rssVideos[id]);
                    } else {
                        try {
                            const oembed = await httpGet(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
                            const parsed = JSON.parse(oembed);
                            if (parsed.title) {
                                videos.push({ id, title: parsed.title, views: '0' });
                            }
                        } catch(e) { videos.push({ id, title: id, views: '0' }); }
                    }
                }
                results[creatorId] = videos;
            } catch(e) { results[creatorId] = { error: e.message }; }
        }
        res.json({ synced: new Date().toISOString(), channels: results });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok', features: { verification: !!ANTHROPIC_API_KEY, payouts: !!TREASURY_PRIVATE_KEY_ENCRYPTED, discord: !!DISCORD_WEBHOOKS.views } }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`CoinDrop Auth running on port ${PORT}`));
