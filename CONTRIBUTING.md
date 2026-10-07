# Contributing to SecureFlow Scaffold

Thank you for your interest in contributing to SecureFlow Scaffold! We welcome contributions from developers of all experience levels. This document provides complete instructions for setting up your local environment, developing smart contracts and frontend components, following our coding conventions, and submitting pull requests.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Smart Contract Workflow](#smart-contract-workflow)
5. [Frontend Workflow](#frontend-workflow)
6. [Branching and Commit Conventions](#branching-and-commit-conventions)
7. [Issue Reporting Guidelines & Templates](#issue-reporting-guidelines--templates)
8. [Pull Request Checklist](#pull-request-checklist)

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please ensure interactions are respectful, collaborative, and inclusive.

---

## Prerequisites

Before setting up the project locally, verify that you have the following installed:

- **Node.js**: version `20.x` or later (recommended LTS: Node 22)
- **npm**: version `10.x` or later
- **Rust Toolchain**: `stable` (compatible with edition 2021)
- **WebAssembly Target**: `rustup target add wasm32-unknown-unknown`
- **Stellar CLI**: (Optional for contract compilation and scaffolding) `cargo install --locked stellar-cli`
- **Git**: version `2.30+`

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Centurylong/SecureFlow-scaffold.git
cd SecureFlow-scaffold
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment configuration if needed:

```bash
cp .env.example .env.local 2>/dev/null || true
```

Review and update any RPC endpoints or network passphrases required for local or testnet development.

---

## Smart Contract Workflow

The smart contracts reside in the `contracts/` directory and are managed with Cargo workspace tooling.

### Building Contracts

Compile contracts for testing and release:

```bash
cargo build
cargo build --target wasm32-unknown-unknown --release
```

### Running Contract Tests

Execute the unit and integration tests across all workspace crates:

```bash
cargo test
```

### Code Quality

Run formatting and linting for Rust code:

```bash
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
```

---

## Frontend Workflow

The frontend is built with React, Vite, Tailwind CSS, TypeScript, and the Stellar Wallets Kit.

### Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Typechecking & Production Build

Ensure all TypeScript types compile without errors:

```bash
npm run build
```

### Linting and Formatting

Run ESLint and Prettier checks before submitting code:

```bash
# Check and report lint errors
npm run lint

# Auto-format codebase
npm run format
```

---

## Branching and Commit Conventions

### Branch Naming

Use clear descriptive branch names prefixing the type of work:

- `feat/<feature-name>`: New functionality
- `fix/<bug-description>`: Bug fixes
- `docs/<documentation-topic>`: Documentation updates
- `test/<test-suite>`: Test additions or refactoring
- `refactor/<scope>`: Code refactoring without behavior changes

### Commit Messages

Follow standard conventional commit messages:

```text
<type>(<scope>): <short description>

[optional body explaining context and rationale]

[optional footer, e.g. Closes #123]
```

---

## Issue Reporting Guidelines & Templates

When creating an issue, select the appropriate template:

### Bug Report Template

```markdown
### Summary
A clear and concise description of the bug.

### Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

### Expected Behavior
A concise description of what you expected to happen.

### Actual Behavior / Screenshots
What actually happened, including console logs or error traces.

### Environment
- OS: [e.g. Linux, macOS, Windows]
- Browser: [e.g. Chrome 120, Firefox 122]
- Node version: [e.g. 20.11.0]
```

### Feature Request Template

```markdown
### Problem Statement
Is your feature request related to a problem? Please describe.

### Proposed Solution
A clear and concise description of what you want to happen.

### Alternatives Considered
A description of any alternative solutions or features you considered.

### Additional Context
Add any other context, mockups, or diagrams here.
```

---

## Pull Request Checklist

Before submitting a Pull Request, please complete the following verification steps:

- [ ] My code adheres to the project's coding and style guidelines.
- [ ] I have executed `npm run lint` and resolved any reported warnings/errors.
- [ ] I have executed `npm run build` and confirmed TypeScript compiles cleanly.
- [ ] If contract code was modified, `cargo test` passes 100%.
- [ ] New functionality includes corresponding unit tests or documentation.
- [ ] Commit history is clean, readable, and follows conventional standards.
- [ ] Pull request description includes a standalone issue reference:
  ```text
  Closes #<issue_number>
  ```
