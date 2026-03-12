import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import PagoDialog from '@/components/PagoDialog';
import PagoCard from '@/components/PagoCard';
import PagoDetailModal from '@/components/PagoDetailModal';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from "@/lib/customSupabaseClient";

function PagosSection() {

  const [pagos, setPagos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPago, setEditingPago] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPago, setSelectedPago] = useState(null);

  const { toast } = useToast();

  const fetchPagos = async () => {

    const { data, error } = await supabase
      .from("pagos")
      .select(`
      *,
      clientes(nombre)
    `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error cargando pagos",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setPagos(
      (data || []).map(p => ({
        ...p,
        cliente: p.clientes?.nombre || ""
      }))
    );
  };

  useEffect(() => {
    fetchPagos();
  }, []);

  const handleAddPago = async (pagoData) => {

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("pagos")
      .insert([{
        referencia: pagoData.referencia,
        cliente_id: pagoData.cliente_id,
        monto: pagoData.monto,
        divisa: pagoData.divisa,
        status: pagoData.status,
        fecha_limite: pagoData.fecha_limite,
        proveedor_id: pagoData.proveedor_id || null,
        concepto: pagoData.concepto || null,
        user_id: user.id
      }]);

    if (error) {
      toast({
        title: "Error creando pago",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Pago creado"
    });

    fetchPagos();
  };

  const handleEditPago = async (pagoData) => {

    const { error } = await supabase
      .from("pagos")
      .update({
        referencia: pagoData.referencia,
        monto: pagoData.monto,
        divisa: pagoData.divisa,
        status: pagoData.status,
        fecha_limite: pagoData.fecha_limite,
        updated_at: new Date().toISOString()
      })
      .eq("id", editingPago.id);

    if (error) {
      toast({
        title: "Error actualizando pago",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Pago actualizado"
    });

    fetchPagos();

  };

  const handleDeletePago = async (id) => {

    const { error } = await supabase
      .from("pagos")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error eliminando pago",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Pago eliminado"
    });

    fetchPagos();

  };

  const handleCardClick = (pago) => {
    setSelectedPago(pago);
    setDetailModalOpen(true);
  };

  const getDaysRemaining = (fecha_limite) => {

    // Current date is 2025-12-09
    const today = new Date();
    const limit = new Date(fecha_limite + 'T00:00:00Z'); // Ensure comparison is date-only
    const diffTime = limit.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getColorCategory = (pago) => {
    if (pago.status === 'Pagado') return 'blue'; // New condition for "Pagado" status
    const days = getDaysRemaining(pago.fecha_limite);
    if (days > 7) return 'green';
    if (days >= 3 && days <= 6) return 'orange';
    return 'red';
  };

  const filteredPagos = pagos.filter(pago => {
    const matchesSearch = (pago.referencia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pago.cliente || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'paid') return matchesSearch && pago.status === 'Pagado'; // Filter for "Pagado"
    if (filterType === 'pending_green') return matchesSearch && getColorCategory(pago) === 'green';
    if (filterType === 'pending_orange') return matchesSearch && getColorCategory(pago) === 'orange';
    if (filterType === 'pending_red') return matchesSearch && getColorCategory(pago) === 'red';

    // Fallback for custom filter types (if added later)
    return matchesSearch && getColorCategory(pago) === filterType;
  });

  const getTotales = (pagosList) => {

    const total = pagosList.reduce((sum, p) => sum + Number(p.monto || 0), 0);

    const pagado = pagosList
      .filter(p => p.status === "Pagado" || p.status === "Parcial")
      .reduce((sum, p) => sum + Number(p.monto || 0), 0);

    const pendiente = total - pagado;

    return {
      total,
      pagado,
      pendiente
    };

  };

  const groupedPagos = React.useMemo(() =>
    filteredPagos.reduce((acc, pago) => {
      const key = pago.referencia;
      if (!acc[key]) acc[key] = [];
      acc[key].push(pago);
      return acc;
    }, {}), [filteredPagos]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">

          <Button
            onClick={() => {
              setEditingPago(null);
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Pago
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por referencia o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="transition-colors"
            >
              Todos
            </Button>
            <Button
              variant={filterType === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('paid')}
              className="transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              Pagados
            </Button>
            <Button
              variant={filterType === 'pending_green' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('pending_green')}
              className="transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              &gt;7 días
            </Button>
            <Button
              variant={filterType === 'pending_orange' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('pending_orange')}
              className="transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
              3-6 días
            </Button>
            <Button
              variant={filterType === 'pending_red' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('pending_red')}
              className="transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              &lt;2 días
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence>
            {Object.entries(groupedPagos).map(([referencia, pagosList]) => {

              const totales = getTotales(pagosList);

              return (

                <motion.div
                  key={referencia}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <div className="mb-4">

                    <h3 className="text-lg font-semibold text-slate-800">
                      {referencia}
                    </h3>

                    <div className="flex gap-3 mt-2 text-sm">

                      <div className="bg-slate-100 px-3 py-1 rounded">
                        Total: ${totales.total.toLocaleString()}
                      </div>

                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded">
                        Pagado: ${totales.pagado.toLocaleString()}
                      </div>

                      <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded">
                        Pendiente: ${totales.pendiente.toLocaleString()}
                      </div>

                    </div>

                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pagosList.map(pago => (
                      <div key={pago.id} onClick={() => handleCardClick(pago)} className="cursor-pointer">
                        <PagoCard
                          pago={pago}
                          onEdit={(e) => {
                            e && e.stopPropagation();
                            setEditingPago(pago);
                            setDialogOpen(true);
                          }}
                          onDelete={(e) => {
                            e && e.stopPropagation();
                            handleDeletePago(pago.id);
                          }}
                          // Pass the payment object directly to getColorCategory and getDaysRemaining
                          colorCategory={getColorCategory(pago)}
                          daysRemaining={getDaysRemaining(pago.fecha_limite)}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

          </AnimatePresence>
        </div>

        {filteredPagos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No se encontraron pagos</p>
          </div>
        )}
      </div>

      <PagoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={editingPago ? handleEditPago : handleAddPago}
        initialData={editingPago}
      />

      <PagoDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        pago={selectedPago}
        title={selectedPago ? `Pago: ${selectedPago.referencia} (${selectedPago.monto} ${selectedPago.divisa})` : 'Detalle de Pago'}
        onDelete={handleDeletePago}
        onEdit={(p) => {
          setEditingPago(p);
          setDialogOpen(true);
        }}
      />

    </div>
  );
}

export default PagosSection;