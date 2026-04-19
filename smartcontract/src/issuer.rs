use soroban_sdk::{contracttype, Address, Env, String};

use crate::errors::ContractError;

// ──────────────────────────────────────────────────────────────────────────────
//  Storage keys
// ──────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum IssuerKey {
    /// Stores the contract administrator address.
    Admin,
    /// Stores metadata for a registered issuer (university).
    Registry(Address),
}

// ──────────────────────────────────────────────────────────────────────────────
//  Data model
// ──────────────────────────────────────────────────────────────────────────────

/// Metadata for a registered credential-issuing institution.
#[contracttype]
#[derive(Clone, Debug)]
pub struct IssuerInfo {
    /// Human-readable name (e.g. "MIT", "Stanford University").
    pub name: String,
    /// Whether the issuer is currently active.
    pub active: bool,
    /// Running count of credentials issued by this authority.
    pub issue_count: u64,
    /// Ledger sequence at registration time.
    pub registered_at: u64,
}

// ──────────────────────────────────────────────────────────────────────────────
//  Admin helpers
// ──────────────────────────────────────────────────────────────────────────────

/// Store the admin address. Called once during contract initialization.
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage()
        .persistent()
        .set(&IssuerKey::Admin, admin);
}

/// Retrieve the admin address. Panics if not initialized.
pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .persistent()
        .get(&IssuerKey::Admin)
        .expect("Contract not initialized — no admin set")
}

/// Verify that `caller` is the admin. Returns error if not.
pub fn require_admin(env: &Env, caller: &Address) -> Result<(), ContractError> {
    let admin = get_admin(env);
    if *caller != admin {
        return Err(ContractError::NotAuthorized);
    }
    caller.require_auth();
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
//  Issuer registry
// ──────────────────────────────────────────────────────────────────────────────

/// Register a new issuer (university). Only callable by the admin.
pub fn register_issuer(
    env: &Env,
    issuer_id: &Address,
    name: String,
) -> Result<IssuerInfo, ContractError> {
    let key = IssuerKey::Registry(issuer_id.clone());

    // Prevent duplicate registration
    if env.storage().persistent().has(&key) {
        return Err(ContractError::IssuerAlreadyExists);
    }

    let info = IssuerInfo {
        name,
        active: true,
        issue_count: 0,
        registered_at: env.ledger().sequence() as u64,
    };

    env.storage().persistent().set(&key, &info);
    Ok(info)
}

/// Get issuer info by address. Returns None if not registered.
pub fn get_issuer(env: &Env, issuer_id: &Address) -> Option<IssuerInfo> {
    let key = IssuerKey::Registry(issuer_id.clone());
    env.storage().persistent().get(&key)
}

/// Verify the address is a registered, active issuer.
pub fn require_active_issuer(env: &Env, issuer_id: &Address) -> Result<IssuerInfo, ContractError> {
    let info = get_issuer(env, issuer_id).ok_or(ContractError::IssuerNotFound)?;
    if !info.active {
        return Err(ContractError::NotAuthorized);
    }
    issuer_id.require_auth();
    Ok(info)
}

/// Increment the issue_count for a registered issuer.
pub fn increment_issue_count(env: &Env, issuer_id: &Address) {
    let key = IssuerKey::Registry(issuer_id.clone());
    if let Some(mut info) = env.storage().persistent().get::<_, IssuerInfo>(&key) {
        info.issue_count += 1;
        env.storage().persistent().set(&key, &info);
    }
}
