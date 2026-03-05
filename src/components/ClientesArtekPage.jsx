import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  Search,
  Ship,
  Plane,
  Truck,
  Calendar,
  MapPin,
  ChevronRight,
  Folder,
  TrendingUp,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TrackingDetailDialog from '@/components/TrackingDetailDialog';
import DocumentManagerDialog from '@/components/DocumentManagerDialog';
import { useToast } from '@/components/ui/use-toast';

const ClientesArtekPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [operaciones, setOperaciones] = useState([]);

  // Exchange Rate State
  const [exchangeRates, setExchangeRates] = useState({ usd: null, eur: null });
  const [loadingRates, setLoadingRates] = useState(true);

  // Modal states
  const [selectedOperacion, setSelectedOperacion] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [selectedOpForDocs, setSelectedOpForDocs] = useState(null);

  const { toast } = useToast();

  useEffect(() => {
    // Load operations from localStorage
    const storedOps = localStorage.getItem('artek_operaciones');
    if (storedOps) {
      setOperaciones(JSON.parse(storedOps));
    }

    // Fetch Exchange Rates
    const fetchRates = async () => {
      try {
        setLoadingRates(true);
        // Using Frankfurter API as a reliable open source for exchange rates
        const [usdRes, eurRes] = await Promise.all([
          fetch('https://api.frankfurter.app/latest?from=USD&to=MXN'),
          fetch('https://api.frankfurter.app/latest?from=EUR&to=MXN')
        ]);

        if (!usdRes.ok || !eurRes.ok) throw new Error('Error fetching rates');

        const usdData = await usdRes.json();
        const eurData = await eurRes.json();

        // Adding 0.18 spread as requested
        setExchangeRates({
          usd: (usdData.rates.MXN + 0.18).toFixed(2),
          eur: (eurData.rates.MXN + 0.18).toFixed(2)
        });
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
        // Fallback for visual continuity if API fails
        setExchangeRates({ usd: '19.85', eur: '21.45' });
      } finally {
        setLoadingRates(false);
      }
    };

    fetchRates();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRates, 300000);
    return () => clearInterval(interval);

  }, []);

  const handleUpdateOperacion = (updatedOp) => {
    const newOps = operaciones.map(op => op.id === updatedOp.id ? updatedOp : op);
    setOperaciones(newOps);
    localStorage.setItem('artek_operaciones', JSON.stringify(newOps));

    if (selectedOperacion && selectedOperacion.id === updatedOp.id) setSelectedOperacion(updatedOp);
    if (selectedOpForDocs && selectedOpForDocs.id === updatedOp.id) setSelectedOpForDocs(updatedOp);

    toast({
      title: "Actualización Exitosa",
      description: "Los cambios han sido guardados."
    });
  };

  const filteredOperaciones = operaciones.filter(op =>
  (op.referencia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.mbl?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTypeIcon = (type) => {
    switch (type) {
      case 'A': return <Plane className="w-5 h-5" />;
      case 'T': return <Truck className="w-5 h-5" />;
      default: return <Ship className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'En Proceso': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Cancelado': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Check if it's yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  return (
    <>
      <Helmet>
        <title>Portal Clientes - Artek Engine</title>
        <meta name="description" content="Portal exclusivo para clientes Artek" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col">

        {/* Exchange Rate Ticker */}
        <div className="bg-slate-900 text-slate-300 text-xs py-2 text-center border-b border-slate-800 relative z-[60]">
          <div className="flex items-center justify-center gap-6 animate-in fade-in slide-in-from-top-2 duration-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-slate-400 uppercase tracking-wide hidden sm:inline">Tipo de Cambio Hoy</span>
            </div>
            <div className="flex items-center gap-4">
              {loadingRates ? (
                <span className="flex items-center gap-2 text-slate-500">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Actualizando...
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 font-mono bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                    <span className="text-white font-bold">USD</span>
                    <span className="text-emerald-400 font-bold">${exchangeRates.usd}</span>
                    <span className="text-[9px] text-slate-500 uppercase">MXN</span>
                  </span>
                  <span className="hidden sm:block w-px h-3 bg-slate-700"></span>
                  <span className="flex items-center gap-1.5 font-mono bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                    <span className="text-white font-bold">EUR</span>
                    <span className="text-blue-400 font-bold">${exchangeRates.eur}</span>
                    <span className="text-[9px] text-slate-500 uppercase">MXN</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-8 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <img
                  src="https://horizons-cdn.hostinger.com/41a8ed2d-afc3-4af9-bf7f-944ec0ca7fd8/a7e66a672c3f7f5362c9a70052cd8256.png"
                  alt="Artek Logistic"
                  className="h-10 w-auto object-contain"
                />
                <span className="font-bold text-slate-400 text-sm ml-2 border-l border-slate-300 pl-3">Portal Clientes</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">

            {/* Search Hero */}
            <div className="mb-12 text-center max-w-2xl mx-auto pt-4">
              <h1 className="text-3xl font-bold text-slate-900 mb-4">Rastreo de Cargas</h1>
              <p className="text-slate-600 mb-8">Consulte el estado de sus embarques en tiempo real ingresando su referencia.</p>

              <div className="bg-white p-2 rounded-2xl shadow-lg shadow-slate-200 border border-slate-100 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por referencia (ej. AR160M)..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
                <Button className="h-auto px-6 bg-blue-600 hover:bg-blue-700 rounded-xl">
                  Buscar
                </Button>
              </div>
            </div>

            {/* Results Grid */}
            {searchTerm && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredOperaciones.length > 0 ? (
                    filteredOperaciones.map((op) => (
                      <motion.div
                        key={op.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all group relative overflow-hidden flex flex-col"
                      >
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                          {getTypeIcon(op.tipoOperacion)}
                        </div>

                        <div className="flex justify-between items-start mb-4 cursor-pointer" onClick={() => { setSelectedOperacion(op); setDetailOpen(true); }}>
                          <div>
                            <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-2">
                              {op.referencia}
                            </span>
                            <h3 className="font-semibold text-slate-900 line-clamp-1">{op.cliente}</h3>
                          </div>
                          <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(op.status)}`}>
                            {op.status}
                          </div>
                        </div>

                        <div className="space-y-3 cursor-pointer" onClick={() => { setSelectedOperacion(op); setDetailOpen(true); }}>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="truncate max-w-[100px]">{op.origen}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                            <div className="flex items-center gap-2 text-slate-600 justify-end">
                              <span className="truncate max-w-[100px] text-right">{op.destino}</span>
                              <MapPin className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                            <div>
                              <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> ETD
                              </p>
                              <p className="text-sm font-medium text-slate-700">{formatDate(op.etd)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5 flex items-center justify-end gap-1">
                                ETA <Calendar className="w-3 h-3" />
                              </p>
                              <p className="text-sm font-medium text-slate-700">{formatDate(op.eta)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600 h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOpForDocs(op);
                              setDocsOpen(true);
                            }}
                          >
                            <Folder className="w-3.5 h-3.5 mr-2" />
                            Documentos
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOperacion(op);
                              setDetailOpen(true);
                            }}
                          >
                            Ver Detalles
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No se encontraron embarques con esa referencia.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {!searchTerm && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left max-w-5xl mx-auto">
                {[
                  { title: 'Visibilidad Total', desc: 'Monitoreo 24/7 de sus operaciones logísticas.', icon: Search },
                  { title: 'Documentación', desc: 'Acceso digital a facturas, pedimentos y guías.', icon: Package },
                  { title: 'Soporte Directo', desc: 'Canal de comunicación directo con su ejecutivo.', icon: UserCheck }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-slate-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </main>
      </div>

      <TrackingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        operacion={selectedOperacion}
        onUpdate={handleUpdateOperacion}
      />

      <DocumentManagerDialog
        open={docsOpen}
        onOpenChange={setDocsOpen}
        operacion={selectedOpForDocs}
        onUpdate={handleUpdateOperacion}
      />
    </>
  );
};

export default ClientesArtekPage;
