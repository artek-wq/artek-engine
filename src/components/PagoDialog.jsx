import { supabase } from "@/lib/customSupabaseClient";
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { logError } from '@/lib/ErrorLogger';

function PagoDialog({ open, onOpenChange, onSave, initialData }) {
  const [operaciones, setOperaciones] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [referenciaSearch, setReferenciaSearch] = useState('');
  const [proveedorSearch, setProveedorSearch] = useState('');
  const [formData, setFormData] = useState({
    referencia: '',
    cliente: '',
    cliente_id: '',
    monto: '',
    divisa: 'USD',
    status: 'Pendiente',
    fecha_limite: '',
    proveedor_id: '',
    concepto: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchOperaciones();
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {

    const { data, error } = await supabase
      .from("proveedores")
      .select("id, razon_social")
      .order("razon_social");

    if (error) {
      console.error("Error cargando proveedores", error);
      return;
    }

    setProveedores(data || []);

  };

  const fetchOperaciones = async () => {

    const { data, error } = await supabase
      .from("operaciones")
      .select(`
      id,
      referencia,
      cliente_id,
      clientes(nombre)
    `);

    if (error) {

      toast({
        title: "Error cargando operaciones",
        description: error.message,
        variant: "destructive"
      });

      return;

    }

    const formatted = (data || []).map(op => ({
      id: op.id,
      referencia: op.referencia,
      cliente: op.clientes?.nombre || "",
      cliente_id: op.cliente_id
    }));

    setOperaciones(formatted);

  };

  useEffect(() => {

    if (initialData) {
      setReferenciaSearch(initialData.referencia || "");

      const proveedor = proveedores.find(
        p => String(p.id) === String(initialData.proveedor_id)
      );

      if (proveedor) {
        setProveedorSearch(proveedor.razon_social);
      }
      setFormData({
        referencia: initialData.referencia || "",
        cliente: initialData.cliente || "",
        cliente_id: initialData.cliente_id || "",
        monto: initialData.monto || "",
        divisa: initialData.divisa || "USD",
        status: initialData.status || "Pendiente",
        fecha_limite: initialData.fecha_limite || "",
        proveedor_id: initialData.proveedor_id || "",
        concepto: initialData.concepto || ""
      });

    } else {

      setFormData({
        referencia: "",
        cliente: "",
        cliente_id: "",
        monto: "",
        divisa: "USD",
        status: "Pendiente",
        fecha_limite: "",
        proveedor_id: "",
        concepto: ""
      });

    }

  }, [initialData, open, proveedores]);


  const handleReferenciaChange = (referencia) => {

    const operacion = operaciones.find(op => op.referencia === referencia);

    if (operacion) {

      setFormData(prev => ({
        ...prev,
        referencia,
        cliente: operacion.cliente,
        cliente_id: operacion.cliente_id
      }));

    } else {

      setFormData(prev => ({
        ...prev,
        referencia
      }));

    }

  };

  const referenciasFiltradas =
    referenciaSearch && !formData.referencia
      ? operaciones.filter(op =>
        op.referencia.toLowerCase().includes(referenciaSearch.toLowerCase())
      )
      : [];

  const proveedoresFiltrados =
    proveedorSearch.length === 0
      ? []
      : proveedores.filter(p =>
        p.razon_social.toLowerCase().includes(proveedorSearch.toLowerCase())
      );

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!formData.referencia || !formData.monto || !formData.fecha_limite) {

      toast({
        title: "Campos incompletos",
        description: "Referencia, monto y fecha límite son obligatorios.",
        variant: "destructive"
      });

      return;

    }

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Pago' : 'Nuevo Pago'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="referencia">Referencia de Operación *</Label>
              <input
                type="text"
                placeholder="Buscar referencia..."
                value={referenciaSearch}
                onChange={(e) => setReferenciaSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1"
              />

              <div className="border rounded-lg max-h-32 overflow-y-auto mt-1">

                {referenciasFiltradas.map(op => (

                  <div
                    key={op.id}
                    onClick={() => {

                      handleReferenciaChange(op.referencia);
                      setReferenciaSearch(op.referencia);

                    }}
                    className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                  >
                    {op.referencia}
                  </div>

                ))}

              </div>

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
              <Label htmlFor="proveedor">Proveedor</Label>

              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={proveedorSearch}
                onChange={(e) => setProveedorSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1"
              />

              <div className="border rounded-lg max-h-32 overflow-y-auto mt-1">

                {proveedoresFiltrados.map(p => (

                  <div
                    key={p.id}
                    onClick={() => {

                      setFormData({
                        ...formData,
                        proveedor_id: p.id
                      });

                      setProveedorSearch(p.razon_social);

                    }}
                    className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                  >
                    {p.razon_social}
                  </div>

                ))}

              </div>
            </div>

            <div>
              <Label htmlFor="monto">Monto *</Label>
              <input
                id="monto"
                type="number"
                step="0.01"
                required
                value={formData.monto}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    monto: e.target.value
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="concepto">Concepto</Label>

              <input
                id="concepto"
                type="text"
                value={formData.concepto}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    concepto: e.target.value
                  })
                }
                placeholder="Descripción del pago"
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
              <Label htmlFor="fecha_limite">Fecha Límite *</Label>
              <input
                id="fecha_limite"
                type="date"
                required
                value={formData.fecha_limite}
                onChange={(e) => setFormData({ ...formData, fecha_limite: e.target.value })}
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
