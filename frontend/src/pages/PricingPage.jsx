import { useAuth } from '../context/AuthContext';
export default function PricingPage() {
  const { isGuest } = useAuth();
  const plans = [
    { n: 'Mensual', p: '$21', cop: '$89,900 COP', per: '/mes', save: null, pop: false, cls: 'nx-price-mensual' },
    { n: 'Semestral', p: '$95', cop: '$399,900 COP', per: '/6 meses', save: 'Ahorra 26%', pop: true, cls: 'nx-price-semestral' },
    { n: 'Anual', p: '$155', cop: '$649,900 COP', per: '/año', save: 'Ahorra 40%', pop: false, cls: 'nx-price-anual' },
  ];
  return (<div>
    <div style={{ textAlign: 'center', marginBottom: 24 }} className="fi">
      {isGuest && <div style={{ marginBottom: 16, padding: 14, background: 'var(--brand-soft)', border: '1px solid var(--border-main)', borderRadius: 'var(--r-lg)' }}><div className="nx-section-label" style={{ color: 'var(--brand)', marginBottom: 4 }}>🪦 SIN CONEXIÓN</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Activa tu Sinapsis para acceder a todo el campus</div></div>}
      <div className="tt" style={{ fontSize: 16 }}>💎 Elige tu plan</div><div className="st" style={{ maxWidth: 400, margin: '0 auto' }}>Acceso completo al Campus IA</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }} className="fi fi1">{plans.map((p, i) => (
      <div key={i} className={`nx-price-card ${p.pop ? 'pop' : ''} ${p.cls}`}>
        {p.pop && <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-display)', fontSize: 7, fontWeight: 700, letterSpacing: 3, color: 'var(--accent-green)', background: 'var(--accent-green-soft)', padding: '2px 10px', borderRadius: 20 }}>MÁS POPULAR</div>}
        <div className="nx-section-label" style={{ marginBottom: 6, marginTop: p.pop ? 16 : 0 }}>{p.n}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>{p.p}</div>
        <div className="nx-mono-sm" style={{ marginBottom: 3 }}>{p.cop} {p.per}</div>
        {p.save ? <div className="nx-mono-sm" style={{ color: 'var(--accent-green)', marginBottom: 14 }}>{p.save}</div> : <div style={{ height: 16 }} />}
        <button className="nx-btn nx-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Elegir</button>
      </div>
    ))}</div>
    <div className="fi fi2 nx-mono-sm" style={{ textAlign: 'center', marginTop: 20 }}>💳 Tarjeta · PSE · Nequi · MercadoPago · PayPal · Crypto</div>
  </div>);
}
