import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminModal from '@/components/AdminModal';
import { validateSession } from '@/lib/authUtils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AdminPage() {
  const [modalOpen, setModalOpen] = useState(true);
  const navigate = useNavigate();

  const handleOpenChange = (open) => {
    setModalOpen(open);
    if (!open) {
      navigate('/dashboard');
    }
  };

  const checkSession = async () => {
    const isValid = await validateSession();
    if (!isValid) {
      navigate('/');
    }
  };

  React.useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Modo Administrador</h1>
        <p className="text-slate-500 mb-6">Gestionando configuración del sistema...</p>
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>
      </div>
      
      <AdminModal open={modalOpen} onOpenChange={handleOpenChange} />
    </div>
  );
}