# Asset-Manager — Developer Guide

This document summarizes **project goal, stack, what is implemented, and what you must configure** to run and deploy the app.

**Note:** This project is **not tied to Replit**. Run it anywhere with Node.js, pnpm, and PostgreSQL.

---

## Mission

**Smart NFC digital card** for Topping Courier (and related logistics):

- Each card has a **unique code** (e.g. `C1001`).
- Tapping or scanning opens a **URL** (e.g. `https://card.toppingcourier.ca/card/C1001`).
- If the card is not bound to a user yet → **activation / registration**.
- After signup → **public profile** (e.g. `/u/username`) and shareable link.
- **$40 credit** and user management are part of the current design.

MVP goal: **fast signup, public profile, card bound to user** — without hard dependency on full CRM/payment in v1.

---

## Stack


| Layer                         | Technology                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| **Monorepo**                  | pnpm workspaces + `pnpm-lock.yaml`                                                      |
| **Language**                  | TypeScript                                                                              |
| **Frontend**                  | React (Vite) + Tailwind + shadcn/ui + `wouter` — package `@workspace/nfc-card`          |
| **Backend**                   | Node.js + Express 5 — package `@workspace/api-server`                                   |
| **Database**                  | PostgreSQL + Drizzle ORM — package `@workspace/db`                                      |
| **Validation / API contract** | OpenAPI + Zod (`@workspace/api-zod`) + generated client (`@workspace/api-client-react`) |
| **Auth**                      | JWT (`jsonwebtoken`) + `bcryptjs` for passwords                                         |


Use `**npx pnpm@latest`** if `pnpm` is not on your PATH.

---

## Repository layout

- `**artifacts/nfc-card/`** — Web app (activation, signup, profile, dashboard, …).
- `**artifacts/api-server/**` — API server.
- `**lib/db/**` — Drizzle schema and Postgres connection.
- `**lib/api-zod/**` — Zod schemas generated from OpenAPI.
- `**lib/api-client-react/**` — React Query hooks / Orval-generated API client.
- `**lib/api-spec/**` — OpenAPI spec (`openapi.yaml`).

---

## User flow (as implemented)

1. **Card URL:** Frontend route `/card/:code` — loads card from API, redirects to `/activate/:code` or “already active” handling.
2. **Activation:** Registration form → `POST /api/cards/:code/activate` — creates user, profile, credit, updates card.
3. **Public profile:** `GET /api/users/:username` (no login).
4. **Login:** `POST /api/auth/login` with email and password.

**Public routes without `/api` prefix** (`artifacts/api-server/src/publicRoutes.ts`):

- `GET /card/:code` — if `user_id` is null → redirect to `/activate/:code`; else → `/u/:username`.
- `POST /register` — same activation logic with `code` in body (for HTML forms; JSON or `Accept: html`).

Useful when the domain points directly at Node; with Vite-only SPA, routing stays in React.

---

## What is already in the repo

- **Data model:** `users`, `profiles`, `cards`, `credits` (Drizzle).
- **REST API** under `/api`: cards, auth, profile, credits, admin (when `is_admin`).
- **Frontend** pages: home, activation, signup, public profile, dashboard, edit profile, login, admin.
- **Generated API client** for the frontend.
- **Public routes** `GET /card/:code` and `POST /register` mounted on the Express app (see `publicRoutes.ts`).
- **Dev proxy** in `artifacts/nfc-card/vite.config.ts`: `/api` → `http://127.0.0.1:8080` (override with `VITE_API_PROXY`).

---

## What you must do (local / deployment)

### 1) PostgreSQL and `DATABASE_URL`

- `**DATABASE_URL`** is **required** (the DB module fails at startup without it).
- After setting `DATABASE_URL`:

```bash
npx pnpm@latest --filter @workspace/db run push
```

This applies the schema. **Without it**, tables like `cards` do not exist and `/api/cards/...` queries fail.

### 2) Seed card rows

Test codes like `C1001`–`C1005` are mentioned in docs; **there is no automatic seed in-repo** unless you insert rows. Add rows to `cards` (SQL `INSERT`, admin API after promoting an admin user, etc.).

### 3) Run the API

```bash
export DATABASE_URL="postgres://..."
PORT=8080 npx pnpm@latest --filter @workspace/api-server run dev
```

From the **repository root** (same folder as `pnpm-workspace.yaml`):

```bash
export DATABASE_URL="postgres://..."
PORT=8080 npm start
# or: npm run dev  /  npm run dev:api
```

**Note:** `Ctrl+C` stops the server (`SIGTERM`). To use the API again, start the same command. Keep that terminal open, or run the server in another tab/background.

Health check:

```bash
curl -sS http://localhost:8080/api/healthz
```

### 4) Run the frontend

```bash
PORT=20216 BASE_PATH=/ npx pnpm@latest --filter @workspace/nfc-card run dev
```

Shortcut from root: `npm run dev:web`.

If the API uses another port:

```bash
VITE_API_PROXY=http://127.0.0.1:YOUR_PORT PORT=20216 BASE_PATH=/ npx pnpm@latest --filter @workspace/nfc-card run dev
```

### 5) Admin and login

- Normal users are created via **card activation**; **login** uses the same email/password.
- **Admin** requires `is_admin = true` in the database; there is no default admin seed in-repo.

### 6) Optional UI test user

```bash
psql "$DATABASE_URL" -f scripts/seed-ui-test-user.sql
```

Then login with `**ui-test@local.dev**` / `**TempUI2026!**` (see comments in that SQL file).

---

## Out of scope for MVP (typical next phases)

- Full **CRM** integration and **custom website** webhooks (needs API design and security).
- **Payments** and heavy automation.
- **Pricing / packages** stored in DB (needs new schema and endpoints).

---

## Useful commands

```bash
npx pnpm@latest run typecheck
npx pnpm@latest run build
```

---

## Summary


| Topic             | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Goal**          | NFC card → unique URL → signup or public profile; Topping Courier stack.               |
| **Stack**         | TypeScript + React/Vite + Express + Postgres/Drizzle.                                  |
| **Done**          | API, frontend, schema, JWT, public `/card` and `/register`, dev `/api` proxy.          |
| **You configure** | `DATABASE_URL`, `db push`, test cards in DB, run API + frontend, admin flag if needed. |


