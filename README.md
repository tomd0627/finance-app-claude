# Finance Tracker

A full-stack personal finance management app built as a pnpm monorepo.

## Features

- **Dashboard** — monthly income/expense summary, spending-by-category donut chart, 6-month trend bar chart, recent transactions
- **Transactions** — full CRUD with search, filters (type, category, account, date range, amount), sort, and pagination
- **Accounts** — track checking, savings, credit card, and cash accounts with computed balances
- **Budgets** — monthly spending limits per category with progress bars and rollover support
- **Recurring Transactions** — define repeating income/expense templates (daily → yearly) with pause/resume
- **CSV Import** — 3-step wizard: upload → map columns → preview & import
- **Reports** — date-range summaries, spending breakdown, monthly table, CSV export
- **Dark mode** — persisted to `localStorage`, respects OS preference
- **Keyboard shortcuts** — chord navigation, per-page actions (see below)
- **Mobile-friendly** — responsive sidebar drawer, mobile top bar, touch-friendly layout
- **Accessible** — ARIA labels, focus management, skip link, screen reader support

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Server | Node.js, Express 5, tRPC v11, Drizzle ORM, SQLite (`@libsql/client`) |
| Client | React 19, Vite 6, Tailwind CSS, react-router-dom v7, TanStack Query v5, Recharts |
| Shared | Zod schemas (in `packages/shared`) |
| Tooling | pnpm workspaces, TypeScript, Biome (lint + format) |

## Prerequisites

- Node.js v18 or later (v24 recommended)
- pnpm v9 or later (`npm install -g pnpm`)

## Getting Started

```bash
# Install dependencies
pnpm install

# Seed the database with sample data
pnpm --filter server run db:seed

# Start both server and client in development mode
pnpm dev
```

The client runs at **http://localhost:5173** and the API server at **http://localhost:3001**.

## Scripts

### Root

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start server + client concurrently |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format all files |

### Database (`--filter server`)

| Script | Description |
|--------|-------------|
| `pnpm --filter server run db:generate` | Generate Drizzle migrations |
| `pnpm --filter server run db:migrate` | Run pending migrations |
| `pnpm --filter server run db:seed` | Seed with sample data |

## Project Structure

```
finance-tracker-claude/
├── packages/
│   ├── client/          # React + Vite frontend
│   │   └── src/
│   │       ├── components/  # Shared UI + layout components
│   │       ├── routes/      # One folder per page route
│   │       └── lib/         # trpc client, utils, hooks
│   ├── server/          # Express + tRPC backend
│   │   └── src/
│   │       ├── db/          # Drizzle schema, seed, client
│   │       └── trpc/        # Router definitions
│   └── shared/          # Zod schemas shared by client + server
├── biome.json
├── package.json
└── pnpm-workspace.yaml
```

The SQLite database is stored at `packages/server/data/finance.db`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `g` then `d` | Go to Dashboard |
| `g` then `t` | Go to Transactions |
| `g` then `a` | Go to Accounts |
| `g` then `b` | Go to Budgets |
| `g` then `p` | Go to Recurring |
| `g` then `i` | Go to Import |
| `g` then `r` | Go to Reports |
| `g` then `s` | Go to Settings |
| `n` | New item (on current page) |
| `d` | Toggle dark / light mode |
| `?` | Show keyboard shortcuts help |

Shortcuts are disabled while typing in forms.
