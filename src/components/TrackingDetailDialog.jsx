import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plane, Ship, Truck, MapPin, Calendar, Clock, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const TrackingDetailDialog = ({ open, onOpenChange, operacion, onUpdate }) => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    fecha: new Date().toISOString().slice(0, 16),
    descripcion: '',
    ubicacion: ''
  });

  if (!operacion) return null;

  // Calculate Progress
  const calculateProgress = () => {
    if (!operacion.etd || !operacion.eta) return 0;
    const start = new Date(operacion.etd).getTime();
    const end = new Date(operacion.eta).getTime();
    const now = new Date().getTime();

    if (now >= end) return 100;
    if (now <= start) return 0;

    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const progress = calculateProgress();

  const handleAddEvent = (e) => {
    e.preventDefault();
    const event = {
      id: Date.now(),
      ...newEvent,
      createdAt: new Date().toISOString()
    };

    const updatedOperacion = {
      ...operacion,
      eventos: [...(operacion.eventos || []), event].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    };

    onUpdate(updatedOperacion);
    setShowEventForm(false);
    setNewEvent({
      fecha: new Date().toISOString().slice(0, 16),
      descripcion: '',
      ubicacion: ''
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'A': return <Plane className="w-6 h-6" />;
      case 'T': return <Truck className="w-6 h-6" />;
      default: return <Ship className="w-6 h-6" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--/--/----';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const sortedEvents = (operacion.eventos || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-0 gap-0">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/10 p-2 rounded-lg">
                  {getTypeIcon(operacion.tipoOperacion)}
                </div>
                <h2 className="text-2xl font-bold">{operacion.referencia}</h2>
              </div>
              <p className="text-slate-400 text-sm">Cliente: {operacion.cliente}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              operacion.status === 'Completado' ? 'bg-emerald-500 text-white' : 
              operacion.status === 'En Proceso' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              {operacion.status}
            </div>
          </div>

          {/* Route Info */}
          <div className="mt-8 flex items-center justify-between text-sm">
             <div className="text-left">
                <p className="text-slate-400 text-xs uppercase mb-1">Origen</p>
                <p className="font-semibold text-lg">{operacion.origen || 'N/A'}</p>
                <p className="text-slate-400">{formatDate(operacion.etd)}</p>
             </div>
             <div className="flex-1 px-8 relative">
                {/* Progress Bar Container */}
                <div className="h-2 bg-slate-700 rounded-full w-full overflow-hidden relative">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${progress}%` }}
                     transition={{ duration: 1, ease: "easeOut" }}
                     className="h-full bg-blue-500 relative"
                   />
                </div>
                {/* Moving Icon */}
                <motion.div 
                  initial={{ left: 0 }}
                  animate={{ left: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-blue-400 bg-slate-900 p-1 rounded-full border border-slate-700"
                >
                  {getTypeIcon(operacion.tipoOperacion)}
                </motion.div>
             </div>
             <div className="text-right">
                <p className="text-slate-400 text-xs uppercase mb-1">Destino</p>
                <p className="font-semibold text-lg">{operacion.destino || 'N/A'}</p>
                <p className="text-slate-400">{formatDate(operacion.eta)}</p>
             </div>
          </div>
        </div>

        <div className="p-6">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
               <label className="text-xs text-slate-500 uppercase font-bold">Bultos</label>
               <p className="text-slate-800 font-medium">{operacion.bultos || '-'}</p>
            </div>
            <div>
               <label className="text-xs text-slate-500 uppercase font-bold">CBM</label>
               <p className="text-slate-800 font-medium">{operacion.cbm || '-'}</p>
            </div>
            <div>
               <label className="text-xs text-slate-500 uppercase font-bold">Contenedor</label>
               <p className="text-slate-800 font-medium">{operacion.contenedor || '-'}</p>
            </div>
            <div>
               <label className="text-xs text-slate-500 uppercase font-bold">MBL/HBL</label>
               <p className="text-slate-800 font-medium truncate" title={operacion.mbl}>{operacion.mbl || '-'}</p>
            </div>
          </div>

          {/* Events Section */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-900">Bitácora de Eventos</h3>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowEventForm(!showEventForm)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Agregar Evento
            </Button>
          </div>

          {/* Add Event Form */}
          {showEventForm && (
             <motion.form 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 space-y-3"
               onSubmit={handleAddEvent}
             >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Fecha y Hora</Label>
                    <input 
                      type="datetime-local" 
                      required
                      className="w-full text-sm p-2 rounded border border-blue-200"
                      value={newEvent.fecha}
                      onChange={e => setNewEvent({...newEvent, fecha: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ubicación</Label>
                    <input 
                      type="text" 
                      className="w-full text-sm p-2 rounded border border-blue-200"
                      placeholder="Ej. Puerto de Manzanillo"
                      value={newEvent.ubicacion}
                      onChange={e => setNewEvent({...newEvent, ubicacion: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                   <Label className="text-xs">Descripción del Evento</Label>
                   <input 
                      type="text" 
                      required
                      className="w-full text-sm p-2 rounded border border-blue-200"
                      placeholder="Ej. Carga recibida en almacén..."
                      value={newEvent.descripcion}
                      onChange={e => setNewEvent({...newEvent, descripcion: e.target.value})}
                   />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                   <Button type="button" variant="ghost" size="sm" onClick={() => setShowEventForm(false)}>Cancelar</Button>
                   <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">Guardar Evento</Button>
                </div>
             </motion.form>
          )}

          {/* Events Timeline */}
          <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {sortedEvents.length > 0 ? (
              sortedEvents.map((event, idx) => (
                <div key={idx} className="relative pl-8">
                   <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow-sm z-10"></div>
                   <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-slate-800 text-sm">{event.descripcion}</span>
                        <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                           <Calendar className="w-3 h-3" />
                           {new Date(event.fecha).toLocaleDateString('es-MX')}
                           <Clock className="w-3 h-3 ml-1" />
                           {new Date(event.fecha).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      {event.ubicacion && (
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                           <MapPin className="w-3 h-3" />
                           {event.ubicacion}
                        </div>
                      )}
                   </div>
                </div>
              ))
            ) : (
              <div className="pl-8 text-sm text-slate-400 italic py-4">
                No hay eventos registrados aún.
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackingDetailDialog;