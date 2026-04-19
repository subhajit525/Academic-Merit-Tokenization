# 🎓 Academic Merit Tokenization

A decentralized application (dApp) for issuing, managing, and verifying academic credentials as on-chain tokens on the **Stellar / Soroban** blockchain. Universities mint verifiable Merit Tokens representing degrees, honors, and achievements; students hold them in their wallets; and employers can verify authenticity with a single on-chain lookup.

> **Network:** Stellar Testnet &nbsp;|&nbsp; **Smart Contract Runtime:** Soroban (Rust) &nbsp;|&nbsp; **Frontend:** React 19 + Vite 8

---

## 📑 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Smart Contract — Soroban](#smart-contract--soroban)
  - [Contract File Structure](#contract-file-structure)
  - [Data Models](#data-models)
  - [Core Functions](#core-functions)
  - [Credential Catalog](#credential-catalog)
  - [Error Codes](#error-codes)
  - [Build & Deploy](#build--deploy)
- [Frontend Application](#frontend-application)
  - [Frontend File Structure](#frontend-file-structure)
  - [Key Components](#key-components)
  - [Stellar Integration Layer](#stellar-integration-layer)
- [Frontend ↔ Smart Contract Integration](#frontend--smart-contract-integration)
- [Getting Started](#getting-started)
- [Environment & Prerequisites](#environment--prerequisites)
- [Available Scripts](#available-scripts)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 19 + Vite 8)                    │
│                                                                      │
│  Dashboard ─ IssueCredential ─ VerifyCredential ─ History            │
│                          │                                           │
│                src/lib/stellar.js                                    │
│     ┌────────────────────┴────────────────────┐                      │
│     │   Horizon REST API    │  Soroban RPC    │                      │
│     │   (reads, classic tx) │  (contract tx)  │                      │
│     └────────────────────┬──┘─────────────────┘                      │
│                          │                                           │
│              Freighter Wallet (signing)                               │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  XDR / JSON-RPC
┌──────────────────────────▼───────────────────────────────────────────┐
│                    STELLAR TESTNET                                    │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │              SOROBAN SMART CONTRACT (Rust → WASM)            │   │
│   │                                                              │   │
│   │  Modules:                                                    │   │
│   │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐     │   │
│   │  │  issuer.rs   │  │credential.rs │  │   errors.rs     │     │   │
│   │  │ Admin mgmt   │  │ CRUD storage │  │ ContractError   │     │   │
│   │  │ Registry     │  │ Index/lookup │  │ 8 error codes   │     │   │
│   │  └─────────────┘  └──────────────┘  └─────────────────┘     │   │
│   │                                                              │   │
│   │  Public API:                                                 │   │
│   │  • initialize()       — set contract admin                   │   │
│   │  • register_issuer()  — whitelist a university               │   │
│   │  • issue_credential() — mint a Merit Token to student        │   │
│   │  • verify_credential()— on-chain authenticity check          │   │
│   │  • revoke_credential()— revoke a credential                  │   │
│   │  • list_credentials() — enumerate student credentials        │   │
│   │  • get_issuer()       — query issuer metadata                │   │
│   │  • get_admin()        — query contract administrator         │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Horizon API:  Balances │ Transactions │ Payments │ Network Stats   │
│   Native Asset: XLM      │ Custom Assets: HONORS, BSCS, MSCERT...   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Academic-Merit-Tokenization/
│
├── smartcontract/                  # Soroban smart contract (Rust)
│   ├── Cargo.toml                  # Rust package manifest & Soroban SDK v21.7.1
│   ├── src/
│   │   ├── lib.rs                  # Contract entry point, #[contract] macro, tests
│   │   ├── credential.rs           # CredentialToken struct, storage CRUD, index
│   │   ├── issuer.rs               # IssuerInfo struct, admin auth, registry
│   │   └── errors.rs               # ContractError enum (8 error codes)
│   └── README.md                   # Contract-specific docs & deploy guide
│
├── src/                            # React frontend application
│   ├── main.jsx                    # App bootstrap & React DOM render
│   ├── App.jsx                     # Root component — renders Dashboard
│   ├── App.css                     # Component-scoped styles
│   ├── index.css                   # Global design system (dark theme, glassmorphism)
│   ├── lib/
│   │   └── stellar.js              # Stellar SDK wrapper — Horizon, Soroban RPC,
│   │                               #   Freighter wallet, contract invocations
│   ├── components/
│   │   ├── Dashboard.jsx           # Main dashboard — tabs, stats, layout
│   │   ├── CredentialsList.jsx     # Render credential tokens with tier badges
│   │   ├── IssueCredential.jsx     # University registry — claim credentials
│   │   ├── VerifyCredential.jsx    # On-chain credential verification portal
│   │   ├── TransactionHistory.jsx  # Payment & operation history feed
│   │   ├── FundAccount.jsx         # Testnet Friendbot funding widget
│   │   └── NetworkStatus.jsx       # Live Stellar network stats footer
│   └── assets/                     # Static assets (icons, images)
│
├── public/                         # Public static files
├── index.html                      # HTML entry point (with Buffer polyfill)
├── .env.example                    # Environment variable template
├── package.json                    # Node dependencies & scripts
├── vite.config.js                  # Vite bundler config (Stellar SDK polyfills)
├── eslint.config.js                # ESLint rules
└── README.md                       # ← You are here
```

---

## Smart Contract — Soroban

The smart contract is written in **Rust** targeting the **Soroban** runtime on Stellar. It manages the full credential lifecycle: registration of trusted issuers (universities), issuance of merit tokens to student accounts, on-chain verification, and revocation.

### Contract File Structure

```
smartcontract/
├── Cargo.toml                      # soroban-sdk = "21.7.1"
└── src/
    ├── lib.rs                      # AcademicMeritContract — public entry points
    │                               #   + 6 unit tests covering all paths
    ├── credential.rs               # CredentialToken, CredentialKey, CRUD helpers
    │                               #   store_credential(), get_credential(),
    │                               #   list_credentials(), revoke_credential(),
    │                               #   is_valid_asset_code()
    ├── issuer.rs                   # IssuerInfo, IssuerKey, admin helpers
    │                               #   set_admin(), get_admin(), require_admin(),
    │                               #   register_issuer(), require_active_issuer(),
    │                               #   increment_issue_count()
    └── errors.rs                   # ContractError — 8 descriptive error codes
```

### Data Models

#### `CredentialToken` (credential.rs)

```rust
pub struct CredentialToken {
    pub asset_code: String,     // e.g. "HONORS", "BSCS"
    pub issuer: Address,        // University's Stellar address
    pub metadata: String,       // Arbitrary JSON metadata
    pub issued_at: u64,         // Ledger sequence at issuance
    pub revoked: bool,          // Revocation flag
}
```

#### `IssuerInfo` (issuer.rs)

```rust
pub struct IssuerInfo {
    pub name: String,           // e.g. "MIT", "Stanford University"
    pub active: bool,           // Whether currently authorized
    pub issue_count: u64,       // Running count of credentials issued
    pub registered_at: u64,     // Ledger sequence at registration
}
```

### Core Functions

| Function | Access | Description |
|---|---|---|
| `initialize(admin)` | Once | Set the contract administrator |
| `register_issuer(admin, issuer_id, name)` | Admin only | Whitelist a university as a trusted credential issuer |
| `issue_credential(issuer, student, asset_code, metadata)` | Registered Issuer | Mint a credential token to a student's account |
| `verify_credential(student, asset_code)` | Public | Check if a credential exists and is not revoked |
| `revoke_credential(issuer, student, asset_code)` | Issuing Authority | Revoke a previously issued credential |
| `list_credentials(student)` | Public | Return all credentials held by a student account |
| `get_issuer(issuer_id)` | Public | Fetch issuer metadata (name, status, issue count) |
| `get_admin()` | Public | Return the contract administrator address |

### Credential Catalog

The contract validates credential types against this pre-defined catalog:

| Code | Name | Tier | Description |
|---|---|---|---|
| `HONORS` | Graduation Honors | 🥇 Gold | Cum Laude distinction for outstanding academic performance |
| `BSCS` | B.Sc Computer Science | 💎 Platinum | Bachelor of Science degree in Computer Science |
| `MSCERT` | Master Certificate | 💠 Diamond | Post-graduate mastery certification |
| `DEAN` | Dean's List | 🥈 Silver | Semester-level recognition for top 10% GPA |
| `RESEARCH` | Research Publication | 🥉 Bronze | Peer-reviewed research paper in an academic journal |

### Error Codes

| Code | Name | Description |
|---|---|---|
| 1 | `NotAuthorized` | Caller is not the admin or not an active issuer |
| 2 | `IssuerAlreadyExists` | Duplicate issuer registration attempt |
| 3 | `IssuerNotFound` | Issuer address not in registry |
| 4 | `CredentialAlreadyIssued` | Credential already exists for this student |
| 5 | `CredentialNotFound` | No credential record found |
| 6 | `InvalidAssetCode` | Asset code not in supported catalog |
| 7 | `InvalidStudent` | Student address is invalid |
| 8 | `CredentialRevoked` | Credential has been revoked |

### Build & Deploy

```bash
# Prerequisites
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli --features opt

# Build the contract
cd smartcontract
cargo build --target wasm32-unknown-unknown --release

# Run contract unit tests (6 tests covering all paths)
cargo test

# Deploy to Stellar Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/academic_merit.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>

# Save the returned CONTRACT_ID → put it in .env as VITE_CONTRACT_ID

# Initialize the contract with an admin
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <ADMIN_SECRET_KEY> \
  -- initialize \
  --admin <ADMIN_ADDRESS>

# Register a university issuer
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <ADMIN_SECRET_KEY> \
  -- register_issuer \
  --admin <ADMIN_ADDRESS> \
  --issuer_id <UNIVERSITY_ADDRESS> \
  --name "State University"

# Issue a credential to a student
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <UNIVERSITY_SECRET_KEY> \
  -- issue_credential \
  --issuer <UNIVERSITY_ADDRESS> \
  --student <STUDENT_ADDRESS> \
  --asset_code "HONORS" \
  --metadata '{"gpa":"3.95","semester":"Fall 2025"}'
```

---

## Frontend Application

### Frontend File Structure

```
src/
├── main.jsx                    # ReactDOM.createRoot entry
├── App.jsx                     # Root — wraps <Dashboard />
├── index.css                   # Design tokens: dark theme, glassmorphism,
│                               #   mesh gradients, orbital glows, animations
├── App.css                     # Component-level supplementary styles
├── lib/
│   └── stellar.js              # All Stellar/Horizon/Soroban/Freighter interactions
└── components/
    ├── Dashboard.jsx           # Tab-based layout (Dashboard / Credentials /
    │                           #   History / Verify), stats cards, routing
    ├── CredentialsList.jsx     # Token grid — tier badges, issuer status
    ├── IssueCredential.jsx     # Credential catalog picker + trustline creation
    ├── VerifyCredential.jsx    # Lookup any address + asset code for verification
    ├── TransactionHistory.jsx  # Paginated on-chain transaction/payment feed
    ├── FundAccount.jsx         # One-click Friendbot testnet funding
    └── NetworkStatus.jsx       # Live base fee, ledger height, protocol version
```

### Key Components

| Component | Responsibility |
|---|---|
| **Dashboard** | Orchestrates the entire app — wallet connection state, tab navigation, stats cards. Includes a **Dev Mode** bypass that injects a testnet wallet address (`GBY3...YZZ`) allowing developers to test the UI without installing the Freighter extension. |
| **IssueCredential** | **Dual-Mode:** Lets users select a credential from the catalog and either 1) sign a `changeTrust` transaction (Classic Stellar) to create an on-chain trustline, or 2) perform a Soroban smart contract invocation (`issue_credential`) to mint a dedicated token record. |
| **VerifyCredential** | **Dual-Mode:** Accepts any Stellar public key + asset code and verifies authenticity either by querying Horizon (for classic trustlines) or fetching state directly from the Soroban smart contract. |
| **CredentialsList** | Displays held merit tokens as styled cards with tier badges (Gold/Platinum/Diamond/Silver/Bronze). Seamlessly aggregates and deduplicates credentials from both Horizon and Soroban sources. |
| **TransactionHistory** | Fetches and renders recent transactions and payments for the connected account using the Horizon payments/transactions endpoints |
| **FundAccount** | Triggers Stellar Friendbot to fund 10,000 XLM to the connected testnet account |
| **NetworkStatus** | Polls `/fee_stats` and `/ledgers` to display real-time network health in the footer |

### Stellar Integration Layer

**`src/lib/stellar.js`** — the single-file SDK wrapper that bridges the frontend to both the Horizon REST API and the Soroban smart contract:

```
stellar.js
│
├── Configuration
│   ├── HORIZON_URL                 # Stellar Horizon REST API endpoint
│   ├── SOROBAN_RPC_URL             # Soroban JSON-RPC endpoint
│   ├── CONTRACT_ID                 # Deployed Soroban contract address
│   └── CREDENTIAL_CATALOG          # 5 credential types with metadata
│
├── Wallet
│   └── connectWallet()             # Freighter → detect, get public key
│
├── Horizon API (reads & classic transactions)
│   ├── fetchAccountData()          # XLM balance, merit tokens, subentries
│   ├── fetchTransactionHistory()   # Recent transactions (desc, paginated)
│   ├── fetchPaymentHistory()       # Incoming/outgoing payments
│   ├── fetchNetworkStats()         # Fee stats, latest ledger info
│   ├── fundTestnetAccount()        # Friendbot → fund 10,000 XLM on testnet
│   ├── verifyCredential()          # Check asset existence + trusted issuer
│   └── createTrustline()           # Build, sign (Freighter), submit changeTrust
│
├── Soroban RPC (smart contract invocations)
│   ├── invokeContract()            # Build → simulate → sign → submit → poll
│   ├── simulateContractCall()      # Read-only simulation (no signing)
│   │
│   ├── initializeContract()        # Set contract admin
│   ├── registerIssuer()            # Add university to registry
│   ├── getIssuerInfo()             # Query issuer metadata (read-only)
│   ├── getContractAdmin()          # Query admin address (read-only)
│   │
│   ├── issueCredentialOnChain()    # Mint credential to student
│   ├── verifyCredentialOnChain()   # On-chain verification (read-only)
│   ├── revokeCredentialOnChain()   # Revoke credential
│   └── listCredentialsOnChain()    # List student's credentials (read-only)
│
└── Legacy
    └── issueMeritToken()           # Backward-compatible placeholder
```

---

## Frontend ↔ Smart Contract Integration

The frontend communicates with the Stellar network via **two channels**:

### 1. Horizon REST API (Account Reads & Classic Transactions)

```
React Component → stellar.js → Horizon REST API → Stellar Testnet
```

Used for:
- **Account queries** — `horizonServer.loadAccount()` for balances, subentries
- **Transaction history** — `horizonServer.transactions()` / `.payments()`
- **Network stats** — `fetch('/fee_stats')` and `fetch('/ledgers')`
- **Friendbot funding** — `fetch('https://friendbot.stellar.org?addr=...')`
- **Trustline creation** — `TransactionBuilder` → `Operation.changeTrust` → Freighter sign → submit

### 2. Soroban RPC (Smart Contract Invocations)

```
React Component → stellar.js → Soroban RPC → Smart Contract (WASM) → Stellar Testnet
```

Used for:
- **Issue credential** — `issueCredentialOnChain()` → builds `invokeContract` tx → simulates → signs with Freighter → submits → polls for result
- **Verify credential** — `verifyCredentialOnChain()` → read-only `simulateTransaction` → returns verification result
- **Revoke credential** — `revokeCredentialOnChain()` → state-changing invocation
- **List credentials** — `listCredentialsOnChain()` → read-only simulation

### Soroban Transaction Lifecycle

```
    ┌─────────────────────────────────────────────────┐
    │  1. Build Transaction                            │
    │     new TransactionBuilder(account, { fee })     │
    │     .addOperation(contract.call(fn, ...args))    │
    │     .setTimeout(30).build()                      │
    └──────────────────────┬──────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────────┐
    │  2. Simulate                                      │
    │     sorobanServer.simulateTransaction(tx)          │
    │     → Returns resource costs, footprint            │
    └──────────────────────┬───────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────────┐
    │  3. Assemble                                      │
    │     SorobanRpc.assembleTransaction(tx, simulated) │
    │     → Adds resource info to transaction            │
    └──────────────────────┬───────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────────┐
    │  4. Sign via Freighter                            │
    │     signTransaction(tx.toXDR(), { network })      │
    │     → User reviews & approves in wallet            │
    └──────────────────────┬───────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────────┐
    │  5. Submit & Poll                                 │
    │     sorobanServer.sendTransaction(signedTx)        │
    │     → Poll getTransaction() until SUCCESS/FAILED   │
    └──────────────────────────────────────────────────┘
```

### Integration Flow Example

```
Student clicks "Claim HONORS Credential"
        │
        ▼
IssueCredential.jsx
        │  calls createTrustline(address, 'HONORS', issuerKey)
        ▼
stellar.js
        │  1. horizonServer.loadAccount(address)
        │  2. TransactionBuilder → Operation.changeTrust()
        │  3. transaction.toXDR()
        ▼
Freighter Wallet
        │  User reviews & signs the transaction
        ▼
stellar.js
        │  TransactionBuilder.fromXDR(signedXdr)
        │  horizonServer.submitTransaction(signedTx)
        ▼
Stellar Testnet
        │  Trustline created on-chain ✓
        ▼
Dashboard refreshes account data automatically
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/Academic-Merit-Tokenization.git
cd Academic-Merit-Tokenization
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your VITE_CONTRACT_ID (see Build & Deploy above)
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Connect Wallet

1. Install the [Freighter Wallet](https://www.freighter.app/) browser extension
2. Create or import a Stellar account
3. Switch to **Testnet** in Freighter settings
4. Click **Connect Wallet** in the app
5. Use the **Fund Account** widget to get 10,000 testnet XLM from Friendbot

### 6. Build & Deploy Smart Contract (Optional)

```bash
# Install Rust + Soroban toolchain
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli --features opt

# Build
cd smartcontract
cargo build --target wasm32-unknown-unknown --release

# Test (6 unit tests)
cargo test

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/academic_merit.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>
```

---

## Environment & Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.0 | JavaScript runtime |
| **npm** | ≥ 9.0 | Package manager |
| **Rust** | ≥ 1.74 | Smart contract development |
| **Stellar CLI** | ≥ 21.0 | Contract build, deploy, invoke |
| **Freighter Wallet** | Latest | Browser wallet for signing transactions |
| **wasm32-unknown-unknown** | — | Rust compilation target for Soroban WASM |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
| `cargo build --target wasm32-unknown-unknown --release` | Compile the Soroban smart contract |
| `cargo test` | Run smart contract unit tests (6 tests) |
| `stellar contract deploy` | Deploy compiled WASM to Stellar Testnet |
| `stellar contract invoke` | Invoke contract functions from CLI |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Blockchain** | Stellar Network (Testnet) |
| **Smart Contract** | Soroban (Rust → WASM), soroban-sdk v21.7.1 |
| **Frontend Framework** | React 19 |
| **Build Tool** | Vite 8 |
| **Stellar SDK** | `@stellar/stellar-sdk` v15 (Horizon + Soroban RPC) |
| **Wallet Integration** | `@stellar/freighter-api` v6 |
| **Icons** | Lucide React |
| **Styling** | Vanilla CSS (glassmorphism, dark theme, mesh gradients) |

---

## License

This project is available under the [MIT License](LICENSE).
