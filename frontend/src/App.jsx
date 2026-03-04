import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import UsersPage from './pages/UsersPage';
import ContentPage from './pages/ContentPage';
import ChannelsPage from './pages/ChannelsPage';
import PaymentsPage from './pages/PaymentsPage';
import CodesPage from './pages/CodesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import FreeboxPage from './pages/FreeboxPage';
import CampusPage from './pages/CampusPage';
import ModulePage from './pages/ModulePage';
import LessonPage from './pages/LessonPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="nx-loading">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function GuestRedirect() {
  const { user, isGuest } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (isGuest) return <Navigate to="/freebox" />;
  return <Navigate to="/dashboard" />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="nx-loading"><span>🧠</span> Cargando NeuralBox...</div>;
  if (!user) return <Routes><Route path="*" element={<LoginPage />} /></Routes>;

  return (
    <Layout>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<GuestRedirect />} />
        <Route path="/login" element={<Navigate to="/" />} />

        {/* Admin only */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['ADMIN']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute roles={['ADMIN']}><LeadsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute roles={['ADMIN']}><ContentPage /></ProtectedRoute>} />
        <Route path="/channels" element={<ProtectedRoute roles={['ADMIN']}><ChannelsPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute roles={['ADMIN']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/codes" element={<ProtectedRoute roles={['ADMIN']}><CodesPage /></ProtectedRoute>} />

        {/* Admin + Sinapsis */}
        <Route path="/announcements" element={<ProtectedRoute roles={['ADMIN','SINAPSIS']}><AnnouncementsPage /></ProtectedRoute>} />
        <Route path="/campus" element={<ProtectedRoute roles={['ADMIN','SINAPSIS']}><CampusPage /></ProtectedRoute>} />
        <Route path="/campus/:moduleId" element={<ProtectedRoute roles={['ADMIN','SINAPSIS']}><ModulePage /></ProtectedRoute>} />
        <Route path="/campus/:moduleId/:lessonId" element={<ProtectedRoute roles={['ADMIN','SINAPSIS']}><LessonPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute roles={['ADMIN','SINAPSIS']}><LeaderboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={['ADMIN','SINAPSIS']}><ProfilePage /></ProtectedRoute>} />

        {/* Everyone */}
        <Route path="/freebox" element={<ProtectedRoute roles={['ADMIN','SINAPSIS','GUEST']}><FreeboxPage /></ProtectedRoute>} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
