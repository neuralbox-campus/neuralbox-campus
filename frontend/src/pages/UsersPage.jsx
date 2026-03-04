import { useApi } from '../hooks/useApi';
export default function UsersPage() {
  const { data: users, loading } = useApi('/admin/users');
  return (<div><div className="tt fi">👥 Usuarios</div><div className="st fi">Email visible solo para admin</div>
    <div className="nx-card fi fi1" style={{ overflowX: 'auto' }}><table className="nx-table"><thead><tr><th></th><th>Username</th><th>Email</th><th>Rol</th><th>XP</th><th>Estado</th></tr></thead>
    <tbody>{(users || []).map(u => (<tr key={u.id}><td style={{ fontSize: 16 }}>{u.avatar || '👤'}</td><td className="nx-fw600">{u.name}</td><td className="nx-mono-sm">{u.email}</td><td><span className={`bg ${u.role === 'ADMIN' ? 'bg-y' : 'bg-b'}`}>{u.role === 'ADMIN' ? 'Cuántico' : 'Sinapsis'}</span></td><td className="nx-mono">{u.xp || 0}</td><td><span className="bg bg-g">Activo</span></td></tr>))}</tbody></table>
    {loading && <div className="nx-loading-sm">Cargando...</div>}</div></div>);
}
