const express = require('express');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');
// Firestore REST API (no service account needed)
const FIREBASE_PROJECT = 'coindrop-e39de';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
const FIREBASE_API_KEY = 'AIzaSyCiDPW1rGWSbL1ozIFIVh3B_IaA8nReeI8';

let _firestoreThrottled = false;
let _throttleUntil = 0;

function checkThrottle(parsed) {
    if (parsed && parsed.error && (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED')) {
        _firestoreThrottled = true;
        _throttleUntil = Date.now() + 60000;
        console.error('FIRESTORE QUOTA EXCEEDED — serving from cache for 60s');
        return true;
    }
    if (_firestoreThrottled && Date.now() > _throttleUntil) _firestoreThrottled = false;
    return false;
}

const firestore = {
    async getDoc(collection, docId) {
        try {
            const data = await httpGet(`${FIRESTORE_URL}/${collection}/${docId}?key=${FIREBASE_API_KEY}`);
            const parsed = JSON.parse(data);
            if (checkThrottle(parsed)) return null;
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
        const result = await httpPostJson(`${FIRESTORE_URL}/${collection}?key=${FIREBASE_API_KEY}`, body);
        try {
            const parsed = JSON.parse(result);
            if (parsed.name) return parsed.name.split('/').pop();
        } catch(e) {}
        return null;
    },
    async deleteDoc(collection, docId) {
        try { await httpDelete(`${FIRESTORE_URL}/${collection}/${docId}?key=${FIREBASE_API_KEY}`); } catch(e) {}
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

function httpDelete(url) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'DELETE' },
            res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
        req.on('error', reject); req.end();
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
    payouts: 'https://discord.com/api/webhooks/1521127897090359366/hZvkQGoEd2PNs-ht4ut1jcyLheM0Ubq95xdSQ9ebxMcooIN9PLnN86glL9qdhIHvTXyQ',
    flash: process.env.DISCORD_WEBHOOK_FLASH || 'https://discord.com/api/webhooks/1521127897090359366/hZvkQGoEd2PNs-ht4ut1jcyLheM0Ubq95xdSQ9ebxMcooIN9PLnN86glL9qdhIHvTXyQ',
};

const DISCORD_SERVER_ID = '1517900956849803346';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// All rewards in USD cents — converted to SOL at payout time
const TASK_REWARDS_USD = {
    watch: 0.01,
    like: 0.005,
    comment: 0.05,
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
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=no_code`);

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
            return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
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
        res.redirect(`${FRONTEND_URL}/dashboard?auth=${encodedUser}`);
    } catch (err) {
        console.error('OAuth error:', err.message || err);
        res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }
});

// ===== Screenshot Verification =====
app.post('/api/verify-task', async (req, res) => {
    try {
        const { screenshot, taskType, videoTitle, creatorName, creatorHandle, videoId, platform, userId, username, walletAddress } = req.body;
        // Display name and channel handle can differ (e.g. persona "Aysha" vs handle "@Sage_elohi") — accept either on screen.
        const creatorIdentity = creatorHandle && creatorHandle !== creatorName
            ? `"${creatorName}" or "${creatorHandle}"`
            : `"${creatorName}"`;

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

        // Subscribe tasks: only allowed once per creator per user (permanent, no repeat)
        if (taskType === 'subscribe') {
            try {
                const listData = await httpGet(`${FIRESTORE_URL}/tasks?key=${FIREBASE_API_KEY}&pageSize=500`);
                const parsed = JSON.parse(listData);
                if (parsed.documents) {
                    const alreadySubscribed = parsed.documents.some(doc => {
                        const d = parseFirestoreDoc(doc.fields || {});
                        return d.userId === userId && d.taskType === 'subscribe' && d.creatorName === creatorName;
                    });
                    if (alreadySubscribed) {
                        return res.json({ success: false, verified: false, reason: `You have already subscribed to ${creatorName}. Subscribe tasks can only be completed once per creator.` });
                    }
                }
            } catch(e) { console.warn('Subscribe dup check skipped:', e.message); }
        }

        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const mediaType = screenshot.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';

        const taskRules = {
            watch: `WATCH VERIFICATION — ALL 3 conditions must be met:
1. VIDEO TITLE MATCH: The video title "${videoTitle}" (or a recognizable portion of it) must be visible on screen. Partial matches are OK (e.g. "MINDS THROUGH TIME" matching "MINDS THROUGH TIME : EPISODE 4 : CARDI B...").
2. CHANNEL NAME VISIBLE: The creator/channel name ${creatorIdentity} (the display name and the @handle both refer to the SAME creator and either one being visible is sufficient — they do not need to resemble each other textually) must be visible somewhere on screen — below the video, in the header, or in the URL.
3. ACTIVE PLAYBACK: Evidence the video was watched — look for ANY of: a red progress bar on the video timeline showing elapsed time, a pause button visible (meaning video is playing), visible timestamp showing elapsed time (e.g. "0:15 / 7:55"), or the video player in fullscreen/theater mode.

PASS if all 3 conditions are met. FAIL if the title doesn't match, channel name isn't visible, or there's no evidence of playback.`,

            like: `LIKE VERIFICATION — ALL 3 conditions must be met:
1. VIDEO TITLE MATCH: The video title "${videoTitle}" (or a recognizable portion) must be visible.
2. CHANNEL NAME VISIBLE: The creator ${creatorIdentity} (display name or @handle — either is sufficient, they refer to the same creator) must be visible.
3. LIKE BUTTON ACTIVE: The thumbs-up/like button must appear FILLED or SOLID, OR an "Unlike" label is visible. Specific rules:
   - If the word "Unlike" appears anywhere near the like button, the content IS liked — PASS immediately.
   - A like count (any number like "1", "42", etc.) next to the thumbs-up icon means the like is active — PASS.
   - On YouTube dark mode, a LIKED video shows a SOLID WHITE filled thumb — this IS the active/liked state and PASSES.
   - On YouTube light mode, it shows solid blue or black.
   - On Instagram, a red filled heart.
   - The ONLY state that FAILS is a clearly HOLLOW/OUTLINE-ONLY thumb with no fill AND no "Unlike" label AND no like count.
   - LIVE STREAMS: If the video player shows "Live stream offline" or "Live stream" — this is completely normal and DOES NOT affect the like button verification. A live stream being offline has no progress bar by design. Only check the like button state, title, and channel name.
   - IGNORE the video player state entirely for LIKE verification — do not require a progress bar, play button, or any playback evidence.

PASS if: "Unlike" button visible, OR like count > 0 next to thumb, OR thumb has any solid fill. FAIL ONLY if thumb is clearly hollow/outline with zero count and no Unlike label.`,

            comment: `COMMENT VERIFICATION — ALL 4 conditions must be met:
1. VIDEO TITLE MATCH: The video title "${videoTitle}" (or a recognizable portion) must be visible on screen.
2. CHANNEL NAME VISIBLE: The creator/channel ${creatorIdentity} (display name or @handle — either is sufficient, they refer to the same creator) must be visible on screen.
3. FRESH COMMENT VISIBLE: The comments section must be visible and show a recently posted comment with a timestamp of "0 seconds ago", "just now", "1 minute ago", OR "2 minutes ago". Comments showing "3 minutes ago" or older FAIL. The comment must contain actual text (not empty). A timestamp is required — if no timestamp is visible, FAIL.
4. COMMENTER NAME MATCH: The display name shown next to the most recent comment (the one with the freshest timestamp) must match or closely resemble the CoinDrop username "${username}". The match does not need to be perfect — YouTube display names may differ slightly from usernames (e.g. capitalization, spaces). However if the commenter name is completely unrelated to "${username}", FAIL. If you cannot read the commenter name at all, FAIL.

PASS if all 4 conditions are met: matching title, visible channel name, comment posted within 2 minutes, and commenter name matches "${username}".
FAIL if: comment is 3+ minutes old, no timestamp visible, no comment visible, title/channel don't match, or commenter name does not resemble "${username}".`,

            subscribe: `SUBSCRIBE VERIFICATION — ALL 2 conditions must be met:
1. CHANNEL NAME VISIBLE: The creator/channel name ${creatorIdentity} (display name or @handle — either is sufficient, they refer to the same creator and do NOT need to textually resemble each other) must be visible on screen.
2. SUBSCRIBED STATE: Look for ANY of these indicators that the user is already subscribed:
   - A bell/notification icon next to the channel name (with or without a dropdown arrow) — this means "Subscribed" and the subscribe button has been replaced by the bell
   - A gray "Subscribed" button
   - The word "Join" visible instead of "Subscribe" (YouTube shows "Join" when already subscribed)
   - The ABSENCE of a red/colored "Subscribe" button — if there is no subscribe button visible and instead there is a bell icon, the user IS subscribed

   If a RED "Subscribe" button is still visible, the user has NOT subscribed — FAIL.
   If the subscribe button is gone and replaced by a bell icon or notification icon, the user HAS subscribed — PASS.

PASS if bell icon is present or subscribe button shows subscribed state. FAIL only if red Subscribe button is still visible.`,

            follow: `FOLLOW VERIFICATION — ALL 2 conditions must be met:
1. ACCOUNT NAME VISIBLE: The creator ${creatorIdentity} (display name or @handle — either is sufficient) must be visible.
2. FOLLOWING STATE: The follow button must show "Following" rather than "Follow". If it still says "Follow", the user hasn't followed — FAIL.`
        };

        const verificationPrompt = `You are a strict screenshot verification AI for CoinDrop. Analyze this screenshot for proof of task completion.

TASK: ${taskType.toUpperCase()}
VIDEO/CONTENT: "${videoTitle}"
CREATOR: ${creatorName}${creatorHandle && creatorHandle !== creatorName ? ` (channel handle: ${creatorHandle})` : ''}
PLATFORM: ${platform}

${taskRules[taskType] || taskRules.watch}

IMPORTANT RULES:
- Check EACH condition independently. Do not assume — look carefully at the actual screenshot.
- IGNORE ALL WATERMARKS: Videos may contain AI-generation watermarks (Sora, Runway, Kling, Pika, Midjourney, OpenAI, Google DeepMind, Stability AI, HiDream, Seedance, Higgsfield, etc.). These watermarks are part of the video content itself and are NOT relevant to verification. Do NOT fail or reduce confidence because of watermarks visible in the video player or on the video content.
- IGNORE overlays, badges, or text burned into the video content — only evaluate the YouTube/Instagram UI elements (title, channel name, like button state, comments, progress bar).
- CREATOR NAME MATCHING: Creators often have a display/persona name that is different from their @handle (e.g. display name "Aysha" with handle "@Sage_elohi"). This is normal and expected — do NOT fail verification just because the on-screen name doesn't textually resemble the other name. Seeing EITHER the display name OR the @handle on screen satisfies the channel name condition.
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
            const newDocId = await firestore.addDoc('tasks', {
                userId, videoId, videoTitle, creatorName, taskType, platform,
                rewardUSD, rewardSOL: rewardSOL || 0, txSignature: txSignature || '',
                payoutSuccess: payoutSuccess,
                walletAddress: walletAddress || '',
                username: username || '',
                timestamp: '__serverTimestamp__'
            });

            // Denormalized stats write — single doc contains everything the frontend needs
            const existingStats = await firestore.getDoc('stats', userId) || {};
            const newStats = {
                views: (existingStats.views || 0) + (statField === 'views' ? 1 : 0),
                likes: (existingStats.likes || 0) + (statField === 'likes' ? 1 : 0),
                comments: (existingStats.comments || 0) + (statField === 'comments' ? 1 : 0),
                subs: (existingStats.subs || 0) + (statField === 'subs' ? 1 : 0),
                tasksCompleted: (existingStats.tasksCompleted || 0) + 1,
                totalEarned: (existingStats.totalEarned || 0) + rewardUSD,
                lastActivity: '__serverTimestamp__',
                firstTaskAt: existingStats.firstTaskAt || new Date().toISOString(),
                displayName: username || existingStats.displayName || userId.substring(0, 8),
                avatar: (existingUser && existingUser.avatar) || existingStats.avatar || '',
                email: (existingUser && existingUser.email) || existingStats.email || '',
            };
            // Compute prestige + badges and store in stats doc
            let prestige = 'starter';
            const tc = newStats.tasksCompleted;
            if (tc >= 500) prestige = 'diamond';
            else if (tc >= 300) prestige = 'platinum';
            else if (tc >= 150) prestige = 'gold';
            else if (tc >= 50) prestige = 'silver';
            else if (tc >= 10) prestige = 'bronze';
            newStats.prestige = prestige;
            const badges = computeUserBadges(userId, newStats.email, tc, newStats.firstTaskAt);
            newStats.badges = JSON.stringify(badges);
            await firestore.setDoc('stats', userId, newStats);

            // Set cooldown — merged into single doc
            const existingCd = await firestore.getDoc('cooldowns', userId) || {};
            existingCd[`${videoId}_${taskType}`] = new Date().toISOString();
            await firestore.setDoc('cooldowns', userId, existingCd);

            console.log(`TASK LOGGED: ${username} (${userId}) — ${taskType} — ${videoTitle} — $${rewardUSD}`);

            // Add to in-memory cache with docId so unpaid-tasks can reference it
            const now = new Date().toISOString();
            cache.tasks.push({ userId, videoId, videoTitle, creatorName, taskType, platform, rewardUSD, rewardSOL: rewardSOL || 0, txSignature: txSignature || '', payoutSuccess, walletAddress: walletAddress || '', username: username || '', timestamp: now, retryTimestamp: payoutSuccess ? now : '', _docId: newDocId || '' });
            // Update platform stats immediately so ticker reflects this payout in real time
            recomputeStatsFromCache();
        } catch(dbErr) {
            console.error('Firestore write error:', dbErr.message);
        }

        if (payoutSuccess && txSignature) {
            notifyPayout(userId, username, taskType, videoTitle, rewardUSD, rewardSOL, txSignature);
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
    let lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

    // Check if recipient account exists — if not, must send enough for rent exemption
    const recipientInfo = await connection.getAccountInfo(recipient);
    if (!recipientInfo) {
        const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
        if (lamports < rentExempt) {
            lamports = rentExempt;
        }
    }

    const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient, lamports })
    );

    const signature = await connection.sendTransaction(transaction, [payer]);
    await connection.confirmTransaction(signature, 'confirmed');
    const actualSOL = lamports / LAMPORTS_PER_SOL;
    console.log(`PAYOUT: ${actualSOL} SOL to ${recipientAddress} — tx: ${signature}`);
    return signature;
}

// ===== Admin Check =====
const ADMIN_EMAILS = ['demarkuswilsone@gmail.com', 'dwilson@illyrobotic-ai.com'];

// ===== Prestige Badges =====
const BETA_BADGE_CUTOFF = '2026-06-30T23:59:59.000Z';

function computeUserBadges(userId, email, tasksCompleted, firstTaskTimestamp) {
    const badges = [];
    const now = new Date();
    const cutoff = new Date(BETA_BADGE_CUTOFF);
    const isAdmin = ADMIN_EMAILS.includes((email || '').toLowerCase().trim());
    if (isAdmin) {
        badges.push({ id: 'admin', label: 'ADMIN', icon: 'fas fa-shield-alt', color: '#dc2626', bg: '#fef2f2' });
    }
    if (tasksCompleted > 0 && firstTaskTimestamp) {
        const firstTask = new Date(firstTaskTimestamp);
        if (firstTask <= cutoff) {
            badges.push({ id: 'beta-tester', label: 'Beta Tester', icon: 'fas fa-flask', color: '#7c3aed', bg: '#f5f3ff' });
            badges.push({ id: 'coin-collector', label: 'COIN-COLLECTOR', icon: 'fas fa-coins', color: '#d97706', bg: '#fffbeb' });
        }
    }
    return badges;
}

app.get('/api/admin/check', (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    res.json({ isAdmin: ADMIN_EMAILS.includes(email) });
});

// ===== Earnings Potential (server-cached, highest value persists) =====
const EP_DEFAULT = { daily: 22.40, sub: 0.85, residual: 0.17, network: '17 creators · 640 videos' };
let cachedEarningsPotential = EP_DEFAULT;

// Load persisted EP on startup
(async function loadEP() {
    try {
        const existing = await firestore.getDoc('config', 'earningsPotential');
        if (existing && existing.daily >= EP_DEFAULT.daily) cachedEarningsPotential = existing;
    } catch(e) {}
})();

app.get('/api/earnings-potential', (req, res) => {
    res.json(cachedEarningsPotential);
});

// Client reports actual video/creator counts so server can persist the highest earning potential
app.post('/api/earnings-potential/update', async (req, res) => {
    const { totalVideos, totalCreators } = req.body;
    if (!totalVideos || !totalCreators) return res.status(400).json({ error: 'Missing counts' });

    const dailyUSD = (totalVideos * 0.01) + (totalVideos * 0.005) + (totalVideos * 0.05);
    const subOnetime = totalCreators * 0.05;
    const monthlyResidual = totalCreators * 0.01;

    const newData = {
        daily: parseFloat(dailyUSD.toFixed(2)),
        sub: parseFloat(subOnetime.toFixed(2)),
        residual: parseFloat(monthlyResidual.toFixed(2)),
        network: `${totalCreators} creators · ${totalVideos} videos`,
        totalCreators,
        totalVideos,
        updatedAt: new Date().toISOString(),
    };

    // Keep the highest daily value ever seen
    try {
        const existing = await firestore.getDoc('config', 'earningsPotential');
        if (existing && existing.daily > newData.daily) {
            newData.daily = existing.daily;
            newData.sub = Math.max(newData.sub, existing.sub || 0);
            newData.residual = Math.max(newData.residual, existing.residual || 0);
        }
    } catch(e) {}

    cachedEarningsPotential = newData;
    try { await firestore.setDoc('config', 'earningsPotential', newData); } catch(e) {}

    res.json(newData);
});

// ===== Treasury Balance Check =====
app.get('/api/admin/treasury-balance', async (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ error: 'Unauthorized' });

    try {
        if (!TREASURY_PRIVATE_KEY_ENCRYPTED || !TREASURY_ENCRYPTION_KEY) {
            return res.json({ balance: 0, error: 'Treasury key not configured' });
        }
        const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
        const bs58 = require('bs58');
        const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);
        const secretKey = bs58.decode(treasuryKey);
        const payer = Keypair.fromSecretKey(secretKey);
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const balance = await connection.getBalance(payer.publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;
        res.json({ balance: solBalance, address: payer.publicKey.toBase58() });
    } catch (err) {
        res.json({ balance: 0, error: err.message });
    }
});

// ===== Admin: Unpaid Tasks =====

app.get('/api/admin/unpaid-tasks', async (req, res) => {
    const email = req.query.email;
    if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        // Try Firestore first, fall back to cache if throttled
        let allTasks = [];
        if (!_firestoreThrottled) {
            let nextPageToken = null;
            do {
                let url = `${FIRESTORE_URL}/tasks?key=${FIREBASE_API_KEY}&pageSize=300`;
                if (nextPageToken) url += `&pageToken=${nextPageToken}`;
                const listData = await httpGet(url);
                const parsed = JSON.parse(listData);
                if (checkThrottle(parsed)) break;
                if (!parsed.documents) break;
                for (const doc of parsed.documents) {
                    allTasks.push({ ...parseFirestoreDoc(doc.fields || {}), docId: doc.name.split('/').pop() });
                }
                nextPageToken = parsed.nextPageToken || null;
            } while (nextPageToken);
        }
        if (allTasks.length > 0) {
            cache.tasks = allTasks.map(t => ({ ...t, _docId: t.docId }));
            recomputeStatsFromCache();
        } else if (cache.tasks.length > 0) {
            allTasks = cache.tasks.map(t => ({ ...t, docId: t._docId || t.docId }));
            console.log(`Admin unpaid-tasks: using cache (${allTasks.length} tasks) — Firestore ${_firestoreThrottled ? 'throttled' : 'empty'}`);
        } else {
            return res.json({ unpaid: [], error: _firestoreThrottled ? 'Firestore quota exceeded — data will refresh when quota resets at midnight PT' : null });
        }
        console.log(`Admin unpaid-tasks: processing ${allTasks.length} total tasks`);

        const unpaid = [];
        const seenSubscribes = new Set();
        allTasks.sort((a, b) => (a.timestamp || '') < (b.timestamp || '') ? -1 : 1);
        for (const t of allTasks) {
            if (t.taskType === 'subscribe') {
                const key = `${t.userId}:${t.creatorName}`;
                if (!seenSubscribes.has(key)) {
                    seenSubscribes.add(key);
                    t._isFirstSubscribe = true;
                } else {
                    t._isFirstSubscribe = false;
                }
            }
        }
        for (const t of allTasks) {
            if (!t.txSignature && !t.payoutSuccess) {
                if (t.taskType === 'subscribe' && !t._isFirstSubscribe) continue;
                const userDoc = await getUserProfileCached(t.userId);
                const wallet = userDoc ? userDoc.walletAddress : t.walletAddress;
                unpaid.push({
                    docId: t.docId,
                    userId: t.userId,
                    username: t.username || (userDoc && userDoc.displayName) || t.userId.substring(0, 8),
                    walletAddress: wallet || t.walletAddress || '',
                    taskType: t.taskType,
                    videoTitle: t.videoTitle,
                    creatorName: t.creatorName,
                    rewardUSD: t.rewardUSD || 0,
                    rewardSOL: t.rewardSOL || 0,
                    timestamp: t.timestamp,
                });
            }
        }
        unpaid.sort((a, b) => (b.timestamp || '') < (a.timestamp || '') ? -1 : 1);
        const paidCount = allTasks.filter(t => t.txSignature || t.payoutSuccess).length;
        const noPayout = allTasks.filter(t => !t.txSignature && !t.payoutSuccess).length;
        console.log(`Admin unpaid-tasks: ${allTasks.length} total, ${paidCount} paid, ${noPayout} no-payout-flag, ${unpaid.length} eligible unpaid`);
        res.json({ unpaid, debug: { totalTasks: allTasks.length, paidCount, noPayoutFlag: noPayout, eligibleUnpaid: unpaid.length } });
    } catch (err) {
        console.error('Admin unpaid error:', err.message);
        res.status(500).json({ error: 'Failed to fetch unpaid tasks' });
    }
});

// All tasks audit endpoint — returns every task with fraud flags
app.get('/api/admin/all-tasks', async (req, res) => {
    const email = req.query.email;
    if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ error: 'Unauthorized' });
    try {
        let allTasks = [];
        if (!_firestoreThrottled) {
            let nextPageToken = null;
            do {
                let url = `${FIRESTORE_URL}/tasks?key=${FIREBASE_API_KEY}&pageSize=300`;
                if (nextPageToken) url += `&pageToken=${nextPageToken}`;
                const listData = await httpGet(url);
                const parsed = JSON.parse(listData);
                if (checkThrottle(parsed)) break;
                if (!parsed.documents) break;
                for (const doc of parsed.documents) {
                    allTasks.push({ ...parseFirestoreDoc(doc.fields || {}), docId: doc.name.split('/').pop() });
                }
                nextPageToken = parsed.nextPageToken || null;
            } while (nextPageToken);
        }
        if (allTasks.length === 0 && cache.tasks.length > 0) {
            allTasks = cache.tasks.map(t => ({ ...t, docId: t._docId || t.docId }));
        }

        allTasks.sort((a, b) => (b.timestamp || '') < (a.timestamp || '') ? -1 : 1);

        // Fraud detection
        const subKeys = {};   // userId:creatorName -> count
        const dayKeys = {};   // userId:videoId:taskType:date -> count
        const userTaskCounts = {}; // userId:date -> count (botting)
        for (const t of allTasks) {
            if (t.taskType === 'subscribe') {
                const k = `${t.userId}:${t.creatorName}`;
                subKeys[k] = (subKeys[k] || 0) + 1;
            }
            if (t.taskType === 'watch' || t.taskType === 'like') {
                const date = (t.timestamp || '').slice(0, 10);
                const k = `${t.userId}:${t.videoId}:${t.taskType}:${date}`;
                dayKeys[k] = (dayKeys[k] || 0) + 1;
            }
            const date = (t.timestamp || '').slice(0, 10);
            const bk = `${t.userId}:${date}`;
            userTaskCounts[bk] = (userTaskCounts[bk] || 0) + 1;
        }

        const tasks = allTasks.map(t => {
            const flags = [];
            if (t.taskType === 'subscribe') {
                const k = `${t.userId}:${t.creatorName}`;
                if ((subKeys[k] || 0) > 1) flags.push('DUPLICATE_SUBSCRIBE');
            }
            if (t.taskType === 'watch' || t.taskType === 'like') {
                const date = (t.timestamp || '').slice(0, 10);
                const k = `${t.userId}:${t.videoId}:${t.taskType}:${date}`;
                if ((dayKeys[k] || 0) > 1) flags.push('SAME_DAY_DUPLICATE');
            }
            const date = (t.timestamp || '').slice(0, 10);
            const bk = `${t.userId}:${date}`;
            if ((userTaskCounts[bk] || 0) > 50) flags.push('HIGH_VOLUME_BOT_RISK');
            return {
                docId: t.docId,
                userId: t.userId,
                username: t.username || '',
                taskType: t.taskType,
                platform: t.platform || 'youtube',
                creatorName: t.creatorName || '',
                videoTitle: t.videoTitle || '',
                videoId: t.videoId || '',
                rewardUSD: t.rewardUSD || 0,
                rewardSOL: t.rewardSOL || 0,
                payoutSuccess: !!(t.txSignature || t.payoutSuccess),
                txSignature: t.txSignature || '',
                timestamp: t.timestamp || '',
                walletAddress: t.walletAddress || '',
                flags,
            };
        });

        const flagged = tasks.filter(t => t.flags.length > 0).length;
        res.json({ tasks, total: tasks.length, flagged });
    } catch (err) {
        console.error('Admin all-tasks error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tasks' });
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
        const taskDoc = await firestore.getDoc('tasks', docId);
        const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);
        const txSignature = await sendSolPayment(treasuryKey, walletAddress, parseFloat(rewardSOL));
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
        // Update in-memory cache so unpaid count and ticker stats update immediately
        const cacheEntry = cache.tasks.find(t => (t._docId || t.docId) === docId);
        if (cacheEntry) { cacheEntry.txSignature = txSignature; cacheEntry.payoutSuccess = true; cacheEntry.retryTimestamp = new Date().toISOString(); }
        recomputeStatsFromCache();
        if (taskDoc) {
            const rewardUSD = taskDoc.rewardUSD || (parseFloat(rewardSOL) * 150);
            notifyPayout(taskDoc.userId, taskDoc.username, taskDoc.taskType, taskDoc.videoTitle, rewardUSD, parseFloat(rewardSOL), txSignature);
        }
        res.json({ success: true, txSignature });
    } catch (err) {
        console.error('Retry payout error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Batch payout — aggregates all unpaid tasks per wallet into ONE Solana transaction per user
app.post('/api/admin/retry-all', async (req, res) => {
    const { email, batchSize } = req.body;
    if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const walletLimit = Math.min(batchSize || 5, 10);
    try {
        // Get all tasks
        let allTasks;
        if (cache.tasks.length > 0) {
            allTasks = cache.tasks.map(t => ({ ...t, docId: t._docId || t.docId }));
        } else {
            let fetched = [];
            let nextPageToken = null;
            do {
                let url = `${FIRESTORE_URL}/tasks?key=${FIREBASE_API_KEY}&pageSize=300`;
                if (nextPageToken) url += `&pageToken=${nextPageToken}`;
                const listData = await httpGet(url);
                const parsed = JSON.parse(listData);
                if (!parsed.documents) break;
                for (const doc of parsed.documents) {
                    fetched.push({ ...parseFirestoreDoc(doc.fields || {}), docId: doc.name.split('/').pop() });
                }
                nextPageToken = parsed.nextPageToken || null;
            } while (nextPageToken);
            allTasks = fetched;
        }

        // Find eligible unpaid tasks — dedup subscribe, same-day watch/like
        allTasks.sort((a, b) => (a.timestamp || '') < (b.timestamp || '') ? -1 : 1);
        const seenSubs = new Set();
        const seenDailyActions = new Set(); // userId:videoId:taskType:date
        const eligible = [];
        for (const t of allTasks) {
            if (t.txSignature || t.payoutSuccess) continue;
            if (t.taskType === 'subscribe') {
                const key = `${t.userId}:${t.creatorName}`;
                if (seenSubs.has(key)) { console.log(`DEDUP SKIP subscribe: ${t.username} -> ${t.creatorName}`); continue; }
                seenSubs.add(key);
            }
            if (t.taskType === 'watch' || t.taskType === 'like') {
                const date = (t.timestamp || '').slice(0, 10); // YYYY-MM-DD
                const dayKey = `${t.userId}:${t.videoId}:${t.taskType}:${date}`;
                if (seenDailyActions.has(dayKey)) { console.log(`DEDUP SKIP ${t.taskType}: ${t.username} -> ${t.videoId} on ${date}`); continue; }
                seenDailyActions.add(dayKey);
            }
            eligible.push(t);
        }

        // Aggregate by wallet address — one transaction per wallet
        const walletGroups = {};
        let skippedNoWallet = 0;
        for (const t of eligible) {
            const userDoc = await getUserProfileCached(t.userId);
            const wallet = (userDoc && userDoc.walletAddress) || t.walletAddress || '';
            if (!wallet) { skippedNoWallet++; continue; }
            if (!walletGroups[wallet]) walletGroups[wallet] = { wallet, totalSOL: 0, totalUSD: 0, tasks: [], userId: t.userId, username: t.username || (userDoc && userDoc.displayName) || '' };
            walletGroups[wallet].totalSOL += parseFloat(t.rewardSOL || 0);
            walletGroups[wallet].totalUSD += t.rewardUSD || 0;
            walletGroups[wallet].tasks.push(t);
        }

        const wallets = Object.values(walletGroups).slice(0, walletLimit);
        const totalWallets = Object.keys(walletGroups).length;
        const results = [];
        const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);

        for (const group of wallets) {
            try {
                if (results.length > 0) await new Promise(r => setTimeout(r, 2000));
                console.log(`BATCH PAY: ${group.username} (${group.wallet.substring(0,8)}...) — ${group.tasks.length} tasks, ${group.totalSOL.toFixed(6)} SOL`);
                const txSig = await Promise.race([
                    sendSolPayment(treasuryKey, group.wallet, group.totalSOL),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Solana RPC timeout')), 30000))
                ]);
                // Mark ALL tasks for this wallet as paid
                for (const t of group.tasks) {
                    try {
                        const TASKS_URL = `${FIRESTORE_URL}/tasks/${t.docId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=txSignature&updateMask.fieldPaths=payoutSuccess&updateMask.fieldPaths=retryTimestamp`;
                        const patchBody = JSON.stringify({ fields: { txSignature: { stringValue: txSig }, payoutSuccess: { booleanValue: true }, retryTimestamp: { stringValue: new Date().toISOString() } } });
                        await httpPatch(TASKS_URL, patchBody);
                        const ce = cache.tasks.find(c => (c._docId || c.docId) === t.docId);
                        if (ce) { ce.txSignature = txSig; ce.payoutSuccess = true; }
                    } catch(e) { console.warn('Task patch error:', t.docId, e.message); }
                }
                results.push({ wallet: group.wallet, username: group.username, status: 'paid', taskCount: group.tasks.length, totalSOL: group.totalSOL, totalUSD: group.totalUSD, txSignature: txSig });
                // Send ONE notification per user with combined total
                notifyPayout(group.userId, group.username, `${group.tasks.length} tasks`, 'multiple completed tasks', group.totalUSD, group.totalSOL, txSig);
            } catch (payErr) {
                results.push({ wallet: group.wallet, username: group.username, status: 'failed', taskCount: group.tasks.length, reason: payErr.message });
            }
        }

        const paidWallets = results.filter(r => r.status === 'paid').length;
        const paidTasks = results.filter(r => r.status === 'paid').reduce((s, r) => s + r.taskCount, 0);
        const remaining = totalWallets - wallets.length;
        // Update ticker stats immediately so they reflect these payouts in real time
        recomputeStatsFromCache();
        console.log(`BATCH COMPLETE: ${paidWallets}/${wallets.length} wallets paid (${paidTasks} tasks), ${remaining} wallets remaining, ${skippedNoWallet} tasks skipped (no wallet)`);
        res.json({ results, paidWallets, paidTasks, skippedNoWallet, remaining });
    } catch (err) {
        console.error('Retry-all error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===== Subscriptions with 30-day residual (uses in-memory cache, zero reads) =====
app.get('/api/user-subscriptions/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const tasks = cache.tasks.length > 0 ? cache.tasks : [];

        const subsByCreator = {};
        for (const data of tasks) {
            if (data.userId === userId && data.taskType === 'subscribe') {
                const key = data.creatorName;
                if (!subsByCreator[key] || (data.timestamp < subsByCreator[key].timestamp)) {
                    subsByCreator[key] = data;
                }
            }
        }

        const subscriptions = [];
        const now = Date.now();
        for (const [creator, sub] of Object.entries(subsByCreator)) {
            const subDate = new Date(sub.timestamp);
            const daysSince = Math.floor((now - subDate.getTime()) / (24 * 60 * 60 * 1000));
            const daysRemaining = Math.max(0, 30 - daysSince);
            const residualDue = daysRemaining === 0;
            subscriptions.push({
                creatorName: creator,
                subscribedAt: sub.timestamp,
                rewardUSD: 0.05,
                paid: !!sub.txSignature || sub.payoutSuccess === true,
                daysSinceSubscribe: daysSince,
                daysUntilResidual: daysRemaining,
                residualDue,
                residualAmount: 0.01,
            });
        }
        res.json({ subscriptions });
    } catch (err) {
        console.error('Subscriptions error:', err.message);
        res.json({ subscriptions: [] });
    }
});

// ===== Unified Cache System =====
// Optimized to minimize Firestore reads — uses in-memory cache + persisted config docs
const BASELINE_STATS = { totalTasksCompleted: 299, totalPaidUSD: 6.22, paidLastHourUSD: 0, paidLast24hUSD: 0, uniqueUsers: 10 };

const cache = {
    tasks: [],
    platformStats: { ...BASELINE_STATS },
    leaderboard: { leaders: [] },
    userProfiles: {},
    lastRefresh: 0,
    refreshing: false,
};

// Twitch flash promos — in-memory (flash promos are transient by design)
const twitchPromos = []; // { id, twitchUrl, streamerName, rewardPerMin, createdAt, active, createdBy }
const twitchSessions = new Map(); // `${userId}:${promoId}` → { lastVerifiedAt: ISO, count: number }
const kickPromos = [];   // { id, kickUrl, streamerName, rewardPerMin, createdAt, active, createdBy }
const kickSessions = new Map();

async function loadCacheFromFirestore() {
    console.log('Loading cached data from Firestore...');
    try {
        const stats = await firestore.getDoc('config', 'platformStats');
        if (stats && stats.totalTasksCompleted) cache.platformStats = stats;
    } catch(e) { console.warn('Stats cache load skipped'); }
    try {
        const lb = await firestore.getDoc('config', 'leaderboard');
        if (lb && lb.leaders) {
            const parsed = JSON.parse(lb.leaders);
            if (Array.isArray(parsed) && parsed.length > 0) cache.leaderboard = { leaders: parsed };
        }
    } catch(e) { console.warn('Leaderboard cache load skipped'); }
    // Load persisted task snapshot so we have data even if Firestore is throttled
    try {
        const taskSnap = await firestore.getDoc('config', 'taskSnapshot');
        if (taskSnap && taskSnap.tasks) {
            const parsed = JSON.parse(taskSnap.tasks);
            if (Array.isArray(parsed) && parsed.length > 0 && cache.tasks.length === 0) {
                cache.tasks = parsed;
                console.log(`Loaded ${parsed.length} tasks from persisted snapshot`);
            }
        }
    } catch(e) { console.warn('Task snapshot load skipped'); }
    console.log(`Cache loaded: stats=${cache.platformStats.totalTasksCompleted}, leaders=${cache.leaderboard.leaders.length}, tasks=${cache.tasks.length}`);
}

function getCachedUserProfile(userId) {
    return cache.userProfiles[userId] || null;
}

async function getUserProfileCached(userId) {
    if (cache.userProfiles[userId]) return cache.userProfiles[userId];
    try {
        const doc = await firestore.getDoc('users', userId);
        if (doc) cache.userProfiles[userId] = doc;
        return doc;
    } catch(e) { return null; }
}

function recomputeStatsFromCache() {
    if (cache.tasks.length === 0) return;
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;
    let totalPaidUSD = 0, paidLastHourUSD = 0, paidLast24hUSD = 0;
    const uniqueUsers = new Set();
    for (const t of cache.tasks) {
        totalPaidUSD += t.rewardUSD || 0;
        if (t.userId) uniqueUsers.add(t.userId);
        // Use retryTimestamp (actual payment time) if available, otherwise task completion time
        const paidAt = t.retryTimestamp || t.timestamp;
        const ts = paidAt ? new Date(paidAt).getTime() : 0;
        if (ts > oneHourAgo) paidLastHourUSD += t.rewardUSD || 0;
        if (ts > oneDayAgo) paidLast24hUSD += t.rewardUSD || 0;
    }
    cache.platformStats = {
        totalTasksCompleted: Math.max(cache.tasks.length, cache.platformStats.totalTasksCompleted || 0),
        totalPaidUSD: parseFloat(Math.max(totalPaidUSD, cache.platformStats.totalPaidUSD || 0).toFixed(2)),
        paidLastHourUSD: parseFloat(paidLastHourUSD.toFixed(2)),
        paidLast24hUSD: parseFloat(paidLast24hUSD.toFixed(2)),
        uniqueUsers: Math.max(uniqueUsers.size, cache.platformStats.uniqueUsers || 0),
        updatedAt: new Date().toISOString(),
    };
}

async function recomputeLeaderboardFromCache() {
    if (cache.tasks.length === 0) return;
    const userMap = {};
    const userNames = {};
    for (const t of cache.tasks) {
        if (!t.userId) continue;
        if (!userMap[t.userId]) userMap[t.userId] = { tasksCompleted: 0, totalEarnedUSD: 0 };
        userMap[t.userId].tasksCompleted++;
        userMap[t.userId].totalEarnedUSD += t.rewardUSD || 0;
        if (t.username && !userNames[t.userId]) userNames[t.userId] = t.username;
    }
    const leaders = [];
    const sortedUsers = Object.entries(userMap).sort((a, b) => (b[1].totalEarnedUSD || 0) - (a[1].totalEarnedUSD || 0)).slice(0, 20);
    for (const [userId, data] of sortedUsers) {
        let name = userNames[userId] || userId.substring(0, 8);
        let avatar = null;
        let email = null;
        const userDoc = await getUserProfileCached(userId);
        if (userDoc) { name = userDoc.displayName || name; avatar = userDoc.avatar || null; email = userDoc.email || null; }
        const userTasks = cache.tasks.filter(t => t.userId === userId);
        const firstTs = userTasks.reduce((min, t) => (!min || (t.timestamp && t.timestamp < min)) ? t.timestamp : min, null);
        const badges = computeUserBadges(userId, email, data.tasksCompleted, firstTs || new Date().toISOString());
        leaders.push({ userId, name, avatar, badges, ...data });
    }
    cache.leaderboard = { leaders };
}

async function refreshAllData() {
    if (cache.refreshing) return;
    cache.refreshing = true;
    console.log('Refreshing task data from Firestore...');
    try {
        let allTasks = [];
        let nextPageToken = null;
        do {
            let url = `${FIRESTORE_URL}/tasks?key=${FIREBASE_API_KEY}&pageSize=300`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;
            const listData = await httpGet(url);
            const parsed = JSON.parse(listData);
            if (checkThrottle(parsed)) break;
            if (parsed.error) { console.warn('Firestore error during refresh:', parsed.error.message); break; }
            if (parsed.documents && Array.isArray(parsed.documents)) {
                for (const doc of parsed.documents) {
                    allTasks.push({ ...parseFirestoreDoc(doc.fields || {}), _docId: doc.name.split('/').pop() });
                }
            }
            nextPageToken = parsed.nextPageToken || null;
        } while (nextPageToken);

        if (allTasks.length === 0) { cache.refreshing = false; return; }
        cache.tasks = allTasks;

        recomputeStatsFromCache();
        await recomputeLeaderboardFromCache();

        // Persist to Firestore for next startup (3 writes)
        try { await firestore.setDoc('config', 'platformStats', cache.platformStats); } catch(e) {}
        try { await firestore.setDoc('config', 'leaderboard', { leaders: JSON.stringify(cache.leaderboard.leaders), updatedAt: new Date().toISOString() }); } catch(e) {}
        // Persist task snapshot so data survives restarts + quota exhaustion
        try {
            const snapshot = allTasks.map(t => ({ userId: t.userId, videoId: t.videoId, videoTitle: t.videoTitle, creatorName: t.creatorName, taskType: t.taskType, platform: t.platform, rewardUSD: t.rewardUSD, rewardSOL: t.rewardSOL, txSignature: t.txSignature || '', payoutSuccess: t.payoutSuccess || false, walletAddress: t.walletAddress || '', username: t.username || '', timestamp: t.timestamp, _docId: t._docId || '' }));
            await firestore.setDoc('config', 'taskSnapshot', { tasks: JSON.stringify(snapshot), count: snapshot.length, updatedAt: new Date().toISOString() });
        } catch(e) { console.warn('Task snapshot persist skipped:', e.message); }

        cache.lastRefresh = Date.now();
        console.log(`Refresh complete: ${allTasks.length} tasks, ${cache.leaderboard.leaders.length} leaders, $${cache.platformStats.totalPaidUSD} paid`);
    } catch (err) {
        console.error('Data refresh error:', err.message);
    }
    cache.refreshing = false;
}

// Load persisted cache on startup, then full refresh after 5s, then every 15 min
loadCacheFromFirestore().then(() => {
    setTimeout(refreshAllData, 5000);
    setTimeout(() => { if (cache.tasks.length === 0) refreshAllData(); }, 60000);
});
setInterval(refreshAllData, 900000);
setInterval(() => { if (cache.tasks.length > 0) recomputeStatsFromCache(); }, 60000);

// Admin can trigger manual refresh
app.get('/api/admin/refresh-cache', async (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ error: 'Unauthorized' });
    cache.refreshing = false;
    await refreshAllData();
    res.json({ tasks: cache.tasks.length, leaders: cache.leaderboard.leaders.length, stats: cache.platformStats });
});

// ===== TWITCH FLASH PROMOS =====

// Admin: create a flash promo
app.post('/api/admin/create-twitch-promo', async (req, res) => {
    const { email, twitchUrl, streamerName, rewardPerMin } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    if (!twitchUrl || !streamerName) return res.status(400).json({ error: 'twitchUrl and streamerName required' });

    const promo = {
        id: Date.now().toString(),
        twitchUrl: twitchUrl.trim(),
        streamerName: streamerName.trim(),
        rewardPerMin: parseFloat(rewardPerMin) || 0.02,
        createdAt: new Date().toISOString(),
        active: true,
        createdBy: email,
    };
    twitchPromos.unshift(promo);

    // Discord flash alert
    try {
        await postToDiscord(DISCORD_WEBHOOKS.flash, {
            username: 'CoinDrop Flash Alert',
            avatar_url: 'https://coindrop.in/assets/logo.svg',
            content: '🔴 **FLASH EARN EVENT — LIVE NOW!**',
            embeds: [{
                color: 0x9146FF, // Twitch purple
                title: `⚡ Flash Earn: ${streamerName} is LIVE on Twitch!`,
                description: `Earn **$${promo.rewardPerMin.toFixed(2)}/min** just for watching the live stream! Submit a screenshot every minute to earn.`,
                fields: [
                    { name: '📺 Stream', value: `[Watch Now](${promo.twitchUrl})`, inline: true },
                    { name: '💰 Rate', value: `$${promo.rewardPerMin.toFixed(2)} per minute`, inline: true },
                    { name: '📱 How to Earn', value: 'Login to CoinDrop → Live Earn tab → Start Watching', inline: false },
                ],
                url: promo.twitchUrl,
                timestamp: new Date().toISOString(),
                footer: { text: 'CoinDrop Flash Earn • Limited Time' },
            }],
        });
    } catch(e) { console.warn('Discord flash alert failed:', e.message); }

    console.log(`TWITCH PROMO CREATED: ${streamerName} (${twitchUrl}) @ $${promo.rewardPerMin}/min`);
    res.json({ success: true, promo });
});

// All users: get active promos
app.get('/api/twitch-promos/active', (req, res) => {
    res.json({ promos: twitchPromos.filter(p => p.active) });
});

// Admin: deactivate a promo
app.post('/api/admin/deactivate-twitch-promo', (req, res) => {
    const { email, promoId } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    const promo = twitchPromos.find(p => p.id === promoId);
    if (promo) promo.active = false;
    res.json({ success: true });
});

// All users: verify a Twitch screenshot (per-minute submission)
app.post('/api/verify-twitch', async (req, res) => {
    try {
        const { screenshot, promoId, userId, username } = req.body;
        if (!screenshot || !promoId || !userId) return res.status(400).json({ success: false, error: 'Missing fields' });

        const promo = twitchPromos.find(p => p.id === promoId && p.active);
        if (!promo) return res.json({ success: false, verified: false, reason: 'This flash promo is no longer active.' });

        // Rate-limit: enforce minimum 50s between submissions per user per promo
        const sessionKey = `${userId}:${promoId}`;
        const session = twitchSessions.get(sessionKey) || { lastVerifiedAt: null, count: 0 };
        if (session.lastVerifiedAt) {
            const elapsed = Date.now() - new Date(session.lastVerifiedAt).getTime();
            if (elapsed < 50000) {
                const wait = Math.ceil((50000 - elapsed) / 1000);
                return res.json({ success: false, verified: false, reason: `Please wait ${wait} more seconds before your next submission.` });
            }
        }

        // Extract streamer handle from URL (e.g. twitch.tv/streamer → streamer)
        const expectedHandle = promo.streamerName.toLowerCase().replace(/^@/, '');
        const lastVerifiedAt = session.lastVerifiedAt;
        const submissionNum = session.count + 1;

        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const mediaType = screenshot.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';

        const prompt = `You are verifying a CoinDrop Twitch live stream screenshot. The user "${username || userId}" claims to be watching a live Twitch stream.

STREAMER: ${promo.streamerName} (twitch.tv/${expectedHandle})
SUBMISSION: #${submissionNum}${lastVerifiedAt ? `\nPREVIOUS VERIFIED TIME: ${new Date(lastVerifiedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC` : '\nPREVIOUS VERIFIED TIME: None (first submission)'}

CHECK ALL 4 CONDITIONS — ALL must pass:

1. TWITCH PLATFORM VISIBLE: The screenshot must clearly show the Twitch interface. Look for: twitch.tv URL in the browser address bar, the Twitch logo/wordmark, Twitch chat panel, or the characteristic Twitch dark player interface. FAIL if this is YouTube, a local file, or another platform.

2. CORRECT STREAMER: The channel name "${promo.streamerName}" or handle "${expectedHandle}" must be visible somewhere on screen — in the URL bar (twitch.tv/${expectedHandle}), in the channel header, in the stream title area, or in the chat. FAIL if a different streamer is clearly shown.

3. STREAM IS LIVE NOW: Look for ANY of these live indicators:
   - A red "LIVE" badge on the player
   - A red buffering/loading bar at the top of the browser or player
   - A live viewer count visible (e.g. "1.2K viewers")
   - The Twitch chat actively visible alongside the stream
   - The stream player showing video (not an offline/ended screen)
   FAIL if the stream clearly shows "Stream Ended", "Offline", or no live indicators at all.

4. SYSTEM CLOCK VISIBLE: The user's device clock must be visible anywhere in the screenshot:
   - Windows taskbar clock (bottom-right corner)
   - Mac menu bar clock (top-right)
   - Phone status bar time (top of screen)
   - Any other clearly readable clock showing current time
   ${lastVerifiedAt ? `The time shown MUST be AFTER ${new Date(lastVerifiedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (the previous submission time). If the clock shows the same or earlier time, FAIL — each screenshot must be from a newer moment.` : 'Since this is the first submission, any current time is acceptable.'}
   FAIL if no clock is visible anywhere in the screenshot.

IMPORTANT: This is a LIVE stream verification. Brief buffering, loading spinners, or a momentarily blank frame are all normal — do not fail for these. Only fail if the stream is definitively offline/ended.

Respond with EXACTLY this JSON (no other text):
{"verified": true/false, "confidence": 0.0-1.0, "reason": "brief explanation", "clockTime": "HH:MM visible in screenshot or null if not found"}`;

        const claudeResponse = await anthropicRequest({
            model: 'claude-sonnet-4-6',
            max_tokens: 200,
            messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
                { type: 'text', text: prompt },
            ]}],
        });

        let result;
        try { result = JSON.parse(claudeResponse.content[0].text.trim()); }
        catch(e) { return res.json({ success: false, verified: false, reason: 'Verification parsing error. Please try again.' }); }

        if (result.verified) {
            // Update session
            const now = new Date().toISOString();
            twitchSessions.set(sessionKey, { lastVerifiedAt: now, count: submissionNum });

            // Attempt SOL payout
            let txSignature = null, payoutSuccess = false, rewardSOL = 0;
            const rewardUSD = promo.rewardPerMin;
            try {
                const solPrice = await getSolPrice();
                rewardSOL = parseFloat((rewardUSD / solPrice).toFixed(9));
                const userDoc = await getUserProfileCached(userId);
                const wallet = userDoc?.walletAddress;
                if (wallet) {
                    const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);
                    txSignature = await Promise.race([
                        sendSolPayment(treasuryKey, wallet, rewardSOL),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
                    ]);
                    payoutSuccess = true;
                }
            } catch(e) { console.warn('Twitch payout error:', e.message); }

            // Log to Firestore tasks collection (reuses existing task infrastructure)
            try {
                const taskDoc = {
                    userId, username: username || '', taskType: 'twitch_live',
                    videoTitle: `${promo.streamerName} Live Stream (min #${submissionNum})`,
                    creatorName: promo.streamerName, videoId: promoId,
                    platform: 'twitch', rewardUSD, rewardSOL,
                    txSignature: txSignature || '', payoutSuccess,
                    walletAddress: '', timestamp: new Date().toISOString(),
                };
                await firestore.addDoc('tasks', taskDoc);
            } catch(e) { console.warn('Twitch task log error:', e.message); }

            res.json({ success: true, verified: true, confidence: result.confidence, reason: result.reason, rewardUSD, rewardSOL, payoutSuccess, txSignature, submissionNum });
        } else {
            res.json({ success: false, verified: false, confidence: result.confidence || 0, reason: result.reason });
        }
    } catch(err) {
        console.error('verify-twitch error:', err.message);
        res.status(500).json({ success: false, error: 'Verification server error' });
    }
});

