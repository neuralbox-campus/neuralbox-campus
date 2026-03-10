import { useState } from 'react';
import { useApi } from '../hooks/useApi';
export default function LeaderboardPage() {
  const [period, setPeriod] = useState('weekly');
  const { data: lb, loading } = useApi(`/progress/leaderboard?period=${period}`, [period]);
  const leaders = lb?.leaders || (Array.isArray(lb) ? lb : []);
  return (<div style={{ maxWidth: 650 }}><div className="tt fi">🏆 Leaderboard</div><div className="st fi">Top estudiantes NeuralBox</div>
    <div className="tabs fi" style={{ marginBottom: 16 }}>{['weekly','monthly','alltime'].map(x => (<div key={x} className={`tab ${period === x ? 'ac' : ''}`} onClick={() => setPeriod(x)}>{x === 'weekly' ? 'Semanal' : x === 'monthly' ? 'Mensual' : 'All-Time'}</div>))}</div>
    {loading ? <div className="nx-loading-sm">Cargando...</div> : leaders.map((l, i) => (
      <div key={l.id || i} className="nx-lb-row fi">
        <div className={`nx-lb-rank ${i === 0 ? 'g' : i === 1 ? 's' : i === 2 ? 'b' : ''}`}>{i + 1}</div>
        <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{l.avatar || '👤'}</div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{l.name} <span className="nx-mono-sm">Lv.{l.level}</span></div>
        <span style={{ fontSize: 11, color: 'var(--accent-orange)' }}><span className="flame">🔥</span>{l.streak}</span>
        <span className="nx-mono" style={{ color: 'var(--brand)' }}>{(l.xp || 0).toLocaleString()}</span>
      </div>
    ))}</div>);
}
