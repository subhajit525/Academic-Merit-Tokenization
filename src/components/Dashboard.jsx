import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, Loader2, Award, ShieldCheck, ExternalLink, AlertCircle,
  LayoutDashboard, History, Fingerprint, GraduationCap,
  ChevronRight, Copy, Check
} from 'lucide-react';
import { connectWallet, fetchAccountData, listCredentialsOnChain } from '../lib/stellar';
import CredentialsList from './CredentialsList';
import IssueCredential from './IssueCredential';
import TransactionHistory from './TransactionHistory';
import VerifyCredential from './VerifyCredential';
import FundAccount from './FundAccount';
import NetworkStatus from './NetworkStatus';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'credentials', label: 'Credentials', icon: GraduationCap },
  { id: 'history', label: 'History', icon: History },
  { id: 'verify', label: 'Verify', icon: Fingerprint },
];

const Dashboard = () => {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [copied, setCopied] = useState(false);
  const [accountData, setAccountData] = useState({ 
    xlmBalance: '0', meritTokens: [], subentryCount: 0, sequenceNumber: '0' 
  });

  const safeParseBalance = (balance) => {
    const num = parseFloat(balance);
    return isNaN(num) ? 0 : num;
  };

  const refreshAccountData = useCallback(async (publicKey) => {
    if (!publicKey || typeof publicKey !== 'string') return;
    try {
      const data = await fetchAccountData(publicKey);
      if (data) {
        try {
          const contractCreds = await listCredentialsOnChain(publicKey, publicKey);
          if (Array.isArray(contractCreds)) {
            const mappedCreds = contractCreds.filter(c => !c.revoked).map(c => ({
              code: c.asset_code?.toString() || c.asset_code,
              issuer: c.issuer?.toString() || c.issuer,
              balance: '1.0000000',
              verified: true,
              isContract: true,
            }));
            
            // Deduplicate across classic and contract based on asset code
            const existingCodes = new Set(data.meritTokens.map(t => t.code));
            const uniqueContractCreds = mappedCreds.filter(c => !existingCodes.has(c.code));
            
            data.meritTokens = [...data.meritTokens, ...uniqueContractCreds];
          }
        } catch (contractErr) {
          console.error('Failed to fetch Soroban credentials:', contractErr);
        }
        setAccountData(data);
      }
    } catch (err) {
      console.error('Failed to refresh account data:', err);
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      await refreshAccountData(addr);
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleMockConnect = async () => {
    setAddress('GBY3UUVXOWI54L26R5PZV54B2XMY22Z2234QYZUHYEGBM4YIBAK4YZZ');
    await refreshAccountData('GBY3UUVXOWI54L26R5PZV54B2XMY22Z2234QYZUHYEGBM4YIBAK4YZZ');
  };

  const handleDisconnect = () => {
    setAddress(null);
    setAccountData({ xlmBalance: '0', meritTokens: [], subentryCount: 0, sequenceNumber: '0' });
    setError(null);
    setActiveTab('dashboard');
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let interval;
    if (address && typeof address === 'string') {
      interval = setInterval(() => refreshAccountData(address), 15000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [address, refreshAccountData]);

  const xlmValue = safeParseBalance(accountData.xlmBalance);
  const xlmWhole = Math.floor(xlmValue);
  const xlmDecimal = (xlmValue % 1).toFixed(4).split('.')[1] || '0000';
  const credCount = accountData.meritTokens.length;

  const getRank = () => {
    if (credCount >= 5) return { label: 'Elite', color: '#fbbf24' };
    if (credCount >= 3) return { label: 'Scholar', color: '#818cf8' };
    if (credCount >= 1) return { label: 'Achiever', color: '#22c55e' };
    return { label: 'Novice', color: '#64748b' };
  };
  const rank = getRank();

  return (
    <div style={{minHeight:'100vh', display:'flex', flexDirection:'column'}}>
      {/* ═══════ HEADER ═══════ */}
      <header style={{
        maxWidth:'72rem', width:'100%', margin:'0 auto', padding:'1.5rem 2rem',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
          <div className="academic-border" style={{
            padding:'0.75rem', borderRadius:'0.75rem',
            background:'rgba(245,158,11,0.15)',
          }}>
            <Award style={{width:'1.75rem', height:'1.75rem', color:'#f59e0b'}} />
          </div>
          <div>
            <h1 style={{
              fontSize:'1.75rem', fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.2,
            }}>
              Academic <span className="text-gradient">Merit</span>
            </h1>
            <p style={{fontSize:'0.7rem', color:'#64748b', fontWeight:600, letterSpacing:'0.05em'}}>
              Verifiable Credential Ledger
            </p>
          </div>
        </div>

        {address ? (
          <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
            <div className="glass" style={{
              display:'flex', alignItems:'center', gap:'0.75rem',
              padding:'0.4rem 1rem', borderRadius:'9999px',
            }}>
              <div style={{
                width:'8px', height:'8px', borderRadius:'50%', background:'#22c55e',
                boxShadow:'0 0 8px rgba(34,197,94,0.6)',
                animation:'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }} />
              <span style={{
                fontFamily:"'JetBrains Mono', monospace", fontSize:'0.7rem',
                color:'#cbd5e1', letterSpacing:'-0.02em',
              }}>
                {address.slice(0, 6)}...{address.slice(-6)}
              </span>
              <button
                onClick={handleCopyAddress}
                style={{
                  background:'none', border:'none', padding:'4px', cursor:'pointer',
                  color:'#64748b', boxShadow:'none', display:'flex',
                }}
                title="Copy address"
              >
                {copied ? (
                  <Check style={{width:'12px', height:'12px', color:'#22c55e'}} />
                ) : (
                  <Copy style={{width:'12px', height:'12px'}} />
                )}
              </button>
            </div>
            <button 
              onClick={handleDisconnect}
              style={{
                background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.15)',
                borderRadius:'0.5rem', padding:'8px 14px', cursor:'pointer',
                fontSize:'0.6rem', fontWeight:800, color:'#ef4444',
                textTransform:'uppercase', letterSpacing:'0.1em', boxShadow:'none',
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div style={{display:'flex', gap:'0.75rem'}}>
            <button
              onClick={handleConnect}
              disabled={loading}
              style={{
                background:'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color:'#1e1b4b', border:'none', borderRadius:'0.75rem',
                padding:'0.75rem 1.5rem', cursor:'pointer',
                display:'flex', alignItems:'center', gap:'0.5rem',
                fontSize:'0.8rem', fontWeight:800,
                boxShadow:'0 4px 20px rgba(245,158,11,0.25)',
              }}
            >
              {loading ? <Loader2 style={{width:'16px', height:'16px'}} className="animate-spin" /> : <Wallet style={{width:'16px', height:'16px'}} />}
              Connect Wallet
            </button>
            <button
              onClick={handleMockConnect}
              style={{
                background:'rgba(255,255,255,0.05)',
                color:'#cbd5e1', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'0.75rem',
                padding:'0.75rem 1.25rem', cursor:'pointer',
                fontSize:'0.75rem', fontWeight:700, transition:'all 0.3s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              title="Bypass wallet requirement for testing UI"
            >
              Dev Mode
            </button>
          </div>
        )}
      </header>

      {/* ═══════ ERROR BANNER ═══════ */}
      {error && (
        <div className="animate-fade" style={{maxWidth:'72rem', width:'100%', margin:'0 auto 1rem', padding:'0 2rem'}}>
          <div style={{
            display:'flex', alignItems:'center', gap:'0.75rem',
            padding:'1rem 1.25rem', borderRadius:'0.75rem',
            background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)',
          }}>
            <AlertCircle style={{width:'1rem', height:'1rem', color:'#ef4444', flexShrink:0}} />
            <p style={{fontSize:'0.8rem', color:'#fca5a5', flex:1}}>{error}</p>
            <button 
              onClick={() => setError(null)} 
              style={{
                background:'none', border:'none', padding:'4px 10px',
                fontSize:'0.65rem', fontWeight:700, color:'#64748b', cursor:'pointer',
                boxShadow:'none',
              }}
            >✕</button>
          </div>
        </div>
      )}

      {/* ═══════ TAB NAVIGATION ═══════ */}
      {address && (
        <nav style={{
          maxWidth:'72rem', width:'100%', margin:'0 auto', padding:'0 2rem 1.5rem',
        }}>
          <div style={{
            display:'flex', gap:'4px', padding:'4px', borderRadius:'0.75rem',
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
            width:'fit-content',
          }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:'6px',
                    padding:'8px 18px', borderRadius:'0.5rem', cursor:'pointer',
                    border:'none', transition:'all 0.25s ease',
                    fontSize:'0.7rem', fontWeight:isActive ? 800 : 600,
                    textTransform:'uppercase', letterSpacing:'0.08em',
                    background: isActive ? 'rgba(79,70,229,0.15)' : 'transparent',
                    color: isActive ? '#a5b4fc' : '#64748b',
                    boxShadow: isActive ? '0 0 12px rgba(79,70,229,0.1)' : 'none',
                  }}
                >
                  <Icon style={{width:'14px', height:'14px'}} />
                  {tab.label}
                  {tab.id === 'credentials' && credCount > 0 && (
                    <span style={{
                      fontSize:'0.55rem', fontWeight:900, padding:'1px 6px',
                      borderRadius:'9999px', background:'rgba(245,158,11,0.15)',
                      color:'#fbbf24', marginLeft:'2px',
                    }}>{credCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main style={{flex:1, maxWidth:'72rem', width:'100%', margin:'0 auto', padding:'0 2rem 2rem'}}>
        
        {/* ─── TAB: Dashboard ─── */}
        {(activeTab === 'dashboard' || !address) && (
          <div style={{
            display:'grid', gridTemplateColumns:'1fr', gap:'1.5rem',
          }}>
            {/* Top Row: Stats Cards */}
            <div style={{
              display:'grid', 
              gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', 
              gap:'1rem',
            }}>
              {/* XLM Balance Card */}
              <div className="glass-card" style={{padding:'1.5rem', position:'relative', overflow:'hidden'}}>
                <div style={{
                  position:'absolute', top:'-1rem', right:'-1rem', width:'4rem', height:'4rem',
                  background:'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)',
                  borderRadius:'50%',
                }} />
                <p style={{
                  fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.15em', color:'#64748b', marginBottom:'0.75rem',
                }}>Network Reserve</p>
                <div style={{display:'flex', alignItems:'baseline', gap:'2px'}}>
                  <span style={{fontSize:'2.25rem', fontWeight:900, letterSpacing:'-0.04em'}}>{xlmWhole}</span>
                  <span style={{fontSize:'1rem', fontWeight:700, color:'rgba(129,140,248,0.7)'}}>.{xlmDecimal}</span>
                  <span style={{fontSize:'0.65rem', fontWeight:700, color:'#64748b', marginLeft:'6px'}}>XLM</span>
                </div>
              </div>

              {/* Credentials Count */}
              <div className="glass-card" style={{padding:'1.5rem', position:'relative', overflow:'hidden'}}>
                <div style={{
                  position:'absolute', top:'-1rem', right:'-1rem', width:'4rem', height:'4rem',
                  background:'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
                  borderRadius:'50%',
                }} />
                <p style={{
                  fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.15em', color:'#64748b', marginBottom:'0.75rem',
                }}>Credentials</p>
                <div style={{display:'flex', alignItems:'baseline', gap:'8px'}}>
                  <span style={{fontSize:'2.25rem', fontWeight:900}}>{credCount}</span>
                  <span style={{
                    fontSize:'0.6rem', fontWeight:800, padding:'3px 10px',
                    borderRadius:'6px', background:`${rank.color}18`,
                    color: rank.color, textTransform:'uppercase', letterSpacing:'0.08em',
                  }}>{rank.label}</span>
                </div>
              </div>

              {/* Trustlines */}
              <div className="glass-card" style={{padding:'1.5rem', position:'relative', overflow:'hidden'}}>
                <div style={{
                  position:'absolute', top:'-1rem', right:'-1rem', width:'4rem', height:'4rem',
                  background:'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
                  borderRadius:'50%',
                }} />
                <p style={{
                  fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.15em', color:'#64748b', marginBottom:'0.75rem',
                }}>Trust Status</p>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <span style={{fontSize:'2.25rem', fontWeight:900, color: address ? '#22c55e' : '#475569'}}>
                    {address ? accountData.subentryCount : '—'}
                  </span>
                  <div>
                    <span style={{
                      display:'block', fontSize:'0.55rem', fontWeight:700, color:'#475569',
                      textTransform:'uppercase', letterSpacing:'0.08em',
                    }}>Subentries</span>
                    <span style={{
                      fontSize:'0.6rem', fontWeight:800,
                      color: address ? '#22c55e' : '#475569',
                    }}>
                      {address ? '● Active' : '○ Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sequence */}
              <div className="glass-card" style={{padding:'1.5rem', position:'relative', overflow:'hidden'}}>
                <div style={{
                  position:'absolute', top:'-1rem', right:'-1rem', width:'4rem', height:'4rem',
                  background:'radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)',
                  borderRadius:'50%',
                }} />
                <p style={{
                  fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.15em', color:'#64748b', marginBottom:'0.75rem',
                }}>Sequence #</p>
                <span style={{
                  fontSize:'1rem', fontWeight:800, color:'#cbd5e1',
                  fontFamily:"'JetBrains Mono', monospace",
                  wordBreak:'break-all',
                }}>
                  {address ? accountData.sequenceNumber : '—'}
                </span>
              </div>
            </div>

            {/* Bottom Row: Two Column Layout */}
            <div style={{
              display:'grid', 
              gridTemplateColumns: address ? 'minmax(300px, 1fr) minmax(300px, 2fr)' : '1fr',
              gap:'1.5rem',
            }}>
              {/* Left Column: Actions */}
              {address ? (
                <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                  <IssueCredential userAddress={address} onComplete={() => refreshAccountData(address)} />
                  <FundAccount address={address} onFunded={() => refreshAccountData(address)} />
                  
                  {/* Explorer Link */}
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card"
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'1rem 1.5rem', textDecoration:'none', color:'#818cf8',
                      fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.03em',
                    }}
                  >
                    <span style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <ShieldCheck style={{width:'1rem', height:'1rem'}} />
                      View on Stellar Explorer
                    </span>
                    <ChevronRight style={{width:'1rem', height:'1rem', opacity:0.5}} />
                  </a>
                </div>
              ) : null}

              {/* Right Column: Credentials or Connect Prompt */}
              <div>
                <div style={{
                  display:'flex', justifyContent:'space-between', alignItems:'flex-end',
                  marginBottom:'1rem', paddingBottom:'0.75rem',
                  borderBottom:'1px solid rgba(255,255,255,0.05)',
                }}>
                  <div>
                    <h2 style={{fontSize:'1.35rem', fontWeight:800, letterSpacing:'-0.02em'}}>
                      Credential Ledger
                    </h2>
                    <p style={{
                      fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.12em', color:'#64748b', marginTop:'4px',
                    }}>
                      Verified achievements on-chain
                    </p>
                  </div>
                  {address && credCount > 0 && (
                    <button
                      onClick={() => setActiveTab('credentials')}
                      style={{
                        display:'flex', alignItems:'center', gap:'4px',
                        background:'none', border:'none', padding:'4px 8px',
                        fontSize:'0.6rem', fontWeight:700, color:'#818cf8',
                        cursor:'pointer', boxShadow:'none',
                      }}
                    >
                      View All <ChevronRight style={{width:'12px', height:'12px'}} />
                    </button>
                  )}
                </div>

                {!address ? (
                  <div className="glass-card" style={{
                    padding:'4rem 2rem', textAlign:'center',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:'1.25rem',
                  }}>
                    <div style={{
                      padding:'1.25rem', borderRadius:'50%',
                      background:'rgba(79,70,229,0.1)', border:'1px solid rgba(79,70,229,0.15)',
                    }}>
                      <Wallet style={{width:'2.5rem', height:'2.5rem', color:'#818cf8'}} />
                    </div>
                    <div>
                      <h3 style={{fontSize:'1.25rem', fontWeight:700, marginBottom:'0.5rem'}}>
                        Wallet Not Connected
                      </h3>
                      <p style={{color:'#94a3b8', maxWidth:'22rem', margin:'0 auto', lineHeight:1.7}}>
                        Connect your Freighter wallet to view your verifiable academic credentials and manage on-chain tokens.
                      </p>
                    </div>
                    <div style={{display:'flex', gap:'0.5rem', justifyContent:'center', marginTop:'0.5rem'}}>
                      <button 
                        onClick={handleConnect}
                        style={{
                          background:'linear-gradient(135deg, #4f46e5, #4338ca)',
                          color:'white', border:'none', borderRadius:'0.75rem',
                          padding:'0.75rem 1.5rem', cursor:'pointer',
                          fontSize:'0.75rem', fontWeight:700,
                        }}
                      >
                        Connect Now
                      </button>
                      <button 
                        onClick={handleMockConnect}
                        style={{
                          background:'rgba(255,255,255,0.05)',
                          color:'#cbd5e1', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'0.75rem',
                          padding:'0.75rem 1.25rem', cursor:'pointer',
                          fontSize:'0.75rem', fontWeight:700,
                        }}
                      >
                        Dev Mock
                      </button>
                    </div>
                  </div>
                ) : (
                  <CredentialsList tokens={accountData.meritTokens} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Credentials ─── */}
        {activeTab === 'credentials' && address && (
          <div className="animate-fade">
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'flex-end',
              marginBottom:'1.5rem', paddingBottom:'0.75rem',
              borderBottom:'1px solid rgba(255,255,255,0.05)',
            }}>
              <div>
                <h2 style={{fontSize:'1.5rem', fontWeight:800, letterSpacing:'-0.02em'}}>All Credentials</h2>
                <p style={{
                  fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.12em', color:'#64748b', marginTop:'4px',
                }}>
                  {credCount} credential{credCount !== 1 ? 's' : ''} on the Stellar network
                </p>
              </div>
            </div>
            <CredentialsList tokens={accountData.meritTokens} />
          </div>
        )}

        {/* ─── TAB: History ─── */}
        {activeTab === 'history' && address && (
          <div className="animate-fade">
            <div style={{
              marginBottom:'1.5rem', paddingBottom:'0.75rem',
              borderBottom:'1px solid rgba(255,255,255,0.05)',
            }}>
              <h2 style={{fontSize:'1.5rem', fontWeight:800, letterSpacing:'-0.02em'}}>Transaction History</h2>
              <p style={{
                fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.12em', color:'#64748b', marginTop:'4px',
              }}>
                Recent on-chain payments and operations
              </p>
            </div>
            <TransactionHistory address={address} />
          </div>
        )}

        {/* ─── TAB: Verify ─── */}
        {activeTab === 'verify' && address && (
          <div className="animate-fade" style={{
            display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:'1.5rem',
          }}>
            <div>
              <div style={{
                marginBottom:'1.5rem', paddingBottom:'0.75rem',
                borderBottom:'1px solid rgba(255,255,255,0.05)',
              }}>
                <h2 style={{fontSize:'1.5rem', fontWeight:800, letterSpacing:'-0.02em'}}>Credential Verification</h2>
                <p style={{
                  fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.12em', color:'#64748b', marginTop:'4px',
                }}>
                  Verify any academic credential on-chain
                </p>
              </div>
              <VerifyCredential />
            </div>
            <div>
              <div style={{
                marginBottom:'1.5rem', paddingBottom:'0.75rem',
                borderBottom:'1px solid rgba(255,255,255,0.05)',
              }}>
                <h2 style={{fontSize:'1.5rem', fontWeight:800, letterSpacing:'-0.02em'}}>Issue New Credential</h2>
                <p style={{
                  fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.12em', color:'#64748b', marginTop:'4px',
                }}>
                  Claim credentials from the university registry
                </p>
              </div>
              <IssueCredential userAddress={address} onComplete={() => refreshAccountData(address)} />
            </div>
          </div>
        )}
      </main>

      {/* ═══════ NETWORK STATUS FOOTER ═══════ */}
      <NetworkStatus />
    </div>
  );
};

export default Dashboard;
