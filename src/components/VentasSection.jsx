import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  FileText, 
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Users
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

import LeadDialog from '@/components/LeadDialog';
import QuoteGeneratorDialog from '@/components/QuoteGeneratorDialog';
import VentasDocumentDialog from '@/components/VentasDocumentDialog';

const STATUS_COLORS = {
  'Nuevo Prospecto': 'bg-slate-200 text-slate-700 hover:bg-slate-300',
  'Contactado': 'bg-blue-200 text-blue-800 hover:bg-blue-300',
  'Propuesta Enviada': 'bg-purple-200 text-purple-800 hover:bg-purple-300',
  'Negociación': 'bg-amber-200 text-amber-800 hover:bg-amber-300',
  'Ganado': 'bg-emerald-400 text-emerald-900 hover:bg-emerald-500',
  'Perdido': 'bg-red-200 text-red-800 hover:bg-red-300'
};

const SELLERS = [
  { id: 1, name: 'Ana Garcia', avatar: 'AG' },
  { id: 2, name: 'Carlos Ruiz', avatar: 'CR' },
  { id: 3, name: 'Sofia Lopez', avatar: 'SL' },
];

function VentasSection() {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  
  // Quote Generator
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [selectedLeadForQuote, setSelectedLeadForQuote] = useState(null);

  // Documents
  const [docsOpen, setDocsOpen] = useState(false);
  const [selectedLeadForDocs, setSelectedLeadForDocs] = useState(null);

  const { toast } = useToast();

  useEffect(() => {
    const savedLeads = localStorage.getItem('artek_ventas_leads');
    if (savedLeads) {
      setLeads(JSON.parse(savedLeads));
    } else {
        // Initial Dummy Data
        const initialData = [
            {
                id: 1,
                empresa: 'Logistica Global SA',
                contacto: 'Roberto Mendez',
                email: 'rmendez@logglobal.com',
                telefono: '55 1234 5678',
                web: 'www.logglobal.com',
                status: 'Nuevo Prospecto',
                ultimoContacto: '2023-10-20',
                proximoContacto: new Date().toISOString().split('T')[0], // Today
                vendedor: 'AG',
                documentos: []
            },
            {
                id: 2,
                empresa: 'Importadores Unidos',
                contacto: 'Maria Fernanda',
                email: 'mafer@importu.mx',
                telefono: '55 8765 4321',
                web: 'www.importu.mx',
                status: 'Propuesta Enviada',
                ultimoContacto: '2023-10-18',
                proximoContacto: '2023-10-30',
                vendedor: 'CR',
                documentos: []
            }
        ];
        setLeads(initialData);
        localStorage.setItem('artek_ventas_leads', JSON.stringify(initialData));
    }
  }, []);

  const saveLeads = (newLeads) => {
    setLeads(newLeads);
    localStorage.setItem('artek_ventas_leads', JSON.stringify(newLeads));
  };

  const handleSaveLead = (leadData) => {
    if (editingLead) {
      const updatedLeads = leads.map(l => l.id === editingLead.id ? { ...l, ...leadData } : l);
      saveLeads(updatedLeads);
      toast({ title: "Prospecto actualizado", description: "Los cambios se han guardado." });
    } else {
      const newLead = {
        id: Date.now(),
        ...leadData,
        documentos: [], // Auto-create folder
        createdAt: new Date().toISOString()
      };
      saveLeads([...leads, newLead]);
      toast({ title: "Prospecto creado", description: "Carpeta de documentos inicializada." });
    }
    setLeadDialogOpen(false);
    setEditingLead(null);
  };

  const handleStatusChange = (leadId, newStatus) => {
    const updatedLeads = leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l);
    saveLeads(updatedLeads);
    toast({ title: "Status actualizado", description: `El prospecto ahora está en: ${newStatus}` });
  };

  const handleUpdateLeadDocs = (updatedLead) => {
     const updatedLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
     saveLeads(updatedLeads);
     // Update selection if open
     if (selectedLeadForDocs?.id === updatedLead.id) setSelectedLeadForDocs(updatedLead);
  };

  const isAlertActive = (dateString) => {
      if (!dateString) return false;
      const today = new Date().toISOString().split('T')[0];
      return dateString <= today;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const filteredLeads = leads.filter(l => 
    l.empresa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.contacto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Total Pipeline</p>
           <h3 className="text-2xl font-bold text-slate-800">{leads.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Alertas Activas</p>
           <h3 className="text-2xl font-bold text-amber-600 flex items-center gap-2">
             {leads.filter(l => isAlertActive(l.proximoContacto) && l.status !== 'Ganado' && l.status !== 'Perdido').length}
             <AlertTriangle className="w-5 h-5" />
           </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Cierres del Mes</p>
           <h3 className="text-2xl font-bold text-emerald-600">
             {leads.filter(l => l.status === 'Ganado').length}
           </h3>
        </div>
        <div className="bg-blue-600 p-4 rounded-xl border border-blue-700 shadow-sm text-white flex items-center justify-between cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => { setEditingLead(null); setLeadDialogOpen(true); }}>
           <div>
             <p className="text-blue-100 text-xs uppercase font-bold tracking-wider">Acción Rápida</p>
             <h3 className="text-xl font-bold">Nuevo Prospecto</h3>
           </div>
           <Plus className="w-8 h-8 opacity-50" />
        </div>
      </div>

      {/* Main Board Area */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
         {/* Toolbar */}
         <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4 flex-1">
               <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar empresa, contacto..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
               </div>
               <Button variant="outline" size="sm" className="hidden md:flex">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
               </Button>
            </div>
         </div>

         {/* Monday.com Style Table Header */}
         <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-3">Empresa / Contacto</div>
            <div className="col-span-2">Vendedor</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2">Seguimiento</div>
            <div className="col-span-3 text-right">Acciones</div>
         </div>

         {/* Scrollable Content */}
         <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-slate-50/30">
            <AnimatePresence>
               {filteredLeads.map((lead) => (
                  <motion.div 
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-12 gap-4 px-4 py-3 bg-white rounded-lg border border-slate-200 items-center hover:shadow-md transition-shadow group relative"
                  >
                     {/* Left Border Status Indicator */}
                     <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg ${STATUS_COLORS[lead.status]?.split(' ')[0] || 'bg-slate-200'}`}></div>

                     {/* Company Info */}
                     <div className="col-span-3 pl-2">
                        <h4 className="font-bold text-slate-800 text-sm truncate" title={lead.empresa}>{lead.empresa}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                           <User className="w-3 h-3" />
                           <span className="truncate">{lead.contacto}</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                           {lead.telefono && (
                             <a href={`tel:${lead.telefono}`} className="text-slate-400 hover:text-blue-600" title={lead.telefono}>
                               <Phone className="w-3 h-3" />
                             </a>
                           )}
                           {lead.email && (
                             <a href={`mailto:${lead.email}`} className="text-slate-400 hover:text-blue-600" title={lead.email}>
                               <Mail className="w-3 h-3" />
                             </a>
                           )}
                           {lead.web && (
                             <a href={`https://${lead.web}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600" title={lead.web}>
                               <Globe className="w-3 h-3" />
                             </a>
                           )}
                        </div>
                     </div>

                     {/* Salesperson */}
                     <div className="col-span-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200" title={SELLERS.find(s => s.avatar === lead.vendedor)?.name || 'Sin Asignar'}>
                           {lead.vendedor || 'N/A'}
                        </div>
                        <span className="text-xs text-slate-500 truncate hidden xl:block">
                           {SELLERS.find(s => s.avatar === lead.vendedor)?.name || 'Sin Asignar'}
                        </span>
                     </div>

                     {/* Status Pill (Interactive) */}
                     <div className="col-span-2 flex justify-center">
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <button className={`w-full max-w-[140px] py-1.5 px-3 rounded-full text-xs font-bold truncate transition-colors cursor-pointer ${STATUS_COLORS[lead.status]}`}>
                                 {lead.status}
                              </button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent>
                              <DropdownMenuLabel>Cambiar Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {Object.keys(STATUS_COLORS).map(status => (
                                 <DropdownMenuItem key={status} onClick={() => handleStatusChange(lead.id, status)}>
                                    <div className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[status]?.split(' ')[0]}`}></div>
                                    {status}
                                 </DropdownMenuItem>
                              ))}
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>

                     {/* Follow Up */}
                     <div className="col-span-2 text-xs">
                        <div className={`flex items-center gap-2 mb-1 ${isAlertActive(lead.proximoContacto) && lead.status !== 'Ganado' && lead.status !== 'Perdido' ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                           <Clock className="w-3 h-3" />
                           {lead.proximoContacto ? formatDate(lead.proximoContacto) : '-'}
                           {isAlertActive(lead.proximoContacto) && lead.status !== 'Ganado' && lead.status !== 'Perdido' && (
                              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                           )}
                        </div>
                        <div className="text-slate-400 truncate max-w-[150px]">
                           {lead.ultimoContacto ? `Último: ${formatDate(lead.ultimoContacto)}` : 'Sin contacto previo'}
                        </div>
                     </div>

                     {/* Actions */}
                     <div className="col-span-3 flex justify-end gap-2">
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                           onClick={() => { setSelectedLeadForDocs(lead); setDocsOpen(true); }}
                           title="Carpeta Documentos"
                         >
                            <FolderOpen className="w-4 h-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                           onClick={() => { setSelectedLeadForQuote(lead); setQuoteDialogOpen(true); }}
                           title="Generar Cotización"
                         >
                            <FileText className="w-4 h-4" />
                         </Button>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                                 <MoreHorizontal className="w-4 h-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingLead(lead); setLeadDialogOpen(true); }}>
                                 Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => {
                                 const newLeads = leads.filter(l => l.id !== lead.id);
                                 saveLeads(newLeads);
                                 toast({ title: "Prospecto eliminado" });
                              }}>
                                 Eliminar
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                  </motion.div>
               ))}
               {filteredLeads.length === 0 && (
                  <div className="text-center py-20 opacity-50">
                     <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                     <p>No se encontraron prospectos</p>
                  </div>
               )}
            </AnimatePresence>
         </div>
      </div>

      <LeadDialog 
        open={leadDialogOpen} 
        onOpenChange={setLeadDialogOpen}
        initialData={editingLead}
        onSave={handleSaveLead}
      />

      <QuoteGeneratorDialog
         open={quoteDialogOpen}
         onOpenChange={setQuoteDialogOpen}
         lead={selectedLeadForQuote}
         onGenerate={(leadWithNewDoc) => {
             handleUpdateLeadDocs(leadWithNewDoc);
             setQuoteDialogOpen(false);
         }}
      />

      <VentasDocumentDialog 
         open={docsOpen}
         onOpenChange={setDocsOpen}
         entity={selectedLeadForDocs}
         onUpdate={handleUpdateLeadDocs}
      />
    </div>
  );
}

export default VentasSection;