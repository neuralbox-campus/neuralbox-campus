import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import Modal from '../components/Modal';

const TYPE_LABELS = {
  ADMIN: { label: 'CONTROL', icon: '🔒', color: 'bg-y' },
  PUBLIC: { label: 'COMUNIDAD', icon: '💬', color: 'bg-b' },
  FREEBOX: { label: 'ABIERTO', icon: '📺', color: 'bg-g' },
};

export default function ChannelsPage() {
  const { data: channels, loading, refetch } = useApi('/admin/channels');
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [cn, setCn] = useState('');
  const [cs, setCs] = useState('');
  const [ci, setCi] = useState('💬');
  const [ct, setCt] = useState('PUBLIC');
  const [cd, setCd] = useState('');
  const [co, setCo] = useState(0);
  const { mutate: create } = useMutation('POST');
  const { mutate: doUpdate } = useMutation('PUT');
  const { mutate: remove } = useMutation('DELETE');

  const channelList = Array.isArray(channels) ? channels : [];

  // Group by type
  const grouped = {};
  channelList.forEach(ch => {
    const t = ch.type || 'PUBLIC';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(ch);
  });

  const resetForm = () => { setCn(''); setCs(''); setCi('💬'); setCt('PUBLIC'); setCd(''); setCo(0); };

  const addCh = async () => {
    if (!cn) return;
    const slug = cs || cn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await create('/admin/channels', { name: cn, slug, icon: ci, type: ct, description: cd || undefined, order: co });
    resetForm(); setShow(false); refetch();
  };

  const openEdit = (ch) => {
    setCn(ch.name); setCs(ch.slug); setCi(ch.icon || '💬'); setCt(ch.type || 'PUBLIC');
    setCd(ch.description || ''); setCo(ch.order || 0); setEdit(ch);
  };

  const saveCh = async () => {
    if (!edit || !cn) return;
    const slug = cs || cn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await doUpdate(`/admin/channels/${edit.id}`, { name: cn, slug, icon: ci, type: ct, description: cd || undefined, order: co });
    resetForm(); setEdit(null); refetch();
  };

  return (<div>
    <div className="nx-header-row fi">
      <div><div className="tt">📡 Canales</div><div className="st">Gestión de canales estilo Discord</div></div>
      <button className="nx-btn nx-btn-accent nx-btn-sm" onClick={() => { resetForm(); setShow(true); }}>+ Canal</button>
    </div>

    {['ADMIN', 'PUBLIC', 'FREEBOX'].map(type => {
      const info = TYPE_LABELS[type];
      const items = grouped[type] || [];
      if (items.length === 0 && type !== 'ADMIN') return null;
      return (
        <div key={type} className="nx-card fi" style={{ marginBottom: 10 }}>
          <div className="nx-header-row" style={{ marginBottom: 8 }}>
            <span className="nx-section-label" style={{ marginBottom: 0 }}>{info.icon} {info.label}</span>
            <span className={`bg ${info.color}`} style={{ fontSize: 9 }}>{items.length} canales</span>
          </div>
          {items.length === 0 ? <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Sin canales en esta categoría</div> :
          <div style={{ overflowX: 'auto' }}><table className="nx-table"><thead><tr><th></th><th>Canal</th><th>Slug</th><th>Posts</th><th>Orden</th><th></th></tr></thead>
          <tbody>{items.map(ch => (<tr key={ch.id}>
            <td style={{ fontSize: 14 }}>{ch.icon || '💬'}</td>
            <td className="nx-fw600">{ch.name}</td>
            <td className="nx-mono-sm">{ch.slug}</td>
            <td className="nx-mono">{ch._count?.posts || 0}</td>
            <td className="nx-mono">{ch.order || 0}</td>
            <td style={{ display: 'flex', gap: 2 }}>
              <button className="nx-btn nx-btn-ghost nx-btn-xs" onClick={() => openEdit(ch)}>✏️</button>
              <button className="nx-btn nx-btn-danger nx-btn-xs" onClick={async () => { await remove(`/admin/channels/${ch.id}`); refetch(); }}>✕</button>
            </td>
          </tr>))}</tbody></table></div>}
        </div>
      );
    })}

    {loading && <div className="nx-loading-sm">Cargando...</div>}

    {/* Modal: Nuevo Canal */}
    {show && <Modal title="Nuevo Canal" onClose={() => setShow(false)}>
      <div className="nx-field"><div className="nx-field-label">Nombre</div><input className="nx-input" value={cn} onChange={e => setCn(e.target.value)} /></div>
      <div className="nx-field"><div className="nx-field-label">Slug</div><input className="nx-input" value={cs} onChange={e => setCs(e.target.value)} placeholder="auto-generado" /></div>
      <div className="nx-field"><div className="nx-field-label">Categoría</div>
        <select className="nx-select" value={ct} onChange={e => setCt(e.target.value)}>
          <option value="ADMIN">🔒 CONTROL</option>
          <option value="PUBLIC">💬 COMUNIDAD</option>
          <option value="FREEBOX">📺 ABIERTO</option>
        </select>
      </div>
      <div className="nx-field"><div className="nx-field-label">Descripción</div><input className="nx-input" value={cd} onChange={e => setCd(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="nx-field" style={{ flex: 1 }}><div className="nx-field-label">Icono</div><input className="nx-input" value={ci} onChange={e => setCi(e.target.value)} style={{ width: 60 }} /></div>
        <div className="nx-field" style={{ flex: 1 }}><div className="nx-field-label">Orden</div><input className="nx-input" type="number" value={co} onChange={e => setCo(+e.target.value)} /></div>
      </div>
      <button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={addCh}>Crear</button>
    </Modal>}

    {/* Modal: Editar Canal */}
    {edit && <Modal title="Editar Canal" onClose={() => { setEdit(null); resetForm(); }}>
      <div className="nx-field"><div className="nx-field-label">Nombre</div><input className="nx-input" value={cn} onChange={e => setCn(e.target.value)} /></div>
      <div className="nx-field"><div className="nx-field-label">Slug</div><input className="nx-input" value={cs} onChange={e => setCs(e.target.value)} /></div>
      <div className="nx-field"><div className="nx-field-label">Categoría</div>
        <select className="nx-select" value={ct} onChange={e => setCt(e.target.value)}>
          <option value="ADMIN">🔒 CONTROL</option>
          <option value="PUBLIC">💬 COMUNIDAD</option>
          <option value="FREEBOX">📺 ABIERTO</option>
        </select>
      </div>
      <div className="nx-field"><div className="nx-field-label">Descripción</div><input className="nx-input" value={cd} onChange={e => setCd(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="nx-field" style={{ flex: 1 }}><div className="nx-field-label">Icono</div><input className="nx-input" value={ci} onChange={e => setCi(e.target.value)} style={{ width: 60 }} /></div>
        <div className="nx-field" style={{ flex: 1 }}><div className="nx-field-label">Orden</div><input className="nx-input" type="number" value={co} onChange={e => setCo(+e.target.value)} /></div>
      </div>
      <button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={saveCh}>Guardar</button>
    </Modal>}
  </div>);
}
