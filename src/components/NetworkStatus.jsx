import React, { useState, useEffect } from 'react';
import { Activity, Radio, Zap, Server, Globe, TrendingUp } from 'lucide-react';
import { fetchNetworkStats } from '../lib/stellar';

const NetworkStatus = () => {
  const [stats, setStats] = useState(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await fetchNetworkStats();
      setStats(data);
    };
    load();
    const interval = setInterval(() => {
      load();
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const timeSince = (dateStr) => {
    if (!dateStr) return '—';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  if (!stats) return null;

  const statItems = [
    { label: 'Network', value: stats.network, icon: Globe, color: '#22c55e' },
    { label: 'Ledger', value: stats.ledgerSequence?.toLocaleString(), icon: Server, color: '#818cf8' },
    { label: 'Base Fee', value: `${stats.baseFee} stroops`, icon: Zap, color: '#fbbf24' },
    { label: 'Protocol', value: `v${stats.ledgerVersion}`, icon: Activity, color: '#f43f5e' },
    { label: 'Tx/Ledger', value: stats.txSuccessCount, icon: TrendingUp, color: '#06b6d4' },
    { label: 'Last Close', value: timeSince(stats.closedAt), icon: Radio, color: '#a78bfa' },
  ];

  return (
    <footer style={{
      marginTop:'3rem', padding:'1.5rem 0', 
      borderTop:'1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        maxWidth:'72rem', margin:'0 auto', padding:'0 2rem',
        display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'0.5rem',
      }}>
        {/* Live Indicator */}
        <div style={{
          display:'flex', alignItems:'center', gap:'8px',
          padding:'8px 16px', borderRadius:'8px',
          background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.12)',
          marginRight:'1rem',
        }}>
          <div style={{
            width:'6px', height:'6px', borderRadius:'50%', 
            background:'#22c55e',
            animation: pulse ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            boxShadow:'0 0 8px rgba(34,197,94,0.5)',
          }} />
          <span style={{
            fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase',
            letterSpacing:'0.15em', color:'#22c55e',
          }}>Live</span>
        </div>

        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.label}
              style={{
                display:'flex', alignItems:'center', gap:'8px',
                padding:'8px 14px', borderRadius:'8px',
                background:'rgba(255,255,255,0.03)', 
                border:'1px solid rgba(255,255,255,0.06)',
                transition:'border-color 0.3s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${item.color}33`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
            >
              <Icon style={{width:'12px', height:'12px', color: item.color}} />
              <span style={{
                fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.1em', color:'#475569',
              }}>{item.label}</span>
              <span style={{
                fontSize:'0.7rem', fontWeight:800, color:'#cbd5e1',
                fontFamily:"'JetBrains Mono', monospace",
              }}>{item.value}</span>
            </div>
          );
        })}
      </div>
    </footer>
  );
};

export default NetworkStatus;
