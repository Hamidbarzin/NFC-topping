# Smart NFC Digital Card System

## Overview

A complete Smart NFC Digital Card System connected to the Topping Courier logistics platform. Users tap or scan an NFC/QR card, register into the system, create a personal digital business card, view and share their profile, and use $40 in credit.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React (Vite) + TailwindCSS + shadcn/ui + wouter routing
- **Backend**: Node.js + Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken) + bcryptjs for password hashing
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/nfc-card run dev` — run frontend locally

## Features

### NFC Card System
- Each card has a unique code (e.g., `C1001`)
- Pre-seeded cards: C1001 through C1005
- `/card/:code` — checks card status, redirects appropriately
- `/activate/:code` — activation form

### User Registration
- Collects: name, business name, phone, email, username, password
- Passwords hashed with bcrypt
- JWT token returned on registration/login
- $40 credit automatically assigned

### Digital Card Page (`/u/:username`)
- Public profile: name, business, phone (call button), email, WhatsApp, website, Instagram, bio, logo
- Footer: "Powered by Topping Courier"

### Dashboard & Profile Edit
- Credit balance display
- Edit all profile fields
- Shareable card link

### Admin Panel (`/admin`)
- Stats: total users, cards, active/new split, credits issued
- User list with credit info
- Card list with status
- Create new card codes

## Database Schema

- **users**: id, name, business_name, phone, email, username, password_hash, is_admin, timestamps
- **profiles**: id, user_id, website, instagram, whatsapp, bio, logo, updated_at
- **cards**: id, card_code, user_id, status (new/active), timestamps
- **credits**: id, user_id, total, used, updated_at

## API Routes

- `GET /api/cards/:code` — get card info
- `POST /api/cards/:code/activate` — activate card + create user
- `POST /api/auth/login` — login
- `GET /api/auth/me` — get current user (auth required)
- `POST /api/auth/logout` — logout
- `GET /api/users/:username` — public profile
- `GET /api/profile` — current user's profile (auth required)
- `PATCH /api/profile` — update profile (auth required)
- `GET /api/credits` — current user's credits (auth required)
- `GET /api/admin/users` — all users (admin only)
- `GET /api/admin/cards` — all cards (admin only)
- `POST /api/admin/cards` — create card (admin only)
- `GET /api/admin/stats` — dashboard stats (admin only)

## Auth

Token-based JWT auth. Token stored in localStorage under key `nfc_token`. All protected API calls include `Authorization: Bearer <token>` header automatically via the api-client-react `setAuthTokenGetter`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
