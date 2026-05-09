import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { isAuthenticated, logout } from './api/auth';
import { LoadingProvider } from './context/LoadingContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import TopLoadingBar from './components/TopLoadingBar';
import PageTransition from './components/PageTransition';
import LoginPage from './components/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreatePage from './pages/CreatePage';
import TrajectoryPage from './pages/TrajectoryPage';

const TOAST_BASE = {
  fontFamily: '"Share Tech Mono", monospace',
  fontSize: '13px',
  background: '#010828',
  color: '#EFF4FF',
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [pathname]);
  return null;
}

function AppShell({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const handleReport = () => navigate('/create');

  return (
    <Layout>
      <Navbar onReport={handleReport} onLogout={onLogout} />
      <PageTransition>
        <Routes>
          <Route path="/dashboard"  element={<DashboardPage onReport={handleReport} />} />
          <Route path="/create"     element={<CreatePage />} />
          <Route path="/trajectory" element={<TrajectoryPage />} />
          <Route path="*"           element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </PageTransition>
      <Footer />
    </Layout>
  );
}

function AppRoutes() {
  const [authed, setAuthed] = useState<boolean>(isAuthenticated());

  useEffect(() => {
    const handler = () => {
      setAuthed(false);
      toast.error('Session expired. Please sign in again.', {
        duration: 4000,
        style: { ...TOAST_BASE, border: '1px solid rgba(255,60,60,0.35)' },
      });
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const handleLogin  = () => setAuthed(true);
  const handleLogout = () => {
    logout();
    setAuthed(false);
    toast('Signed out successfully.', {
      icon: '👋',
      style: { ...TOAST_BASE, border: '1px solid rgba(239,244,255,0.1)' },
    });
  };

  return (
    <>
      <ScrollToTop />
      <Routes>
        {authed ? (
          <>
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/*"     element={<AppShell onLogout={handleLogout} />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*"      element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LoadingProvider>
        <SocketProvider>
          <TopLoadingBar />
          <Toaster
            position="top-right"
            gutter={10}
            containerStyle={{ top: 20, right: 20 }}
            toastOptions={{
              duration: 4000,
              style: TOAST_BASE,
              success: { style: { ...TOAST_BASE, border: '1px solid rgba(111,255,0,0.35)' } },
              error:   { style: { ...TOAST_BASE, border: '1px solid rgba(255,60,60,0.35)' } },
            }}
          />
          <AppRoutes />
        </SocketProvider>
      </LoadingProvider>
    </BrowserRouter>
  );
}
