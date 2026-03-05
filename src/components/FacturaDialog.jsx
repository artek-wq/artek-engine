
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { logError } from '@/lib/ErrorLogger';

function FacturaDialog({ open, onOpenChange, onSave, initialData }) {
  const [operaciones, setOperaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [formData, setFormData] = useState({
    referencia: '',
    cliente: '',
    clienteRFC: '',
    clienteDomicilio: '',
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia',
    items: [{ concepto: '', precio: '', cantidad: 1 }]
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedOperaciones = localStorage.getItem('artek_operaciones');
    const savedClientes = localStorage.getItem('artek_clientes');
    if (savedOperaciones) setOperaciones(JSON.parse(savedOperaciones));
    if (savedClientes) setClientes(JSON.parse(savedClientes));
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        referencia: '',
        cliente: '',
        clienteRFC: '',
        clienteDomicilio: '',
        fecha: new Date().toISOString().split('T')[0],
        metodoPago: 'Transferencia',
        items: [{ concepto: '', precio: '', cantidad: 1 }]
      });
    }
  }, [initialData, open]);

  const handleReferenciaChange = (referencia) => {
    const operacion = operaciones.find(op => op.referencia === referencia);
    if (operacion) {
      const cliente = clientes.find(c => c.nombre === operacion.cliente);
      setFormData({
        ...formData,
        referencia,
        cliente: operacion.cliente,
        clienteRFC: cliente?.rfc || '',
        clienteDomicilio: cliente?.domicilio || ''
      });
    } else {
      setFormData({
        ...formData,
        referencia
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { concepto: '', precio: '', cantidad: 1 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      items: newItems.length > 0 ? newItems : [{ concepto: '', precio: '', cantidad: 1 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = formData.items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      logError('Error saving factura', 'DATABASE', error);
      toast({
        title: "Error",
        description: "Error al guardar la factura.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="referencia">Referencia de Operación *</Label>
              <select
                id="referencia"
                required
                value={formData.referencia}
                onChange={(e) => handleReferenciaChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              >
                <option value="">Seleccionar referencia</option>
                {operaciones.map(op => (
                  <option key={op.id} value={op.referencia}>{op.referencia}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <input
                id="cliente"
                type="text"
                required
                value={formData.cliente}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 bg-slate-50 text-slate-800"
                readOnly
              />
            </div>

            <div>
              <Label htmlFor="clienteRFC">RFC del Cliente</Label>
              <input
                id="clienteRFC"
                type="text"
                value={formData.clienteRFC}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 bg-slate-50 text-slate-800"
                readOnly
              />
            </div>

            <div>
              <Label htmlFor="fecha">Fecha *</Label>
              <input
                id="fecha"
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="metodoPago">Método de Pago *</Label>
              <select
                id="metodoPago"
                required
                value={formData.metodoPago}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              >
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Conceptos de Facturación</h3>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Concepto
              </Button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label htmlFor={`concepto-${index}`}>Concepto</Label>
                    <input
                      id={`concepto-${index}`}
                      type="text"
                      required
                      value={item.concepto}
                      onChange={(e) => updateItem(index, 'concepto', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label htmlFor={`precio-${index}`}>Precio</Label>
                    <input
                      id={`precio-${index}`}
                      type="number"
                      step="0.01"
                      required
                      value={item.precio}
                      onChange={(e) => updateItem(index, 'precio', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`cantidad-${index}`}>Cantidad</Label>
                    <input
                      id={`cantidad-${index}`}
                      type="number"
                      min="1"
                      required
                      value={item.cantidad}
                      onChange={(e) => updateItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        size="sm"
                        variant="ghost"
                        className="w-full hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {initialData ? 'Actualizar' : 'Crear'} Factura
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FacturaDialog;
