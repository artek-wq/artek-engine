import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const EMPTY_FORM = {
  operacion_id: '',
  cliente_id: '',
  fecha: new Date().toISOString().split('T')[0],
  metodo_pago: 'Transferencia',
  status: 'Pendiente',
  notas: '',
  items: [{ concepto: '', precio: '', cantidad: 1 }]
};

const METODOS_PAGO = ['Transferencia', 'Efectivo', 'Cheque', 'Tarjeta'];
const STATUS_OPTIONS = ['Pendiente', 'Pagada', 'Cancelada', 'Vencida'];

function FacturaDialog({ open, onOpenChange, onSuccess, factura }) {
  const { toast } = useToast();
  const isEdit = !!factura;

  const [operaciones, setOperaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // ─── Load catalogs ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [{ data: ops }, { data: cls }] = await Promise.all([
        supabase.from('operaciones').select('id, referencia, cliente_id, clientes(nombre, rfc, domicilio)').order('created_at', { ascending: false }),
        supabase.from('clientes').select('id, nombre, rfc, domicilio').order('nombre'),
      ]);
      setOperaciones(ops || []);
      setClientes(cls || []);
    };
    load();
  }, [open]);

  // ─── Populate form when editing ──────────────────────────────────────────
  useEffect(() => {
    if (open && isEdit && factura) {
      setFormData({
        operacion_id: factura.operacion_id || '',
        cliente_id: factura.cliente_id || '',
        fecha: factura.fecha || new Date().toISOString().split('T')[0],
        metodo_pago: factura.metodo_pago || 'Transferencia',
        status: factura.status || 'Pendiente',
        notas: factura.notas || '',
        items: factura.items_factura?.length > 0
          ? factura.items_factura.map(i => ({ concepto: i.concepto, precio: i.precio, cantidad: i.cantidad }))
          : [{ concepto: '', precio: '', cantidad: 1 }]
      });
    }
    if (open && !isEdit) {
      setFormData(EMPTY_FORM);
    }
  }, [open, isEdit, factura]);

  // ─── Auto-fill client from operacion ─────────────────────────────────────
  const handleOperacionChange = (operacionId) => {
    const op = operaciones.find(o => o.id === operacionId);
    setFormData(prev => ({
      ...prev,
      operacion_id: operacionId,
      cliente_id: op?.cliente_id || prev.cliente_id,
    }));
  };

  // ─── Items helpers ────────────────────────────────────────────────────────
  const addItem = () => setFormData(p => ({ ...p, items: [...p.items, { concepto: '', precio: '', cantidad: 1 }] }));
  const removeItem = (i) => setFormData(p => ({ ...p, items: p.items.length > 1 ? p.items.filter((_, idx) => idx !== i) : p.items }));
  const updateItem = (i, field, value) => setFormData(p => ({ ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  // ─── Totals ───────────────────────────────────────────────────────────────
  const subtotal = formData.items.reduce((s, i) => s + (parseFloat(i.precio) || 0) * (parseInt(i.cantidad) || 0), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cliente_id) {
      toast({ title: 'Cliente requerido', description: 'Selecciona una operación o cliente.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const facturaPayload = {
      operacion_id: formData.operacion_id || null,
      cliente_id: formData.cliente_id,
      fecha: formData.fecha,
      metodo_pago: formData.metodo_pago,
      status: formData.status,
      subtotal,
      iva,
      total,
      notas: formData.notas || null,
    };

    let facturaId = factura?.id;

    if (isEdit) {
      const { error } = await supabase.from('facturas').update(facturaPayload).eq('id', facturaId);
      if (error) {
        toast({ title: 'Error al actualizar', description: error.message, variant: 'destructive' });
        setLoading(false); return;
      }
      // Re-insert items
      await supabase.from('items_factura').delete().eq('factura_id', facturaId);
    } else {
      const { data, error } = await supabase.from('facturas').insert(facturaPayload).select().single();
      if (error) {
        toast({ title: 'Error al crear factura', description: error.message, variant: 'destructive' });
        setLoading(false); return;
      }
      facturaId = data.id;
    }

    // Insert items
    const itemsPayload = formData.items
      .filter(i => i.concepto && i.precio)
      .map(i => ({
        factura_id: facturaId,
        concepto: i.concepto,
        precio: parseFloat(i.precio),
        cantidad: parseInt(i.cantidad) || 1,
        // importe es columna GENERATED en Supabase (precio * cantidad), no se inserta
      }));

    if (itemsPayload.length > 0) {
      const { error: itemsError } = await supabase.from('items_factura').insert(itemsPayload);
      if (itemsError) {
        toast({ title: 'Error en conceptos', description: itemsError.message, variant: 'destructive' });
        setLoading(false); return;
      }
    }

    toast({ title: isEdit ? 'Factura actualizada' : 'Factura creada', description: `Total: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` });
    setLoading(false);
    onSuccess?.();
    onOpenChange(false);
  };

  const selectedCliente = clientes.find(c => c.id === formData.cliente_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Row 1: Operación + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="operacion_id">Operación (referencia)</Label>
              <select
                id="operacion_id"
                value={formData.operacion_id}
                onChange={e => handleOperacionChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm"
              >
                <option value="">Sin operación vinculada</option>
                {operaciones.map(op => (
                  <option key={op.id} value={op.id}>{op.referencia} — {op.clientes?.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cliente_id">Cliente *</Label>
              <select
                id="cliente_id"
                required
                value={formData.cliente_id}
                onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cliente info (read-only) */}
          {selectedCliente && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2 border border-slate-200">
              <div><span className="text-slate-500">RFC:</span> <span className="font-medium">{selectedCliente.rfc || '—'}</span></div>
              <div><span className="text-slate-500">Domicilio:</span> <span className="font-medium">{selectedCliente.domicilio || '—'}</span></div>
            </div>
          )}

          {/* Row 2: Fecha + Método + Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fecha">Fecha *</Label>
              <input id="fecha" type="date" required value={formData.fecha}
                onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm" />
            </div>
            <div>
              <Label htmlFor="metodo_pago">Método de pago</Label>
              <select id="metodo_pago" value={formData.metodo_pago}
                onChange={e => setFormData(p => ({ ...p, metodo_pago: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm">
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" value={formData.status}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">Conceptos de facturación</h3>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Agregar concepto
              </Button>
            </div>
            <div className="space-y-2">
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {idx === 0 && <Label>Concepto</Label>}
                    <input type="text" required value={item.concepto} placeholder="Descripción del servicio"
                      onChange={e => updateItem(idx, 'concepto', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm" />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <Label>Precio unit.</Label>}
                    <input type="number" step="0.01" min="0" required value={item.precio} placeholder="0.00"
                      onChange={e => updateItem(idx, 'precio', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label>Cant.</Label>}
                    <input type="number" min="1" required value={item.cantidad}
                      onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm" />
                  </div>
                  <div className="col-span-2 flex items-end gap-1">
                    <div className="flex-1 text-right text-sm font-medium text-slate-700 pb-2">
                      ${((parseFloat(item.precio) || 0) * (parseInt(item.cantidad) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                    {formData.items.length > 1 && (
                      <Button type="button" onClick={() => removeItem(idx)} size="sm" variant="ghost"
                        className="hover:bg-red-50 hover:text-red-600 px-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 border-t pt-3 space-y-1 text-sm max-w-xs ml-auto">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-slate-600"><span>IVA (16%)</span><span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between font-bold text-slate-900 text-base border-t pt-1"><span>Total</span><span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas (opcional)</Label>
            <textarea id="notas" rows={2} value={formData.notas}
              onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))}
              placeholder="Observaciones, condiciones de pago..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800 text-sm resize-none" />
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : isEdit ? 'Actualizar factura' : 'Crear factura'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FacturaDialog;