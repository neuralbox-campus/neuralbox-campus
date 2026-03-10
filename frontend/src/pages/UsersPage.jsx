import { useApi } from '../hooks/useApi';
export default function UsersPage() {
  const { data: usersData, loading } = useApi('/admin/users');
  const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);
  return (<div><div className="tt fi">👥 Usuarios</div><div className="st fi">Email visible solo para admin</div>
    <div className="nx-card fi fi1" style={{ overflowX: 'auto' }}><table className="nx-table"><thead><tr><th></th><th>Username</th><th>Email</th><th>Rol</th><th>XP</th><th>Estado</th></tr></thead>
    <tbody>{users.map(u => (<tr key={u.id}><td style={{ fontSize: 16 }}>{u.avatar || '👤'}</td><td className="nx-fw600">{u.name}</td><td className="nx-mono-sm">{u.email}</td><td><span className={`bg ${u.role === 'ADMIN' ? 'bg-y' : u.subscriptions?.length > 0 ? 'bg-b' : 'bg-d'}`}>{u.role === 'ADMIN' ? 'Cuántico' : u.subscriptions?.length > 0 ? 'Sinapsis' : 'Free'}</span></td><td className="nx-mono">{u.xp || 0}</td><td><span className={`bg ${u.isActive ? 'bg-g' : 'bg-d'}`}>{u.isActive ? 'Activo' : 'Inactivo'}</span></td></tr>))}</tbody></table>
    {loading && <div className="nx-loading-sm">Cargando...</div>}</div></div>);
}
