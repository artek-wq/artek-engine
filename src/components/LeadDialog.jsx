import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, Building, Mail, Phone, Globe, Calendar, Briefcase } from 'lucide-react';

const LeadDialog = ({ open, onOpenChange, initialData, onSave }) => {
  const [formData, setFormData] = useState({
    empresa: '',
    contacto: '',
    email: '',
    telefono: '',
    web: '',
    status: 'Nuevo Prospecto',
    proximoContacto: '',
    notas: '',
    vendedor: 'AG'
  });

  useEffect(() => {
    if (open) {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                empresa: '',
                contacto: '',
                email: '',
                telefono: '',
                web: '',
                status: 'Nuevo Prospecto',
                proximoContacto: '',
                notas: '',
                vendedor: 'AG'
            });
        }
    }
  }, [open, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Prospecto' : 'Nuevo Prospecto'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
               <Label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                  <Building className="w-3 h-3" /> Empresa
               </Label>
               <input 
                 required
                 name="empresa"
                 value={formData.empresa}
                 onChange={handleChange}
                 className="w-full p-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                 placeholder="Nombre de la empresa"
               />
            </div>

            <div className="space-y-2">
               <Label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                  <User className="w-3 h-3" /> Contacto Principal
               </Label>
               <input 
                 required
                 name="contacto"
                 value={formData.contacto}
                 onChange={handleChange}
                 className="w-full p-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                 placeholder="Nombre del contacto"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                      <Mail className="w-3 h-3" /> Email
                   </Label>
                   <input 
                     type="email"
                     name="email"
                     value={formData.email}
                     onChange={handleChange}
                     className="w-full p-2 rounded-md border border-slate-300 text-sm outline-none"
                     placeholder="correo@ejemplo.com"
                   />
                </div>
                <div className="space-y-2">
                   <Label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                      <Phone className="w-3 h-3" /> Teléfono
                   </Label>
                   <input 
                     name="telefono"
                     value={formData.telefono}
                     onChange={handleChange}
                     className="w-full p-2 rounded-md border border-slate-300 text-sm outline-none"
                     placeholder="55..."
                   />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                      <Globe className="w-3 h-3" /> Website
                   </Label>
                   <input 
                     name="web"
                     value={formData.web}
                     onChange={handleChange}
                     className="w-full p-2 rounded-md border border-slate-300 text-sm outline-none"
                     placeholder="www..."
                   />
                </div>
                <div className="space-y-2">
                   <Label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                      <Briefcase className="w-3 h-3" /> Asignar a
                   </Label>
                   <select 
                     name="vendedor"
                     value={formData.vendedor}
                     onChange={handleChange}
                     className="w-full p-2 rounded-md border border-slate-300 text-sm outline-none bg-white"
                   >
                      <option value="AG">Ana Garcia</option>
                      <option value="CR">Carlos Ruiz</option>
                      <option value="SL">Sofia Lopez</option>
                   </select>
                </div>
            </div>

            <div className="space-y-2">
               <Label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                  <Calendar className="w-3 h-3" /> Próximo Seguimiento
               </Label>
               <input 
                 type="date"
                 name="proximoContacto"
                 value={formData.proximoContacto}
                 onChange={handleChange}
                 className="w-full p-2 rounded-md border border-slate-300 text-sm outline-none"
               />
               <p className="text-[10px] text-slate-400">Se generará una alerta en la fecha seleccionada.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDialog;