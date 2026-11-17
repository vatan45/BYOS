# Account setup (no Supabase required)

BYOS accounts now use PostgreSQL, bcrypt password hashes, and opaque, revocable seven-day sessions. No Supabase URL, anon key, or Supabase account is required.

1. Set `DATABASE_URL` to a PostgreSQL connection string in `.env.local` (or your deployment's environment settings).
2. Run `npm run db:migrate`. This applies the application schema and password/session tables. Back up an existing database before migrating it.
3. Restart the app and visit `/signup` to create an account, then use `/login` for subsequent visits.

Existing accounts are not claimed merely by entering their email. Supabase passwords are not copied, and an existing email cannot be re-registered. Migrating those accounts requires a verified recovery flow; this version does not provide password reset or email verification. New accounts use the free plan.

Google Drive connection is separate from account login. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `ENCRYPTION_KEY`, `JWT_SECRET`, and `NEXT_PUBLIC_APP_URL` for storage functionality. Run `npm run check:config` to list missing variables without printing their values.

Use HTTPS in production; production session cookies are Secure, HttpOnly, and SameSite=Lax. Auth mutation requests require a matching Origin. Deploy behind a proxy that preserves the public request origin. Login attempts are capped per account in the database.
