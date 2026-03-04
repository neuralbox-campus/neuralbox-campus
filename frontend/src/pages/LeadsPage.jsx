import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import Modal from '../components/Modal';

export default function LeadsPage() {
  const { data: leads, loading, refetch } = useApi('/admin/leads');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', source: 'Landing' });
  const { mutate } = useMutation('POST');
  const { mutate: remove } = useMutation('DELETE');

  const add = async () => {
    if (!form.email) return;
    await mutate('/admin/leads', form);
    setShow(false); setForm({ email: '', name: '', source: 'Landing' }); refetch();
  };

  const del = async (id) => { await remove(`/admin/leads/${id}`); refetch(); };

  return (
    <div>
      <div className="nx-header-row fi"><div><div className="tt">💌 Leads</div><div className="st">Gestión de leads</div></div>
        <button className="nx-btn nx-btn-accent nx-btn-sm" onClick={() => setShow(true)}>+ Lead</button></div>
      <div className="nx-card fi fi1" style={{ overflowX: 'auto' }}>
        <table className="nx-table"><thead><tr><th>Nombre</th><th>Email</th><th>Fuente</th><th>Estado</th><th></th></tr></thead>
        <tbody>{(leads || []).map(l => (
          <tr key={l.id}><td className="nx-fw600">{l.name}</td><td className="nx-mono-sm">{l.email}</td><td>{l.source}</td>
          <td><span className={`bg ${l.status === 'preventa' ? 'bg-o' : 'bg-d'}`}>{l.status}</span></td>
          <td><button className="nx-btn nx-btn-danger nx-btn-xs" onClick={() => del(l.id)}>✕</button></td></tr>
        ))}</tbody></table>
        {loading && <div className="nx-loading-sm">Cargando...</div>}
      </div>
      {show && <Modal title="Agregar Lead" onClose={() => setShow(false)}>
        <div className="nx-field"><div className="nx-field-label">Email</div><input className="nx-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        <div className="nx-field"><div className="nx-field-label">Nombre</div><input className="nx-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="nx-field"><div className="nx-field-label">Fuente</div><select className="nx-select" value={form.source} onChange={e => setForm({...form, source: e.target.value})}><option>Landing</option><option>Instagram</option><option>TikTok</option><option>Referido</option></select></div>
        <button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={add}>Guardar</button>
      </Modal>}
    </div>
  );
}
