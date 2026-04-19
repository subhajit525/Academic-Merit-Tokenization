use soroban_sdk::{contracttype, Address, Env, String, Vec};

use crate::errors::ContractError;

// ──────────────────────────────────────────────────────────────────────────────
//  Storage keys
// ──────────────────────────────────────────────────────────────────────────────

/// Storage key for a single credential record.
/// Keyed by (student_address, asset_code).
#[contracttype]
#[derive(Clone)]
pub enum CredentialKey {
    Record(Address, String),
    Index(Address),
}

// ──────────────────────────────────────────────────────────────────────────────
//  Data model
// ──────────────────────────────────────────────────────────────────────────────

/// Represents a single academic credential stored on-chain.
#[contracttype]
#[derive(Clone, Debug)]
pub struct CredentialToken {
    /// The asset code (e.g. "HONORS", "BSCS").
    pub asset_code: String,
    /// The issuer (university) address that minted this credential.
    pub issuer: Address,
    /// Arbitrary metadata string (e.g. JSON with GPA, semester, etc.).
    pub metadata: String,
    /// Ledger sequence number at issuance time — acts as a timestamp.
    pub issued_at: u64,
    /// Whether the credential has been revoked.
    pub revoked: bool,
}

// ──────────────────────────────────────────────────────────────────────────────
//  Supported asset codes
// ──────────────────────────────────────────────────────────────────────────────

/// Validates that an asset code belongs to the supported catalog.
pub fn is_valid_asset_code(env: &Env, code: &String) -> bool {
    let valid_codes: [&str; 5] = ["HONORS", "BSCS", "MSCERT", "DEAN", "RESEARCH"];
    for valid in valid_codes.iter() {
        if code == &String::from_str(env, valid) {
            return true;
        }
    }
    false
}

// ──────────────────────────────────────────────────────────────────────────────
//  CRUD helpers
// ──────────────────────────────────────────────────────────────────────────────

/// Store a credential record in persistent storage.
pub fn store_credential(env: &Env, student: &Address, credential: &CredentialToken) {
    let key = CredentialKey::Record(student.clone(), credential.asset_code.clone());
    env.storage().persistent().set(&key, credential);

    // Append to the student's credential index
    let idx_key = CredentialKey::Index(student.clone());
    let mut index: Vec<String> = env
        .storage()
        .persistent()
        .get(&idx_key)
        .unwrap_or(Vec::new(env));

    // Avoid duplicates in the index
    let mut found = false;
    for existing in index.iter() {
        if existing == credential.asset_code {
            found = true;
            break;
        }
    }
    if !found {
        index.push_back(credential.asset_code.clone());
        env.storage().persistent().set(&idx_key, &index);
    }
}

/// Retrieve a credential by student + asset code. Returns None if not found.
pub fn get_credential(
    env: &Env,
    student: &Address,
    asset_code: &String,
) -> Option<CredentialToken> {
    let key = CredentialKey::Record(student.clone(), asset_code.clone());
    env.storage().persistent().get(&key)
}

/// List all credentials for a given student.
pub fn list_credentials(env: &Env, student: &Address) -> Vec<CredentialToken> {
    let idx_key = CredentialKey::Index(student.clone());
    let index: Vec<String> = env
        .storage()
        .persistent()
        .get(&idx_key)
        .unwrap_or(Vec::new(env));

    let mut result: Vec<CredentialToken> = Vec::new(env);
    for code in index.iter() {
        if let Some(cred) = get_credential(env, student, &code) {
            result.push_back(cred);
        }
    }
    result
}

/// Mark a credential as revoked. Returns an error if the credential doesn't exist.
pub fn revoke_credential(
    env: &Env,
    student: &Address,
    asset_code: &String,
) -> Result<(), ContractError> {
    let key = CredentialKey::Record(student.clone(), asset_code.clone());
    let mut cred: CredentialToken = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::CredentialNotFound)?;

    cred.revoked = true;
    env.storage().persistent().set(&key, &cred);
    Ok(())
}
