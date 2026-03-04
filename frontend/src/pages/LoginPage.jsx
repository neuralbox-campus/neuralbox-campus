import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, enterAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      if (tab === 'register') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al conectar');
    } finally { setLoading(false); }
  };

  const handleGuest = () => { enterAsGuest(); navigate('/freebox'); };

  return (
    <div className="nx-auth">
      <div className="nx-auth-box fi">
        <div className="nx-auth-logo">
          <h1><span className="nx-logo-n">NEURAL</span><span className="nx-logo-b">BOX</span></h1>
          <p>Campus IA</p>
        </div>
        <div className="nx-auth-div" />

        <div className="tabs" style={{ width: '100%', marginBottom: 12, display: 'flex' }}>
          <div className={`tab ${tab === 'login' ? 'ac' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setTab('login')}>Iniciar Sesión</div>
          <div className={`tab ${tab === 'register' ? 'ac' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setTab('register')}>Registrarse</div>
        </div>

        {tab === 'register' && <input className="nx-input" placeholder="Username (único)" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 7 }} />}
        <input className="nx-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 7 }} type="email" />
        <input className="nx-input" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 12 }} type="password"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

        {error && <div style={{ color: 'var(--accent-red)', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{error}</div>}

        <button className="nx-btn nx-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 10, fontSize: 13 }} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Conectando...' : 'Entrar al Campus →'}
        </button>

        <div className="nx-auth-or"><span>○</span></div>
        <button className="nx-btn nx-btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={handleGuest}>
          🪦 Entrar como Invitado
        </button>
      </div>
    </div>
  );
}
