import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, Hash, Layers, Loader2, RefreshCw } from 'lucide-react';
import { fetchPaymentHistory } from '../lib/stellar';

const TransactionHistory = ({ address }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async (isRefresh = false) => {
    if (!address) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await fetchPaymentHistory(address, 15);
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [address]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const truncate = (str) => str ? `${str.slice(0, 6)}...${str.slice(-6)}` : '—';

  if (loading) {
    return (
      <div className="glass-card p-8" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem', minHeight:'200px'}}>
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p style={{color:'#64748b', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em'}}>Loading Transactions...</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="glass-card p-8" style={{textAlign:'center'}}>
        <div style={{
          width:'3.5rem', height:'3.5rem', borderRadius:'50%', margin:'0 auto 1rem',
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(79,70,229,0.1)'
        }}>
          <Clock className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 style={{fontSize:'1.125rem', fontWeight:700, marginBottom:'0.5rem'}}>No Transactions Yet</h3>
        <p style={{color:'#94a3b8', fontSize:'0.875rem', maxWidth:'20rem', margin:'0 auto'}}>
          Fund your testnet account or create a trustline to see transaction history here.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{overflow:'hidden'}}>
      {/* Header */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'1.5rem 2rem', borderBottom:'1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <Layers className="w-4 h-4 text-indigo-400" />
          <span style={{fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.15em', color:'#64748b'}}>
            On-Chain Activity
          </span>
          <span style={{
            fontSize:'0.6rem', fontWeight:800, padding:'2px 8px', borderRadius:'9999px',
            background:'rgba(79,70,229,0.15)', color:'#818cf8'
          }}>{payments.length}</span>
        </div>
        <button 
          onClick={() => loadPayments(true)}
          disabled={refreshing}
          style={{
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:'0.5rem', padding:'6px 12px', display:'flex', alignItems:'center', gap:'6px',
            fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em',
            color:'#64748b', cursor:'pointer'
          }}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Transaction List */}
      <div style={{maxHeight:'420px', overflowY:'auto'}}>
        {payments.map((payment, idx) => {
          const isIncoming = payment.to === address;
          const isCreation = payment.type === 'create_account';
          
          return (
            <div 
              key={payment.id}
              className="animate-fade"
              style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'1rem 2rem', gap:'1rem',
                borderBottom: idx < payments.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                transition:'background 0.2s ease',
                cursor:'pointer',
                animationDelay: `${idx * 0.05}s`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Icon + Info */}
              <div style={{display:'flex', alignItems:'center', gap:'1rem', flex:1, minWidth:0}}>
                <div style={{
                  width:'2.5rem', height:'2.5rem', borderRadius:'0.75rem', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: isCreation 
                    ? 'rgba(34,197,94,0.12)' 
                    : isIncoming 
                      ? 'rgba(79,70,229,0.12)' 
                      : 'rgba(251,191,36,0.12)',
                  border: `1px solid ${
                    isCreation 
                      ? 'rgba(34,197,94,0.2)' 
                      : isIncoming 
                        ? 'rgba(79,70,229,0.2)' 
                        : 'rgba(251,191,36,0.2)'
                  }`
                }}>
                  {isCreation ? (
                    <Layers className="w-4 h-4" style={{color:'#22c55e'}} />
                  ) : isIncoming ? (
                    <ArrowDownLeft className="w-4 h-4" style={{color:'#818cf8'}} />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" style={{color:'#fbbf24'}} />
                  )}
                </div>

                <div style={{minWidth:0}}>
                  <p style={{
                    fontSize:'0.85rem', fontWeight:700, marginBottom:'2px',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
                  }}>
                    {isCreation ? 'Account Created' : isIncoming ? 'Received' : 'Sent'}
                    {payment.assetCode !== 'XLM' && payment.assetType !== 'native' && (
                      <span style={{
                        marginLeft:'8px', fontSize:'0.6rem', fontWeight:800,
                        padding:'2px 6px', borderRadius:'4px', verticalAlign:'middle',
                        background:'rgba(251,191,36,0.1)', color:'#fbbf24',
                        textTransform:'uppercase', letterSpacing:'0.05em'
                      }}>
                        {payment.assetCode}
                      </span>
                    )}
                  </p>
                  <p style={{fontSize:'0.7rem', color:'#475569', fontFamily:"'JetBrains Mono', monospace"}}>
                    {isIncoming ? 'From' : 'To'}: {truncate(isIncoming ? payment.from : payment.to)}
                  </p>
                </div>
              </div>

              {/* Amount + Date */}
              <div style={{textAlign:'right', flexShrink:0}}>
                <p style={{
                  fontSize:'0.9rem', fontWeight:800,
                  color: isIncoming || isCreation ? '#22c55e' : '#f59e0b',
                  fontFamily:"'JetBrains Mono', monospace"
                }}>
                  {isIncoming || isCreation ? '+' : '−'}{parseFloat(payment.amount).toLocaleString('en-US', {maximumFractionDigits: 2})}
                  <span style={{fontSize:'0.6rem', marginLeft:'4px', opacity:0.7}}>
                    {payment.assetCode || 'XLM'}
                  </span>
                </p>
                <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px', marginTop:'2px'}}>
                  <Clock className="w-3 h-3" style={{color:'#475569'}} />
                  <span style={{fontSize:'0.6rem', color:'#475569'}}>
                    {formatDate(payment.createdAt)} · {formatTime(payment.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionHistory;
