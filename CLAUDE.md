# CoinDrop: working rules for Claude

Two people work in this repo (the owner and an apprentice) and either may be using Claude at any time, often on
different machines. These rules apply to every session, for both of them.

## Always ship after every change
When you finish a change, **commit, push and deploy it without waiting to be asked**. The owner has authorised this
as a standing rule for both people. Do not leave finished work uncommitted or undeployed. If the apprentice forgets to
say "deploy", deploy anyway, and make sure everything he changed is committed before the session ends.

## Safe procedure (do these as separate steps, in order)
Both people deploy, so a stale local copy can silently overwrite the other person's live changes. Always:

1. `git fetch origin`, then merge `origin/main` into your branch (resolve conflicts carefully; keep both people's work,
   and if two designs genuinely conflict, stop and ask the owner which to keep).
2. Syntax-check what you changed (`node --check` for JS) and run any tests that apply.
3. `git add` the files you changed (not blanket `git add -A`), commit with a clear message, and **push**.
4. **Confirm the push succeeded** (`git status -sb` shows in sync with `origin/main`). If it was rejected, go back to
   step 1. Never deploy after a failed push, and never chain push and deploy in one command that continues on failure.
5. Deploy the frontend: `firebase deploy --only hosting` (project `coindrop-e39de`).
6. Backend: Railway redeploys `auth-server/` automatically from `main`. Wait for it and verify, e.g.
   `https://coindrop-auth.up.railway.app/health`. After a deploy that adds an endpoint, check the endpoint responds.
7. Tell the user plainly what was committed, pushed and deployed (and anything that was not).

If you are behind `origin/main` right before deploying, fast-forward first so you never redeploy an older frontend.

## Never commit or deploy
- Secrets of any kind: Discord webhook URLs, API keys, database passwords, the Solana treasury key, service-account
  private keys. These live only in Railway environment variables. Never paste them into chat, files or commits.
- Unrelated local edits you did not make (for example `capacitor.config.json` / `package.json` changes in the working
  tree): leave them out of your commit and mention them instead.

## Project facts worth knowing
- **Frontend:** static site in the repo root (`js/`, `css/`, `*.html`), hosted on Firebase Hosting.
- **Backend:** `auth-server/server.js` on Railway (`https://coindrop-auth.up.railway.app`).
- **Data:** Postgres on Railway holds `config`, `managed_creators`, `notifications`, `referrals`, `user_profiles`.
  Firestore still holds users, tasks, stats, cooldowns and subscriptions and has been hitting its quota.
- **Creators and videos** come only from the YouTube Data API (`YOUTUBE_API_KEY`), synced on a schedule by the server
  and served to the site from `GET /api/catalog`. No RSS or page scraping.
- **Payout rules:** duplicate subscribes and same-day duplicate watch/like/comment tasks are never paid. The earliest
  task in each group is payable. See `computeDuplicateBlocks` in `auth-server/server.js`.
- **Admins** are listed in `ADMIN_EMAILS` (`auth-server/server.js`) and `LOCAL_ADMIN_EMAILS` (`js/admin-payouts.js`).
- Environment variables are set in Railway, for example `YOUTUBE_API_KEY`, `DATABASE_URL`,
  `DISCORD_WEBHOOK_ANNOUNCEMENTS`, `GA4_PROPERTY_ID` and its service-account variables, `VIDEOS_PER_CREATOR`.
