#![no_std]

mod credential;
mod errors;
mod issuer;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

use credential::{
    is_valid_asset_code, CredentialToken,
    get_credential as storage_get_credential,
    list_credentials as storage_list_credentials,
    revoke_credential as storage_revoke_credential,
    store_credential,
};
use errors::ContractError;
use issuer::{
    get_admin, get_issuer as registry_get_issuer, increment_issue_count, register_issuer as registry_register_issuer,
    require_active_issuer, require_admin, set_admin, IssuerInfo,
};

#[contract]
pub struct AcademicMeritContract;

#[contractimpl]
impl AcademicMeritContract {
    // ─────────────────────────────────────────────────────────────────────────
    //  Initialization
    // ─────────────────────────────────────────────────────────────────────────

    /// Initialize the contract with an administrator address.
    /// Must be called exactly once before any other function.
    pub fn initialize(env: Env, admin: Address) {
        // Prevent re-initialization
        if env.storage().persistent().has(&issuer::IssuerKey::Admin) {
            panic!("Contract already initialized");
        }
        admin.require_auth();
        set_admin(&env, &admin);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Issuer Management
    // ─────────────────────────────────────────────────────────────────────────

    /// Register a university as a trusted credential issuer.
    /// Only the contract admin may call this.
    ///
    /// # Arguments
    /// * `admin`     — the admin address (must match stored admin)
    /// * `issuer_id` — the university's Stellar address
    /// * `name`      — human-readable institution name
    pub fn register_issuer(
        env: Env,
        admin: Address,
        issuer_id: Address,
        name: String,
    ) -> Result<IssuerInfo, ContractError> {
        require_admin(&env, &admin)?;
        registry_register_issuer(&env, &issuer_id, name)
    }

    /// Fetch metadata for a registered issuer.
    pub fn get_issuer(env: Env, issuer_id: Address) -> Option<IssuerInfo> {
        registry_get_issuer(&env, &issuer_id)
    }

    /// Return the current contract administrator address.
    pub fn get_admin(env: Env) -> Address {
        get_admin(&env)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Credential Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /// Issue a credential token to a student.
    ///
    /// # Arguments
    /// * `issuer`     — the university address (must be a registered, active issuer)
    /// * `student`    — the student's Stellar address
    /// * `asset_code` — one of the supported catalog codes (HONORS, BSCS, etc.)
    /// * `metadata`   — arbitrary metadata string (e.g. JSON)
    pub fn issue_credential(
        env: Env,
        issuer: Address,
        student: Address,
        asset_code: String,
        metadata: String,
    ) -> Result<CredentialToken, ContractError> {
        // Verify the issuer is registered and active
        require_active_issuer(&env, &issuer)?;

        // Validate the asset code is in the catalog
        if !is_valid_asset_code(&env, &asset_code) {
            return Err(ContractError::InvalidAssetCode);
        }

        // Check if the credential was already issued
        if let Some(existing) = storage_get_credential(&env, &student, &asset_code) {
            if existing.revoked {
                return Err(ContractError::CredentialRevoked);
            }
            return Err(ContractError::CredentialAlreadyIssued);
        }

        let credential = CredentialToken {
            asset_code: asset_code.clone(),
            issuer: issuer.clone(),
            metadata,
            issued_at: env.ledger().sequence() as u64,
            revoked: false,
        };

        store_credential(&env, &student, &credential);
        increment_issue_count(&env, &issuer);

        Ok(credential)
    }

    /// Verify a specific credential on a student's account.
    /// Returns the credential record if it exists and is not revoked.
    pub fn verify_credential(
        env: Env,
        student: Address,
        asset_code: String,
    ) -> Result<CredentialToken, ContractError> {
        let cred =
            storage_get_credential(&env, &student, &asset_code)
                .ok_or(ContractError::CredentialNotFound)?;

        if cred.revoked {
            return Err(ContractError::CredentialRevoked);
        }

        Ok(cred)
    }

    /// Revoke a previously issued credential.
    /// Only the original issuing authority may revoke.
    pub fn revoke_credential(
        env: Env,
        issuer: Address,
        student: Address,
        asset_code: String,
    ) -> Result<(), ContractError> {
        // Check issuer is a registered, active authority
        require_active_issuer(&env, &issuer)?;

        // Ensure the credential exists and was issued by this issuer
        let cred = storage_get_credential(&env, &student, &asset_code)
            .ok_or(ContractError::CredentialNotFound)?;

        if cred.issuer != issuer {
            return Err(ContractError::NotAuthorized);
        }

        storage_revoke_credential(&env, &student, &asset_code)
    }

    /// List all credentials held by a student.
    pub fn list_credentials(env: Env, student: Address) -> Vec<CredentialToken> {
        storage_list_credentials(&env, &student)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    fn setup_contract() -> (Env, AcademicMeritContractClient<'static>, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, AcademicMeritContract);
        let client = AcademicMeritContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let university = Address::generate(&env);
        let student = Address::generate(&env);

        client.initialize(&admin);

        (env, client, admin, university, student)
    }

    #[test]
    fn test_initialize_and_get_admin() {
        let (_env, client, admin, _, _) = setup_contract();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    fn test_register_issuer() {
        let (env, client, admin, university, _) = setup_contract();
        let name = String::from_str(&env, "State University");

        let info = client.register_issuer(&admin, &university, &name);
        assert_eq!(info.name, name);
        assert!(info.active);
        assert_eq!(info.issue_count, 0);
    }

    #[test]
    fn test_issue_and_verify_credential() {
        let (env, client, admin, university, student) = setup_contract();

        // Register issuer first
        let uni_name = String::from_str(&env, "State University");
        client.register_issuer(&admin, &university, &uni_name);

        // Issue credential
        let asset_code = String::from_str(&env, "HONORS");
        let metadata = String::from_str(&env, "{\"gpa\":\"3.95\",\"semester\":\"Fall 2025\"}");

        let cred = client.issue_credential(&university, &student, &asset_code, &metadata);
        assert_eq!(cred.asset_code, asset_code);
        assert!(!cred.revoked);

        // Verify credential
        let verified = client.verify_credential(&student, &asset_code);
        assert_eq!(verified.issuer, university);
        assert!(!verified.revoked);
    }

    #[test]
    fn test_list_credentials() {
        let (env, client, admin, university, student) = setup_contract();

        let uni_name = String::from_str(&env, "State University");
        client.register_issuer(&admin, &university, &uni_name);

        // Issue two credentials
        let honors = String::from_str(&env, "HONORS");
        let bscs = String::from_str(&env, "BSCS");
        let meta = String::from_str(&env, "{}");

        client.issue_credential(&university, &student, &honors, &meta);
        client.issue_credential(&university, &student, &bscs, &meta);

        let all = client.list_credentials(&student);
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_revoke_credential() {
        let (env, client, admin, university, student) = setup_contract();

        let uni_name = String::from_str(&env, "State University");
        client.register_issuer(&admin, &university, &uni_name);

        let asset_code = String::from_str(&env, "DEAN");
        let meta = String::from_str(&env, "{}");
        client.issue_credential(&university, &student, &asset_code, &meta);

        // Revoke
        client.revoke_credential(&university, &student, &asset_code);

        // Verify should now fail
        let result = client.try_verify_credential(&student, &asset_code);
        assert!(result.is_err());
    }

    #[test]
    fn test_duplicate_issuance_rejected() {
        let (env, client, admin, university, student) = setup_contract();

        let uni_name = String::from_str(&env, "State University");
        client.register_issuer(&admin, &university, &uni_name);

        let code = String::from_str(&env, "RESEARCH");
        let meta = String::from_str(&env, "{}");

        client.issue_credential(&university, &student, &code, &meta);

        // Second issuance should fail
        let result = client.try_issue_credential(&university, &student, &code, &meta);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_asset_code_rejected() {
        let (env, client, admin, university, student) = setup_contract();

        let uni_name = String::from_str(&env, "State University");
        client.register_issuer(&admin, &university, &uni_name);

        let bad_code = String::from_str(&env, "FAKE");
        let meta = String::from_str(&env, "{}");

        let result = client.try_issue_credential(&university, &student, &bad_code, &meta);
        assert!(result.is_err());
    }
}
