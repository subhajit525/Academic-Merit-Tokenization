# 🎓 Academic Merit — Soroban Smart Contract

This directory contains the **Soroban (Rust → WASM)** smart contract that powers the Academic Merit Tokenization system on the Stellar blockchain.

---

## Contract Overview

The contract manages the full lifecycle of academic credentials:

1. **Admin initializes** the contract and becomes the sole authority for issuer management
2. **Universities are registered** as trusted credential issuers by the admin
3. **Credentials are issued** by registered universities to student Stellar accounts
4. **Anyone can verify** a credential's authenticity and issuer trust status
5. **Issuers can revoke** credentials they previously granted

---

## File Structure

```
smartcontract/
├── Cargo.toml              # Dependencies: soroban-sdk v21.7.1
└── src/
    ├── lib.rs              # Contract entry point, public functions, tests
    ├── credential.rs       # CredentialToken model, storage CRUD, catalog validation
    ├── issuer.rs           # IssuerInfo model, admin auth, issuer registry
    └── errors.rs           # ContractError enum (8 error codes)
```

---

## Public Functions

| Function | Caller | Description |
|---|---|---|
| `initialize(admin)` | Deployer | Set the contract admin (one-time) |
| `register_issuer(admin, issuer_id, name)` | Admin | Whitelist a university |
| `get_issuer(issuer_id)` | Anyone | Fetch issuer metadata |
| `get_admin()` | Anyone | Return the admin address |
| `issue_credential(issuer, student, asset_code, metadata)` | Registered Issuer | Mint credential to student |
| `verify_credential(student, asset_code)` | Anyone | Check credential exists & is valid |
| `revoke_credential(issuer, student, asset_code)` | Original Issuer | Revoke a credential |
| `list_credentials(student)` | Anyone | List all student credentials |

---

## Supported Credential Codes

| Code | Name | Tier |
|---|---|---|
| `HONORS` | Graduation Honors | Gold |
| `BSCS` | B.Sc Computer Science | Platinum |
| `MSCERT` | Master Certificate | Diamond |
| `DEAN` | Dean's List | Silver |
| `RESEARCH` | Research Publication | Bronze |

---

## Prerequisites

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the WASM target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install soroban-cli
```

---

## Build

```bash
cd smartcontract
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM binary will be at:
```
target/wasm32-unknown-unknown/release/academic_merit.wasm
```

---

## Test

```bash
cargo test
```

The test suite covers:
- ✅ Contract initialization & admin retrieval
- ✅ Issuer registration
- ✅ Credential issuance & verification
- ✅ Listing multiple credentials
- ✅ Credential revocation
- ✅ Duplicate issuance rejection
- ✅ Invalid asset code rejection

---

## Deploy to Testnet

```bash
# Generate a keypair (if needed)
soroban keys generate deployer --network testnet

# Deploy the contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/academic_merit.wasm \
  --network testnet \
  --source deployer

# Save the returned CONTRACT_ID for subsequent calls
```

---

## Invoke Examples

```bash
# Initialize the contract
soroban contract invoke \
  --id <CONTRACT_ID> --network testnet --source deployer \
  -- initialize --admin <ADMIN_ADDRESS>

# Register a university
soroban contract invoke \
  --id <CONTRACT_ID> --network testnet --source deployer \
  -- register_issuer \
  --admin <ADMIN_ADDRESS> \
  --issuer_id <UNIVERSITY_ADDRESS> \
  --name "State University"

# Issue a credential
soroban contract invoke \
  --id <CONTRACT_ID> --network testnet --source university \
  -- issue_credential \
  --issuer <UNIVERSITY_ADDRESS> \
  --student <STUDENT_ADDRESS> \
  --asset_code HONORS \
  --metadata '{"gpa":"3.95"}'

# Verify a credential
soroban contract invoke \
  --id <CONTRACT_ID> --network testnet \
  -- verify_credential \
  --student <STUDENT_ADDRESS> \
  --asset_code HONORS
```

---

## Error Codes

| Code | Name | Meaning |
|---|---|---|
| 1 | `NotAuthorized` | Caller lacks required permissions |
| 2 | `IssuerAlreadyExists` | University already registered |
| 3 | `IssuerNotFound` | Address not in issuer registry |
| 4 | `CredentialAlreadyIssued` | Student already holds this credential |
| 5 | `CredentialNotFound` | No matching credential on-chain |
| 6 | `InvalidAssetCode` | Asset code not in supported catalog |
| 7 | `InvalidStudent` | Invalid student address |
| 8 | `CredentialRevoked` | Credential was revoked; cannot re-issue |
