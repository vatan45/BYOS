# BYOS Production Deployment & Operational Guide

This guide covers provisioning external state engines (PostgreSQL and Redis) and configuring essential environment variables for production deployments on Vercel, Railway, or AWS.

---

## 1. Infrastructure Provisioning

### A. PostgreSQL Database
BYOS uses PostgreSQL for lightning-fast S3 object metadata indexing, virtual directory mapping, and user account usage rollups.

- **Recommended Providers**: Supabase, Neon, or Railway Postgres.
- **Provisioning Sequence**:
  1. Create a PostgreSQL 15+ database instance in your cloud provider.
  2. Obtain the transaction pooled connection URL (e.g., `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/byos_production?pgbouncer=true`).
  3. Run database migrations and seeds locally against your production endpoint:
     ```bash
     export DATABASE_URL="postgresql://..."
     npm run db:push
     ```

### B. Redis Cluster (Optional / Recommended for Pro Scale)
Redis powers distributed token-bucket rate limiting and asynchronous hourly usage rollup worker queues via BullMQ.

- **Recommended Providers**: Upstash Redis (Serverless), Railway Redis, or AWS ElastiCache.
- **Provisioning Sequence**:
  1. Create a standard Redis or Valkey compatible store.
  2. Copy the connection string (`rediss://default:[PASSWORD]@[HOST]:[PORT]`).
  3. If Redis is unconfigured or unavailable, BYOS gracefully degrades rate limiters and runs scheduled rollups synchronously via fallback triggers.

---

## 2. Production Environment Variable Checklist

Configure these variables in your platform control panel (Vercel Project Settings -> Environment Variables, or Railway Variables table):

| Variable Name | Required | Default / Sample | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/db` | Primary PostgreSQL database connection string. |
| `REDIS_URL` | No | `redis://default:pass@host:6379` | Redis cluster string for BullMQ workers and token-bucket rate limiters. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://api.byos.dev` | Canonical root domain used for presigned download grant generator signatures and OAuth callbacks. |
| `GOOGLE_CLIENT_ID` | **Yes** | `28391...apps.googleusercontent.com` | Google Cloud Console OAuth 2.0 Client ID for Google Drive API storage connections. |
| `GOOGLE_CLIENT_SECRET` | **Yes** | `GOCSPX-...` | Google Cloud OAuth Client Secret. |
| `ENCRYPTION_KEY` | **Yes** | `0123456789abcdef0123456789abcdef` | 32-byte hexadecimal secret key used for encrypting OAuth tokens and HMAC signing presigned transfer grants. |
| `ADMIN_EMAILS` | No | `developer@byos.dev,admin@byos.dev` | Comma-separated allowlist of developer account emails granted access to `/admin` telemetry routes. |
| `SENTRY_DSN` | No | `https://abcdef0123456789@o12345.ingest.sentry.io/45678` | Exception tracking sink for runtime monitoring via `@/lib/monitoring.ts`. |

---

## 3. Platform Verification & Post-Deployment Audit

After deploying to production:
1. Verify system health at `https://your-domain.com/api/health`.
2. Ensure OAuth redirect URIs in Google Cloud Console contain `https://your-domain.com/api/auth/google/callback`.
3. Perform an end-to-end test with the Node.js client SDK using a freshly minted production key (`byos_live_...`).
