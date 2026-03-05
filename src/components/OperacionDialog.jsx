import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { STATUS } from '@/constants/status';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const TIPOS_OPERACION = [
  { value: 'M', label: 'Marítimo' },
  { value: 'A', label: 'Aéreo' },
  { value: 'T', label: 'Terrestre' },
  { value: 'D', label: 'Despacho Aduanal' },
  { value: 'P', label: 'Paquetería' }
];

function OperacionDialog({ open, onOpenChange, onSuccess, operacion }) {

  const { toast } = useToast();
  const isEditMode = !!operacion;

  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedores, setSelectedProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentos, setDocumentos] = useState([]);

  const [formData, setFormData] = useState({
    tipo_operacion: '',
    cliente_id: '',
    status: 'Pendiente',

    shipper: '',
    incoterms: '',

    origen: '',
    destino: '',

    etd: '',
    eta: '',

    mbl: '',
    hbl: '',
    contenedor: '',

    bultos: '',
    cbm: '',
    aseguradora: '',

    notas: ''
  });

  /* =========================
     CARGA INICIAL
  ========================== */

  useEffect(() => {
    if (open) {
      fetchClientes();
      fetchProveedores();
    }
  }, [open]);

  const loadDocumentos = async (operacionId) => {

    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('operacion_id', operacionId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error cargando documentos",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setDocumentos(data || []);
  };

  useEffect(() => {

    if (isEditMode && open) {
      loadOperacionData();
      loadDocumentos(operacion.id);
    }

    if (!isEditMode && open) {
      resetForm();
      setDocumentos([]);
    }

  }, [operacion, open]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre')
      .order('nombre');

    setClientes(data || []);
  };

  const fetchProveedores = async () => {
    const { data } = await supabase
      .from('proveedores')
      .select('id, razon_social')
      .order('razon_social');

    setProveedores(data || []);
  };

  const loadOperacionData = async () => {

    setFormData({
      tipo_operacion: operacion.tipo_operacion || '',
      cliente_id: operacion.cliente_id || '',
      status: operacion.status || 'Pendiente',

      shipper: operacion.shipper || '',
      incoterms: operacion.incoterms || '',

      origen: operacion.origen || '',
      destino: operacion.destino || '',

      etd: operacion.etd || '',
      eta: operacion.eta || '',

      mbl: operacion.mbl || '',
      hbl: operacion.hbl || '',
      contenedor: operacion.contenedor || '',

      bultos: operacion.bultos || '',
      cbm: operacion.cbm || '',
      aseguradora: operacion.aseguradora || '',

      notas: operacion.notas || ''
    });


    // 🔥 Cargar proveedores vinculados
    const { data: relaciones } = await supabase
      .from('operacion_proveedores')
      .select('proveedor_id')
      .eq('operacion_id', operacion.id);

    setSelectedProveedores(relaciones?.map(r => r.proveedor_id) || []);
  };

  const resetForm = () => {
    setFormData({
      tipo_operacion: '',
      cliente_id: '',
      status: 'Pendiente',

      shipper: '',
      incoterms: '',

      origen: '',
      destino: '',

      etd: '',
      eta: '',

      mbl: '',
      hbl: '',
      contenedor: '',

      bultos: '',
      cbm: '',
      aseguradora: '',

      notas: ''
    });

    setSelectedProveedores([]);
  };
  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔒 Validación obligatorios
    if (!formData.tipo_operacion || !formData.cliente_id) {
      toast({
        title: 'Error',
        description: 'Tipo de operación y Cliente son obligatorios.',
        variant: 'destructive'
      });
      return;
    }

    // 🔒 Validación coherencia fechas
    if (formData.etd && formData.eta && formData.eta < formData.etd) {
      toast({
        title: 'Error',
        description: 'ETA no puede ser menor que ETD.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión inválida');

      let result;

      if (isEditMode) {

        const { data, error } = await supabase
          .from('operaciones')
          .update({
            ...formData
          })
          .eq('id', operacion.id)
          .select()
          .single();

        if (error) throw error;

        result = data;

        toast({
          title: 'Operación actualizada correctamente'
        });

      } else {

        const { data, error } = await supabase
          .from('operaciones')
          .insert({
            ...formData,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        result = data;

        toast({
          title: 'Operación creada',
          description: `Referencia: ${data.referencia}`
        });
      }

      /* =========================
         🔥 SINCRONIZAR PROVEEDORES
      ========================== */

      // Eliminar relaciones anteriores
      await supabase
        .from('operacion_proveedores')
        .delete()
        .eq('operacion_id', result.id);

      // Insertar nuevas relaciones si existen
      if (selectedProveedores.length > 0) {

        const inserts = selectedProveedores.map(proveedorId => ({
          operacion_id: result.id,
          proveedor_id: proveedorId
        }));

        const { error: proveedoresError } = await supabase
          .from('operacion_proveedores')
          .insert(inserts);

        if (proveedoresError) throw proveedoresError;
      }

      // 🔥 Notificar al padre correctamente
      onSuccess?.(result);

      onOpenChange(false);
      resetForm();

    } catch (err) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-slate-50 to-white border-b px-8 py-6">

          <div className="flex justify-between items-start">

            <div className="flex gap-2">

              <Button
                variant="outline"
                onClick={() => {

                  window.dispatchEvent(
                    new CustomEvent(
                      'openFileManagerOperacion',
                      {
                        detail: operacion
                      }
                    )
                  );

                }}
              >
                📂 Archivos
              </Button>

            </div>

            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {isEditMode
                  ? `Editar ${operacion?.referencia || ''}`
                  : 'Nueva Operación'}
              </DialogTitle>

              {operacion?.clientes?.nombre && (
                <div className="text-sm text-slate-500 mt-1">
                  {operacion.clientes.nombre}
                </div>
              )}
            </div>

            <div className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600 font-medium">
              {formData.status}
            </div>

          </div>

        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="operacion-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* FILA 1 */}
              <div>
                <Label>Tipo de Operación *</Label>
                <select
                  required
                  value={formData.tipo_operacion}
                  onChange={(e) =>
                    setFormData({ ...formData, tipo_operacion: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="">Seleccionar</option>
                  {TIPOS_OPERACION.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Cliente *</Label>
                <select
                  required
                  value={formData.cliente_id}
                  onChange={(e) =>
                    setFormData({ ...formData, cliente_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILA 2 */}
              <div>
                <Label>Status *</Label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  {Object.values(STATUS).map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Shipper</Label>
                <input
                  value={formData.shipper}
                  onChange={(e) =>
                    setFormData({ ...formData, shipper: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>MBL</Label>
                <input
                  value={formData.mbl}
                  onChange={(e) =>
                    setFormData({ ...formData, mbl: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              {/* FILA 3 */}
              <div>
                <Label>HBL</Label>
                <input
                  value={formData.hbl}
                  onChange={(e) =>
                    setFormData({ ...formData, hbl: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>Buque / No. de Viaje</Label>
                <input
                  value={formData.buque_viaje}
                  onChange={(e) =>
                    setFormData({ ...formData, buque_viaje: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>Contenedor</Label>
                <input
                  value={formData.contenedor}
                  onChange={(e) =>
                    setFormData({ ...formData, contenedor: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              {/* FILA 4 */}
              <div>
                <Label>Origen</Label>
                <input
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
                  value={formData.destino}
                  onChange={(e) =>
                    setFormData({ ...formData, destino: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>ETD</Label>
                <input
                  type="date"
                  value={formData.etd}
                  onChange={(e) =>
                    setFormData({ ...formData, etd: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              {/* FILA 5 */}
              <div>
                <Label>ETA</Label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) =>
                    setFormData({ ...formData, eta: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>Bultos</Label>
                <input
                  type="number"
                  value={formData.bultos}
                  onChange={(e) =>
                    setFormData({ ...formData, bultos: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>CBM</Label>
                <input
                  type="number"
                  value={formData.cbm}
                  onChange={(e) =>
                    setFormData({ ...formData, cbm: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              {/* FILA 6 */}
              <div>
                <Label>Incoterms</Label>
                <input
                  value={formData.incoterms}
                  onChange={(e) =>
                    setFormData({ ...formData, incoterms: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>Aseguradora</Label>
                <input
                  value={formData.aseguradora}
                  onChange={(e) =>
                    setFormData({ ...formData, aseguradora: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              <div>
                <Label>Equipo</Label>
                <input
                  value={formData.equipo}
                  onChange={(e) =>
                    setFormData({ ...formData, equipo: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>

              {/* PROVEEDORES */}
              <div className="md:col-span-3">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Proveedores
                </Label>

                <div className="border border-slate-200 rounded-lg p-3 mt-1 max-h-40 overflow-y-auto space-y-2 bg-white">

                  {proveedores.length === 0 && (
                    <div className="text-xs text-slate-400">
                      No hay proveedores registrados
                    </div>
                  )}

                  {proveedores.map(p => (

                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                    >

                      <input
                        type="checkbox"
                        checked={selectedProveedores.includes(p.id)}
                        onChange={(e) => {

                          if (e.target.checked) {
                            setSelectedProveedores(prev => [...prev, p.id]);
                          } else {
                            setSelectedProveedores(prev =>
                              prev.filter(id => id !== p.id)
                            );
                          }

                        }}
                      />

                      {p.razon_social}

                    </label>

                  ))}

                </div>
              </div>

              {/* DOCUMENTOS */}
              <div className="md:col-span-3">

                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Documentos
                </Label>

                <div className="border rounded-lg mt-2 divide-y">

                  {documentos.length === 0 && (
                    <div className="p-4 text-sm text-slate-400">
                      No hay documentos cargados
                    </div>
                  )}

                  {documentos.map(doc => (

                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-4 py-2"
                    >

                      <div className="text-sm text-slate-700">
                        {doc.nombre}
                      </div>

                      <div className="flex gap-2">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {

                            const url =
                              supabase.storage
                                .from(BUCKET_NAME)
                                .getPublicUrl(doc.archivo_path)
                                .data.publicUrl;

                            window.open(url, "_blank");

                          }}
                        >
                          Ver
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {

                            await supabase
                              .from('documentos')
                              .delete()
                              .eq('id', doc.id);

                            loadDocumentos(operacion.id);

                          }}
                        >
                          Eliminar
                        </Button>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

              {/* NOTAS FULL WIDTH */}
              <div className="md:col-span-3">
                <Label>Notas</Label>
                <textarea
                  value={formData.notas}
                  onChange={(e) =>
                    setFormData({ ...formData, notas: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  rows={3}
                />
              </div>

            </div>
          </form>
        </div>
        <div className="border-t bg-white px-8 py-4 flex justify-end gap-3 sticky bottom-0">

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            form="operacion-form"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
          </Button>

        </div>

      </DialogContent>
    </Dialog >
  );
}

export default OperacionDialog;