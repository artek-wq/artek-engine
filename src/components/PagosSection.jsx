import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import PagoDialog from '@/components/PagoDialog';
import PagoCard from '@/components/PagoCard';
import DetailModal from '@/components/DetailModal';
import { useToast } from '@/components/ui/use-toast';

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

  useEffect(() => {
    const savedPagos = localStorage.getItem('artek_pagos');
    if (savedPagos) {
      setPagos(JSON.parse(savedPagos));
    }
  }, []);

  const savePagos = (newPagos) => {
    setPagos(newPagos);
    localStorage.setItem('artek_pagos', JSON.stringify(newPagos));
  };

  const handleAddPago = (pagoData) => {
    const newPago = {
      id: Date.now().toString(),
      ...pagoData,
      createdAt: new Date().toISOString()
    };
    savePagos([...pagos, newPago]);
    toast({
      title: "Pago creado",
      description: "El pago se ha registrado exitosamente.",
    });
  };

  const handleEditPago = (pagoData) => {
    const updatedPagos = pagos.map(p => 
      p.id === editingPago.id ? { ...p, ...pagoData } : p
    );
    savePagos(updatedPagos);
    toast({
      title: "Pago actualizado",
      description: "Los cambios se han guardado exitosamente.",
    });
  };

  const handleDeletePago = (id) => {
    // Support passing object or ID
    const targetId = typeof id === 'object' ? id.id : id;
    savePagos(pagos.filter(p => p.id !== targetId));
    toast({
      title: "Pago eliminado",
      description: "El pago ha sido eliminado.",
    });
  };

  const handleCardClick = (pago) => {
    setSelectedPago(pago);
    setDetailModalOpen(true);
  };

  const handleGeneratePDF = (pago) => {
    toast({
      title: "Generando Comprobante",
      description: `Comprobante de pago para ${pago.referencia}...`,
    });
  };

  const getDaysRemaining = (fechaLimite) => {
    // Current date is 2025-12-09
    const today = new Date('2025-12-09T00:00:00Z'); 
    const limit = new Date(fechaLimite + 'T00:00:00Z'); // Ensure comparison is date-only
    const diffTime = limit.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getColorCategory = (pago) => {
    if (pago.status === 'Pagado') return 'blue'; // New condition for "Pagado" status
    const days = getDaysRemaining(pago.fechaLimite);
    if (days > 7) return 'green';
    if (days >= 3 && days <= 6) return 'orange';
    return 'red';
  };

  const filteredPagos = pagos.filter(pago => {
    const matchesSearch = pago.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pago.cliente.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'paid') return matchesSearch && pago.status === 'Pagado'; // Filter for "Pagado"
    if (filterType === 'pending_green') return matchesSearch && getColorCategory(pago) === 'green';
    if (filterType === 'pending_orange') return matchesSearch && getColorCategory(pago) === 'orange';
    if (filterType === 'pending_red') return matchesSearch && getColorCategory(pago) === 'red';
    
    // Fallback for custom filter types (if added later)
    return matchesSearch && getColorCategory(pago) === filterType;
  });

  const groupedPagos = filteredPagos.reduce((acc, pago) => {
    const key = pago.referencia;
    if (!acc[key]) acc[key] = [];
    acc[key].push(pago);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Gestión de Pagos</h2>
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
            {Object.entries(groupedPagos).map(([referencia, pagosList]) => (
              <motion.div
                key={referencia}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-slate-200 rounded-lg p-4"
              >
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{referencia}</h3>
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
                        daysRemaining={getDaysRemaining(pago.fechaLimite)}
                        />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
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

      <DetailModal 
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        data={selectedPago}
        title={selectedPago ? `Pago: ${selectedPago.referencia} (${selectedPago.monto} ${selectedPago.divisa})` : 'Detalle de Pago'}
        onDelete={handleDeletePago}
        onEdit={(p) => {
          setEditingPago(p);
          setDialogOpen(true);
        }}
        onGeneratePDF={handleGeneratePDF}
      />
    </div>
  );
}

export default PagosSection;