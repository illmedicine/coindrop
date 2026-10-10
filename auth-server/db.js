// Postgres document store (Railway). Same interface as the Firestore REST helper in
// server.js (getDoc / setDoc / addDoc / deleteDoc / query) so collections can be
// moved over one at a time. All documents live in a single table keyed by
// (collection, id) with the fields stored as JSONB.
const crypto = require('crypto');

const OPS = { EQUAL: '=', NOT_EQUAL: '<>', LESS_THAN: '<', LESS_THAN_OR_EQUAL: '<=', GREATER_THAN: '>', GREATER_THAN_OR_EQUAL: '>=' };

function create(databaseUrl, Pool) {
    if (!databaseUrl) return null;
    Pool = Pool || require('pg').Pool;

    const needsSsl = /proxy\.rlwy\.net|sslmode=require/.test(databaseUrl) || process.env.PGSSL === 'true';
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000,
    });
    pool.on('error', e => console.warn('Postgres pool error:', e.message));

    let ready = null;
    function init() {
        if (!ready) {
            ready = pool.query(`
                CREATE TABLE IF NOT EXISTS docs (
                    collection TEXT NOT NULL,
                    id         TEXT NOT NULL,
                    data       JSONB NOT NULL DEFAULT '{}'::jsonb,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    PRIMARY KEY (collection, id)
                );
                CREATE INDEX IF NOT EXISTS docs_collection_updated_idx ON docs (collection, updated_at DESC);
            `).then(() => console.log('Postgres store ready'))
              .catch(e => { ready = null; throw e; });
        }
        return ready;
    }

    return {
        kind: 'postgres',
        init,

        async getDoc(collection, id) {
            try {
                await init();
                const r = await pool.query('SELECT data FROM docs WHERE collection = $1 AND id = $2', [collection, String(id)]);
                return r.rows[0] ? r.rows[0].data : null;
            } catch (e) { console.warn(`pg getDoc ${collection}/${id}: ${e.message}`); return null; }
        },

        // Full replace, matching Firestore PATCH-without-mask behaviour
        async setDoc(collection, id, fields) {
            await init();
            await pool.query(
                `INSERT INTO docs (collection, id, data, updated_at) VALUES ($1, $2, $3::jsonb, now())
                 ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
                [collection, String(id), JSON.stringify(fields || {})]);
        },

        async addDoc(collection, fields) {
            const id = crypto.randomBytes(10).toString('hex');
            await this.setDoc(collection, id, fields);
            return id;
        },

        async deleteDoc(collection, id) {
            try { await init(); await pool.query('DELETE FROM docs WHERE collection = $1 AND id = $2', [collection, String(id)]); }
            catch (e) { console.warn(`pg deleteDoc ${collection}/${id}: ${e.message}`); }
        },

        // Same signature as the Firestore helper: (collection, field, op, value, orderBy, limit)
        async query(collection, field, op, value, orderBy, limit) {
            await init();
            const params = [collection];
            let sql = 'SELECT id, data FROM docs WHERE collection = $1';
            if (field) {
                const sqlOp = OPS[op];
                if (!sqlOp) throw new Error(`Unsupported query operator: ${op}`);
                params.push(field); params.push(JSON.stringify(value));
                sql += ` AND data -> $${params.length - 1} ${sqlOp} $${params.length}::jsonb`;
            }
            if (orderBy) { params.push(orderBy); sql += ` ORDER BY data -> $${params.length} DESC NULLS LAST`; }
            else sql += ' ORDER BY updated_at DESC';
            params.push(Math.max(1, Math.min(parseInt(limit, 10) || 20, 1000)));
            sql += ` LIMIT $${params.length}`;
            const r = await pool.query(sql, params);
            return r.rows.map(row => ({ id: row.id, ...row.data }));
        },

        // Insert only if missing (used by the Firestore -> Postgres copy; never clobbers newer data)
        async insertIfMissing(collection, id, fields) {
            await init();
            const r = await pool.query(
                `INSERT INTO docs (collection, id, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (collection, id) DO NOTHING RETURNING id`,
                [collection, String(id), JSON.stringify(fields || {})]);
            return r.rows.length === 1;
        },

        async counts() {
            await init();
            const r = await pool.query('SELECT collection, count(*)::int AS n FROM docs GROUP BY collection ORDER BY collection');
            return Object.fromEntries(r.rows.map(x => [x.collection, x.n]));
        },

        async ping() { await pool.query('SELECT 1'); return true; },
    };
}

module.exports = { create };
