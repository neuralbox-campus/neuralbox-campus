import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
export default function CampusPage() {
  const { data: courses, loading } = useApi('/content/courses');
  const courseList = Array.isArray(courses) ? courses : [];
  const modules = courseList.flatMap(c => (c.modules || []).map(m => ({ ...m, courseTitle: c.title })));
  return (<div><div className="tt fi">🚀 Mi Campus</div><div className="st fi">Tu espacio de aprendizaje</div>
    {loading ? <div className="nx-loading-sm">Cargando...</div> :
    <div className="nx-module-grid">{modules.map(m => (
      <Link key={m.id} to={`/campus/${m.id}`} className="nx-module-card fi" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="mn-n">Módulo {String(m.order || 0).padStart(2, '0')}</div>
        <div style={{ fontSize: 26, marginBottom: 8 }}>📦</div>
        <div className="mn-t">{m.title}</div>
        <div className="mn-m">{(m.lessons || []).length} lecciones</div>
        <div className="nx-progress" style={{ marginTop: 6 }}><div className="nx-progress-fill" style={{ width: '0%' }} /></div>
      </Link>
    ))}</div>}</div>);
}
