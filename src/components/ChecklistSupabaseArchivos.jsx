import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Wrench, 
  AlertTriangle, 
  Loader2,
  Database,
  Shield,
  FolderTree,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

const REQUIRED_FOLDERS = ['Operaciones', 'Ventas', 'Pagos', 'Facturas', 'Clientes', 'Finanzas', 'Proveedores'];
const BUCKET_NAME = 'team-files';

export default function ChecklistSupabaseArchivos() {
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const { toast } = useToast();
  
  const [diagnostics, setDiagnostics] = useState({
    env: { status: 'idle', details: '' },
    session: { status: 'idle', user: null, details: '' },
    bucket: { status: 'idle', details: '' },
    rls: { status: 'idle', details: '' },
    folders: { status: 'idle', existing: [], missing: [] }
  });

  const runDiagnostics = async () => {
    setLoading(true);
    const results = {
      env: { status: 'error', details: '' },
      session: { status: 'error', user: null, details: '' },
      bucket: { status: 'error', details: '' },
      rls: { status: 'error', details: '' },
      folders: { status: 'error', existing: [], missing: [] }
    };

    // 1. Environment Variables Check
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      results.env.status = 'ok';
      results.env.details = 'Variables de entorno configuradas correctamente.';
    } else {
      results.env.details = 'Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.';
    }

    // 2. Session Check
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        results.session.status = 'ok';
        results.session.user = session.user;
        results.session.details = `Usuario autenticado: ${session.user.email} (ID: ${session.user.id.slice(0,8)}...)`;
      } else {
        results.session.details = 'No hay sesión válida. Storage negará uploads.';
      }
    } catch (e) {
      results.session.details = `Error verificando sesión: ${e.message}`;
    }

    // 3. Bucket Access Check (LIST)
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 5 });
      if (error) {
        results.bucket.details = `Error al listar bucket '${BUCKET_NAME}': ${error.message}`;
      } else {
        results.bucket.status = 'ok';
        results.bucket.details = `Acceso al bucket '${BUCKET_NAME}' verificado. ${data.length} items encontrados en raíz.`;
      }
    } catch (e) {
      results.bucket.details = `Excepción al acceder al bucket: ${e.message}`;
    }

    // 4. RLS Check (Simulate Permissions)
    if (results.session.status === 'ok') {
      try {
        // SELECT is verified by the list above implicitly, but let's be explicit with storage.objects check if possible
        // or just rely on a Write/Delete test file
        const testFileName = `_diagnostic_${Date.now()}.txt`;
        const testFile = new File(["test content"], testFileName, { type: 'text/plain' });
        
        // Test INSERT
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(testFileName, testFile);
        
        if (uploadError) {
          results.rls.details = `Fallo en INSERT (Upload): ${uploadError.message}`;
        } else {
          // Test SELECT (Download)
          const { error: downloadError } = await supabase.storage.from(BUCKET_NAME).download(testFileName);
          
          // Test DELETE
          const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove([testFileName]);

          if (downloadError) {
            results.rls.details = `INSERT OK, pero fallo en SELECT (Download): ${downloadError.message}`;
          } else if (deleteError) {
             results.rls.details = `INSERT/SELECT OK, pero fallo en DELETE: ${deleteError.message}`;
          } else {
            results.rls.status = 'ok';
            results.rls.details = 'Permisos RLS (SELECT, INSERT, DELETE) verificados correctamente.';
          }
        }
      } catch (e) {
        results.rls.details = `Error probando permisos RLS: ${e.message}`;
      }
    } else {
      results.rls.details = 'No se puede probar RLS sin sesión de usuario.';
    }

    // 5. Folders Existence Check
    if (results.bucket.status === 'ok') {
      try {
        const { data } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 100 });
        const existingNames = data.map(item => item.name);
        
        const existing = [];
        const missing = [];

        REQUIRED_FOLDERS.forEach(folder => {
          if (existingNames.includes(folder)) {
            existing.push(folder);
          } else {
            missing.push(folder);
          }
        });

        results.folders.status = missing.length === 0 ? 'ok' : 'warning';
        results.folders.existing = existing;
        results.folders.missing = missing;
      } catch (e) {
        results.folders.details = `Error verificando carpetas: ${e.message}`;
      }
    } else {
      results.folders.details = 'No se puede verificar carpetas sin acceso al bucket.';
    }

    setDiagnostics(results);
    setLoading(false);
  };

  const handleRepair = async () => {
    if (diagnostics.folders.missing.length === 0) return;
    
    setRepairing(true);
    let repairedCount = 0;
    let errors = [];

    for (const folder of diagnostics.folders.missing) {
      // Create a dummy file to initialize folder
      const dummyFile = new File([""], ".keep", { type: 'text/plain' });
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(`${folder}/.keep`, dummyFile);
      
      if (error) {
        errors.push(`${folder}: ${error.message}`);
      } else {
        repairedCount++;
      }
    }

    setRepairing(false);
    
    if (errors.length > 0) {
      toast({
        title: "Reparación parcial",
        description: `Se crearon ${repairedCount} carpetas. Errores: ${errors.join(', ')}`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Reparación exitosa",
        description: `Se crearon ${repairedCount} carpetas faltantes.`,
      });
    }

    // Re-run diagnostics
    runDiagnostics();
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusItem = ({ status, title, details, icon: Icon }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border flex items-start gap-4 mb-3 ${
        status === 'ok' 
          ? 'bg-green-50 border-green-200' 
          : status === 'idle' 
            ? 'bg-slate-50 border-slate-200'
            : 'bg-red-50 border-red-200'
      }`}
    >
      <div className={`p-2 rounded-full ${
        status === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
      }`}>
        {status === 'idle' ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Icon className="w-5 h-5" />}
      </div>
      <div>
        <h4 className={`font-semibold ${
          status === 'ok' ? 'text-green-800' : 'text-red-800'
        }`}>
          {title}
        </h4>
        <p className={`text-sm mt-1 ${
          status === 'ok' ? 'text-green-700' : 'text-red-700'
        }`}>
          {status === 'idle' ? 'Verificando...' : details}
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Shield className="w-6 h-6 text-blue-600" />
             Diagnóstico de Archivos Supabase
           </h2>
           <p className="text-slate-500 mt-1">Herramienta para validar la conexión y permisos del sistema de archivos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runDiagnostics} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
          {diagnostics.folders.missing?.length > 0 && (
            <Button onClick={handleRepair} disabled={repairing || loading} className="bg-blue-600 hover:bg-blue-700">
              {repairing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
              Reparar Carpetas ({diagnostics.folders.missing.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna: LO QUE YA TIENE */}
        <Card className="border-green-100 shadow-sm">
          <CardHeader className="bg-green-50/50 border-b border-green-100 pb-4">
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              LO QUE YA TIENE
            </CardTitle>
            <CardDescription>Configuraciones y recursos verificados exitosamente</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {diagnostics.env.status === 'ok' && (
              <StatusItem 
                status="ok" 
                title="Variables de Entorno" 
                details={diagnostics.env.details} 
                icon={Database} 
              />
            )}
            
            {diagnostics.session.status === 'ok' && (
              <StatusItem 
                status="ok" 
                title="Sesión de Usuario" 
                details={diagnostics.session.details} 
                icon={UserCheck} 
              />
            )}

            {diagnostics.bucket.status === 'ok' && (
              <StatusItem 
                status="ok" 
                title="Acceso al Bucket 'team-files'" 
                details={diagnostics.bucket.details} 
                icon={FolderTree} 
              />
            )}

            {diagnostics.rls.status === 'ok' && (
              <StatusItem 
                status="ok" 
                title="Permisos RLS (CRUD)" 
                details={diagnostics.rls.details} 
                icon={Shield} 
              />
            )}

            {diagnostics.folders.existing?.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2 text-green-800 font-semibold">
                  <FolderTree className="w-5 h-5" />
                  Carpetas Existentes
                </div>
                <div className="flex flex-wrap gap-2">
                  {diagnostics.folders.existing.map(folder => (
                    <span key={folder} className="px-2 py-1 bg-white border border-green-200 text-green-700 text-xs rounded-md font-mono">
                      {folder}/
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {Object.values(diagnostics).every(d => d.status !== 'ok') && !loading && (
               <p className="text-center text-slate-400 italic py-8">No se encontraron elementos exitosos.</p>
            )}
          </CardContent>
        </Card>

        {/* Columna: LO QUE FALTA */}
        <Card className="border-red-100 shadow-sm">
          <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              LO QUE FALTA
            </CardTitle>
            <CardDescription>Problemas detectados que requieren atención</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {diagnostics.env.status === 'error' && (
              <StatusItem 
                status="error" 
                title="Variables de Entorno" 
                details={diagnostics.env.details} 
                icon={Database} 
              />
            )}
            
            {diagnostics.session.status === 'error' && (
              <StatusItem 
                status="error" 
                title="Sesión de Usuario" 
                details={diagnostics.session.details} 
                icon={UserCheck} 
              />
            )}

            {diagnostics.bucket.status === 'error' && (
              <StatusItem 
                status="error" 
                title="Acceso al Bucket" 
                details={diagnostics.bucket.details} 
                icon={FolderTree} 
              />
            )}

            {diagnostics.rls.status === 'error' && (
              <StatusItem 
                status="error" 
                title="Permisos RLS" 
                details={diagnostics.rls.details} 
                icon={Shield} 
              />
            )}

            {diagnostics.folders.missing?.length > 0 && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="bg-red-50 border border-red-200 rounded-lg p-4"
               >
                 <div className="flex items-center justify-between mb-2 text-red-800 font-semibold">
                   <div className="flex items-center gap-2">
                     <AlertTriangle className="w-5 h-5" />
                     Carpetas Faltantes
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-2 mb-3">
                   {diagnostics.folders.missing.map(folder => (
                     <span key={folder} className="px-2 py-1 bg-white border border-red-200 text-red-700 text-xs rounded-md font-mono">
                       {folder}/
                     </span>
                   ))}
                 </div>
                 <Button 
                   size="sm" 
                   onClick={handleRepair} 
                   disabled={repairing}
                   className="w-full bg-red-600 hover:bg-red-700 text-white"
                 >
                   {repairing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wrench className="w-3 h-3 mr-2" />}
                   Crear carpetas faltantes ahora
                 </Button>
               </motion.div>
            )}

            {Object.values(diagnostics).every(d => d.status === 'ok' || (d.existing && !d.missing?.length)) && !loading && (
               <div className="flex flex-col items-center justify-center py-12 text-center">
                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                   <CheckCircle className="w-8 h-8 text-green-600" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900">¡Todo en orden!</h3>
                 <p className="text-slate-500 mt-1 max-w-xs">No se detectaron problemas en la configuración de archivos.</p>
               </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}