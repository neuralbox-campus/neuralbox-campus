import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import Modal from '../components/Modal';
export default function ContentPage() {
  const { data: courses, loading, refetch } = useApi('/admin/courses');
  const [showM, setShowM] = useState(false);
  const [showL, setShowL] = useState(null);
  const [exp, setExp] = useState(null);
  const [mt, setMt] = useState('');
  const [mc, setMc] = useState('');
  const [lt, setLt] = useState('');
  const [ltp, setLtp] = useState('VIDEO');
  const [ld, setLd] = useState(10);
  const [lx, setLx] = useState(50);
  const { mutate: create } = useMutation('POST');
  const { mutate: remove } = useMutation('DELETE');

  const courseList = Array.isArray(courses) ? courses : [];
  // Build modules with courseId for creating new modules
  const allModules = courseList.flatMap(c => (c.modules || []).map(m => ({ ...m, courseId: c.id, courseTitle: c.title })));

  const addMod = async () => {
    if (!mt || !mc) return;
    await create('/admin/modules', { title: mt, courseId: mc });
    setMt(''); setMc(''); setShowM(false); refetch();
  };

  const addLes = async (modId) => {
    if (!lt) return;
    await create('/admin/lessons', { title: lt, type: ltp, duration: ld, xp: lx, moduleId: modId });
    setLt(''); setShowL(null); refetch();
  };

  return (<div><div className="nx-header-row fi"><div><div className="tt">🚀 Contenido</div><div className="st">Módulos y lecciones editables</div></div><button className="nx-btn nx-btn-accent nx-btn-sm" onClick={() => setShowM(true)}>+ Módulo</button></div>
    {allModules.map(m => (<div key={m.id} className="nx-card fi" style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setExp(exp === m.id ? null : m.id)}>
        <span style={{ fontSize: 20 }}>📦</span><div style={{ flex: 1 }}><div className="mn-n">Módulo {String(m.order || 0).padStart(2, '0')} — {m.courseTitle}</div><div className="nx-fw700">{m.title}</div><div className="mn-m">{(m.lessons || []).length} lecciones</div></div>
        <button className="nx-btn nx-btn-danger nx-btn-xs" onClick={e => { e.stopPropagation(); remove(`/admin/modules/${m.id}`).then(refetch); }}>🗑</button>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{exp === m.id ? '▾' : '▸'}</span>
      </div>
      {exp === m.id && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-main)' }}>
        {(m.lessons || []).map(l => (<div key={l.id} className="nx-lesson-row"><span>{l.type === 'VIDEO' ? '▶' : '❓'}</span><span style={{ flex: 1, fontWeight: 500 }}>{l.title}</span><span className="bg bg-b">{l.type}</span><span className="nx-mono-sm">{l.duration}m +{l.xp}XP</span><button className="nx-btn nx-btn-danger nx-btn-xs" onClick={() => remove(`/admin/lessons/${l.id}`).then(refetch)}>✕</button></div>))}
        <button className="nx-btn nx-btn-primary nx-btn-sm" style={{ marginTop: 6 }} onClick={() => setShowL(m.id)}>+ Lección</button>
      </div>}
    </div>))}
    {loading && <div className="nx-loading-sm">Cargando...</div>}
    {showM && <Modal title="Nuevo Módulo" onClose={() => setShowM(false)}>
      <div className="nx-field"><div className="nx-field-label">Curso</div>
        <select className="nx-select" value={mc} onChange={e => setMc(e.target.value)}>
          <option value="">Seleccionar curso...</option>
          {courseList.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div className="nx-field"><div className="nx-field-label">Título</div><input className="nx-input" value={mt} onChange={e => setMt(e.target.value)} /></div>
      <button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={addMod}>Crear</button>
    </Modal>}
    {showL && <Modal title="Nueva Lección" onClose={() => setShowL(null)}><div className="nx-field"><div className="nx-field-label">Título</div><input className="nx-input" value={lt} onChange={e => setLt(e.target.value)} /></div><div className="nx-field"><div className="nx-field-label">Tipo</div><select className="nx-select" value={ltp} onChange={e => setLtp(e.target.value)}><option>VIDEO</option><option>TEXT</option><option>QUIZ</option></select></div><div style={{ display: 'flex', gap: 8 }}><div className="nx-field" style={{ flex: 1 }}><div className="nx-field-label">Min</div><input className="nx-input" type="number" value={ld} onChange={e => setLd(+e.target.value)} /></div><div className="nx-field" style={{ flex: 1 }}><div className="nx-field-label">XP</div><input className="nx-input" type="number" value={lx} onChange={e => setLx(+e.target.value)} /></div></div><button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={() => addLes(showL)}>Agregar</button></Modal>}
  </div>);
}
