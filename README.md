# BYOS — Bring Your Own Storage

> **The Stripe of Cloud Storage: $0 Markup, S3-Compatible Storage Powered by Your Personal Google Drive.**

[![Test Suite](https://github.com/byos-dev/byos/actions/workflows/deploy.yml/badge.svg)](https://github.com/byos-dev/byos/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Node.js SDK](https://img.shields.io/badge/SDK-TypeScript%20%7C%20Node.js-blue.svg)](./sdk/node/README.md)

---

## What is BYOS?

Traditional cloud storage vendors mark up hard drive storage space by over **1,000%**. BYOS bypasses vendor lock-in and inflated bandwidth fees by transforming your personal or Google Workspace cloud Drive into a production-grade, highly indexed, **S3-Compatible object storage platform**.

When a developer connects their Google Drive, BYOS creates an isolated folder with restricted read/write scopes (`drive.file`). All file streaming and transfer costs remain entirely within your Google account's free or existing storage quota — resulting in **$0 markup on bandwidth and storage bytes**.

### Core Architecture & Edge Security

```mermaid
sequenceDiagram
  autonumber
  actor Dev as Developer App / SDK
  participant Edge as BYOS Edge API (Vercel/Next.js)
  participant DB as PostgreSQL Metadata Index
  participant GDrive as Google Drive API

  Dev->>Edge: PUT /api/v1/buckets/default/objects/video.mp4 (Bearer byos_live_...)
  Edge->>DB: O(1) Index Lookup & Bcrypt Secret Hash Verification
  DB-->>Edge: Valid Key & Plan Quotas (5GB Max Size Verified)
  Edge->>GDrive: Stream Binary Payload directly to Isolated Drive Folder
  GDrive-->>Edge: ETag & Provider File Identifier
  Edge->>DB: Record Atomic Object Metadata & Version Pointer
  Edge-->>Dev: 200 OK { "key": "video.mp4", "size": 10485760 }
```

---

## 🚀 Quickstart & Local Development Setup

### 1. Requirements & Cloning
- **Node.js**: v18.17 or v20+
- **PostgreSQL**: Local instance or Supabase/Railway dev instance
- **Redis (Optional)**: For local BullMQ background worker testing

```bash
git clone https://github.com/byos-dev/byos.git
cd byos
npm install
```

### 2. Google OAuth 2.0 Client Credentials Setup
To allow users to connect their Google Drive locally:
1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a new Project (`BYOS Local Dev`).
2. Navigate to **APIs & Services -> Library** and enable the **Google Drive API**.
3. Under **OAuth consent screen**, select **External** (or Internal for Workspace) and add scope `https://www.googleapis.com/auth/drive.file`.
4. Go to **Credentials -> Create Credentials -> OAuth client ID** (Application type: Web application).
5. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
6. Copy your `Client ID` and `Client Secret`.

### 3. Environment Variable Configuration
Copy the template and plug in your database connection string and OAuth credentials:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/byos_dev"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef" # 32-character hex secret for token & URL HMAC encryption
```

### 4. Database Schema Migration & Seeding
Push the schema definitions directly to your PostgreSQL database and seed initial testing state:
```bash
npm run db:push
npm run db:seed
```

### 5. Start Development Server & UI
```bash
npm run dev
```
Visit `http://localhost:3000/dashboard` to manage connected storage providers, view object explorers, and mint production API keys.

---

## 📦 Building & Installing the Developer SDK

BYOS comes with an ergonomic TypeScript/Node.js client SDK with automatic retries, exponentional backoff, and presigned streaming URL helpers.

To compile and link the SDK locally for scripts and downstream services:
```bash
cd sdk/node
npm install
npm run build
npm link
```

See the dedicated [Node.js SDK Documentation](./sdk/node/README.md) for full method references and API types.

---

## 🛠️ API Documentation & Interactive Testing

- **Postman API Collection**: Test all CRUD routes, version pruning, and signed grants directly via our interactive collection: [docs/byos-api.postman_collection.json](./docs/byos-api.postman_collection.json).
- **Production Deployment Guide**: View infrastructure requirements and production deployment configurations in [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🛡️ Production Hardening & Testing

Run the full TypeScript type check and automated integration test suite:
```bash
npx tsc --noEmit
npx vitest run
```

---
*Built with modern shadcn/ui primitives, Aceternity UI animations, Next.js 14 App Router, Drizzle ORM, and Google Drive API v3.*
