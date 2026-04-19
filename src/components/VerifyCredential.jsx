import React, { useState } from 'react';
import { Search, ShieldCheck, ShieldX, Loader2, Fingerprint, X, Zap, FileCode2 } from 'lucide-react';
import { verifyCredential, verifyCredentialOnChain, CREDENTIAL_CATALOG, ISSUING_ACCOUNT } from '../lib/stellar';

const VerifyCredential = () => {
  const [publicKey, setPublicKey] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('HONORS');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('trustline'); // 'trustline' | 'contract'

  const handleVerify = async () => {
    if (!publicKey.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (mode === 'contract') {
        res = await verifyCredentialOnChain(ISSUING_ACCOUNT, publicKey.trim(), selectedAsset);
      } else {
        res = await verifyCredential(publicKey.trim(), selectedAsset);
      }
      setResult(res);
    } catch (err) {
      setResult({ verified: false, reason: err.message });
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setPublicKey('');
  };

  return (
    <div className="glass-card" style={{overflow:'hidden'}}>
      {/* Header */}
      <div style={{
        padding:'1.5rem 2rem',
        borderBottom:'1px solid rgba(255,255,255,0.05)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
          <div style={{
            padding:'10px', borderRadius:'0.75rem',
            background:'rgba(79,70,229,0.1)', border:'1px solid rgba(79,70,229,0.15)',
          }}>
            <Fingerprint style={{width:'1.25rem', height:'1.25rem', color:'#818cf8'}} />
          </div>
          <div>
            <h3 style={{fontSize:'1rem', fontWeight:800, marginBottom:'2px'}}>Credential Verifier</h3>
            <p style={{fontSize:'0.7rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em'}}>
              On-chain authenticity check
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display:'flex', borderRadius:'8px', overflow:'hidden',
          border:'1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={() => { setMode('trustline'); setResult(null); }}
            style={{
              padding:'6px 12px', border:'none', cursor:'pointer',
              fontSize:'0.55rem', fontWeight:800, textTransform:'uppercase',
              letterSpacing:'0.08em', boxShadow:'none',
              background: mode === 'trustline' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'trustline' ? '#fbbf24' : '#475569',
            }}
            title="Verify against Classic Stellar trustlines"
          >
            <Zap style={{width:'10px', height:'10px', display:'inline', marginRight:'4px', verticalAlign:'middle'}} />
            Classic
          </button>
          <button
            onClick={() => { setMode('contract'); setResult(null); }}
            style={{
              padding:'6px 12px', border:'none', cursor:'pointer',
              fontSize:'0.55rem', fontWeight:800, textTransform:'uppercase',
              letterSpacing:'0.08em', boxShadow:'none',
              borderLeft:'1px solid rgba(255,255,255,0.08)',
              background: mode === 'contract' ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.03)',
              color: mode === 'contract' ? '#818cf8' : '#475569',
            }}
            title="Verify against Soroban smart contract state"
          >
            <FileCode2 style={{width:'10px', height:'10px', display:'inline', marginRight:'4px', verticalAlign:'middle'}} />
            Soroban
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{padding:'1.5rem 2rem'}}>
        <div style={{marginBottom:'1rem'}}>
          <label style={{
            display:'block', fontSize:'0.65rem', fontWeight:800, 
            textTransform:'uppercase', letterSpacing:'0.15em', color:'#64748b', marginBottom:'8px',
          }}>Stellar Address</label>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="GABC...XYZ"
            style={{
              width:'100%', padding:'12px 16px', borderRadius:'0.75rem',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              color:'#e2e8f0', fontSize:'0.8rem', fontFamily:"'JetBrains Mono', monospace",
              outline:'none', transition:'border-color 0.3s ease',
              boxSizing:'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(79,70,229,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>

        <div style={{marginBottom:'1.25rem'}}>
          <label style={{
            display:'block', fontSize:'0.65rem', fontWeight:800,
            textTransform:'uppercase', letterSpacing:'0.15em', color:'#64748b', marginBottom:'8px',
          }}>Credential Type</label>
          <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
            {CREDENTIAL_CATALOG.map((cred) => (
              <button
                key={cred.code}
                onClick={() => setSelectedAsset(cred.code)}
                style={{
                  padding:'6px 14px', borderRadius:'8px', cursor:'pointer',
                  fontSize:'0.65rem', fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.08em', transition:'all 0.25s ease',
                  border: selectedAsset === cred.code 
                    ? `1px solid ${cred.color}55` 
                    : '1px solid rgba(255,255,255,0.06)',
                  background: selectedAsset === cred.code 
                    ? `${cred.color}18` 
                    : 'rgba(255,255,255,0.03)',
                  color: selectedAsset === cred.code ? cred.color : '#64748b',
                  boxShadow: selectedAsset === cred.code 
                    ? `0 0 12px ${cred.color}15` 
                    : 'none',
                }}
              >
                {cred.code}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || !publicKey.trim()}
          style={{
            width:'100%', padding:'12px', borderRadius:'0.75rem',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
            fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase',
            letterSpacing:'0.15em', cursor:'pointer', transition:'all 0.3s ease',
            background: loading ? 'rgba(79,70,229,0.15)' : 'linear-gradient(135deg, #4f46e5, #4338ca)',
            color:'white', border:'none',
            opacity: !publicKey.trim() ? 0.4 : 1,
          }}
        >
          {loading ? (
            <><Loader2 style={{width:'14px', height:'14px'}} className="animate-spin" /> Verifying...</>
          ) : (
            <><Search style={{width:'14px', height:'14px'}} /> Verify Credential</>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="animate-fade" style={{
          margin:'0 1.5rem 1.5rem', padding:'1.25rem', borderRadius:'0.75rem',
          background: result.verified ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${result.verified ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              {result.verified ? (
                <ShieldCheck style={{width:'1.25rem', height:'1.25rem', color:'#22c55e'}} />
              ) : (
                <ShieldX style={{width:'1.25rem', height:'1.25rem', color:'#ef4444'}} />
              )}
              <span style={{
                fontSize:'0.8rem', fontWeight:800,
                color: result.verified ? '#22c55e' : '#ef4444',
              }}>
                {result.verified ? 'VERIFIED ✓' : 'NOT VERIFIED'}
              </span>
            </div>
            <button 
              onClick={clearResult}
              style={{
                background:'none', border:'none', padding:'4px', cursor:'pointer',
                color:'#64748b', boxShadow:'none',
              }}
            >
              <X style={{width:'14px', height:'14px'}} />
            </button>
          </div>
          <p style={{fontSize:'0.8rem', color:'#94a3b8', lineHeight:1.6, marginBottom:'0.75rem'}}>
            {result.reason}
          </p>
          {(result.issuer || result.result?.issuer) && (
            <div style={{
              display:'flex', flexWrap:'wrap', gap:'0.5rem',
              fontSize:'0.6rem', color:'#475569',
            }}>
              <span style={{
                padding:'4px 10px', borderRadius:'6px',
                background:'rgba(255,255,255,0.04)', fontFamily:"'JetBrains Mono', monospace",
              }}>
                Asset: {result.assetCode || result.result?.asset_code}
              </span>
              <span style={{
                padding:'4px 10px', borderRadius:'6px',
                background:'rgba(255,255,255,0.04)', fontFamily:"'JetBrains Mono', monospace",
              }}>
                Issuer: {(result.issuer || result.result.issuer).slice(0, 8)}...{(result.issuer || result.result.issuer).slice(-8)}
              </span>
              {result.result?.issued_at && (
                <span style={{
                  padding:'4px 10px', borderRadius:'6px',
                  background:'rgba(255,255,255,0.04)', fontFamily:"'JetBrains Mono', monospace",
                }}>
                  Ledger: {result.result.issued_at.toString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyCredential;
