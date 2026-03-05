import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, Printer, Download } from 'lucide-react';
import FacturaDialog from '@/components/FacturaDialog';
import DetailModal from '@/components/DetailModal';
import { useToast } from '@/components/ui/use-toast';

function FacturasSection() {
  const [facturas, setFacturas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);
  
  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  const { toast } = useToast();

  useEffect(() => {
    const savedFacturas = localStorage.getItem('artek_facturas');
    if (savedFacturas) {
      setFacturas(JSON.parse(savedFacturas));
    }
  }, []);

  const saveFacturas = (newFacturas) => {
    setFacturas(newFacturas);
    localStorage.setItem('artek_facturas', JSON.stringify(newFacturas));
  };

  const handleAddFactura = (facturaData) => {
    const newFactura = {
      id: Date.now().toString(),
      folio: `F-${Date.now().toString().slice(-6)}`,
      ...facturaData,
      createdAt: new Date().toISOString()
    };
    saveFacturas([...facturas, newFactura]);
    toast({
      title: "Factura creada",
      description: `Folio: ${newFactura.folio}`,
    });
  };

  const handleEditFactura = (facturaData) => {
    const updatedFacturas = facturas.map(f => 
      f.id === editingFactura.id ? { ...f, ...facturaData } : f
    );
    saveFacturas(updatedFacturas);
    toast({
      title: "Factura actualizada",
      description: "Los cambios se han guardado exitosamente.",
    });
  };

  const handleDeleteFactura = (id) => {
    const targetId = typeof id === 'object' ? id.id : id;
    saveFacturas(facturas.filter(f => f.id !== targetId));
    toast({
      title: "Factura eliminada",
      description: "La factura ha sido eliminada.",
    });
  };

  const handleCardClick = (factura) => {
    setSelectedFactura(factura);
    setDetailModalOpen(true);
  };

  const handleGeneratePDF = (factura) => {
    toast({
      title: "Generando PDF",
      description: `Descargando factura folio ${factura.folio}...`,
    });
  };

  const filteredFacturas = facturas.filter(factura =>
    factura.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    factura.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    factura.referencia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateTotal = (items) => {
    if (!items || items.length === 0) return { subtotal: 0, impuestos: 0, total: 0 };
    const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos;
    return { subtotal, impuestos, total };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar facturas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-800"
          />
        </div>
        
        <Button 
          onClick={() => {
            setEditingFactura(null);
            setDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all rounded-lg w-full md:w-auto font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {filteredFacturas.map((factura) => {
            const totals = calculateTotal(factura.items);
            
            return (
              <motion.div
                key={factura.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => handleCardClick(factura)}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                {/* Header Strip */}
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded text-sm border border-blue-100">
                      {factura.folio}
                    </div>
                    <span className="text-slate-400 text-sm">|</span>
                    <span className="text-sm text-slate-600 font-medium">{formatDate(factura.fecha)}</span>
                  </div>
                  <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600">
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" 
                      onClick={() => { setEditingFactura(factura); setDialogOpen(true); }}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-orange-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" 
                      onClick={() => handleDeleteFactura(factura.id)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between mb-8 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Cliente</h3>
                      <div className="text-lg font-bold text-slate-900">{factura.cliente}</div>
                      <div className="text-sm text-slate-500">{factura.clienteRFC}</div>
                    </div>
                    <div className="text-right">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Total a Pagar</h3>
                      <div className="text-2xl font-bold text-slate-900">${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-sm text-slate-500 mt-1">Método: {factura.metodoPago}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left py-2 px-4 font-semibold text-slate-600">Concepto</th>
                          <th className="text-center py-2 px-4 font-semibold text-slate-600">Cant.</th>
                          <th className="text-right py-2 px-4 font-semibold text-slate-600">Precio</th>
                          <th className="text-right py-2 px-4 font-semibold text-slate-600">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factura.items && factura.items.map((item, index) => (
                          <tr key={index} className="border-b border-slate-50 last:border-0">
                            <td className="py-2 px-4 text-slate-800">{item.concepto}</td>
                            <td className="py-2 px-4 text-center text-slate-600">{item.cantidad}</td>
                            <td className="py-2 px-4 text-right text-slate-600">${parseFloat(item.precio).toLocaleString()}</td>
                            <td className="py-2 px-4 text-right font-medium text-slate-800">${(item.precio * item.cantidad).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredFacturas.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">No hay facturas registradas</p>
        </div>
      )}

      <FacturaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={editingFactura ? handleEditFactura : handleAddFactura}
        initialData={editingFactura}
      />

      <DetailModal 
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        data={selectedFactura}
        title={selectedFactura ? `Factura: ${selectedFactura.folio}` : 'Detalle Factura'}
        onDelete={handleDeleteFactura}
        onEdit={(f) => {
          setEditingFactura(f);
          setDialogOpen(true);
        }}
        onGeneratePDF={handleGeneratePDF}
      />
    </div>
  );
}

export default FacturasSection;