import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';

function SubOperacionDialog({ open, onOpenChange, parentOperacion, onSuccess }) {

  const [loading, setLoading] = useState(false);
  const [subReference, setSubReference] = useState('');
  const [proveedores, setProveedores] = useState([]);

  const [formData, setFormData] = useState({
    tipo_operacion: 'T',
    proveedor: '',
    origen: '',
    destino: ''
  });

  // 🔹 Generar referencia hija
  useEffect(() => {
    if (!parentOperacion || !open) return;

    const generateReference = async () => {
      const { data, error } = await supabase
        .from('operaciones')
        .select('id')
        .eq('operacion_madre_id', parentOperacion.id);

      if (!error) {
        const count = (data?.length || 0) + 1;
        setSubReference(`${parentOperacion.referencia}-S${count}`);
      }
    };

    generateReference();
  }, [parentOperacion, open]);

  // 🔹 Cargar proveedores (HOOK SEPARADO CORRECTO)
  useEffect(() => {
    const fetchProveedores = async () => {
      const { data, error } = await supabase
        .from('proveedores')
        .select('id, razon_social')
        .order('razon_social');

      if (!error) {
        setProveedores(data || []);
      }
    };

    fetchProveedores();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parentOperacion) return;

    setLoading(true);

    const { data: result, error } = await supabase
      .from('operaciones')
      .insert([{
        referencia: subReference,
        tipo_operacion: formData.tipo_operacion,
        status: 'En Proceso',

        cliente_id: parentOperacion.cliente_id,
        user_id: parentOperacion.user_id,

        // 🔥 HERENCIA AUTOMÁTICA
        mbl: parentOperacion.mbl,
        hbl: parentOperacion.hbl,
        contenedor: parentOperacion.contenedor,
        bultos: parentOperacion.bultos,
        cbm: parentOperacion.cbm,
        aseguradora: parentOperacion.aseguradora,
        equipo: parentOperacion.equipo,

        // 🔹 Campos propios de la sub
        proveedor: formData.proveedor,
        origen: formData.origen,
        destino: formData.destino,

        operacion_madre_id: parentOperacion.id
      }])
      .select()
      .single();

    if (!error && result) {
      onSuccess?.(result);
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Sub-Operación</DialogTitle>
        </DialogHeader>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 flex justify-between items-center">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Referencia
          </span>
          <div className="text-lg font-bold text-blue-700">
            {subReference || 'Generando...'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* TIPO */}
          <div>
            <Label>Tipo de Operación</Label>
            <select
              required
              value={formData.tipo_operacion}
              onChange={(e) =>
                setFormData({ ...formData, tipo_operacion: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg mt-1 bg-white"
            >
              <option value="M">Marítimo</option>
              <option value="A">Aéreo</option>
              <option value="T">Terrestre</option>
              <option value="D">Despacho Aduanal</option>
            </select>
          </div>

          {/* PROVEEDOR DROPDOWN CORRECTO */}
          <div>
            <Label>Proveedor</Label>
            <select
              required
              value={formData.proveedor}
              onChange={(e) =>
                setFormData({ ...formData, proveedor: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg mt-1 bg-white"
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.razon_social}>
                  {p.razon_social}
                </option>
              ))}
            </select>
          </div>

          {/* ORIGEN / DESTINO */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Origen</Label>
              <input
                required
                type="text"
                value={formData.origen}
                onChange={(e) =>
                  setFormData({ ...formData, origen: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>

            <div>
              <Label>Destino</Label>
              <input
                required
                type="text"
                value={formData.destino}
                onChange={(e) =>
                  setFormData({ ...formData, destino: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creando...' : 'Crear Sub-Operación'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SubOperacionDialog;