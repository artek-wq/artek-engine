
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { logError } from '@/lib/ErrorLogger';

function PagoDialog({ open, onOpenChange, onSave, initialData }) {
  const [operaciones, setOperaciones] = useState([]);
  const [formData, setFormData] = useState({
    referencia: '',
    cliente: '',
    monto: '',
    divisa: 'USD',
    status: 'Pendiente',
    fechaLimite: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedOperaciones = localStorage.getItem('artek_operaciones');
    if (savedOperaciones) {
      setOperaciones(JSON.parse(savedOperaciones));
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        referencia: '',
        cliente: '',
        monto: '',
        divisa: 'USD',
        status: 'Pendiente',
        fechaLimite: ''
      });
    }
  }, [initialData, open]);

  const handleReferenciaChange = (referencia) => {
    const operacion = operaciones.find(op => op.referencia === referencia);
    if (operacion) {
      setFormData({
        ...formData,
        referencia,
        cliente: operacion.cliente
      });
    } else {
      setFormData({
        ...formData,
        referencia
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      logError('Error saving pago', 'DATABASE', error);
      toast({
        title: "Error",
        description: "Error al guardar el pago.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Pago' : 'Nuevo Pago'}</DialogTitle>
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
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 bg-slate-50 text-slate-800"
                readOnly
              />
            </div>

            <div>
              <Label htmlFor="monto">Monto *</Label>
              <input
                id="monto"
                type="number"
                step="0.01"
                required
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              />
            </div>

            <div>
              <Label htmlFor="divisa">Divisa *</Label>
              <select
                id="divisa"
                required
                value={formData.divisa}
                onChange={(e) => setFormData({ ...formData, divisa: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
                <option value="Vencido">Vencido</option>
                <option value="Parcial">Parcial</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fechaLimite">Fecha Límite *</Label>
              <input
                id="fechaLimite"
                type="date"
                required
                value={formData.fechaLimite}
                onChange={(e) => setFormData({ ...formData, fechaLimite: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {initialData ? 'Actualizar' : 'Crear'} Pago
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PagoDialog;
