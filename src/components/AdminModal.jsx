import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAdminSettings } from '@/contexts/AdminSettingsContext';
import { getErrors, clearErrors, subscribeToErrors } from '@/lib/ErrorLogger';
import { Shield, AlertTriangle, Save, Trash2, Copy, Check, Terminal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export default function AdminModal({ open, onOpenChange }) {
  const { setSupabaseKey, getSupabaseKey } = useAdminSettings();
  const [keyInput, setKeyInput] = useState('');
  const [errors, setErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setKeyInput(getSupabaseKey() || '');
    }
  }, [open, getSupabaseKey]);

  useEffect(() => {
    setErrors(getErrors());
    const unsubscribe = subscribeToErrors(setErrors);
    return () => unsubscribe();
  }, []);

  const handleSaveKey = () => {
    setIsSaving(true);
    try {
      setSupabaseKey(keyInput);
      toast({
        title: "Configuración guardada",
        description: "La clave de Supabase se ha actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error de configuración",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyError = (text) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Error copiado al portapapeles" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 bg-white/95 backdrop-blur-xl border-slate-200 shadow-2xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 rounded-lg">
               <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Panel de Administración</DialogTitle>
              <DialogDescription className="text-slate-500">Configuración del sistema y diagnóstico de errores</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="config" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="config" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Configuración</TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">Registro de Errores</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="config" className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="space-y-4 max-w-2xl mx-auto mt-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Supabase Anon Key
                </h3>
                <p className="text-sm text-blue-700">
                  Esta clave se utiliza para autenticar las solicitudes cliente. Si se deja vacía, se utilizará la clave por defecto definida en las variables de entorno.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">Clave Pública (Anon Key)</Label>
                <div className="relative">
                  <textarea
                    id="apiKey"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs text-slate-600 resize-none transition-all"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                  {keyInput && (
                     <div className="absolute bottom-3 right-3">
                        <Check className="w-4 h-4 text-green-500" />
                     </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveKey} 
                  disabled={isSaving}
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                  <Save className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden p-0">
             <div className="px-6 py-2 flex justify-between items-center border-b border-slate-100 bg-slate-50/30">
                <div className="text-sm text-slate-500 font-medium">
                  Total: {errors.length} eventos registrados
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => clearErrors()}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpiar Todo
                </Button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
               {errors.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Check className="w-12 h-12 mb-3 text-slate-300" />
                    <p>No hay errores registrados</p>
                 </div>
               ) : (
                 errors.map((error) => (
                   <div key={error.id} className="group relative bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
                     <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border",
                              error.type === 'AUTH' ? "bg-orange-50 text-orange-600 border-orange-200" :
                              error.type === 'PERMISSION' ? "bg-red-50 text-red-600 border-red-200" :
                              error.type === 'CONNECTION' ? "bg-blue-50 text-blue-600 border-blue-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                              {error.type}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {new Date(error.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="font-medium text-slate-800 text-sm">{error.message}</p>
                          {error.details && error.details !== 'null' && (
                             <pre className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 text-[10px] text-slate-600 overflow-x-auto">
                               {error.details}
                             </pre>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyError(`${error.message}\n${error.details}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                        </Button>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}