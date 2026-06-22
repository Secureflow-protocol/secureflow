# Contributing

Thanks for helping make SecureFlow a stronger Stellar escrow protocol. This
guide is intended to get a new contributor from a fresh clone to a focused pull
request without needing private project context.

## Prerequisites

Install the tools used by the frontend, backend, and Soroban contract
workspaces:

```bash
# Node.js 22+
node --version
npm --version

# Rust and the Soroban WASM target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none

# Stellar Scaffold CLI
cargo install stellar-scaffold-cli

# Optional local Stellar network
docker --version
```

Never commit private keys, seed phrases, API tokens, `.env` files, customer
data, or production contract credentials.

## Repository layout

| Path | Purpose |
| --- | --- |
| `contracts/secureflow/` | Soroban smart contract modules for escrow, marketplace, refunds, ratings, and admin flows. |
| `src/` | React/Vite frontend and generated contract client integration. |
| `backend/` | Express API for gasless relay, uploads, AI helpers, messages, and notifications. |
| `src/contracts/generated/` | Scaffold-generated TypeScript contract bindings. Regenerate instead of editing by hand when the contract changes. |

## Local setup

```bash
git clone https://github.com/Secureflow-protocol/secureflow.git
cd secureflow

# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

Create local environment files from the examples described in `README.md`.
Keep real credentials local only.

To run a local Stellar network for contract work:

```bash
docker run --rm -p 8000:8000 stellar/quickstart:testing --local
```

Build the contract and generated client after contract changes:

```bash
stellar scaffold build --build-clients
```

## Running the app

Frontend:

```bash
npm run dev
```

Backend:

```bash
cd backend
npm run dev
```

## Tests and quality checks

Run the smallest relevant set before opening a PR, then mention exactly what
passed in the PR description.

Frontend:

```bash
npm run lint
npm run build
```

Backend:

```bash
cd backend
npm run build
```

Contracts:

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

If a command cannot run because a tool is unavailable, say so in the PR and
explain what you checked instead.

## Code style

- Keep PRs small and focused on one issue.
- Prefer clear names and straightforward control flow over clever abstractions.
- Use ESLint and Prettier for TypeScript changes.
- Use `cargo fmt` and `cargo clippy` for Rust changes.
- Add tests or test notes for behavior changes.
- Explain why the change is needed, not only what files changed.

## Commit format

Use conventional commits:

```text
feat: add escrow dispute timeline
fix: reject unauthorized milestone approval
docs: expand contributor setup guide
test: cover refund deadline boundary
chore: update generated contract client
```

## Pull request checklist

Before requesting review:

- [ ] The PR links the issue it addresses.
- [ ] The change is scoped to one concern.
- [ ] Relevant tests, lint, build, or formatting checks were run.
- [ ] Documentation was updated when behavior or setup changed.
- [ ] Security-sensitive contract or backend changes describe authorization,
      fund-flow, and failure-mode impact.
- [ ] No secrets, keys, seed phrases, tokens, or private user data are included.

## Issue reports

Use the GitHub issue templates when opening bugs, feature requests, or contract
issues. For security-sensitive contract behavior, avoid posting live exploit
details publicly; provide a minimal report and ask maintainers for a private
disclosure path.
