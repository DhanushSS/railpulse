-- Run after railpulse_schema.sql. Adds persistent login sessions.
CREATE TABLE IF NOT EXISTS auth_session (
    session_id BIGSERIAL PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_session_expiry ON auth_session(expires_at);
-- Application passwords use salted scrypt hashes. Raw session tokens stay in HttpOnly cookies.
