import HomeSection from '@/components/HomeSection';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { Users, FileText, DollarSign, Receipt, Bell, Settings, Menu, ChevronRight, Briefcase, PieChart, Truck, FolderOpen, FileCheck, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ClientesSection from '@/components/ClientesSection';
import OperacionesSection from '@/components/OperacionesSection';
import PagosSection from '@/components/PagosSection';
import FacturasSection from '@/components/FacturasSection';
import VentasSection from '@/components/VentasSection';
import FinanzasSection from '@/components/FinanzasSection';
import ProveedoresSection from '@/components/ProveedoresSection';
import FileManager from '@/components/FileManager';
import ChecklistSupabaseArchivos from '@/components/ChecklistSupabaseArchivos';
import AdminModal from '@/components/AdminModal';
import { usePermissions } from "@/hooks/usePermissions";
import AdminRolesPanel from "@/components/AdminRolesPanel";
import UsersSection from '@/components/UsersSection';

function Dashboard() {
  useEffect(() => {

    const openOperacionFiles = (event) => {

      const operacion = event.detail;

      setActiveView('archivos');

      setTimeout(() => {

        window.dispatchEvent(
          new CustomEvent('openFileManagerOperacion', {
            detail: operacion
          })
        );

      }, 300);

    };

    window.addEventListener('openOperacionFiles', openOperacionFiles);

    return () => {
      window.removeEventListener('openOperacionFiles', openOperacionFiles);
    };

  }, []);
  const [activeView, setActiveView] = useState('inicio');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { can, loading } = usePermissions();

  if (loading) return null;

  const menuItems = [

    {
      id: "inicio",
      label: "Inicio",
      icon: LayoutDashboard,  // agregar a imports de lucide-react
      description: "Panel ejecutivo"
    },


    can("operaciones.read") && {
      id: "operaciones",
      label: "Operaciones",
      icon: FileText,
      description: "Logística y seguimiento"
    },

    can("pagos.read") && {
      id: "pagos",
      label: "Pagos",
      icon: DollarSign
    },

    can("facturas.read") && {
      id: "facturas",
      label: "Facturación",
      icon: Receipt
    },

    can("clientes.read") && {
      id: "clientes",
      label: "Clientes",
      icon: Users
    },

    can("proveedores.read") && {
      id: "proveedores",
      label: "Proveedores",
      icon: Users
    },

    can("users.read") && {
      id: "users",
      label: "Usuarios",
      icon: Users
    },

    can("roles.read") && {
      id: "roles",
      label: "Permisos",
      icon: Settings,
      description: "Gestión de roles y permisos"
    },

    can("archivos.read") && {
      id: "archivos",
      label: "Gestión de Archivos",
      icon: FolderOpen,
    }

  ].filter(Boolean);

  const activeItem = menuItems.find(item => item.id === activeView);

  return (
    <>
      <Helmet>
        <title>Dashboard - Artek Engine</title>
        <meta name="description" content="Panel de administración Artek" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">

        {/* Sidebar Navigation */}
        <aside className={`
            fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transition-all duration-300 ease-in-out shadow-2xl
            ${isSidebarOpen ? 'w-64' : 'w-20'} 
            flex flex-col
          `}>
          {/* Logo Area */}
          <div className="h-20 flex items-center justify-center border-b border-slate-800/50 p-4">
            <div className="flex items-center gap-3 cursor-pointer w-full justify-center" onClick={() => navigate('/')}>
              <div className={`bg-white rounded-lg p-2 transition-all duration-300 ${isSidebarOpen ? 'w-full' : 'w-14 h-14'} flex items-center justify-center`}>
                <img
                  src="https://horizons-cdn.hostinger.com/41a8ed2d-afc3-4af9-bf7f-944ec0ca7fd8/logo-artek-horizontal-2025-k3n8J.png"
                  alt="Artek Logo"
                  className={`object-contain transition-all duration-300 ${isSidebarOpen ? 'h-12 w-auto' : 'h-10 w-10'}`}
                />
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${activeView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-medium text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isSidebarOpen && activeView === item.id && (
                  <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
            ))}
          </nav>

          {/* User Profile Summary */}
          <div className="p-4 border-t border-slate-800/50">
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold border border-slate-600 uppercase">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>

                {isSidebarOpen && (
                  <div className="text-left overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`
            flex-1 transition-all duration-300 ease-in-out flex flex-col h-screen overflow-hidden
            ${isSidebarOpen ? 'ml-64' : 'ml-20'}
          `}>
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden md:flex items-center text-sm text-slate-500 gap-2">
                <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/')}>Inicio</span>
                <ChevronRight className="w-4 h-4" />
                <span className="font-semibold text-slate-800">{activeItem?.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAdminModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                title="Configuración Admin"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 relative transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
            </div>
          </header>

          {/* Dynamic Content */}
          <div className="flex-1 overflow-auto p-6 scroll-smooth">
            <div className="max-w-7xl mx-auto space-y-6">

              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{activeItem?.label}</h1>
                  <p className="text-slate-500 text-sm mt-1">{activeItem?.description}</p>
                </div>
              </div>

              {/* View Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-[calc(100vh-200px)]"
                >
                  {activeView === 'clientes' && <ClientesSection />}
                  {activeView === 'operaciones' && <OperacionesSection />}
                  {activeView === 'pagos' && <PagosSection />}
                  {activeView === 'facturas' && <FacturasSection />}
                  {activeView === 'ventas' && <VentasSection />}
                  {activeView === 'finanzas' && <FinanzasSection />}
                  {activeView === 'proveedores' && <ProveedoresSection />}
                  {activeView === 'archivos' && <FileManager />}
                  {activeView === 'checklist-files' && <ChecklistSupabaseArchivos />}
                  {activeView === "roles" && <AdminRolesPanel />}
                  {activeView === 'users' && <UsersSection />}
                  {activeView === 'inicio' && <HomeSection />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        <AdminModal open={adminModalOpen} onOpenChange={setAdminModalOpen} />
        <Toaster />
      </div>
    </>
  );
}

export default Dashboard;
