import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminSettingsProvider } from '@/contexts/AdminSettingsContext';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import AccessPage from '@/components/AccessPage';
import Dashboard from '@/components/Dashboard';
import ClientesArtekPage from '@/components/ClientesArtekPage';
import AdminPage from '@/components/AdminPage';
import { logError } from '@/lib/ErrorLogger';

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg font-semibold">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <AccessPage />;
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/clientes-artek" element={<ClientesArtekPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {

  useEffect(() => {
    const handleError = (event) => {
      logError(event.message || 'Unknown error', 'APP_ERROR', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.message : null
      });
    };

    const handleRejection = (event) => {
      logError('Unhandled Promise Rejection', 'APP_ERROR', {
        reason: event.reason ? (event.reason.message || event.reason) : 'Unknown reason'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <AdminSettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </AdminSettingsProvider>
  );
}

export default App;