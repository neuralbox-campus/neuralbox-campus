import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import Modal from '../components/Modal';
export default function CodesPage() {
  const { data: codes, loading, refetch } = useApi('/admin/codes');
  const [show, setShow] = useState(false);
  const [gt, setGt] = useState('preventa');
  const [ge, setGe] = useState('');
  const [gd, setGd] = useState(20);
  const [gm, setGm] = useState(50);
  const [cop, setCop] = useState(null);
  const { mutate } = useMutation('POST');
  const cp = (c) => { navigator.clipboard?.writeText(c); setCop(c); setTimeout(() => setCop(null), 1500); };
  const gen = async () => { await mutate('/admin/codes', { type: gt, email: ge, discount: gd, maxUses: gm }); setGe(''); setShow(false); refetch(); };
  return (<div><div className="nx-header-row fi"><div><div className="tt">🔑 Códigos</div><div className="st">Preventa y descuentos</div></div><button className="nx-btn nx-btn-accent nx-btn-sm" onClick={() => setShow(true)}>+ Generar</button></div>
    <div className="nx-card fi fi1" style={{ overflowX: 'auto' }}><table className="nx-table"><thead><tr><th>Código</th><th>Tipo</th><th>Asignado</th><th>Usos</th><th>Estado</th></tr></thead>
    <tbody>{(codes || []).map(c => (<tr key={c.id}><td className="nx-mono-sm" style={{ color: 'var(--brand)', cursor: 'pointer' }} onClick={() => cp(c.code)}>{c.code} {cop === c.code ? '✓' : '📋'}</td><td><span className={`bg ${c.type === 'preventa' ? 'bg-o' : 'bg-b'}`}>{c.type}</span></td><td className="nx-mono-sm">{c.assignedTo || 'Público'}</td><td className="nx-mono">{c.uses}/{c.maxUses}</td><td><span className={`bg ${c.status === 'activated' ? 'bg-g' : 'bg-o'}`}>{c.status}</span></td></tr>))}</tbody></table>
    {loading && <div className="nx-loading-sm">Cargando...</div>}</div>
    {show && <Modal title="Generar Código" onClose={() => setShow(false)}>
      <div className="nx-field"><div className="nx-field-label">Tipo</div><div className="tabs" style={{ display: 'flex', width: '100%' }}><div className={`tab ${gt === 'preventa' ? 'ac' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setGt('preventa')}>Preventa</div><div className={`tab ${gt === 'descuento' ? 'ac' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setGt('descuento')}>Descuento</div></div></div>
      {gt === 'preventa' && <div className="nx-field"><div className="nx-field-label">Email</div><input className="nx-input" value={ge} onChange={e => setGe(e.target.value)} /></div>}
      {gt === 'descuento' && <><div className="nx-field"><div className="nx-field-label">%</div><input className="nx-input" type="number" value={gd} onChange={e => setGd(+e.target.value)} /></div><div className="nx-field"><div className="nx-field-label">Usos máx</div><input className="nx-input" type="number" value={gm} onChange={e => setGm(+e.target.value)} /></div></>}
      <button className="nx-btn nx-btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={gen}>Generar</button>
    </Modal>}</div>);
}
