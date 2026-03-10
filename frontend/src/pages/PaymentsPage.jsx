import { useApi } from '../hooks/useApi';
export default function PaymentsPage() {
  const { data: paymentsData, loading } = useApi('/admin/payments');
  const payments = paymentsData?.payments || (Array.isArray(paymentsData) ? paymentsData : []);
  return (<div><div className="tt fi">💳 Pagos</div><div className="st fi">Transacciones</div>
    <div className="nx-card fi fi1" style={{ overflowX: 'auto' }}><table className="nx-table"><thead><tr><th>Usuario</th><th>Plan</th><th>Monto</th><th>Gateway</th><th>Fecha</th><th></th></tr></thead>
    <tbody>{payments.map(p => (<tr key={p.id}><td className="nx-fw600">{p.user?.name || '—'}</td><td><span className="bg bg-b">{p.subscription?.plan || '—'}</span></td><td className="nx-mono">${(p.amount / 100).toFixed(0)}</td><td>{p.gateway}</td><td className="nx-mono-sm">{new Date(p.createdAt).toLocaleDateString('es')}</td><td><span className={`bg ${p.status === 'COMPLETED' ? 'bg-g' : 'bg-o'}`}>{p.status === 'COMPLETED' ? '✓' : p.status}</span></td></tr>))}</tbody></table>
    {loading && <div className="nx-loading-sm">Cargando...</div>}</div></div>);
}
