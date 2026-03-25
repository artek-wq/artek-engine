import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Search, Grid, List, RefreshCw, X } from 'lucide-react';
import PagoDialog from '@/components/PagoDialog';
import { PagoCardGrid, PagoCardRow } from '@/components/PagoCard';
import PagoDetailModal from '@/components/PagoDetailModal';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getDaysRemaining(fecha_limite) {
  if (!fecha_limite) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(fecha_limite + 'T00:00:00');
  return Math.ceil((limit - today) / (1000 * 60 * 60 * 24));
}

function getColorCategory(pago) {
  if (pago.status === 'Pagado') return 'blue';
  const d = getDaysRemaining(pago.fecha_limite);
  if (d > 7) return 'green';
  if (d >= 3) return 'orange';
  return 'red';
}

function fmt(num) {
  return Number(num || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

const FILTER_TABS = [
  { id: 'all', label: 'Todos', dot: 'bg-slate-400' },
  { id: 'paid', label: 'Pagados', dot: 'bg-blue-500' },
  { id: 'pending_green', label: '+7 días', dot: 'bg-green-500' },
  { id: 'pending_orange', label: '3-6 días', dot: 'bg-orange-500' },
  { id: 'pending_red', label: '-2 días', dot: 'bg-red-500' },
];

// ─────────────────────────────────────────────
// BÚSQUEDA AMPLIA — normaliza y busca en todos los campos
// ─────────────────────────────────────────────
function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesSearch(pago, q) {
  if (!q) return true;
  const n = normalize(q);
  return [
    pago.referencia,
    pago.concepto,
    pago.cliente,
    pago.proveedor,
    pago.status,
    pago.divisa,
    String(pago.monto || ''),
    pago.fecha_limite,
  ].some(v => normalize(v).includes(n));
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
function PagosSection() {
  const { toast } = useToast();

  const [pagos, setPagos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [gridCols, setGridCols] = useState(3);      // 2 o 3 columnas en grid

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPago, setEditingPago] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPago, setSelectedPago] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchPagos = useCallback(async () => {
    const { data, error } = await supabase
      .from('pagos')
      .select(`
        *,
        clientes(nombre),
        proveedores(razon_social)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error cargando pagos', description: error.message, variant: 'destructive' });
      return;
    }

    setPagos((data || []).map(p => ({
      ...p,
      cliente: p.clientes?.nombre || '',
      proveedor: p.proveedores?.razon_social || '',
    })));
  }, [toast]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  // ── CRUD ─────────────────────────────────────────────────────────
  const handleAddPago = async (pagoData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('pagos').insert([{
      referencia: pagoData.referencia,
      cliente_id: pagoData.cliente_id,
      monto: pagoData.monto,
      divisa: pagoData.divisa,
      status: pagoData.status,
      fecha_limite: pagoData.fecha_limite,
      proveedor_id: pagoData.proveedor_id || null,
      concepto: pagoData.concepto || null,
      user_id: user.id,
    }]);
    if (error) { toast({ title: 'Error creando pago', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Pago creado' });
    fetchPagos();
  };

  const handleEditPago = async (pagoData) => {
    const { error } = await supabase.from('pagos').update({
      referencia: pagoData.referencia,
      monto: pagoData.monto,
      divisa: pagoData.divisa,
      status: pagoData.status,
      fecha_limite: pagoData.fecha_limite,
      concepto: pagoData.concepto || null,
      proveedor_id: pagoData.proveedor_id || null,
      updated_at: new Date().toISOString(),
    }).eq('id', editingPago.id);
    if (error) { toast({ title: 'Error actualizando pago', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Pago actualizado' });
    fetchPagos();
  };

  const handleDeletePago = async (id) => {
    const { error } = await supabase.from('pagos').delete().eq('id', id);
    if (error) { toast({ title: 'Error eliminando pago', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Pago eliminado' });
    fetchPagos();
  };

  // ── Filtrado + búsqueda ─────────────────────────────────────────
  const filteredPagos = useMemo(() => {
    return pagos.filter(p => {
      if (!matchesSearch(p, searchTerm)) return false;
      const cat = getColorCategory(p);
      if (filterType === 'all') return true;
      if (filterType === 'paid') return p.status === 'Pagado';
      if (filterType === 'pending_green') return cat === 'green';
      if (filterType === 'pending_orange') return cat === 'orange';
      if (filterType === 'pending_red') return cat === 'red';
      return true;
    });
  }, [pagos, searchTerm, filterType]);

  // ── Agrupación por referencia ───────────────────────────────────
  const groupedPagos = useMemo(() =>
    filteredPagos.reduce((acc, p) => {
      const k = p.referencia || 'Sin referencia';
      if (!acc[k]) acc[k] = [];
      acc[k].push(p);
      return acc;
    }, {}),
    [filteredPagos]);

  // ── Totales ─────────────────────────────────────────────────────
  const getTotales = (list) => {
    const total = list.reduce((s, p) => s + Number(p.monto || 0), 0);
    const pagado = list.filter(p => p.status === 'Pagado' || p.status === 'Parcial').reduce((s, p) => s + Number(p.monto || 0), 0);
    return { total, pagado, pendiente: total - pagado };
  };

  // ── KPIs globales ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = pagos.reduce((s, p) => s + Number(p.monto || 0), 0);
    const pagado = pagos.filter(p => p.status === 'Pagado').reduce((s, p) => s + Number(p.monto || 0), 0);
    const vencidos = pagos.filter(p => p.status !== 'Pagado' && getDaysRemaining(p.fecha_limite) < 0).length;
    const urgentes = pagos.filter(p => p.status !== 'Pagado' && getDaysRemaining(p.fecha_limite) <= 2 && getDaysRemaining(p.fecha_limite) >= 0).length;
    return { total, pagado, pendiente: total - pagado, vencidos, urgentes };
  }, [pagos]);

  const gridClass = gridCols === 2
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: `$${fmt(kpis.total)}`, color: 'text-slate-800' },
          { label: 'Pendiente', value: `$${fmt(kpis.pendiente)}`, color: 'text-amber-600' },
          { label: 'Pagado', value: `$${fmt(kpis.pagado)}`, color: 'text-emerald-600' },
          { label: 'Urgentes', value: kpis.urgentes, color: 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">

        {/* Row 1: búsqueda + controles */}
        <div className="flex gap-3 items-center flex-wrap">

          {/* Buscador amplio */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            )}
            <input
              type="text"
              placeholder="Buscar por proveedor, cliente, concepto, monto, status, referencia..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Refresh */}
          <button onClick={fetchPagos}
            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition border border-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Vista: grid / list */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Columnas (solo en grid) */}
          {viewMode === 'grid' && (
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 text-xs">
              {[2, 3].map(n => (
                <button key={n} onClick={() => setGridCols(n)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${gridCols === n ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {n} col
                </button>
              ))}
            </div>
          )}

          {/* Nuevo pago */}
          <Button onClick={() => { setEditingPago(null); setDialogOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Nuevo Pago
          </Button>
        </div>

        {/* Row 2: filtros rápidos */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition border
                ${filterType === f.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${f.dot}`} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE PAGOS — agrupados por referencia */}
      {filteredPagos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm font-medium">
            {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay pagos registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {Object.entries(groupedPagos).map(([referencia, pagosList]) => {
              const totales = getTotales(pagosList);

              return (
                <motion.div key={referencia}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                >
                  {/* Cabecera del grupo */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800 text-sm">{referencia}</span>
                      <span className="text-xs text-slate-400">{pagosList.length} pago{pagosList.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex gap-2 text-xs flex-wrap">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                        Total ${fmt(totales.total)}
                      </span>
                      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                        Pagado ${fmt(totales.pagado)}
                      </span>
                      <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                        Pendiente ${fmt(totales.pendiente)}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className={`p-4 ${viewMode === 'list' ? 'space-y-2' : gridClass}`}>
                    {pagosList.map(pago => {
                      const cat = getColorCategory(pago);
                      const days = getDaysRemaining(pago.fecha_limite);
                      const shared = {
                        pago, colorCategory: cat, daysRemaining: days,
                        onEdit: e => { e && e.stopPropagation(); setEditingPago(pago); setDialogOpen(true); },
                        onDelete: e => { e && e.stopPropagation(); handleDeletePago(pago.id); },
                      };
                      return (
                        <div key={pago.id} onClick={() => { setSelectedPago(pago); setDetailOpen(true); }}>
                          {viewMode === 'grid'
                            ? <PagoCardGrid {...shared} />
                            : <PagoCardRow  {...shared} />
                          }
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* DIALOGS */}
      <PagoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={editingPago ? handleEditPago : handleAddPago}
        initialData={editingPago}
      />

      <PagoDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        pago={selectedPago}
        title={selectedPago ? `${selectedPago.referencia} · ${selectedPago.monto} ${selectedPago.divisa}` : 'Detalle de Pago'}
        onDelete={handleDeletePago}
        onEdit={p => { setEditingPago(p); setDialogOpen(true); }}
      />
    </div>
  );
}

export default PagosSection;
