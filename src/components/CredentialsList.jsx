import React from 'react';
import { BadgeCheck, GraduationCap, Calendar, Verified, AlertTriangle, ExternalLink, Award, BookOpen, Star, ScrollText } from 'lucide-react';
import { CREDENTIAL_CATALOG } from '../lib/stellar';

const iconMap = {
  award: Award,
  graduation: GraduationCap,
  scroll: ScrollText,
  star: Star,
  book: BookOpen,
};

const CredentialsList = ({ tokens }) => {
  if (tokens.length === 0) {
    return (
      <div className="glass-card" style={{
        padding:'4rem 2rem', textAlign:'center',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem',
      }}>
        <div style={{
          padding:'1.25rem', borderRadius:'50%',
          background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.15)',
        }}>
          <GraduationCap style={{width:'2.5rem', height:'2.5rem', color:'#f59e0b'}} />
        </div>
        <h3 style={{fontSize:'1.25rem', fontWeight:700}}>No Credentials Found</h3>
        <p style={{color:'#94a3b8', maxWidth:'24rem', lineHeight:1.7}}>
          You haven't received any academic merit tokens yet. Use the University Registry to claim credentials, or ask an institution to issue one to your address.
        </p>
      </div>
    );
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
      {tokens.map((token, index) => {
        const catalogItem = CREDENTIAL_CATALOG.find(c => c.code === token.code);
        const color = catalogItem?.color || token.color || '#818cf8';
        const tier = catalogItem?.tier || token.tier || 'Standard';
        const credName = catalogItem?.name || token.name || token.code;
        const IconComp = iconMap[catalogItem?.icon] || GraduationCap;

        return (
          <div 
            key={`${token.code}-${index}`} 
            className="glass-card animate-fade"
            style={{
              overflow:'hidden', padding:0,
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {/* Accent Bar */}
            <div style={{
              height:'3px', width:'100%',
              background:`linear-gradient(to right, ${color}, ${color}44, transparent)`,
            }} />
            
            <div style={{
              padding:'1.75rem 2rem',
              display:'flex', justifyContent:'space-between', alignItems:'flex-start',
              gap:'1.5rem', flexWrap:'wrap',
            }}>
              {/* Left: Icon + Details */}
              <div style={{display:'flex', gap:'1.25rem', flex:1, minWidth:'280px'}}>
                <div style={{position:'relative', flexShrink:0}}>
                  <div style={{
                    padding:'1.1rem', borderRadius:'1rem',
                    background:`${color}12`, border:`1px solid ${color}25`,
                    boxShadow:`0 0 24px ${color}10`,
                  }}>
                    <IconComp style={{width:'1.75rem', height:'1.75rem', color}} />
                  </div>
                  {token.verified && (
                    <div style={{
                      position:'absolute', top:'-6px', right:'-6px',
                      padding:'4px', borderRadius:'50%', background:'#22c55e',
                      boxShadow:'0 0 10px rgba(34,197,94,0.4)',
                    }}>
                      <BadgeCheck style={{width:'0.8rem', height:'0.8rem', color:'white'}} />
                    </div>
                  )}
                </div>

                <div>
                  <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.4rem', flexWrap:'wrap'}}>
                    <h3 style={{fontSize:'1.35rem', fontWeight:800, letterSpacing:'-0.02em'}}>{credName}</h3>
                    <span style={{
                      fontSize:'0.55rem', fontWeight:800, padding:'3px 10px',
                      borderRadius:'6px', textTransform:'uppercase', letterSpacing:'0.1em',
                      background:`${color}15`, color, border:`1px solid ${color}25`,
                    }}>
                      {tier}
                    </span>
                    {!token.verified && (
                      <span style={{
                        display:'flex', alignItems:'center', gap:'4px',
                        fontSize:'0.55rem', fontWeight:800, padding:'3px 10px',
                        borderRadius:'6px', textTransform:'uppercase', letterSpacing:'0.1em',
                        background:'rgba(245,158,11,0.1)', color:'#f59e0b',
                        border:'1px solid rgba(245,158,11,0.2)',
                      }}>
                        <AlertTriangle style={{width:'0.7rem', height:'0.7rem'}} /> Unverified
                      </span>
                    )}
                  </div>
                  
                  <p style={{color:'#94a3b8', fontSize:'0.8rem', fontWeight:500, marginBottom:'1rem'}}>
                    Issuer: <span style={{
                      fontFamily:"'JetBrains Mono', monospace", fontSize:'0.7rem',
                      color:'rgba(129,140,248,0.8)', padding:'2px 8px', borderRadius:'4px',
                      background:'rgba(79,70,229,0.05)',
                    }}>{token.issuer.slice(0, 12)}...{token.issuer.slice(-12)}</span>
                  </p>
                  
                  {/* Meta Tags */}
                  <div style={{display:'flex', flexWrap:'wrap', gap:'0.75rem'}}>
                    <div style={{
                      display:'flex', alignItems:'center', gap:'6px',
                      fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.12em', color:'#475569',
                    }}>
                      <Calendar style={{width:'0.7rem', height:'0.7rem', color:`${color}88`}} />
                      Issued {new Date().toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'})}
                    </div>
                    <div style={{
                      display:'flex', alignItems:'center', gap:'6px',
                      fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.12em', color:'#475569',
                    }}>
                      <Verified style={{width:'0.7rem', height:'0.7rem', color:'rgba(34,197,94,0.6)'}} />
                      Asset Protocol v1.2
                    </div>
                    <div style={{
                      display:'flex', alignItems:'center', gap:'6px',
                      fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'0.12em', color:'#475569',
                    }}>
                      <span style={{
                        width:'6px', height:'6px', borderRadius:'50%',
                        background: token.verified ? '#22c55e' : '#f59e0b',
                        boxShadow: `0 0 6px ${token.verified ? 'rgba(34,197,94,0.5)' : 'rgba(245,158,11,0.5)'}`,
                      }} />
                      {token.verified ? 'Trusted Authority' : 'Pending Review'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Balance + Actions */}
              <div style={{
                display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.75rem',
                flexShrink:0,
              }}>
                <div style={{
                  fontSize:'1.5rem', fontWeight:900, padding:'0.5rem 1.25rem',
                  borderRadius:'0.75rem', background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  fontFamily:"'JetBrains Mono', monospace",
                }}>
                  <span style={{color:'#94a3b8', fontSize:'0.7rem', fontWeight:700, marginRight:'4px'}}>BAL</span>
                  <span style={{color}}>{parseFloat(token.balance).toFixed(0)}</span>
                </div>
                <button style={{
                  display:'flex', alignItems:'center', gap:'6px',
                  fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.12em', color:'#475569', background:'none',
                  border:'none', padding:'4px 8px', cursor:'pointer', boxShadow:'none',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                >
                  Blockchain Proof <ExternalLink style={{width:'0.7rem', height:'0.7rem'}} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding:'0.75rem 2rem', 
              background:'rgba(255,255,255,0.015)',
              borderTop:'1px solid rgba(255,255,255,0.04)',
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <span style={{
                fontSize:'0.6rem', fontFamily:"'JetBrains Mono', monospace", color:'#334155',
              }}>
                TXID: 0x{Math.random().toString(16).slice(2, 10)}...{Math.random().toString(16).slice(2, 10)}
              </span>
              <span style={{
                fontSize:'0.55rem', fontFamily:"'JetBrains Mono', monospace", color:'#334155',
                textTransform:'uppercase', letterSpacing:'0.1em',
              }}>
                Signed by University Registry
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CredentialsList;
