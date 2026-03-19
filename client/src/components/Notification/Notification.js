import React, { useEffect, useState } from 'react';

const Notification = ({ message, type = 'info', onClose, duration = 4000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const colors = { success:'#1D9E75', error:'#ff2d55', info:'#00e5ff', warning:'#ffb800' };

  return (
    <div style={{
      position:'fixed', top:20, right:20, zIndex:9999,
      background:'#111827', border:`1px solid ${colors[type]}40`,
      borderLeft:`3px solid ${colors[type]}`,
      borderRadius:10, padding:'12px 18px',
      minWidth:260, maxWidth:380,
      display:'flex', alignItems:'center', gap:12,
      transition:'all 0.3s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(20px)',
      boxShadow:'0 4px 24px rgba(0,0,0,0.5)',
    }}>
      <span style={{ color: colors[type], fontSize:16 }}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
      </span>
      <span style={{ color:'#f0f4ff', fontSize:14, flex:1 }}>{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        style={{ background:'none', border:'none', color:'#8896b0', cursor:'pointer', fontSize:16, padding:0, lineHeight:1 }}>×</button>
    </div>
  );
};

export default Notification;
