import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, Download, RefreshCw, FileText, Loader2 } from 'lucide-react';
import FacturaDialog from '@/components/FacturaDialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_STYLES = {
  'Pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Pagada': 'bg-green-100 text-green-700 border-green-200',
  'Cancelada': 'bg-red-100 text-red-700 border-red-200',
  'Vencida': 'bg-orange-100 text-orange-700 border-orange-200',
};

function fmt(num) {
  return (num || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function FacturasSection() {
  const { toast } = useToast();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [facturaToDelete, setFacturaToDelete] = useState(null);

  // ─── KPIs ───────────────────────────────────────────────────────────────
  const totalFacturado = facturas.reduce((s, f) => s + (f.total || 0), 0);
  const totalPendiente = facturas.filter(f => f.status === 'Pendiente').reduce((s, f) => s + (f.total || 0), 0);
  const totalPagado = facturas.filter(f => f.status === 'Pagada').reduce((s, f) => s + (f.total || 0), 0);
  const countVencidas = facturas.filter(f => f.status === 'Vencida').length;

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facturas')
      .select(`
        *,
        clientes(nombre, rfc),
        operaciones(referencia),
        items_factura(id, concepto, precio, cantidad, importe)
      `)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (error) {
      toast({ title: 'Error cargando facturas', description: error.message, variant: 'destructive' });
      return;
    }
    setFacturas(data || []);
  }, [toast]);

  useEffect(() => { fetchFacturas(); }, [fetchFacturas]);

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteConfirmed = async () => {
    if (!facturaToDelete) return;
    // Delete items first (FK constraint)
    await supabase.from('items_factura').delete().eq('factura_id', facturaToDelete.id);
    const { error } = await supabase.from('facturas').delete().eq('id', facturaToDelete.id);
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Factura eliminada' });
      fetchFacturas();
    }
    setFacturaToDelete(null);
    setDeleteOpen(false);
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = facturas.filter(f => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q
      || f.folio?.toLowerCase().includes(q)
      || f.clientes?.nombre?.toLowerCase().includes(q)
      || f.operaciones?.referencia?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total facturado', value: `$${fmt(totalFacturado)}`, color: 'text-slate-800' },
          { label: 'Por cobrar', value: `$${fmt(totalPendiente)}`, color: 'text-amber-600' },
          { label: 'Cobrado', value: `$${fmt(totalPagado)}`, color: 'text-green-600' },
          { label: 'Vencidas', value: countVencidas, color: 'text-red-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por folio, cliente u operación..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFacturas}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { setEditingFactura(null); setDialogOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" /> Nueva Factura
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">{searchTerm || filterStatus ? 'Sin resultados para tu búsqueda' : 'No hay facturas registradas'}</p>
          {!searchTerm && !filterStatus && (
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crear primera factura
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((factura, idx) => (
              <motion.div
                key={factura.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all group"
              >
                {/* Header strip */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-blue-600 font-bold text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {factura.folio || `F-${factura.id?.slice(-6)}`}
                    </span>
                    <span className="text-slate-400 text-xs">·</span>
                    <span className="text-sm text-slate-500">{fmtDate(factura.fecha)}</span>
                    {factura.operaciones?.referencia && (
                      <>
                        <span className="text-slate-300 text-xs">·</span>
                        <span className="text-xs text-slate-500 font-medium">{factura.operaciones.referencia}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[factura.status] || STATUS_STYLES['Pendiente']}`}>
                      {factura.status}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                        onClick={() => { setEditingFactura(factura); setDialogOpen(true); }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        onClick={() => { setFacturaToDelete(factura); setDeleteOpen(true); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{factura.clientes?.nombre || '—'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">RFC: {factura.clientes?.rfc || '—'} · {factura.metodo_pago}</p>
                    {factura.items_factura?.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        {factura.items_factura.length} concepto{factura.items_factura.length !== 1 ? 's' : ''}: {factura.items_factura.map(i => i.concepto).join(', ').slice(0, 60)}{factura.items_factura.map(i => i.concepto).join(', ').length > 60 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">Subtotal ${fmt(factura.subtotal)} + IVA ${fmt(factura.iva)}</div>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">${fmt(factura.total)}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Dialogs */}
      <FacturaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        factura={editingFactura}
        onSuccess={fetchFacturas}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la factura <strong>{facturaToDelete?.folio || facturaToDelete?.id?.slice(-6)}</strong> de <strong>{facturaToDelete?.clientes?.nombre}</strong> por ${fmt(facturaToDelete?.total)}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default FacturasSection;
