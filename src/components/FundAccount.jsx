import React, { useState } from 'react';
import { Banknote, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { fundTestnetAccount } from '../lib/stellar';

const FundAccount = ({ address, onFunded }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFund = async () => {
    if (!address) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fundTestnetAccount(address);
      setResult({ success: true, message: res.message });
      if (onFunded) onFunded();
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{
      overflow:'hidden', 
      borderLeft:'4px solid rgba(34,197,94,0.4)',
    }}>
      <div style={{padding:'1.5rem 2rem', position:'relative'}}>
        {/* Background glow */}
        <div style={{
          position:'absolute', top:0, right:0, width:'6rem', height:'6rem',
          background:'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
          borderRadius:'50%', marginRight:'-2rem', marginTop:'-2rem',
        }} />

        <div style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem', position:'relative', zIndex:1}}>
          <div style={{
            padding:'10px', borderRadius:'0.75rem',
            background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.15)',
          }}>
            <Banknote style={{width:'1.25rem', height:'1.25rem', color:'#22c55e'}} />
          </div>
          <div>
            <h3 style={{fontSize:'1rem', fontWeight:800, marginBottom:'2px'}}>Testnet Faucet</h3>
            <p style={{fontSize:'0.65rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em'}}>
              Friendbot XLM Funding
            </p>
          </div>
        </div>

        <p style={{
          fontSize:'0.8rem', color:'#94a3b8', lineHeight:1.7, marginBottom:'1.25rem',
          position:'relative', zIndex:1,
        }}>
          Request free <span style={{color:'#22c55e', fontWeight:700}}>10,000 XLM</span> from the Stellar Friendbot to fund your testnet account for development and testing.
        </p>

        <button
          onClick={handleFund}
          disabled={loading || !address}
          style={{
            width:'100%', padding:'12px', borderRadius:'0.75rem',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
            fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase',
            letterSpacing:'0.15em', cursor:'pointer', transition:'all 0.3s ease',
            background: result?.success 
              ? 'rgba(34,197,94,0.2)' 
              : 'rgba(34,197,94,0.1)',
            border: result?.success 
              ? '1px solid rgba(34,197,94,0.3)' 
              : '1px solid rgba(34,197,94,0.15)',
            color: '#22c55e',
            opacity: !address ? 0.4 : 1,
          }}
        >
          {loading ? (
            <><Loader2 style={{width:'14px', height:'14px'}} className="animate-spin" /> Funding...</>
          ) : result?.success ? (
            <><CheckCircle2 style={{width:'14px', height:'14px'}} /> Funded Successfully</>
          ) : (
            <><Sparkles style={{width:'14px', height:'14px'}} /> Request Testnet XLM</>
          )}
        </button>

        {/* Result message */}
        {result && (
          <div className="animate-fade" style={{
            marginTop:'1rem', padding:'10px 14px', borderRadius:'0.5rem',
            fontSize:'0.75rem', fontWeight:600,
            background: result.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${result.success ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}`,
            color: result.success ? '#86efac' : '#fca5a5',
          }}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default FundAccount;
