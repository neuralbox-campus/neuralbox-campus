import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import Modal from '../components/Modal';
export default function ChannelsPage() {
  const { data: channels, loading, refetch } = useApi('/admin/channels');
  const [show, setShow] = useState(false);
  const [cn, setCn] = useState('');
  const [cs, setCs] = useState('');
  const [ci, setCi] = useState('💬');
  const [ct, setCt] = useState('PUBLIC');
  const { mutate: create } = useMutation('POST');
  const { mutate: remove } = useMutation('DELETE');

  const channelList = Array.isArray(channels) ? channels : [];

  const addCh = async () => {
    if (!cn) return;
    const slug = cs || cn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await create('/admin/channels', { name: cn, slug, icon: ci, type: ct });
    setCn(''); setCs(''); setCi('💬'); setCt('PUBLIC'); setShow(false); refetch();
  };

  return (<div><div className="nx-header-row fi"><div><div className="tt">📡 Canales</div><div className="st">Gestión de canales de comunidad</div></div><button className="nx-btn nx-btn-accent nx-btn-sm" onClick={() => setShow(true)}>+ Canal</button></div>
    <div className="nx-card fi fi1" style={{ overflowX: 'auto' }}>
      <table className="nx-table"><thead><tr><th></th><th>Canal</th><th>Slug</th><th>Tipo</th><th>Posts</th><th></th></tr></thead>
      <tbody>{channelList.map(ch => (<tr key={ch.id}>
        <td style={{ fontSize: 14 }}>{ch.icon || '💬'}</td>
        <td className="nx-fw600">{ch.name}</td>
        <td className="nx-mono-sm">{ch.slug}</td>
        <td><span className={`bg ${ch.type === 'FREEBOX' ? 'bg-g' : ch.type === 'ADMIN' ? 'bg-y' : 'bg-b'}`}>{ch.type}</span></td>
        <td className="nx-mono">{ch._count?.posts || 0}</td>
        <td><button className="nx-btn nx-btn-danger nx-btn-xs" onClick={async () => { await remove(`/admin/channels/${ch.id}`); refetch(); }}>✕</button></td>
      </tr>))}</tbody></table>
      {loading && <div className="nx-loading-sm">Cargando...</div>}
    </div>
    {show && <Modal title="Nuevo Canal" onClose={() => setShow(false)}>
      <div className="nx-field"><div className="nx-field-label">Nombre</div><input className="nx-input" value={cn} onChange={e => setCn(e.target.value)} /></div>
      <div className="nx-field"><div className="nx-field-label">Slug</div><input className="nx-input" value={cs} onChange={e => setCs(e.target.value)} placeholder="auto-generado" /></div>
      <div className="nx-field"><div className="nx-field-label">Tipo</div><select className="nx-select" value={ct} onChange={e => setCt(e.target.value)}><option>PUBLIC</option><option>FREEBOX</option><option>ADMIN</option></select></div>
      <div className="nx-field"><div className="nx-field-label">Icono</div><input className="nx-input" value={ci} onChange={e => setCi(e.target.value)} style={{ width: 60 }} /></div>
      <button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={addCh}>Crear</button>
    </Modal>}
  </div>);
}
