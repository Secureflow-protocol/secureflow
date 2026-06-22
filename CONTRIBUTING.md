# Contributing to Secureflow

Thank you for contributing to Secureflow. This guide covers the common local setup path for the frontend, backend, contracts, and Supabase data model.

## Prerequisites

- Node.js 20+
- npm
- Supabase CLI
- Rust and the Stellar/Soroban tooling when working on contracts

## Local setup

```bash
git clone https://github.com/Secureflow-protocol/secureflow.git
cd secureflow
npm install
```

Copy the environment examples used by the area you are changing, then start the app or service you need.

## Supabase setup

The repository includes Supabase migrations in `supabase/migrations/` and local seed data in `supabase/seed.sql`.

```bash
supabase start
supabase db reset
```

`supabase db reset` recreates the local database, applies migrations, and loads the seed file. The seed data includes sample messages and notifications so the inbox and notification routes have records to return during local development.

## Backend workflow

```bash
cd backend
npm install
npm run dev
```

When changing API routes, keep request validation and Supabase table fields aligned with the migrations and seed data.

## Pull request checklist

- Keep the change focused on one issue or feature.
- Update docs when setup, migrations, routes, or environment variables change.
- Add or update tests for behavior changes when practical.
- Run the smallest relevant validation command and include it in the PR description.
- Do not commit secrets, private keys, wallet seed phrases, or Supabase service-role credentials.
