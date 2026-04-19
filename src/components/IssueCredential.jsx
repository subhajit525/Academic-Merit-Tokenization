import React, { useState } from 'react';
import { 
  Send, CheckCircle2, Info, Building2, Award, GraduationCap, BookOpen, Star, ScrollText,
  Loader2, FileCode2, Zap
} from 'lucide-react';
import { 
  createTrustline, issueCredentialOnChain, CREDENTIAL_CATALOG, ISSUING_ACCOUNT, CONTRACT_ID 
} from '../lib/stellar';

const iconMap = {
  award: Award,
  graduation: GraduationCap,
  scroll: ScrollText,
  star: Star,
  book: BookOpen,
};

const IssueCredential = ({ userAddress, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedCred, setSelectedCred] = useState(CREDENTIAL_CATALOG[0]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [mode, setMode] = useState('trustline'); // 'trustline' | 'contract'
  const [statusMsg, setStatusMsg] = useState('');
  const [txHash, setTxHash] = useState(null);

  const handleClaimTrustline = async () => {
    if (!userAddress) return alert('Connect wallet first');
    setLoading(true);
    setStatusMsg('Creating trustline...');
    setTxHash(null);
    try {
      const result = await createTrustline(userAddress, selectedCred.code, ISSUING_ACCOUNT);
      setTxHash(result?.hash || result?.id);
      setSuccess(true);
      setStatusMsg('Trustline created on-chain');
      setTimeout(() => {
        setSuccess(false);
        setStatusMsg('');
        if (onComplete) onComplete();
      }, 4000);
    } catch (error) {
      setStatusMsg('');
      alert(`Trustline Error: ${error.message}. Make sure you have at least 1 XLM for the reserve.`);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueContract = async () => {
    if (!userAddress) return alert('Connect wallet first');
    setLoading(true);
    setStatusMsg('Step 1/3 — Building transaction...');
    setTxHash(null);
    try {
      setStatusMsg('Step 2/3 — Awaiting wallet signature...');
      const metadata = JSON.stringify({
        credential: selectedCred.code,
        name: selectedCred.name,
        tier: selectedCred.tier,
        issuedVia: 'Academic Merit dApp',
        timestamp: new Date().toISOString(),
      });

      const result = await issueCredentialOnChain(
        userAddress,     // issuer (demo — in production this would be the university)
        userAddress,     // student
        selectedCred.code,
        metadata
      );

      setStatusMsg('Step 3/3 — Confirmed on-chain');
      setTxHash(result?.hash);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStatusMsg('');
        if (onComplete) onComplete();
      }, 4000);
    } catch (error) {
      setStatusMsg('');
      alert(`Contract Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = mode === 'contract' ? handleIssueContract : handleClaimTrustline;

  const SelectedIcon = iconMap[selectedCred.icon] || Award;

  return (
    <div className="glass-card" style={{overflow:'hidden', borderLeft:`4px solid ${selectedCred.color}55`}}>
      {/* Header */}
      <div style={{
        padding:'1.5rem 2rem', borderBottom:'1px solid rgba(255,255,255,0.05)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
          <div style={{
            padding:'10px', borderRadius:'0.75rem',
            background:`${selectedCred.color}15`, border:`1px solid ${selectedCred.color}25`,
            transition:'all 0.3s ease',
          }}>
            <Building2 style={{width:'1.25rem', height:'1.25rem', color: selectedCred.color}} />
          </div>
          <div>
            <h3 style={{fontSize:'1rem', fontWeight:800, marginBottom:'2px'}}>University Registry</h3>
            <p style={{fontSize:'0.65rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em'}}>
              Issue Credentials Portal
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display:'flex', borderRadius:'8px', overflow:'hidden',
          border:'1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={() => setMode('trustline')}
            style={{
              padding:'6px 12px', border:'none', cursor:'pointer',
              fontSize:'0.55rem', fontWeight:800, textTransform:'uppercase',
              letterSpacing:'0.08em', boxShadow:'none',
              background: mode === 'trustline' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'trustline' ? '#fbbf24' : '#475569',
            }}
            title="Classic Stellar trustline operation"
          >
            <Zap style={{width:'10px', height:'10px', display:'inline', marginRight:'4px', verticalAlign:'middle'}} />
            Classic
          </button>
          <button
            onClick={() => setMode('contract')}
            style={{
              padding:'6px 12px', border:'none', cursor:'pointer',
              fontSize:'0.55rem', fontWeight:800, textTransform:'uppercase',
              letterSpacing:'0.08em', boxShadow:'none',
              borderLeft:'1px solid rgba(255,255,255,0.08)',
              background: mode === 'contract' ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'contract' ? '#818cf8' : '#475569',
            }}
            title="Soroban smart contract invocation"
          >
            <FileCode2 style={{width:'10px', height:'10px', display:'inline', marginRight:'4px', verticalAlign:'middle'}} />
            Soroban
          </button>
        </div>
      </div>

      <div style={{padding:'1.5rem 2rem'}}>
        <p style={{fontSize:'0.8rem', color:'#94a3b8', lineHeight:1.7, marginBottom:'1.25rem'}}>
          {mode === 'contract' 
            ? 'Issue an academic credential via the Soroban smart contract. This creates a permanent, verifiable on-chain record.'
            : 'Select an academic credential from the university catalog and create the required on-chain trustline.'
          }
        </p>

        {/* Selected Credential Preview */}
        <div 
          onClick={() => setShowCatalog(!showCatalog)}
          style={{
            padding:'1rem 1.25rem', borderRadius:'0.75rem', cursor:'pointer',
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.75rem',
            transition:'all 0.3s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = `${selectedCred.color}40`}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
        >
          <div style={{
            width:'2.5rem', height:'2.5rem', borderRadius:'0.75rem',
            display:'flex', alignItems:'center', justifyContent:'center',
            background:`${selectedCred.color}15`, flexShrink:0,
          }}>
            <SelectedIcon style={{width:'1.1rem', height:'1.1rem', color: selectedCred.color}} />
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px'}}>
              <span style={{fontSize:'0.85rem', fontWeight:700}}>{selectedCred.name}</span>
              <span style={{
                fontSize:'0.55rem', fontWeight:800, padding:'2px 8px', borderRadius:'4px',
                background:`${selectedCred.color}18`, color: selectedCred.color,
                textTransform:'uppercase', letterSpacing:'0.08em',
              }}>
                {selectedCred.tier}
              </span>
            </div>
            <p style={{
              fontSize:'0.7rem', color:'#64748b', 
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {selectedCred.description}
            </p>
          </div>
          <span style={{
            fontSize:'0.6rem', color:'#475569', fontWeight:700, flexShrink:0,
            transform: showCatalog ? 'rotate(180deg)' : 'rotate(0)',
            transition:'transform 0.3s ease',
          }}>▼</span>
        </div>

        {/* Credential Catalog Dropdown */}
        {showCatalog && (
          <div className="animate-fade" style={{
            marginBottom:'1rem', borderRadius:'0.75rem', overflow:'hidden',
            border:'1px solid rgba(255,255,255,0.06)',
          }}>
            {CREDENTIAL_CATALOG.map((cred, idx) => {
              const Icon = iconMap[cred.icon] || Award;
              const isSelected = cred.code === selectedCred.code;
              return (
                <div
                  key={cred.code}
                  onClick={() => { setSelectedCred(cred); setShowCatalog(false); }}
                  style={{
                    display:'flex', alignItems:'center', gap:'0.75rem',
                    padding:'0.875rem 1.25rem', cursor:'pointer',
                    background: isSelected ? `${cred.color}08` : 'rgba(255,255,255,0.02)',
                    borderBottom: idx < CREDENTIAL_CATALOG.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderLeft: isSelected ? `3px solid ${cred.color}` : '3px solid transparent',
                    transition:'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <Icon style={{width:'1rem', height:'1rem', color: cred.color, flexShrink:0}} />
                  <div style={{flex:1, minWidth:0}}>
                    <span style={{fontSize:'0.8rem', fontWeight:700, color: isSelected ? '#fff' : '#cbd5e1'}}>{cred.name}</span>
                    <span style={{
                      marginLeft:'8px', fontSize:'0.55rem', fontWeight:800,
                      color: cred.color, textTransform:'uppercase',
                    }}>{cred.code}</span>
                  </div>
                  <span style={{
                    fontSize:'0.5rem', fontWeight:800, padding:'2px 8px', borderRadius:'4px',
                    background:`${cred.color}12`, color: cred.color,
                    textTransform:'uppercase', letterSpacing:'0.05em',
                  }}>{cred.tier}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div style={{
          padding:'0.875rem 1rem', borderRadius:'0.75rem', 
          background: mode === 'contract' ? 'rgba(79,70,229,0.05)' : 'rgba(255,255,255,0.02)', 
          border: mode === 'contract' ? '1px solid rgba(79,70,229,0.12)' : '1px solid rgba(255,255,255,0.05)',
          display:'flex', alignItems:'flex-start', gap:'0.75rem', marginBottom:'1.25rem',
        }}>
          <Info style={{width:'0.875rem', height:'0.875rem', color: mode === 'contract' ? 'rgba(129,140,248,0.6)' : 'rgba(251,191,36,0.6)', marginTop:'2px', flexShrink:0}} />
          <p style={{
            fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.1em', color:'#64748b', lineHeight:1.6,
          }}>
            {mode === 'contract' ? (
              <>Invoking Soroban contract <span style={{color:'#818cf8', fontFamily:"'JetBrains Mono', monospace", fontSize:'0.6rem'}}>{CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-4)}</span> to issue <span style={{color: selectedCred.color}}>{selectedCred.code}</span>. This requires signing a contract transaction.</>
            ) : (
              <>Creating a trustline for <span style={{color: selectedCred.color}}>{selectedCred.code}</span> requires signing a transaction with your wallet. Ensure at least 1.5 XLM reserve is available.</>
            )}
          </p>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="animate-fade" style={{
            padding:'0.75rem 1rem', borderRadius:'0.5rem', marginBottom:'1rem',
            background:'rgba(79,70,229,0.08)', border:'1px solid rgba(79,70,229,0.15)',
            display:'flex', alignItems:'center', gap:'0.5rem',
          }}>
            <Loader2 style={{width:'0.75rem', height:'0.75rem', color:'#818cf8'}} className="animate-spin" />
            <span style={{fontSize:'0.7rem', fontWeight:700, color:'#a5b4fc'}}>{statusMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <button 
          onClick={handleClaim}
          disabled={loading || success || !userAddress}
          style={{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
            gap:'0.75rem', padding:'1rem', borderRadius:'0.75rem',
            fontWeight:900, textTransform:'uppercase', letterSpacing:'0.15em',
            fontSize:'0.68rem', transition:'all 0.4s ease', cursor:'pointer',
            border:'none',
            background: success 
              ? '#22c55e' 
              : mode === 'contract'
                ? 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(79,70,229,0.08))'
                : `linear-gradient(135deg, ${selectedCred.color}22, ${selectedCred.color}08)`,
            color: success ? 'white' : '#e2e8f0',
            boxShadow: success ? `0 0 30px rgba(34,197,94,0.3)` : 'none',
            opacity: !userAddress ? 0.4 : 1,
          }}
        >
          {loading ? (
            <><Loader2 style={{width:'0.9rem', height:'0.9rem'}} className="animate-spin" /> Processing...</>
          ) : success ? (
            <><CheckCircle2 style={{width:'1.1rem', height:'1.1rem'}} className="animate-bounce" /> {mode === 'contract' ? 'Issued via Contract' : 'Registry Confirmed'}</>
          ) : (
            <><Send style={{width:'0.9rem', height:'0.9rem'}} /> {mode === 'contract' ? `Issue ${selectedCred.code} via Soroban` : `Claim ${selectedCred.code} Credential`}</>
          )}
        </button>

        {/* Transaction Hash */}
        {txHash && (
          <div className="animate-fade" style={{
            marginTop:'0.75rem', padding:'0.5rem 1rem', borderRadius:'0.5rem',
            background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.12)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <span style={{fontSize:'0.6rem', color:'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em'}}>Tx Hash</span>
            <a 
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize:'0.65rem', color:'#818cf8', fontFamily:"'JetBrains Mono', monospace",
                textDecoration:'none',
              }}
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueCredential;
