import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
export default function ModulePage() {
  const { moduleId } = useParams();
  const { data, loading } = useApi(`/content/modules/${moduleId}/lessons`);
  const lessons = data?.lessons || (Array.isArray(data) ? data : []);
  const moduleInfo = data?.module || {};
  if (loading) return <div className="nx-loading-sm">Cargando...</div>;
  return (<div style={{ maxWidth: 750 }}>
    <Link to="/campus" style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none' }}>← Volver</Link>
    <div className="fi" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
      <div><div className="tt" style={{ fontSize: 13 }}>{moduleInfo.title || 'Módulo'}</div><div className="mn-m">{lessons.length} lecciones</div></div>
    </div>
    <div className="nx-card fi fi1">{lessons.map(l => (
      <Link key={l.id} to={`/campus/${moduleId}/${l.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--r-md)', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}>
        <span>{l.type === 'VIDEO' ? '▶' : '❓'}</span><span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{l.title}</span>
        <span className="bg bg-b">+{l.xp} XP</span><span className="nx-mono-sm">{l.duration}m</span>
      </Link>
    ))}</div></div>);
}
