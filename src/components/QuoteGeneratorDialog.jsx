import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Calculator, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const QuoteGeneratorDialog = ({ open, onOpenChange, lead, onGenerate }) => {
  const { toast } = useToast();
  const [items, setItems] = useState([
    { id: 1, description: 'Flete Marítimo Internacional', qty: 1, price: 0 }
  ]);
  const [currency, setCurrency] = useState('USD');

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), description: '', qty: 1, price: 0 }]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  };

  const handleGenerate = () => {
    if (!lead) return;

    // Simulate PDF generation
    toast({
      title: "Generando PDF...",
      description: "Por favor espere un momento."
    });

    setTimeout(() => {
        const total = calculateTotal();
        const quoteRef = `COT-${Math.floor(Math.random() * 10000)}`;
        
        const newDoc = {
            id: Date.now(),
            name: `Cotización ${quoteRef} - ${lead.empresa}.pdf`,
            type: 'application/pdf',
            size: '145 KB',
            date: new Date().toISOString(),
            url: '#' // Placeholder
        };

        const updatedLead = {
            ...lead,
            documentos: [...(lead.documentos || []), newDoc],
            status: lead.status === 'Nuevo Prospecto' ? 'Propuesta Enviada' : lead.status
        };

        toast({
            title: "Cotización Generada",
            description: `Se ha guardado en la carpeta de documentos del cliente.`
        });

        onGenerate(updatedLead);
        // Reset form
        setItems([{ id: 1, description: 'Flete Marítimo Internacional', qty: 1, price: 0 }]);
    }, 1500);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <Calculator className="w-5 h-5 text-blue-600" />
             Generador de Cotizaciones
          </DialogTitle>
          <p className="text-sm text-slate-500">Cliente: {lead.empresa} ({lead.contacto})</p>
        </DialogHeader>

        <div className="py-4 space-y-4">
           {/* Currency Selector */}
           <div className="flex justify-end mb-2">
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded p-1 text-sm font-bold"
              >
                  <option value="USD">USD - Dólar Americano</option>
                  <option value="MXN">MXN - Peso Mexicano</option>
              </select>
           </div>

           {/* Items Header */}
           <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 uppercase pb-2 border-b border-slate-100">
              <div className="col-span-6">Concepto</div>
              <div className="col-span-2 text-center">Cant.</div>
              <div className="col-span-3 text-right">Precio Unit.</div>
              <div className="col-span-1"></div>
           </div>

           {/* Items List */}
           <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                          <input 
                            type="text" 
                            placeholder="Descripción del servicio"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          />
                      </div>
                      <div className="col-span-2">
                          <input 
                            type="number" 
                            min="1"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-center"
                            value={item.qty}
                            onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value))}
                          />
                      </div>
                      <div className="col-span-3">
                          <input 
                            type="number" 
                            min="0"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-right"
                            value={item.price}
                            onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                          />
                      </div>
                      <div className="col-span-1 text-center">
                          <button 
                             onClick={() => handleRemoveItem(item.id)}
                             className="text-slate-400 hover:text-red-500 transition-colors"
                             disabled={items.length === 1}
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              ))}
           </div>

           <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2 text-blue-600 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100">
               <Plus className="w-4 h-4 mr-2" /> Agregar Concepto
           </Button>

           {/* Totals */}
           <div className="mt-6 border-t border-slate-200 pt-4 flex justify-end">
               <div className="w-48">
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-sm text-slate-500">Subtotal:</span>
                       <span className="font-bold text-slate-700">{calculateTotal().toFixed(2)} {currency}</span>
                   </div>
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-sm text-slate-500">IVA (16%):</span>
                       <span className="font-bold text-slate-700">{(calculateTotal() * 0.16).toFixed(2)} {currency}</span>
                   </div>
                   <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                       <span className="text-base font-bold text-slate-900">Total:</span>
                       <span className="text-xl font-bold text-blue-600">{(calculateTotal() * 1.16).toFixed(2)} {currency}</span>
                   </div>
               </div>
           </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGenerate}>
              <FileText className="w-4 h-4 mr-2" />
              Generar y Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteGeneratorDialog;