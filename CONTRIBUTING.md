# Contributing to SecureFlow

Thanks for your interest in contributing! This guide covers everything you need to set up the project, run tests, and submit a clean PR.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
  - [Contracts (Soroban)](#1-contracts-soroban)
  - [Frontend](#2-frontend)
  - [Backend](#3-backend)
- [Running Tests](#running-tests)
- [Code Style](#code-style)
- [PR Checklist](#pr-checklist)
- [Conventional Commits](#conventional-commits)

---

## Prerequisites

Install the following tools before setting up the project:

| Tool         | Version    | Install Guide                         |
|-------------|-----------|---------------------------------------|
| Node.js     | ≥ 20      | [nodejs.org](https://nodejs.org/)     |
| Rust        | ≥ 1.85    | [rustup.rs](https://rustup.rs/)       |
| soroban-cli | ≥ 21      | `cargo install soroban-cli`           |
| stellar-cli | ≥ 22      | `cargo install stellar-cli`           |
| wasm32 target | —       | `rustup target add wasm32v1-none`     |
| Docker      | ≥ 24      | [docker.com](https://docker.com/)     |

Verify everything:

```bash
node --version    # ≥ 20
rustc --version   # ≥ 1.85
soroban --version # ≥ 21
docker --version  # ≥ 24
```

---

## Local Setup

### 1. Contracts (Soroban)

Build the smart contracts and generate TypeScript clients:

```bash
npm run prebuild
```

This runs `stellar scaffold build --build-clients`, which:
- Compiles Rust contracts to WASM
- Generates typed TS clients in `src/contracts/generated/`
- Runs `npm run build` inside the generated package

If `stellar scaffold` is unavailable, committed contract artifacts are used as fallback.

Install the generated workspace:

```bash
npm run install:contracts
```

### 2. Frontend

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app starts at `http://localhost:5173` by default.

### 3. Backend

The backend requires a few extra steps:

```bash
cd backend
npm install
```

Copy the environment file:

```bash
cp .env.example .env  # create if missing
```

Required env vars in `backend/.env`:

| Variable       | Description                    |
|---------------|--------------------------------|
| `PORT`        | Server port (default: `8787`)  |
| `API_SECRET`  | Auth secret for API requests   |
| `SUPABASE_URL`| Supabase project URL           |
| `SUPABASE_KEY`| Supabase service role key      |

Start the backend:

```bash
npm run dev
```

---

## Running Tests

### Contracts (Rust)

```bash
cargo test
```

### Frontend

Currently there are no frontend test suites set up. Adding tests is a welcome contribution.

### Backend

```bash
cd backend
npm test          # when tests are configured
```

### CI Pipeline

On every push/PR, GitHub Actions runs:
- `cargo build` and `cargo test` for contracts
- `npm run lint` for the frontend
- Integration tests against a Stellar Quickstart container

---

## Code Style

### TypeScript / React

- **ESLint** — config at `eslint.config.js`
  ```bash
  npm run lint
  ```
- **Prettier** — run before committing
  ```bash
  npx prettier . --write
  ```

### Rust (Contracts)

- **Format:** `cargo fmt`
- **Lint:** `cargo clippy -- -D warnings`
- These are enforced in CI

### Git Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Examples:**
```
feat(contract): add milestone release function
fix(backend): handle null signature in verify
docs: update README with API examples
```

---

## PR Checklist

Before submitting a PR, make sure:

- [ ] Code compiles without errors (`npm run build` / `cargo build`)
- [ ] Tests pass (`cargo test` / `npm test`)
- [ ] Lint passes (`npm run lint` / `cargo clippy`)
- [ ] Prettier has been run (`npx prettier . --write`)
- [ ] No debug code, `console.log`, or `TODO` comments left in
- [ ] PR explains **why** the change is needed, not just **what** changed
- [ ] Commits follow [Conventional Commits](#git-commit-style)
- [ ] Related issues are linked (`Closes #123` or `Refs #123`)

---

## Conventional Commits Quick Reference

| Prefix     | When to use                              |
|-----------|------------------------------------------|
| `feat`     | A new feature                            |
| `fix`      | A bug fix                                |
| `docs`     | Documentation changes                    |
| `style`    | Formatting, linting (no logic change)    |
| `refactor` | Code restructuring (no behavior change)  |
| `test`     | Adding or updating tests                 |
| `chore`    | Build config, dependencies, tooling      |
| `ci`       | CI/CD pipeline changes                   |

---

## Need Help?

Open a [Discussion](https://github.com/Centurylong/SecureFlow-scaffold/discussions) or comment on the issue you're working on.

**Happy contributing! 🚀**
