export const schema = `
CREATE SCHEMA IF NOT EXISTS art;
CREATE TABLE IF NOT EXISTS art.users (
 id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin','staff','customer')),
 active BOOLEAN NOT NULL DEFAULT TRUE, artist_requested BOOLEAN NOT NULL DEFAULT FALSE,
 bio TEXT NOT NULL DEFAULT '', university TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS art.sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES art.users(id), expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS art.categories (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS art.media (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES art.users(id), kind TEXT NOT NULL CHECK(kind IN ('art','slip')),
 data BYTEA NOT NULL, mime TEXT NOT NULL DEFAULT 'image/jpeg', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS art.artworks (
 id TEXT PRIMARY KEY, artist_id TEXT NOT NULL REFERENCES art.users(id), category_id TEXT NOT NULL REFERENCES art.categories(id),
 title TEXT NOT NULL, description TEXT NOT NULL, technique TEXT NOT NULL, width NUMERIC NOT NULL CHECK(width > 0),
 height NUMERIC NOT NULL CHECK(height > 0), price INTEGER NOT NULL CHECK(price > 0), image TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','reserved','sold')),
 review_note TEXT NOT NULL DEFAULT '', credit TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL DEFAULT '',
 deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS art.orders (
 id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES art.users(id), total INTEGER NOT NULL CHECK(total > 0),
 status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment','paid','shipped','completed','cancelled')),
 recipient TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, slip_id TEXT REFERENCES art.media(id),
 payment_note TEXT NOT NULL DEFAULT '', tracking TEXT NOT NULL DEFAULT '', idempotency_key TEXT NOT NULL,
 created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(customer_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS art.order_items (
 order_id TEXT NOT NULL REFERENCES art.orders(id), artwork_id TEXT NOT NULL REFERENCES art.artworks(id),
 title TEXT NOT NULL, price INTEGER NOT NULL, image TEXT NOT NULL, artist_id TEXT NOT NULL REFERENCES art.users(id),
 PRIMARY KEY(order_id,artwork_id)
);
CREATE TABLE IF NOT EXISTS art.audit_logs (
 id BIGSERIAL PRIMARY KEY, actor_id TEXT REFERENCES art.users(id), action TEXT NOT NULL,
 entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS art.rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS art.addresses (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES art.users(id), recipient TEXT NOT NULL, phone TEXT NOT NULL,
 line1 TEXT NOT NULL, province TEXT NOT NULL, district TEXT NOT NULL, subdistrict TEXT NOT NULL, postcode TEXT NOT NULL,
 label TEXT NOT NULL DEFAULT 'home' CHECK(label IN ('home','work','other')), is_default BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS art_addresses_owner ON art.addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS art_addresses_default ON art.addresses(user_id) WHERE is_default=true;
ALTER TABLE art.orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'promptpay' CHECK(payment_method IN ('promptpay','bank_transfer'));
ALTER TABLE art.orders ADD COLUMN IF NOT EXISTS buyer_note TEXT NOT NULL DEFAULT '';
ALTER TABLE art.orders ADD COLUMN IF NOT EXISTS shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK(shipping_fee>=0);
CREATE INDEX IF NOT EXISTS art_artworks_listing ON art.artworks(status,deleted,created_at);
CREATE INDEX IF NOT EXISTS art_orders_customer ON art.orders(customer_id,created_at);
CREATE INDEX IF NOT EXISTS art_audit_created ON art.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS art_sessions_expiry ON art.sessions(expires_at);
ALTER TABLE art.users ADD COLUMN IF NOT EXISTS google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS art_users_google_sub ON art.users(google_sub) WHERE google_sub IS NOT NULL;
-- Application tables live outside Supabase's exposed public schema.
REVOKE ALL ON SCHEMA art FROM PUBLIC;
`;
