import { 
  Horizon, 
  TransactionBuilder, 
  Networks, 
  Asset, 
  Operation, 
  Keypair,
  Contract,
  rpc,
  xdr,
  nativeToScVal,
  scValToNative,
  Address as StellarAddress,
} from '@stellar/stellar-sdk';
import { isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';

// ─── Network Configuration ─────────────────────────────────────────────────
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const horizonServer = new Horizon.Server(HORIZON_URL);
const sorobanServer = new rpc.Server(SOROBAN_RPC_URL);


// ─── Contract Configuration ─────────────────────────────────────────────────
// Replace this with your deployed contract ID after running `stellar contract deploy`
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

// Known university issuing account (for classic asset verification fallback)
export const ISSUING_ACCOUNT = 'GDJ6IAGX7RE5Y3E2B6H5M4G3L2K1J0I9H8G7F6E5D4C3B2A1DEMO';

/**
 * Credential catalog — different academic achievements available on-chain.
 * These codes must match what the Soroban smart contract accepts.
 */
export const CREDENTIAL_CATALOG = [
  { 
    code: 'HONORS', 
    name: 'Graduation Honors', 
    description: 'Cum Laude distinction for outstanding academic performance',
    icon: 'award',
    color: '#fbbf24',
    tier: 'Gold'
  },
  { 
    code: 'BSCS', 
    name: 'B.Sc Computer Science', 
    description: 'Bachelor of Science degree in Computer Science',
    icon: 'graduation',
    color: '#818cf8',
    tier: 'Platinum'
  },
  { 
    code: 'MSCERT', 
    name: 'Master Certificate', 
    description: 'Post-graduate mastery certification in specialized field',
    icon: 'scroll',
    color: '#22c55e',
    tier: 'Diamond'
  },
  { 
    code: 'DEAN', 
    name: "Dean's List", 
    description: "Semester-level Dean's List recognition for top 10% GPA",
    icon: 'star',
    color: '#f43f5e',
    tier: 'Silver'
  },
  { 
    code: 'RESEARCH', 
    name: 'Research Publication', 
    description: 'Peer-reviewed research paper published in academic journal',
    icon: 'book',
    color: '#06b6d4',
    tier: 'Bronze'
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  WALLET CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const connectWallet = async () => {
  try {
    const isConn = await isConnected();
    if (isConn.error || !isConn.isConnected) {
      throw new Error('Freighter extension not found. Please install it from freighter.app');
    }

    const accessResult = await requestAccess();
    if (accessResult.error) {
      throw new Error(accessResult.error.message || accessResult.error);
    }

    const publicKey = accessResult.address || accessResult;

    if (!publicKey || typeof publicKey !== 'string' || !publicKey.startsWith('G')) {
      throw new Error('Invalid Stellar address received from wallet.');
    }

    return publicKey;
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HORIZON — ACCOUNT DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchAccountData = async (publicKey) => {
  if (!publicKey || typeof publicKey !== 'string' || !publicKey.startsWith('G')) {
    return { xlmBalance: '0', meritTokens: [], subentryCount: 0, sequenceNumber: '0' };
  }
  
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const xlmBalance = account.balances.find((b) => b.asset_type === 'native')?.balance || '0';
    
    // Filter for Merit Tokens (custom assets)
    const meritTokens = account.balances
      .filter((b) => b.asset_type !== 'native')
      .map((b) => {
        const catalogItem = CREDENTIAL_CATALOG.find(c => c.code === b.asset_code);
        return {
          code: b.asset_code,
          issuer: b.asset_issuer,
          balance: b.balance,
          verified: b.asset_issuer === ISSUING_ACCOUNT,
          name: catalogItem?.name || b.asset_code,
          color: catalogItem?.color || '#818cf8',
          tier: catalogItem?.tier || 'Standard',
        };
      });

    return { 
      xlmBalance, 
      meritTokens,
      subentryCount: account.subentry_count || 0,
      sequenceNumber: account.sequence || '0',
    };
  } catch (error) {
    if (error?.response?.status === 404) {
      console.warn('Account not found on testnet. Fund it at friendbot.stellar.org');
    } else {
      console.error('Error fetching account:', error);
    }
    return { xlmBalance: '0', meritTokens: [], subentryCount: 0, sequenceNumber: '0' };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HORIZON — TRANSACTION HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchTransactionHistory = async (publicKey, limit = 10) => {
  if (!publicKey || typeof publicKey !== 'string' || !publicKey.startsWith('G')) {
    return [];
  }

  try {
    const transactions = await horizonServer
      .transactions()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit)
      .call();

    return transactions.records.map((tx) => ({
      id: tx.id,
      hash: tx.hash,
      createdAt: tx.created_at,
      sourceAccount: tx.source_account,
      fee: tx.fee_charged,
      operationCount: tx.operation_count,
      memo: tx.memo || null,
      memoType: tx.memo_type || 'none',
      successful: tx.successful,
      ledger: tx.ledger,
    }));
  } catch (error) {
    if (error?.response?.status === 404) {
      return [];
    }
    console.error('Error fetching transactions:', error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HORIZON — PAYMENT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchPaymentHistory = async (publicKey, limit = 15) => {
  if (!publicKey || typeof publicKey !== 'string' || !publicKey.startsWith('G')) {
    return [];
  }

  try {
    const payments = await horizonServer
      .payments()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit)
      .call();

    return payments.records
      .filter(p => p.type === 'payment' || p.type === 'create_account')
      .map((p) => ({
        id: p.id,
        type: p.type,
        createdAt: p.created_at,
        from: p.from || p.source_account || p.funder,
        to: p.to || p.account,
        amount: p.amount || p.starting_balance || '0',
        assetCode: p.asset_code || 'XLM',
        assetType: p.asset_type || 'native',
        transactionHash: p.transaction_hash,
      }));
  } catch (error) {
    if (error?.response?.status === 404) return [];
    console.error('Error fetching payments:', error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HORIZON — NETWORK STATS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchNetworkStats = async () => {
  try {
    const response = await fetch(`${HORIZON_URL}/fee_stats`);
    const feeStats = await response.json();

    const ledgerResponse = await fetch(`${HORIZON_URL}/ledgers?order=desc&limit=1`);
    const ledgerData = await ledgerResponse.json();
    const latestLedger = ledgerData._embedded?.records?.[0];

    return {
      baseFee: feeStats.last_ledger_base_fee || '100',
      medianFee: feeStats.fee_charged?.p50 || '100',
      maxFee: feeStats.fee_charged?.p99 || '1000',
      ledgerVersion: latestLedger?.protocol_version || 'N/A',
      ledgerSequence: latestLedger?.sequence || 0,
      closedAt: latestLedger?.closed_at || null,
      txSuccessCount: latestLedger?.successful_transaction_count || 0,
      txFailedCount: latestLedger?.failed_transaction_count || 0,
      operationCount: latestLedger?.operation_count || 0,
      network: 'TESTNET',
    };
  } catch (error) {
    console.error('Error fetching network stats:', error);
    return {
      baseFee: '100', medianFee: '100', maxFee: '1000',
      ledgerVersion: 'N/A', ledgerSequence: 0, closedAt: null,
      txSuccessCount: 0, txFailedCount: 0, operationCount: 0,
      network: 'TESTNET',
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FRIENDBOT — TESTNET FUNDING
// ═══════════════════════════════════════════════════════════════════════════════

export const fundTestnetAccount = async (publicKey) => {
  if (!publicKey || typeof publicKey !== 'string' || !publicKey.startsWith('G')) {
    throw new Error('Valid Stellar public key is required');
  }

  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData?.detail?.includes('createAccountAlready')) {
        throw new Error('Account already funded. Friendbot can only fund new accounts.');
      }
      throw new Error(`Friendbot returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      hash: data.hash || data.id,
      message: '10,000 XLM funded to your testnet account!',
    };
  } catch (error) {
    console.error('Friendbot error:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CREDENTIAL VERIFICATION (HORIZON-BASED FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════════

export const verifyCredential = async (publicKey, assetCode) => {
  if (!publicKey || !assetCode) {
    return { verified: false, reason: 'Missing public key or asset code' };
  }

  try {
    const account = await horizonServer.loadAccount(publicKey);
    const asset = account.balances.find(
      (b) => b.asset_code === assetCode && b.asset_type !== 'native'
    );

    if (!asset) {
      return { 
        verified: false, 
        reason: 'Credential not found on this account',
        assetCode,
      };
    }

    const isTrusted = asset.asset_issuer === ISSUING_ACCOUNT;
    
    return {
      verified: isTrusted,
      assetCode: asset.asset_code,
      issuer: asset.asset_issuer,
      balance: asset.balance,
      reason: isTrusted 
        ? 'Credential verified — issued by a trusted university authority' 
        : 'Credential found but issuer is not in the trusted registry',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { verified: false, reason: 'Account not found on the Stellar network' };
    }
    return { verified: false, reason: `Verification error: ${error.message}` };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CLASSIC STELLAR — TRUSTLINE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

export const createTrustline = async (publicKey, assetCode, issuer) => {
  if (!publicKey || typeof publicKey !== 'string') {
    throw new Error('Valid public key is required for trustline');
  }
  
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const fee = await horizonServer.fetchBaseFee();
    
    const transaction = new TransactionBuilder(account, {
      fee: String(fee),
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset(assetCode, issuer),
        })
      )
      .setTimeout(30)
      .build();

    const xdrStr = transaction.toXDR();
    const signedResult = await signTransaction(xdrStr, { network: 'TESTNET' });
    
    // Freighter may return { signedTxXdr: string } or a raw string
    let signedXdr;
    if (typeof signedResult === 'string') {
      signedXdr = signedResult;
    } else if (signedResult && signedResult.signedTxXdr) {
      signedXdr = signedResult.signedTxXdr;
    } else {
      throw new Error('Failed to sign transaction');
    }

    const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const result = await horizonServer.submitTransaction(tx);
    return result;
  } catch (error) {
    console.error('Error creating trustline:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SOROBAN — SMART CONTRACT INVOCATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper: Build, simulate, sign, and submit a Soroban contract invocation.
 * This is the core function that bridges the frontend to the Soroban smart contract.
 *
 * @param {string} publicKey        - The caller's Stellar public key
 * @param {string} functionName     - The contract function to invoke
 * @param {Array}  args             - Array of xdr.ScVal arguments
 * @returns {object}                - The transaction result
 */
const invokeContract = async (publicKey, functionName, args = []) => {
  const account = await sorobanServer.getAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  // Simulate the transaction to get the footprint and resource costs
  const simulated = await sorobanServer.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  // Assemble the transaction with the simulation results (adds resource info)
  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // Sign via Freighter
  const xdrStr = prepared.toXDR();
  const signedResult = await signTransaction(xdrStr, {
    network: 'TESTNET',
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  let signedXdr;
  if (typeof signedResult === 'string') {
    signedXdr = signedResult;
  } else if (signedResult && signedResult.signedTxXdr) {
    signedXdr = signedResult.signedTxXdr;
  } else {
    throw new Error('Failed to sign Soroban transaction');
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResponse = await sorobanServer.sendTransaction(signedTx);

  // Poll for completion
  if (sendResponse.status === 'PENDING') {
    let result;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await sorobanServer.getTransaction(sendResponse.hash);
    } while (result.status === 'NOT_FOUND');

    if (result.status === 'SUCCESS') {
      return {
        success: true,
        hash: sendResponse.hash,
        result: result.returnValue,
      };
    } else {
      throw new Error(`Transaction failed: ${result.status}`);
    }
  } else if (sendResponse.status === 'ERROR') {
    throw new Error(`Send failed: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  return { success: true, hash: sendResponse.hash };
};

/**
 * Helper: Simulate a read-only Soroban contract call (no signing required).
 *
 * @param {string} publicKey        - Any valid Stellar address as the source
 * @param {string} functionName     - The contract function to invoke
 * @param {Array}  args             - Array of xdr.ScVal arguments
 * @returns {xdr.ScVal|null}        - The return value from simulation
 */
const simulateContractCall = async (publicKey, functionName, args = []) => {
  const account = await sorobanServer.getAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  const simulated = await sorobanServer.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  return simulated.result?.retval ? scValToNative(simulated.result.retval) : null;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SOROBAN — ISSUER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the contract with an admin address.
 * Must be called exactly once after deployment.
 */
export const initializeContract = async (adminPublicKey) => {
  return invokeContract(adminPublicKey, 'initialize', [
    new StellarAddress(adminPublicKey).toScVal(),
  ]);
};

/**
 * Register a university as a trusted credential issuer.
 * Only the contract admin may call this.
 */
export const registerIssuer = async (adminPublicKey, issuerPublicKey, universityName) => {
  return invokeContract(adminPublicKey, 'register_issuer', [
    new StellarAddress(adminPublicKey).toScVal(),
    new StellarAddress(issuerPublicKey).toScVal(),
    nativeToScVal(universityName, { type: 'string' }),
  ]);
};

/**
 * Fetch issuer info from the contract (read-only simulation).
 */
export const getIssuerInfo = async (callerPublicKey, issuerPublicKey) => {
  try {
    const result = await simulateContractCall(callerPublicKey, 'get_issuer', [
      new StellarAddress(issuerPublicKey).toScVal(),
    ]);
    return result;
  } catch (error) {
    console.error('Error fetching issuer info:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SOROBAN — CREDENTIAL LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Issue a credential token to a student via the Soroban smart contract.
 * The issuer must be a registered, active university.
 *
 * @param {string} issuerPublicKey  - University's Stellar address
 * @param {string} studentPublicKey - Student's Stellar address
 * @param {string} assetCode        - One of: HONORS, BSCS, MSCERT, DEAN, RESEARCH
 * @param {string} metadataJson     - Arbitrary metadata (e.g. JSON with GPA, semester)
 */
export const issueCredentialOnChain = async (issuerPublicKey, studentPublicKey, assetCode, metadataJson) => {
  return invokeContract(issuerPublicKey, 'issue_credential', [
    new StellarAddress(issuerPublicKey).toScVal(),
    new StellarAddress(studentPublicKey).toScVal(),
    nativeToScVal(assetCode, { type: 'string' }),
    nativeToScVal(metadataJson, { type: 'string' }),
  ]);
};

/**
 * Verify a credential on-chain via the Soroban smart contract (read-only).
 *
 * @param {string} callerPublicKey  - Any valid Stellar address
 * @param {string} studentPublicKey - Student whose credential to verify
 * @param {string} assetCode        - The credential code to check
 */
export const verifyCredentialOnChain = async (callerPublicKey, studentPublicKey, assetCode) => {
  try {
    const result = await simulateContractCall(callerPublicKey, 'verify_credential', [
      new StellarAddress(studentPublicKey).toScVal(),
      nativeToScVal(assetCode, { type: 'string' }),
    ]);

    if (result) {
      return {
        verified: true,
        reason: 'Credential verified on-chain via Soroban smart contract',
        result,
      };
    }
    return { verified: false, reason: 'Credential not found on-chain' };
  } catch (error) {
    return {
      verified: false,
      reason: `Contract verification error: ${error.message}`,
    };
  }
};

/**
 * Revoke a previously issued credential.
 * Only the original issuing university can call this.
 */
export const revokeCredentialOnChain = async (issuerPublicKey, studentPublicKey, assetCode) => {
  return invokeContract(issuerPublicKey, 'revoke_credential', [
    new StellarAddress(issuerPublicKey).toScVal(),
    new StellarAddress(studentPublicKey).toScVal(),
    nativeToScVal(assetCode, { type: 'string' }),
  ]);
};

/**
 * List all credentials held by a student (read-only).
 */
export const listCredentialsOnChain = async (callerPublicKey, studentPublicKey) => {
  try {
    const result = await simulateContractCall(callerPublicKey, 'list_credentials', [
      new StellarAddress(studentPublicKey).toScVal(),
    ]);
    return result;
  } catch (error) {
    console.error('Error listing credentials from contract:', error);
    return null;
  }
};

/**
 * Get the contract admin address (read-only).
 */
export const getContractAdmin = async (callerPublicKey) => {
  try {
    const result = await simulateContractCall(callerPublicKey, 'get_admin', []);
    return result;
  } catch (error) {
    console.error('Error fetching contract admin:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  LEGACY — issueMeritToken (kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export const issueMeritToken = async (studentPublicKey, assetCode) => {
  console.log(`Issuing ${assetCode} to ${studentPublicKey}`);
  console.log('Use issueCredentialOnChain() for real Soroban contract invocations.');
};
