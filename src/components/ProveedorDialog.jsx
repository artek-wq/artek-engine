import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Mail, Phone, Briefcase, User, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function ProveedorDialog({ open, onOpenChange, onSave, initialData }) {
  const [formData, setFormData] = useState({
    razonSocial: '',
    nombreComercial: '',
    rfc: '',
    domicilio: '',
    web: '',
    contactos: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setFormData({
        razonSocial: initialData.razon_social || '',
        nombreComercial: initialData.nombre_comercial || '',
        rfc: initialData.rfc || '',
        domicilio: initialData.domicilio || '',
        web: initialData.web || '',
        contactos: initialData.contactos || []
      });
    } else {
      setFormData({
        razonSocial: '',
        nombreComercial: '',
        rfc: '',
        domicilio: '',
        web: '',
        contactos: []
      });
    }

    setErrors({});
  }, [initialData, open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.razonSocial.trim()) newErrors.razonSocial = 'La Razón Social es obligatoria';
    if (!formData.rfc.trim()) newErrors.rfc = 'El RFC es obligatorio';
    if (!formData.contactos || formData.contactos.length === 0)
      newErrors.contactos = 'Se requiere al menos 1 contacto';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddContacto = () => {
    setFormData({
      ...formData,
      contactos: [...formData.contactos, { area: '', puesto: '', nombre: '', email: '', telefono: '' }]
    });

    if (errors.contactos) {
      const newErrors = { ...errors };
      delete newErrors.contactos;
      setErrors(newErrors);
    }
  };

  const handleRemoveContacto = (index) => {
    const newContactos = formData.contactos.filter((_, i) => i !== index);
    setFormData({ ...formData, contactos: newContactos });
  };

  const handleContactoChange = (index, field, value) => {
    const newContactos = [...formData.contactos];
    newContactos[index] = { ...newContactos[index], [field]: value };
    setFormData({ ...formData, contactos: newContactos });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor revise los campos obligatorios.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el proveedor.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Información General */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              Información General
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <Label className={errors.razonSocial ? "text-red-500" : ""}>
                  Razón Social *
                </Label>
                <input
                  value={formData.razonSocial}
                  onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg mt-1 ${errors.razonSocial ? 'border-red-500' : 'border-slate-300'
                    }`}
                />
              </div>

              <div>
                <Label>Nombre Comercial</Label>
                <input
                  value={formData.nombreComercial}
                  onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 text-slate-800"
                />
              </div>

              <div>
                <Label className={errors.rfc ? "text-red-500" : ""}>
                  RFC *
                </Label>
                <input
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg mt-1 ${errors.rfc ? 'border-red-500' : 'border-slate-300'
                    }`}
                />
              </div>

              <div>
                <Label>Sitio Web</Label>
                <input
                  value={formData.web}
                  onChange={(e) => setFormData({ ...formData, web: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Domicilio Fiscal</Label>
                <input
                  value={formData.domicilio}
                  onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1"
                />
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className={`text-sm font-bold uppercase ${errors.contactos ? 'text-red-500' : ''}`}>
                Contactos *
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={handleAddContacto}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Contacto
              </Button>
            </div>

            {formData.contactos.map((contacto, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemoveContacto(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    placeholder="Área"
                    value={contacto.area}
                    onChange={(e) => handleContactoChange(index, 'area', e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  />
                  <input
                    placeholder="Puesto"
                    value={contacto.puesto}
                    onChange={(e) => handleContactoChange(index, 'puesto', e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  />
                  <input
                    placeholder="Nombre"
                    value={contacto.nombre}
                    onChange={(e) => handleContactoChange(index, 'nombre', e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  />
                  <input
                    placeholder="Email"
                    value={contacto.email}
                    onChange={(e) => handleContactoChange(index, 'email', e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  />
                  <input
                    placeholder="Teléfono"
                    value={contacto.telefono}
                    onChange={(e) => handleContactoChange(index, 'telefono', e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? 'Actualizar' : 'Crear'} Proveedor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ProveedorDialog;