// ===== KICK FLASH PROMOS =====

app.post('/api/admin/create-kick-promo', async (req, res) => {
    const { email, kickUrl, streamerName, rewardPerMin } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    if (!kickUrl || !streamerName) return res.status(400).json({ error: 'kickUrl and streamerName required' });
    const promo = { id: Date.now().toString(), kickUrl: kickUrl.trim(), streamerName: streamerName.trim(), rewardPerMin: parseFloat(rewardPerMin) || 0.02, createdAt: new Date().toISOString(), active: true, createdBy: email };
    kickPromos.unshift(promo);
    try {
        await postToDiscord(DISCORD_WEBHOOKS.flash, {
            username: 'CoinDrop Flash Alert',
            avatar_url: 'https://coindrop.in/assets/logo.svg',
            content: '🟢 **KICK FLASH EARN EVENT — LIVE NOW!**',
            embeds: [{
                color: 0x53FC18,
                title: `⚡ Flash Earn: ${streamerName} is LIVE on Kick!`,
                description: `Earn **$${promo.rewardPerMin.toFixed(2)}/min** watching the live stream! Submit a screenshot every minute to earn.`,
                fields: [
                    { name: '📺 Stream', value: `[Watch Now](${promo.kickUrl})`, inline: true },
                    { name: '💰 Rate', value: `$${promo.rewardPerMin.toFixed(2)} per minute`, inline: true },
                    { name: '📱 How to Earn', value: 'Login to CoinDrop → Kick Live tab → Start Watching', inline: false },
                ],
                url: promo.kickUrl, timestamp: new Date().toISOString(), footer: { text: 'CoinDrop Flash Earn • Limited Time' },
            }],
        });
    } catch(e) { console.warn('Discord Kick alert failed:', e.message); }
    console.log(`KICK PROMO CREATED: ${streamerName} @ $${promo.rewardPerMin}/min`);
    res.json({ success: true, promo });
});

