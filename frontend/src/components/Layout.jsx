import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { section: 'CONTROL', roles: ['ADMIN'], items: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/leads', icon: '💌', label: 'Leads' },
    { to: '/users', icon: '👥', label: 'Usuarios' },
    { to: '/content', icon: '🚀', label: 'Contenido' },
    { to: '/channels', icon: '📡', label: 'Canales' },
    { to: '/payments', icon: '💳', label: 'Pagos' },
    { to: '/codes', icon: '🔑', label: 'Códigos' },
  ]},
  { section: 'NAVEGACIÓN', roles: ['ADMIN','SINAPSIS','GUEST'], items: [
    { to: '/announcements', icon: '📢', label: 'anuncios', roles: ['ADMIN','SINAPSIS'] },
    { to: '/freebox', icon: '📺', label: 'freebox' },
    { to: '/pricing', icon: '💎', label: 'ingresar', roles: ['GUEST'] },
  ]},
  { section: 'CAMPUS', roles: ['ADMIN','SINAPSIS'], items: [
    { to: '/campus', icon: '🚀', label: 'mi-campus' },
    { to: '/leaderboard', icon: '🏆', label: 'leaderboard' },
  ]},
  { section: 'CUENTA', roles: ['ADMIN','SINAPSIS'], items: [
    { to: '/profile', icon: '👤', label: 'Perfil' },
  ]},
];

export default function Layout({ children }) {
  const { user, logout, roleInfo, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="nx-app">
      {/* Mobile overlay */}
      {mobileOpen && <div className="nx-sidebar-overlay show" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <nav className={`nx-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="nx-logo">
          <span style={{ fontSize: 16 }}>🧠</span>
          <span className="nx-logo-text"><span className="nx-logo-n">NEURAL</span> <span className="nx-logo-b">BOX</span></span>
        </div>

        {NAV.map(section => {
          if (!section.roles.includes(user.role)) return null;
          const items = section.items.filter(it => !it.roles || it.roles.includes(user.role));
          if (!items.length) return null;
          return (
            <div key={section.section} className="nx-nav-section">
              <div className="nx-nav-label">{section.section}</div>
              {items.map(it => (
                <NavLink
                  key={it.to} to={it.to}
                  className={({ isActive }) => `nx-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="nx-nav-icon">{it.icon}</span>{it.label}
                </NavLink>
              ))}
            </div>
          );
        })}

        <div className="nx-sidebar-footer">
          <div className="nx-sidebar-logout" onClick={handleLogout}>🚪 Cerrar Sesión</div>
          <div className="nx-user-pill">
            <div className="nx-user-pill-av">{user.avatar || '👾'}</div>
            <div>
              <div className="nx-user-pill-name">{user.name}</div>
              <div className="nx-user-pill-role" style={{ color: roleInfo.color }}>
                {roleInfo.icon} {roleInfo.name}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="nx-main">
        <header className="nx-topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="nx-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>☰</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user.role !== 'GUEST' && (
              <div className="nx-xp-mini">
                <span>👑</span>
                <div className="nx-xp-mini-bar">
                  <div className="nx-xp-mini-fill" style={{ width: `${Math.min(100, ((user.xp || 0) % 1000) / 10)}%` }} />
                </div>
              </div>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: roleInfo.color }}>
              {roleInfo.icon} {roleInfo.name}
            </span>
          </div>
        </header>
        <main className="nx-content">{children}</main>
      </div>
    </div>
  );
}
