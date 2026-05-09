// filepath: src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadingProvider } from './context/LoadingContext';
import { ErrorProvider } from './context/ErrorContext';
import { LoadingBar } from './components/LoadingBar';
import { ErrorBanner } from './components/ErrorBanner';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import './index.css';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Public Route wrapper (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          <LoadingBar />
          <ErrorBanner />
          
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );
}

export default App;