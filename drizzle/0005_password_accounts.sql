CREATE TABLE IF NOT EXISTS password_credentials (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_attempts (
 key text PRIMARY KEY,
 count integer NOT NULL,
 expires_at timestamp with time zone NOT NULL
);
