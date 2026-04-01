import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, UserCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useToast } from '@/components/ui/use-toast';
import { logError } from '@/lib/ErrorLogger';

function ClienteDialog({ open, onOpenChange, onSave, initialData }) {
  const [formData, setFormData] = useState({
    nombre: '',
    rfc: '',
    domicilio: '',
    codigoPostal: '',
    contactos: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        contactos: initialData.contactos || []
      });
      setErrors({});
    } else {
      setFormData({
        nombre: '',
        rfc: '',
        domicilio: '',
        codigoPostal: '',
        contactos: []
      });
      setErrors({});
    }
  }, [initialData, open]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre o razón social es obligatorio';
    if (!formData.rfc.trim()) newErrors.rfc = 'El RFC es obligatorio';
    if (!formData.domicilio.trim()) newErrors.domicilio = 'El domicilio es obligatorio';
    if (!formData.codigoPostal.trim()) newErrors.codigoPostal = 'El código postal es obligatorio';

    if (formData.contactos.length === 0) {
      newErrors.contactos = 'Debe registrar al menos un contacto';
    }

    formData.contactos.forEach((contact, index) => {
      if (!contact.nombre.trim()) {
        newErrors[`contacto_${index}_nombre`] = 'El nombre del contacto es obligatorio';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor revise los campos marcados en rojo.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Folder creation is handled by ClientesSection after insert (uses UUID)
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      logError('Error saving cliente', 'DATABASE', error);
      console.error(error);
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el cliente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addContacto = () => {
    if (formData.contactos.length < 3) {
      setFormData({
        ...formData,
        contactos: [...formData.contactos, { nombre: '', puesto: '', telefono: '', email: '' }]
      });
      if (errors.contactos) {
        const newErrors = { ...errors };
        delete newErrors.contactos;
        setErrors(newErrors);
      }
    }
  };

  const removeContacto = (index) => {
    const newContactos = [...formData.contactos];
    newContactos.splice(index, 1);
    setFormData({ ...formData, contactos: newContactos });
  };

  const updateContacto = (index, field, value) => {
    const newContactos = [...formData.contactos];
    newContactos[index][field] = value;
    setFormData({ ...formData, contactos: newContactos });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Información Fiscal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre" className={errors.nombre ? "text-red-500" : ""}>Nombre / Razón Social *</Label>
                <input
                  id="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 mt-1 text-slate-800 ${errors.nombre ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`}
                />
                {errors.nombre && <span className="text-xs text-red-500 mt-1">{errors.nombre}</span>}
              </div>

              <div>
                <Label htmlFor="rfc" className={errors.rfc ? "text-red-500" : ""}>RFC *</Label>
                <input
                  id="rfc"
                  type="text"
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 mt-1 text-slate-800 ${errors.rfc ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`}
                />
                {errors.rfc && <span className="text-xs text-red-500 mt-1">{errors.rfc}</span>}
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="domicilio" className={errors.domicilio ? "text-red-500" : ""}>Domicilio Fiscal *</Label>
                  <input
                    id="domicilio"
                    type="text"
                    value={formData.domicilio}
                    onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 mt-1 text-slate-800 ${errors.domicilio ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`}
                  />
                  {errors.domicilio && <span className="text-xs text-red-500 mt-1">{errors.domicilio}</span>}
                </div>
                <div>
                  <Label htmlFor="codigoPostal" className={errors.codigoPostal ? "text-red-500" : ""}>Código Postal *</Label>
                  <input
                    id="codigoPostal"
                    type="text"
                    value={formData.codigoPostal}
                    onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 mt-1 text-slate-800 ${errors.codigoPostal ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`}
                  />
                  {errors.codigoPostal && <span className="text-xs text-red-500 mt-1">{errors.codigoPostal}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex flex-col">
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${errors.contactos ? 'text-red-500' : 'text-slate-500'}`}>
                  Personas de Contacto ({formData.contactos.length}/3) *
                </h3>
                {errors.contactos && <span className="text-xs text-red-500">{errors.contactos}</span>}
              </div>
              {formData.contactos.length < 3 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addContacto}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Contacto
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence>
                {formData.contactos.map((contacto, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContacto(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="hidden sm:flex w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                        <UserCircle className="w-6 h-6" />
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className={`text-xs ${errors[`contacto_${index}_nombre`] ? 'text-red-500' : 'text-slate-500'}`}>Nombre Completo *</Label>
                          <input
                            type="text"
                            value={contacto.nombre}
                            onChange={(e) => updateContacto(index, 'nombre', e.target.value)}
                            className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 mt-1 ${errors[`contacto_${index}_nombre`] ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`}
                            placeholder="Ej. Juan Pérez"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Puesto / Cargo</Label>
                          <input
                            type="text"
                            value={contacto.puesto}
                            onChange={(e) => updateContacto(index, 'puesto', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            placeholder="Ej. Gerente de Logística"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Teléfono</Label>
                          <input
                            type="tel"
                            value={contacto.telefono}
                            onChange={(e) => updateContacto(index, 'telefono', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            placeholder="(55) 1234 5678"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Correo Electrónico</Label>
                          <input
                            type="email"
                            value={contacto.email}
                            onChange={(e) => updateContacto(index, 'email', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            placeholder="contacto@empresa.com"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {formData.contactos.length === 0 && (
                <div className="text-center py-6 bg-slate-50/50 rounded-lg border border-dashed border-red-200 bg-red-50/30">
                  <p className="text-sm text-red-500 font-medium">Requerido: No hay contactos registrados</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={addContacto}
                    className="text-blue-600 font-medium"
                  >
                    Agregar el primero ahora
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? 'Actualizar' : 'Crear'} Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ClienteDialog;