app.get('/api/kick-promos/active', (req, res) => {
    res.json({ promos: kickPromos.filter(p => p.active) });
});

app.post('/api/admin/deactivate-kick-promo', (req, res) => {
    const { email, promoId } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    const promo = kickPromos.find(p => p.id === promoId);
    if (promo) promo.active = false;
    res.json({ success: true });
});

app.post('/api/verify-kick', async (req, res) => {
    try {
        const { screenshot, promoId, userId, username } = req.body;
        if (!screenshot || !promoId || !userId) return res.status(400).json({ success: false, error: 'Missing fields' });
        const promo = kickPromos.find(p => p.id === promoId && p.active);
        if (!promo) return res.json({ success: false, verified: false, reason: 'This flash promo is no longer active.' });
        const sessionKey = `${userId}:${promoId}`;
        const session = kickSessions.get(sessionKey) || { lastVerifiedAt: null, count: 0 };
        if (session.lastVerifiedAt) {
            const elapsed = Date.now() - new Date(session.lastVerifiedAt).getTime();
            if (elapsed < 50000) { const wait = Math.ceil((50000 - elapsed) / 1000); return res.json({ success: false, verified: false, reason: `Please wait ${wait} more seconds before your next submission.` }); }
        }
        const expectedHandle = promo.streamerName.toLowerCase().replace(/^@/, '');
        const lastVerifiedAt = session.lastVerifiedAt;
        const submissionNum = session.count + 1;
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const mediaType = screenshot.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';
        const prompt = `You are verifying a CoinDrop Kick live stream screenshot. User "${username || userId}" claims to be watching a live Kick stream.

STREAMER: ${promo.streamerName} (kick.com/${expectedHandle})
SUBMISSION: #${submissionNum}${lastVerifiedAt ? `\nPREVIOUS VERIFIED TIME: ${new Date(lastVerifiedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC` : '\nPREVIOUS VERIFIED TIME: None (first submission)'}

CHECK ALL 4 CONDITIONS — ALL must pass:
1. KICK PLATFORM VISIBLE: kick.com URL in address bar, Kick logo (lime green), Kick chat panel, or Kick's video player. FAIL if this is Twitch, YouTube, or another platform.
2. CORRECT STREAMER: "${promo.streamerName}" or "${expectedHandle}" visible in URL bar, channel header, title, or chat. FAIL if a clearly different streamer is shown.
3. STREAM IS LIVE NOW: red/green LIVE badge, viewer count, active chat, or video playing (not offline/ended screen). FAIL only if stream is definitively offline.
4. SYSTEM CLOCK VISIBLE: Windows taskbar, Mac menu bar, or phone status bar showing current time. ${lastVerifiedAt ? `Time MUST be AFTER ${new Date(lastVerifiedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. FAIL if clock shows same or earlier time.` : 'Any current time acceptable (first submission).'}

Respond with EXACTLY this JSON: {"verified": true/false, "confidence": 0.0-1.0, "reason": "brief explanation", "clockTime": "HH:MM or null"}`;
        const claudeResponse = await anthropicRequest({ model: 'claude-sonnet-4-6', max_tokens: 200, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } }, { type: 'text', text: prompt }] }] });
        let result;
        try { result = JSON.parse(claudeResponse.content[0].text.trim()); }
        catch(e) { return res.json({ success: false, verified: false, reason: 'Verification parsing error. Please try again.' }); }
        if (result.verified) {
            const now = new Date().toISOString();
            kickSessions.set(sessionKey, { lastVerifiedAt: now, count: submissionNum });
            let txSignature = null, payoutSuccess = false, rewardSOL = 0;
            const rewardUSD = promo.rewardPerMin;
            try {
                const solPrice = await getSolPrice();
                rewardSOL = parseFloat((rewardUSD / solPrice).toFixed(9));
                const userDoc = await getUserProfileCached(userId);
                const wallet = userDoc?.walletAddress;
                if (wallet) {
                    const treasuryKey = decryptPrivateKey(TREASURY_PRIVATE_KEY_ENCRYPTED, TREASURY_ENCRYPTION_KEY);
                    txSignature = await Promise.race([sendSolPayment(treasuryKey, wallet, rewardSOL), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))]);
                    payoutSuccess = true;
                }
            } catch(e) { console.warn('Kick payout error:', e.message); }
            try {
                await firestore.addDoc('tasks', { userId, username: username || '', taskType: 'kick_live', videoTitle: `${promo.streamerName} Live on Kick (min #${submissionNum})`, creatorName: promo.streamerName, videoId: promoId, platform: 'kick', rewardUSD, rewardSOL, txSignature: txSignature || '', payoutSuccess, walletAddress: '', timestamp: new Date().toISOString() });
            } catch(e) { console.warn('Kick task log error:', e.message); }
            res.json({ success: true, verified: true, confidence: result.confidence, reason: result.reason, rewardUSD, rewardSOL, payoutSuccess, txSignature, submissionNum });
        } else {
            res.json({ success: false, verified: false, confidence: result.confidence || 0, reason: result.reason });
        }
    } catch(err) {
        console.error('verify-kick error:', err.message);
        res.status(500).json({ success: false, error: 'Verification server error' });
    }
});

