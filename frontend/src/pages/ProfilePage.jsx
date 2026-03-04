import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMutation } from '../hooks/useApi';
const AVATARS = ['👾','😺','🚀','🌸','🔥','💎','🌙','⚡','👽','🧬','🐙','🌺','🧿','🦊','🌟','⭐'];
export default function ProfilePage() {
  const { user, fetchUser, roleInfo } = useAuth();
  const [av, setAv] = useState(user.avatar || '👾');
  const [nm, setNm] = useState(user.name || '');
  const [saved, setSaved] = useState(false);
  const { mutate } = useMutation('PUT');
  const save = async () => { await mutate('/auth/me', { name: nm, avatar: av }); await fetchUser(); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (<div style={{ maxWidth: 650 }}><div className="tt fi">👤 Perfil</div><div className="st fi">Tu presencia en el campus</div>
    <div className="nx-card fi fi1" style={{ textAlign: 'center', padding: 28 }}>
      <div style={{ width: 70, height: 70, borderRadius: 'var(--r-lg)', background: 'var(--bg-elevated)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 14px' }}>{av}</div>
      <input className="nx-input" value={nm} onChange={e => setNm(e.target.value)} style={{ maxWidth: 260, margin: '0 auto 3px', textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
      <div className="nx-mono-sm" style={{ color: 'var(--text-dim)', marginBottom: 12 }}>Username único</div>
      <button className="nx-btn nx-btn-primary nx-btn-sm" style={{ margin: '0 auto 16px' }} onClick={save}>{saved ? '✓ Guardado' : 'Guardar'}</button>
      <div className="nx-field-label" style={{ marginBottom: 8 }}>Elige avatar</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {AVATARS.map(a => (<div key={a} onClick={() => setAv(a)} style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: av === a ? 'var(--brand-soft)' : 'var(--bg-elevated)', border: `1px solid ${av === a ? 'var(--brand)' : 'var(--border-main)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>{a}</div>))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[{ v: user.xp || 0, l: 'XP' }, { v: `Lv.${user.level || 0}`, l: 'Nivel' }, { v: user.completedLessons || 0, l: 'Lecciones' }].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-main)', borderRadius: 'var(--r-md)', padding: '10px 16px', minWidth: 80 }}><div className="nx-kpi-value" style={{ fontSize: 14 }}>{s.v}</div><div className="nx-kpi-label">{s.l}</div></div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--border-main)', paddingTop: 12, marginTop: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border-main)', borderRadius: 'var(--r-md)', padding: '5px 12px', fontFamily: 'var(--font-display)', fontSize: 8, fontWeight: 700, letterSpacing: 2, color: roleInfo.color }}>{roleInfo.icon} {roleInfo.name}</span>
      </div>
    </div></div>);
}
