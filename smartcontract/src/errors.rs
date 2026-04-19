use soroban_sdk::contracterror;

/// Custom error codes for the Academic Merit contract.
/// Each variant maps to a unique u32 returned to callers on failure.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// The caller is not the contract administrator.
    NotAuthorized = 1,

    /// The issuer has already been registered.
    IssuerAlreadyExists = 2,

    /// The issuer address was not found in the registry.
    IssuerNotFound = 3,

    /// The credential has already been issued to this student.
    CredentialAlreadyIssued = 4,

    /// The credential was not found on the student's record.
    CredentialNotFound = 5,

    /// The provided asset code is not in the supported catalog.
    InvalidAssetCode = 6,

    /// The student address is invalid or missing.
    InvalidStudent = 7,

    /// The credential has been revoked and cannot be re-issued.
    CredentialRevoked = 8,
}
