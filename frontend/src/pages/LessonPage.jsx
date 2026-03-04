import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi, useMutation } from '../hooks/useApi';
export default function LessonPage() {
  const { moduleId, lessonId } = useParams();
  const { data: lesson, loading } = useApi(`/content/lessons/${lessonId}`);
  const [done, setDone] = useState(false);
  const { mutate } = useMutation('POST');
  const complete = async () => { await mutate('/progress/complete', { lessonId }); setDone(true); };
  if (loading) return <div className="nx-loading-sm">Cargando...</div>;
  return (<div style={{ maxWidth: 850 }}>
    <Link to={`/campus/${moduleId}`} style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none' }}>← Volver</Link>
    <div className="nx-player fi"><div className="nx-play-btn">▶</div></div>
    <div className="fi fi1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div><div style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>{lesson?.title}</div>
        <div className="nx-mono-sm" style={{ display: 'flex', gap: 12 }}><span>{lesson?.type}</span><span>⏱ {lesson?.duration}m</span><span style={{ color: 'var(--brand)' }}>+{lesson?.xpReward} XP</span></div></div>
      <button className={`nx-btn ${done ? 'nx-btn-ghost' : 'nx-btn-accent'} nx-btn-sm`} onClick={complete}>{done ? '✓ Completada' : 'Completar'}</button>
    </div>
    <div className="nx-card fi fi2" style={{ lineHeight: 1.7, fontSize: 14, color: 'var(--text-secondary)' }}>
      {lesson?.content || <p>Contenido de la lección aparecerá aquí.</p>}
    </div></div>);
}
