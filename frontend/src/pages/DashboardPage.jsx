import { useApi } from '../hooks/useApi';

export default function DashboardPage() {
  const { data: stats, loading } = useApi('/admin/stats');
  const { data: payments } = useApi('/admin/payments?limit=3');
  const { data: users } = useApi('/admin/users?limit=3');

  const kpis = stats ? [
    { i: '👥', v: stats.totalUsers || 0, l: 'Usuarios' },
    { i: '⚡', v: stats.activeSinapsis || 0, l: 'Sinapsis' },
    { i: '💰', v: `$${stats.totalRevenue || 0}`, l: 'Ingresos' },
    { i: '💌', v: stats.totalLeads || 0, l: 'Leads' },
    { i: '✅', v: stats.paidLeads || 0, l: 'Pagados' },
    { i: '📚', v: stats.completedLessons || 0, l: 'Lecciones' },
  ] : [];

  return (
    <div>
      <div className="tt fi">📊 Dashboard</div>
      <div className="st fi">Vista general en tiempo real</div>
      {loading ? <div className="nx-loading-sm">Cargando...</div> : (
        <div className="nx-kpi-grid">
          {kpis.map((s, i) => (
            <div key={i} className="nx-kpi fi fi1">
              <div className="nx-kpi-icon">{s.i}</div>
              <div className="nx-kpi-value">{s.v}</div>
              <div className="nx-kpi-label">{s.l}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
        <div className="nx-card fi fi2">
          <div className="nx-section-label">💳 Pagos recientes</div>
          {(payments || []).map((p, i) => (
            <div key={i} className="nx-row-item">
              <span className="nx-row-name">{p.user?.name || p.userId}</span>
              <span className="nx-row-mono">{p.amountUSD ? `$${p.amountUSD}` : ''}</span>
            </div>
          ))}
        </div>
        <div className="nx-card fi fi2">
          <div className="nx-section-label">👥 Nuevos usuarios</div>
          {(users || []).map((u, i) => (
            <div key={i} className="nx-row-item">
              <span className="nx-row-name">{u.name}</span>
              <span className="bg bg-b">{u.role === 'ADMIN' ? 'Admin' : u.hasActiveSubscription ? 'Sinapsis' : 'Free'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
