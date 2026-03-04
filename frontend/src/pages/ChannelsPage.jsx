import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import Modal from '../components/Modal';
export default function ChannelsPage() {
  const { data: categories, loading, refetch } = useApi('/community/categories');
  const [showCat, setShowCat] = useState(false);
  const [showCh, setShowCh] = useState(null);
  const [cn, setCn] = useState('');
  const [chn, setChn] = useState('');
  const [chi, setChi] = useState('💬');
  const { mutate: create } = useMutation('POST');
  const { mutate: remove } = useMutation('DELETE');
  const addCat = async () => { if (!cn) return; await create('/community/categories', { name: cn }); setCn(''); setShowCat(false); refetch(); };
  const addCh = async (catId) => { if (!chn) return; await create('/community/channels', { name: chn, icon: chi, categoryId: catId }); setChn(''); setShowCh(null); refetch(); };
  return (<div><div className="nx-header-row fi"><div><div className="tt">📡 Canales</div><div className="st">Categorías, canales y roles</div></div><button className="nx-btn nx-btn-accent nx-btn-sm" onClick={() => setShowCat(true)}>+ Categoría</button></div>
    {(categories || []).map(cat => (<div key={cat.id} className="nx-card fi" style={{ marginBottom: 8 }}>
      <div className="nx-header-row" style={{ marginBottom: 8 }}><span className="nx-section-label" style={{ marginBottom: 0 }}>{cat.name}</span><div style={{ display: 'flex', gap: 3 }}><button className="nx-btn nx-btn-primary nx-btn-xs" onClick={() => setShowCh(cat.id)}>+ Canal</button><button className="nx-btn nx-btn-danger nx-btn-xs" onClick={async () => { await remove(`/community/categories/${cat.id}`); refetch(); }}>✕</button></div></div>
      {(cat.channels || []).length === 0 ? <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Sin canales</div> :
      <div style={{ overflowX: 'auto' }}><table className="nx-table"><thead><tr><th></th><th>Canal</th><th>Tipo</th><th></th></tr></thead><tbody>{cat.channels.map(ch => (<tr key={ch.id}><td style={{ fontSize: 14 }}>{ch.icon}</td><td className="nx-fw600">{ch.name}</td><td><span className="bg bg-b">{ch.type || 'PUBLIC'}</span></td><td><button className="nx-btn nx-btn-danger nx-btn-xs" onClick={async () => { await remove(`/community/channels/${ch.id}`); refetch(); }}>✕</button></td></tr>))}</tbody></table></div>}
    </div>))}
    {loading && <div className="nx-loading-sm">Cargando...</div>}
    {showCat && <Modal title="Nueva Categoría" onClose={() => setShowCat(false)}><div className="nx-field"><div className="nx-field-label">Nombre</div><input className="nx-input" value={cn} onChange={e => setCn(e.target.value)} /></div><button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={addCat}>Crear</button></Modal>}
    {showCh && <Modal title="Nuevo Canal" onClose={() => setShowCh(null)}><div className="nx-field"><div className="nx-field-label">Nombre</div><input className="nx-input" value={chn} onChange={e => setChn(e.target.value)} /></div><div className="nx-field"><div className="nx-field-label">Icono</div><input className="nx-input" value={chi} onChange={e => setChi(e.target.value)} style={{ width: 60 }} /></div><button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={() => addCh(showCh)}>Crear</button></Modal>}
  </div>);
}
