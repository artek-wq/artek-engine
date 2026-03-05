import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  RefreshCcw,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

function FinanzasSection() {
  const [rangeStart, setRangeStart] = useState('160');
  const [rangeEnd, setRangeEnd] = useState('175');
  const [gastos, setGastos] = useState([]);
  const [gastoDialogOpen, setGastoDialogOpen] = useState(false);
  const [newGasto, setNewGasto] = useState({ referencia: '', descripcion: '', monto: '', fecha: '' });
  
  const { toast } = useToast();

  useEffect(() => {
    const savedGastos = localStorage.getItem('artek_gastos');
    if (savedGastos) {
      setGastos(JSON.parse(savedGastos));
    }
  }, []);

  const saveGastos = (newGastos) => {
    setGastos(newGastos);
    localStorage.setItem('artek_gastos', JSON.stringify(newGastos));
  };

  const handleAddGasto = () => {
    if (!newGasto.referencia || !newGasto.monto) {
      toast({ title: "Error", description: "Referencia y Monto son requeridos", variant: "destructive" });
      return;
    }
    const gasto = { id: Date.now(), ...newGasto, monto: parseFloat(newGasto.monto) };
    saveGastos([...gastos, gasto]);
    setGastoDialogOpen(false);
    setNewGasto({ referencia: '', descripcion: '', monto: '', fecha: '' });
    toast({ title: "Gasto Registrado", description: "El gasto se ha guardado correctamente." });
  };

  // Memoized calculations
  const analysis = useMemo(() => {
    const operations = JSON.parse(localStorage.getItem('artek_operaciones') || '[]');
    const invoices = JSON.parse(localStorage.getItem('artek_facturas') || '[]');
    // Pagos ahora son EGRESOS
    const payments = JSON.parse(localStorage.getItem('artek_pagos') || '[]'); 

    const start = parseInt(rangeStart) || 0;
    const end = parseInt(rangeEnd) || 999999;

    const getRefNum = (ref) => {
      const match = ref && ref.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const inRange = (ref) => {
      const num = getRefNum(ref);
      return num >= start && num <= end;
    };

    // Filter Items by Range
    const rangeRefs = operations.filter(op => inRange(op.referencia)).map(op => op.referencia);
    const uniqueRefs = [...new Set(rangeRefs)];

    const stats = uniqueRefs.map(ref => {
      // Ingresos (Facturas)
      const refInvoices = invoices.filter(inv => inv.referencia === ref || (inv.folio && inv.folio.includes(ref)));
      const totalInvoiced = refInvoices.reduce((sum, inv) => {
        // Asumiendo que inv.items tiene precio sin IVA
        const subtotal = inv.items?.reduce((s, i) => s + (i.precio * i.cantidad), 0) || 0;
        return sum + (subtotal * 1.16); // Total con IVA
      }, 0);

      // Egresos (Pagos desde sección Pagos)
      const refPagos = payments.filter(p => p.referencia === ref);
      const totalPagos = refPagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

      // Gastos Manuales (desde sección Finanzas)
      const refGastos = gastos.filter(g => g.referencia === ref);
      const totalGastosManuales = refGastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);

      // Total Egresos
      const totalEgresos = totalPagos + totalGastosManuales;

      // Balance / Utilidad
      const balance = totalInvoiced - totalEgresos;
      const margin = totalInvoiced > 0 ? (balance / totalInvoiced) * 100 : 0;

      return {
        ref,
        invoiced: totalInvoiced, // Ingresos
        pagosSystem: totalPagos, // Egresos Sistema
        gastosManual: totalGastosManuales, // Egresos Manuales
        totalExpenses: totalEgresos, // Total Egresos
        profit: balance,
        margin
      };
    });

    return stats;
  }, [rangeStart, rangeEnd, gastos]);

  const totals = useMemo(() => {
    return analysis.reduce((acc, curr) => ({
      invoiced: acc.invoiced + curr.invoiced,
      pagosSystem: acc.pagosSystem + curr.pagosSystem,
      gastosManual: acc.gastosManual + curr.gastosManual,
      totalExpenses: acc.totalExpenses + curr.totalExpenses,
      profit: acc.profit + curr.profit
    }), { invoiced: 0, pagosSystem: 0, gastosManual: 0, totalExpenses: 0, profit: 0 });
  }, [analysis]);

  const globalMargin = totals.invoiced > 0 ? (totals.profit / totals.invoiced) * 100 : 0;

  // Chart Helpers
  const maxVal = Math.max(...analysis.map(a => Math.max(a.invoiced, a.totalExpenses)), 1000);

  return (
    <div className="space-y-6">
      
      {/* Control Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end md:items-center gap-6 justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div>
             <Label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Desde Referencia</Label>
             <div className="flex items-center gap-2">
               <span className="text-slate-400 font-bold">AR</span>
               <input 
                 type="number" 
                 value={rangeStart}
                 onChange={e => setRangeStart(e.target.value)}
                 className="w-24 p-2 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
               />
             </div>
          </div>
          <div className="hidden md:flex items-center pt-6">
             <ArrowRight className="text-slate-300" />
          </div>
          <div>
             <Label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Hasta Referencia</Label>
             <div className="flex items-center gap-2">
               <span className="text-slate-400 font-bold">AR</span>
               <input 
                 type="number" 
                 value={rangeEnd}
                 onChange={e => setRangeEnd(e.target.value)}
                 className="w-24 p-2 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
               />
             </div>
          </div>
        </div>

        <div className="flex gap-3">
           <Button variant="outline" onClick={() => setGastoDialogOpen(true)} className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
              <PlusCircle className="w-4 h-4 mr-2" />
              Gasto Extra
           </Button>
           <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => window.location.reload()}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Actualizar
           </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <DollarSign className="w-16 h-16 text-blue-600" />
            </div>
            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2">Ingresos (Facturas)</p>
            <h3 className="text-2xl font-bold text-slate-900">${totals.invoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <div className="mt-2 text-xs font-medium text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded">
               100% Facturado
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <TrendingDown className="w-16 h-16 text-red-600" />
            </div>
            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2">Egresos Totales</p>
            <h3 className="text-2xl font-bold text-slate-900">${totals.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <div className="mt-2 text-xs font-medium text-red-600 bg-red-50 inline-block px-2 py-0.5 rounded">
               Pagos + Gastos
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <TrendingUp className="w-16 h-16 text-emerald-600" />
            </div>
            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2">Utilidad Operativa</p>
            <h3 className="text-2xl font-bold text-slate-900">${totals.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <div className={`mt-2 text-xs font-medium inline-block px-2 py-0.5 rounded ${globalMargin > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
               {globalMargin.toFixed(1)}% Margen
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Wallet className="w-16 h-16 text-indigo-600" />
            </div>
            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2">Desglose Egresos</p>
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                    <span>Pagos (Sys):</span>
                    <span className="font-bold">${totals.pagosSystem.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                    <span>Gastos (Extra):</span>
                    <span className="font-bold">${totals.gastosManual.toLocaleString()}</span>
                </div>
            </div>
         </div>
      </div>

      {/* Visual Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Main Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-slate-400" />
               Balance por Operación
            </h3>
            
            <div className="h-[300px] flex items-end gap-3 pb-2 overflow-x-auto">
               {analysis.length > 0 ? analysis.map((item) => (
                  <div key={item.ref} className="flex flex-col items-center gap-2 group min-w-[60px] flex-1">
                     <div className="relative w-full flex justify-center items-end h-full gap-1">
                        {/* Revenue Bar */}
                        <div 
                           className="w-3 bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600 relative"
                           style={{ height: `${(item.invoiced / maxVal) * 100}%` }}
                        >
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 whitespace-nowrap bg-white px-1 rounded shadow-sm border border-slate-100 z-10">
                              Ing: ${item.invoiced/1000}k
                           </div>
                        </div>
                        {/* Expense Bar */}
                        <div 
                           className="w-3 bg-red-400 rounded-t-sm transition-all group-hover:bg-red-500 relative"
                           style={{ height: `${(item.totalExpenses / maxVal) * 100}%` }}
                        >
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 whitespace-nowrap bg-white px-1 rounded shadow-sm border border-slate-100 z-10">
                              Egr: ${item.totalExpenses/1000}k
                           </div>
                        </div>
                     </div>
                     <span className="text-[10px] font-medium text-slate-500 -rotate-45 origin-top-left translate-y-2 mt-1 whitespace-nowrap">
                        {item.ref}
                     </span>
                  </div>
               )) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400">
                    Sin datos en el rango seleccionado
                 </div>
               )}
            </div>
         </div>

         {/* Distribution Summary */}
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen Financiero</h3>
            
            <div className="flex-1 flex flex-col justify-center space-y-6">
                {/* Custom Progress/Pie simulation */}
                <div>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Margen Neto</span>
                      <span className="font-bold text-slate-900">{globalMargin.toFixed(1)}%</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, globalMargin))}%` }}></div>
                   </div>
                </div>

                <div>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Eficiencia Operativa</span>
                      <span className="font-bold text-slate-900">
                         {totals.invoiced > 0 ? (100 - (totals.totalExpenses / totals.invoiced * 100)).toFixed(1) : 0}%
                      </span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.max(0, 100 - (totals.totalExpenses / totals.invoiced * 100))}%` }}></div>
                   </div>
                   <p className="text-xs text-slate-400 mt-1">Retención tras costos</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
                   <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div>
                         <h4 className="text-sm font-bold text-slate-800">Insight</h4>
                         <p className="text-xs text-slate-500 mt-1">
                            {globalMargin < 20 
                               ? "El margen operativo está bajo. Revise los pagos registrados en el módulo Pagos."
                               : "Salud financiera óptima. Balance positivo entre Facturación y Pagos."}
                         </p>
                      </div>
                   </div>
                </div>
            </div>
         </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">Detalle por Referencia</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                  <tr>
                     <th className="px-6 py-3">Referencia</th>
                     <th className="px-6 py-3 text-right">Facturado</th>
                     <th className="px-6 py-3 text-right">Pagos (Sys)</th>
                     <th className="px-6 py-3 text-right">Gastos (Man)</th>
                     <th className="px-6 py-3 text-right">Total Egresos</th>
                     <th className="px-6 py-3 text-right">Utilidad</th>
                     <th className="px-6 py-3 text-center">Margen</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {analysis.map((row) => (
                     <tr key={row.ref} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-900">{row.ref}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-600">${row.invoiced.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-500">${row.pagosSystem.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-500">${row.gastosManual.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-mono text-red-600">-${row.totalExpenses.toLocaleString()}</td>
                        <td className={`px-6 py-3 text-right font-mono font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                           ${row.profit.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-center">
                           <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.margin >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {row.margin.toFixed(1)}%
                           </span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={gastoDialogOpen} onOpenChange={setGastoDialogOpen}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Registrar Gasto Extraordinario</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Referencia</Label>
                  <input 
                    value={newGasto.referencia}
                    onChange={(e) => setNewGasto({...newGasto, referencia: e.target.value})}
                    placeholder="Ej: AR160M"
                    className="col-span-3 p-2 border border-slate-300 rounded-md text-sm"
                  />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Descripción</Label>
                  <input 
                    value={newGasto.descripcion}
                    onChange={(e) => setNewGasto({...newGasto, descripcion: e.target.value})}
                    placeholder="Concepto vario..."
                    className="col-span-3 p-2 border border-slate-300 rounded-md text-sm"
                  />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Monto</Label>
                  <input 
                    type="number"
                    value={newGasto.monto}
                    onChange={(e) => setNewGasto({...newGasto, monto: e.target.value})}
                    placeholder="0.00"
                    className="col-span-3 p-2 border border-slate-300 rounded-md text-sm"
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setGastoDialogOpen(false)}>Cancelar</Button>
               <Button onClick={handleAddGasto} className="bg-slate-900 text-white hover:bg-slate-800">Guardar</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}

export default FinanzasSection;