// ===== CREATOR MANAGEMENT =====

async function fetchYouTubeRSS(channelId) {
    if (!channelId) return [];
    try {
        const xml = await httpGet(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
        const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
        return entries.slice(0, 30).map(entry => {
            const id = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
            const rawTitle = (entry.match(/<media:title[^>]*>([^<]+)<\/media:title>/) || entry.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
            const title = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            // YouTube RSS includes <media:statistics views="N"/> — grab real view count for free
            const rawViews = (entry.match(/<media:statistics\s+views="(\d+)"/) || entry.match(/<yt:statistics\s+viewCount="(\d+)"/) || [])[1] || '0';
            const views = parseInt(rawViews, 10) > 0 ? parseInt(rawViews, 10).toLocaleString() : '0';
            return { id, title, views };
        }).filter(v => v.id);
    } catch(e) { console.warn('YouTube RSS fetch failed:', e.message); return []; }
}

// ── Channel-ID auto-discovery + view-count cache ───────────────────────────
let _channelIds = {};          // handle (no @) → channelId, persisted to Firestore
let _removedCreatorIds = new Set(); // loaded from Firestore on boot
const _viewCountCache = { data: {}, updatedAt: 0 };
let _vcRefreshing = false;

// Load persisted state on boot (non-blocking)
(async () => {
    try {
        const chDoc = await firestore.getDoc('config', 'channelIds');
        if (chDoc?.idsJson) _channelIds = JSON.parse(chDoc.idsJson);
    } catch(e) {}
    try {
        const rmDoc = await firestore.getDoc('config', 'removedCreators');
        if (rmDoc?.idsJson) _removedCreatorIds = new Set(JSON.parse(rmDoc.idsJson));
    } catch(e) {}
    console.log(`Loaded ${Object.keys(_channelIds).length} channel IDs, ${_removedCreatorIds.size} removed creators`);
})();

// Scrape YouTube channel page once to discover channel ID — result cached forever
async function discoverChannelId(handle) {
    const h = (handle || '').replace(/^@/, '').toLowerCase();
    if (!h) return null;
    if (_channelIds[h]) return _channelIds[h];
    try {
        const html = await httpGet(`https://www.youtube.com/@${h}`);
        const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
        if (match) {
            _channelIds[h] = match[1];
            firestore.setDoc('config', 'channelIds', { idsJson: JSON.stringify(_channelIds) }).catch(() => {});
            console.log(`Discovered channel ID for @${h}: ${match[1]}`);
            return match[1];
        }
    } catch(e) { console.warn(`discoverChannelId(@${h}): ${e.message}`); }
    return null;
}

// Background: refresh view counts for all provided handles (throttled, non-blocking)
async function refreshViewCounts(handles) {
    if (_vcRefreshing || !handles.length) return;
    _vcRefreshing = true;
    console.log(`Refreshing view counts for ${handles.length} creators...`);
    let updated = 0;
    for (const handle of handles) {
        try {
            const channelId = await discoverChannelId(handle);
            if (!channelId) { await new Promise(r => setTimeout(r, 150)); continue; }
            const videos = await fetchYouTubeRSS(channelId);
            videos.forEach(v => { if (v.id && v.views !== '0') { _viewCountCache.data[v.id] = v.views; updated++; } });
        } catch(e) { console.warn(`viewCount refresh(${handle}): ${e.message}`); }
        await new Promise(r => setTimeout(r, 200)); // 200ms throttle between channels
    }
    _viewCountCache.updatedAt = Date.now();
    _vcRefreshing = false;
    console.log(`View count refresh done — ${updated} videos updated, ${Object.keys(_viewCountCache.data).length} total cached`);
}

app.get('/api/creators/managed', async (req, res) => {
    try {
        const docs = await firestore.query('managed_creators', null, null, null, null, 100);
        const creators = (docs || []).map(d => {
            try { d.videos = JSON.parse(d.videosJson || '[]'); } catch { d.videos = []; }
            delete d.videosJson;
            return d;
        });
        res.json({ creators });
    } catch(e) { res.status(500).json({ error: 'Failed to fetch creators' }); }
});

app.post('/api/admin/add-creator', async (req, res) => {
    const { email, handle, name, channelUrl, channelId, avatar, about, category, subscribers } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    if (!handle || !name || !channelUrl) return res.status(400).json({ error: 'handle, name, channelUrl required' });
    const cleanHandle = handle.startsWith('@') ? handle : '@' + handle;
    const creatorId = cleanHandle.replace(/^@/, '').toLowerCase();
    const videos = channelId ? await fetchYouTubeRSS(channelId.trim()) : [];
    const creator = { id: creatorId, handle: cleanHandle, name: name.trim(), platform: 'youtube', channelUrl: channelUrl.trim(), channelId: (channelId || '').trim(), avatar: (avatar || '').trim(), about: (about || '').trim(), category: (category || 'Entertainment').trim(), subscribers: (subscribers || 'Unknown').toString(), videosJson: JSON.stringify(videos), videoCount: videos.length, addedAt: new Date().toISOString(), addedBy: email, managed: true };
    try {
        await firestore.setDoc('managed_creators', creatorId, creator);
        res.json({ success: true, creator: { ...creator, videos }, videosFound: videos.length });
    } catch(e) { res.status(500).json({ error: 'Failed to save creator: ' + e.message }); }
});

app.post('/api/admin/remove-creator', async (req, res) => {
    const { email, creatorId, isManaged } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    if (!creatorId) return res.status(400).json({ error: 'creatorId required' });
    try {
        if (isManaged) await firestore.deleteDoc('managed_creators', creatorId);
        _removedCreatorIds.add(creatorId);
        await firestore.setDoc('config', 'removedCreators', { idsJson: JSON.stringify([..._removedCreatorIds]) });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Failed to remove creator: ' + e.message }); }
});

app.post('/api/admin/restore-creator', async (req, res) => {
    const { email, creatorId } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    _removedCreatorIds.delete(creatorId);
    try {
        await firestore.setDoc('config', 'removedCreators', { idsJson: JSON.stringify([..._removedCreatorIds]) });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/creators/removed', (req, res) => {
    res.json({ removedIds: [..._removedCreatorIds] });
});

// Returns cached view counts immediately (stale-while-revalidate)
app.get('/api/creators/view-counts', async (req, res) => {
    res.json({ counts: _viewCountCache.data, updatedAt: _viewCountCache.updatedAt });
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    if (Date.now() - _viewCountCache.updatedAt > FOUR_HOURS && !_vcRefreshing) {
        setImmediate(async () => {
            try {
                const docs = await firestore.query('managed_creators', null, null, null, null, 100) || [];
                const handles = docs.filter(d => d.handle).map(d => d.handle);
                await refreshViewCounts(handles);
            } catch(e) { _vcRefreshing = false; }
        });
    }
});

// Frontend registers its creator handles so server can discover channel IDs + prime view-count cache
app.post('/api/creators/register-handles', (req, res) => {
    const { handles } = req.body;
    res.json({ ok: true }); // Always respond immediately
    if (!Array.isArray(handles) || handles.length === 0) return;
    setImmediate(async () => {
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        if (Date.now() - _viewCountCache.updatedAt > FOUR_HOURS && !_vcRefreshing) {
            await refreshViewCounts(handles);
        } else {
            // Just discover IDs for unknown handles (future refreshes will use them)
            for (const h of handles.filter(h => !_channelIds[(h || '').replace(/^@/, '').toLowerCase()])) {
                await discoverChannelId(h);
                await new Promise(r => setTimeout(r, 150));
            }
        }
    });
});

app.post('/api/admin/refresh-creator-videos', async (req, res) => {
    const { email, creatorId } = req.body;
    if (!ADMIN_EMAILS.includes((email || '').toLowerCase())) return res.status(403).json({ error: 'Unauthorized' });
    try {
        const creator = await firestore.getDoc('managed_creators', creatorId);
        if (!creator) return res.status(404).json({ error: 'Creator not found' });
        if (!creator.channelId) return res.status(400).json({ error: 'No Channel ID stored for this creator. Edit and re-add with Channel ID.' });
        const videos = await fetchYouTubeRSS(creator.channelId);
        await firestore.setDoc('managed_creators', creatorId, { ...creator, videosJson: JSON.stringify(videos), videoCount: videos.length, lastSynced: new Date().toISOString() });
        res.json({ success: true, videosFound: videos.length });
    } catch(e) { res.status(500).json({ error: 'Failed to refresh: ' + e.message }); }
});

app.get('/api/platform-stats', async (req, res) => {
    if (cache.platformStats.totalTasksCompleted > BASELINE_STATS.totalTasksCompleted) {
        return res.json(cache.platformStats);
    }
    // Cache is stale — read persisted stats from Firestore
    try {
        const stats = await firestore.getDoc('config', 'platformStats');
        if (stats && stats.totalTasksCompleted) {
            cache.platformStats = stats;
        }
    } catch(e) {}
    res.json(cache.platformStats);
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

// API: Get user profile (wallet, displayName, avatar) — uses cached profiles
app.get('/api/user-profile/:userId', async (req, res) => {
    try {
        const profile = await getUserProfileCached(req.params.userId);
        res.json({ profile: profile || {} });
    } catch(e) { res.json({ profile: {} }); }
});

// API: Get user stats — denormalized: 2 Firestore reads max (stats + cooldowns)
// Badges, prestige, display info all stored in the stats doc at write time
app.get('/api/user-stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Read denormalized stats doc (1 read — contains stats + badges + prestige)
        let stats = { views: 0, likes: 0, comments: 0, subs: 0, tasksCompleted: 0, totalEarned: 0 };
        let badges = [];
        const s = await firestore.getDoc('stats', userId);
        if (s) {
            stats = { views: s.views || 0, likes: s.likes || 0, comments: s.comments || 0, subs: s.subs || 0, tasksCompleted: s.tasksCompleted || 0, totalEarned: s.totalEarned || 0, lastActivity: s.lastActivity || null, firstTaskAt: s.firstTaskAt || null, prestige: s.prestige || 'starter' };
            // Badges stored as JSON string in stats doc
            if (s.badges) {
                try { badges = JSON.parse(s.badges); } catch(e) { badges = []; }
            }
        }
        // If stats doc has no badges yet (legacy), compute them
        if (badges.length === 0 && stats.tasksCompleted > 0) {
            const email = (req.query.email || '').toLowerCase().trim() || (s && s.email) || '';
            badges = computeUserBadges(userId, email, stats.tasksCompleted, stats.firstTaskAt || stats.lastActivity);
        }
        // Admin badge check — always include if email matches
        const email = (req.query.email || '').toLowerCase().trim() || (s && s.email) || '';
        if (ADMIN_EMAILS.includes(email) && !badges.some(b => b.id === 'admin')) {
            badges.unshift({ id: 'admin', label: 'ADMIN', icon: 'fas fa-shield-alt', color: '#dc2626', bg: '#fef2f2' });
        }

        // 2. Read cooldowns (1 read)
        let cooldowns = {};
        const cdData = await firestore.getDoc('cooldowns', userId);
        if (cdData) {
            for (const [key, val] of Object.entries(cdData)) {
                const ms = typeof val === 'string' ? new Date(val).getTime() : val;
                if (Date.now() - ms < 24 * 60 * 60 * 1000) cooldowns[key] = ms;
            }
        }

        // 3. Tasks from cache only (zero reads — cache populated by background refresh)
        let tasks = [];
        if (cache.tasks.length > 0) {
            tasks = cache.tasks.filter(t => t.userId === userId)
                .sort((a, b) => (b.timestamp || '') > (a.timestamp || '') ? 1 : -1)
                .slice(0, 30);
        }

        res.json({ stats, tasks, cooldowns, badges });
    } catch(e) {
        console.error('User stats error:', e.message);
        res.json({ stats: {}, tasks: [], cooldowns: {}, badges: [] });
    }
});

// API: Get user badges
app.get('/api/user-badges/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const email = (req.query.email || '').toLowerCase().trim();
        let tasksCompleted = 0;
        let firstTs = null;
        if (cache.tasks && cache.tasks.length > 0) {
            const userTasks = cache.tasks.filter(t => t.userId === userId);
            tasksCompleted = userTasks.length;
            firstTs = userTasks.reduce((min, t) => (!min || (t.timestamp && t.timestamp < min)) ? t.timestamp : min, null);
        } else {
            try {
                const s = await firestore.getDoc('stats', userId);
                if (s) tasksCompleted = s.tasksCompleted || 0;
            } catch(e) {}
        }
        const badges = computeUserBadges(userId, email, tasksCompleted, firstTs || new Date().toISOString());
        res.json({ badges });
    } catch(e) {
        res.json({ badges: [] });
    }
});

// API: Get global leaderboard — serve from memory, rebuild from Firestore if empty
app.get('/api/leaderboard', async (req, res) => {
    if (cache.leaderboard.leaders.length > 0) {
        return res.json(cache.leaderboard);
    }
    // Cache empty (server just started) — read persisted leaderboard from Firestore
    try {
        const lb = await firestore.getDoc('config', 'leaderboard');
        if (lb && lb.leaders) {
            const parsed = JSON.parse(lb.leaders);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cache.leaderboard = { leaders: parsed };
                return res.json(cache.leaderboard);
            }
        }
    } catch(e) {}
    // Still empty — build from stats collection directly (1 doc per user, cheap)
    try {
        const listData = await httpGet(`${FIRESTORE_URL}/stats?key=${FIREBASE_API_KEY}&pageSize=50`);
        const parsed = JSON.parse(listData);
        if (parsed.documents && Array.isArray(parsed.documents)) {
            const leaders = [];
            for (const doc of parsed.documents) {
                const uid = doc.name.split('/').pop();
                const data = parseFirestoreDoc(doc.fields || {});
                let name = uid.substring(0, 8), avatar = null, email = null;
                try {
                    const u = await firestore.getDoc('users', uid);
                    if (u) { name = u.displayName || name; avatar = u.avatar || null; email = u.email || null; }
                } catch(e) {}
                const badges = computeUserBadges(uid, email, data.tasksCompleted || 0, data.lastActivity || null);
                leaders.push({ userId: uid, name, avatar, badges, tasksCompleted: data.tasksCompleted || 0, totalEarnedUSD: data.totalEarned || 0 });
            }
            leaders.sort((a, b) => (b.totalEarnedUSD || 0) - (a.totalEarnedUSD || 0));
            cache.leaderboard = { leaders: leaders.slice(0, 20) };
            try { await firestore.setDoc('config', 'leaderboard', { leaders: JSON.stringify(cache.leaderboard.leaders), updatedAt: new Date().toISOString() }); } catch(e) {}
        }
    } catch(e) { console.warn('Leaderboard build error:', e.message); }
    res.json(cache.leaderboard);
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

// ===== Presence Tracking (active logged-in users) =====
const activeUsers = new Map();
const PRESENCE_TTL = 90000;

app.post('/api/presence/heartbeat', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    activeUsers.set(userId, Date.now());
    res.json({ ok: true });
});

app.get('/api/presence/count', (req, res) => {
    const now = Date.now();
    let count = 0;
    for (const [uid, ts] of activeUsers) {
        if (now - ts > PRESENCE_TTL) activeUsers.delete(uid);
        else count++;
    }
    res.json({ activeUsers: count });
});

// ===== Discord Server Stats =====
let _discordStatsCache = { totalMembers: 0, onlineMembers: 0, timestamp: 0 };

async function fetchDiscordServerStats() {
    if (Date.now() - _discordStatsCache.timestamp < 120000 && _discordStatsCache.totalMembers > 0) {
        return _discordStatsCache;
    }
    try {
        if (DISCORD_BOT_TOKEN) {
            try {
                const data = await new Promise((resolve, reject) => {
                    const req = https.request({
                        hostname: 'discord.com',
                        path: `/api/v10/guilds/${DISCORD_SERVER_ID}?with_counts=true`,
                        method: 'GET',
                        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                    }, (res) => {
                        let d = '';
                        res.on('data', c => d += c);
                        res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error(d)); } });
                    });
                    req.on('error', reject);
                    req.end();
                });
                console.log('Discord bot API response:', JSON.stringify(data).substring(0, 200));
                if (data.approximate_member_count) {
                    _discordStatsCache = {
                        totalMembers: data.approximate_member_count,
                        onlineMembers: data.approximate_presence_count || 0,
                        timestamp: Date.now(),
                    };
                    return _discordStatsCache;
                }
            } catch (botErr) {
                console.warn('Discord bot API error:', botErr.message);
            }
        }
        try {
            const widgetData = await httpGet(`https://discord.com/api/guilds/${DISCORD_SERVER_ID}/widget.json`);
            const widget = JSON.parse(widgetData);
            console.log('Discord widget response keys:', Object.keys(widget));
            _discordStatsCache = {
                totalMembers: widget.members ? widget.members.length : (widget.presence_count || _discordStatsCache.totalMembers),
                onlineMembers: widget.presence_count || 0,
                timestamp: Date.now(),
            };
        } catch (widgetErr) {
            console.warn('Discord widget error:', widgetErr.message);
        }
        return _discordStatsCache;
    } catch (e) {
        console.warn('Discord stats fetch error:', e.message);
        return _discordStatsCache;
    }
}

app.get('/api/discord-stats', async (req, res) => {
    if (req.query.refresh) { _discordStatsCache.timestamp = 0; }
    const stats = await fetchDiscordServerStats();
    res.json(stats);
});

// ===== User Notifications (Firestore-backed for cross-device consistency) =====
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const doc = await firestore.getDoc('notifications', req.params.userId);
        res.json({ notifications: doc && doc.items ? JSON.parse(doc.items) : [] });
    } catch (e) {
        res.json({ notifications: [] });
    }
});

app.post('/api/notifications/:userId/add', async (req, res) => {
    const { title, message, icon, color } = req.body;
    const userId = req.params.userId;
    try {
        const doc = await firestore.getDoc('notifications', userId);
        const items = doc && doc.items ? JSON.parse(doc.items) : [];
        items.unshift({ title, message, icon: icon || 'fas fa-info-circle', color: color || 'var(--orange)', time: new Date().toISOString(), id: Date.now().toString() });
        if (items.length > 50) items.length = 50;
        await firestore.setDoc('notifications', userId, { items: JSON.stringify(items), updatedAt: '__serverTimestamp__' });
        res.json({ ok: true });
    } catch (e) {
        console.error('Notification save error:', e.message);
        res.json({ ok: false });
    }
});

app.post('/api/notifications/:userId/clear', async (req, res) => {
    try {
        await firestore.setDoc('notifications', req.params.userId, { items: JSON.stringify([]), updatedAt: '__serverTimestamp__' });
        res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
});

app.post('/api/notifications/:userId/dismiss', async (req, res) => {
    const { notifId } = req.body;
    try {
        const doc = await firestore.getDoc('notifications', req.params.userId);
        let items = doc && doc.items ? JSON.parse(doc.items) : [];
        items = items.filter(n => n.id !== notifId);
        await firestore.setDoc('notifications', req.params.userId, { items: JSON.stringify(items), updatedAt: '__serverTimestamp__' });
        res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
});

// Helper: send payout notification to user and post to Discord payouts channel
async function notifyPayout(userId, username, taskType, videoTitle, rewardUSD, rewardSOL, txSignature) {
    try {
        const doc = await firestore.getDoc('notifications', userId);
        const items = doc && doc.items ? JSON.parse(doc.items) : [];
        items.unshift({
            title: 'Payment Received!',
            message: `You were paid <b>$${rewardUSD.toFixed(3)}</b> (${rewardSOL.toFixed(6)} SOL) for your <b>${taskType}</b> task on "${videoTitle}".${txSignature ? ` <a href="https://solscan.io/tx/${txSignature}" target="_blank" style="color:var(--orange);">View transaction</a>` : ''}`,
            icon: 'fas fa-coins',
            color: '#22c55e',
            time: new Date().toISOString(),
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        });
        if (items.length > 50) items.length = 50;
        await firestore.setDoc('notifications', userId, { items: JSON.stringify(items), updatedAt: '__serverTimestamp__' });
    } catch (e) { console.warn('Payout notification save error:', e.message); }

    if (DISCORD_WEBHOOKS.payouts) {
        try {
            await postToDiscord(DISCORD_WEBHOOKS.payouts, {
                username: 'CoinDrop Payouts',
                avatar_url: 'https://coindrop.in/assets/logo.svg',
                embeds: [{
                    color: 0x22c55e,
                    title: '✅ Payout Sent',
                    description: `**@${username || userId.substring(0, 8)}** was paid for a **${taskType}** task.`,
                    fields: [
                        { name: '🎥 Content', value: (videoTitle || 'N/A').substring(0, 100), inline: true },
                        { name: '💰 Amount', value: `$${rewardUSD.toFixed(3)} (${rewardSOL.toFixed(6)} SOL)`, inline: true },
                        ...(txSignature ? [{ name: '📝 Transaction', value: `[View on Solscan](https://solscan.io/tx/${txSignature})` }] : []),
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { text: 'CoinDrop Payouts' },
                }]
            });
        } catch (e) { console.warn('Payouts webhook error:', e.message); }
    }
}

app.get('/health', (req, res) => res.json({ status: 'ok', features: { verification: !!ANTHROPIC_API_KEY, payouts: !!TREASURY_PRIVATE_KEY_ENCRYPTED, discord: !!DISCORD_WEBHOOKS.views } }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`CoinDrop Auth running on port ${PORT}`));
