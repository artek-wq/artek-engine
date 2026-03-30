import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X, File, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { uploadDocument, TIPOS_DOCUMENTO, formatFileSize, sanitizeName } from '@/lib/documentService';

/**
 * FileUploadDialog — usa documentService como único punto de upload.
 *
 * Props:
 *   open, onOpenChange, onUploadComplete
 *   entidadTipo  — 'operacion' | 'cliente' | 'proveedor' | ...
 *   entidadId    — UUID
 *   subfolder    — 'general' | 'facturacion' | 'pagos_proveedores'
 *
 * (Compatibilidad) currentFolder: si se pasa en lugar de entidadTipo/entidadId,
 * se parsea automáticamente como "{tipo}/{id}/{subfolder}".
 */
function FileUploadDialog({ open, onOpenChange, onUploadComplete,
  entidadTipo: propTipo, entidadId: propId, subfolder: propSubfolder,
  currentFolder }) {

  // Parsear currentFolder si viene en modo legacy
  let entidadTipo = propTipo, entidadId = propId, subfolder = propSubfolder || 'general';
  if (!entidadTipo && currentFolder) {
    const parts = currentFolder.split('/');
    entidadTipo = parts[0] || 'general';
    entidadId = parts[1] || '';
    subfolder = parts[2] || 'general';
  }

  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [tipoManual, setTipoManual] = useState('');

  const handleDragOver = useCallback(e => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(e => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback(e => {
    e.preventDefault(); setIsDragging(false);
    setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);
  const handleSelect = e => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
  const removeFile = i => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    if (!entidadId) {
      toast({ title: 'Error', description: 'No se puede determinar la carpeta destino.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const prog = {};

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      prog[i] = 'uploading';
      setProgress({ ...prog });

      const { error } = await uploadDocument({
        file,
        entidadTipo,
        entidadId,
        subfolder,
        tipoManual: tipoManual || undefined,
        onProgress: pct => setProgress(prev => ({ ...prev, [`${i}_pct`]: pct })),
      });

      prog[i] = error ? 'error' : 'success';
      if (error) {
        toast({ title: `Error: ${file.name}`, description: error.message, variant: 'destructive' });
      }
      setProgress({ ...prog });
    }

    const ok = Object.values(prog).filter(v => v === 'success').length;
    toast({ title: 'Carga completada', description: `${ok} de ${selectedFiles.length} archivos subidos.` });

    setUploading(false);
    setTimeout(() => {
      setSelectedFiles([]); setProgress({}); setTipoManual('');
      onUploadComplete?.();
      onOpenChange(false);
    }, 1000);
  };

  const close = () => { if (!uploading) { setSelectedFiles([]); setProgress({}); onOpenChange(false); } };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Subir archivos
            {entidadId && (
              <span className="text-sm font-normal text-slate-500">— {entidadTipo}/{subfolder}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zona drag & drop */}
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => document.getElementById('fu-input').click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-slate-300'}`} />
            <p className="text-sm font-medium text-slate-700">Arrastra archivos aquí o haz clic para seleccionar</p>
            <p className="text-xs text-slate-400 mt-1">Múltiples archivos · Máx. 50 MB por archivo</p>
            <input id="fu-input" type="file" multiple onChange={handleSelect} className="hidden" />
          </div>

          {/* Selector de tipo de documento */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600 shrink-0">Tipo de documento:</label>
            <div className="relative flex-1">
              <select value={tipoManual} onChange={e => setTipoManual(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                <option value="">Detectar automáticamente</option>
                {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Lista de archivos seleccionados */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
              </p>
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <File className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)} → {sanitizeName(file.name)}</p>
                    {/* Barra de progreso */}
                    {progress[`${i}_pct`] !== undefined && progress[i] === 'uploading' && (
                      <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress[`${i}_pct`] || 0}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {progress[i] === 'uploading' && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                    {progress[i] === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {progress[i] === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {!progress[i] && !uploading && (
                      <button onClick={() => removeFile(i)} className="p-1 hover:bg-slate-200 rounded transition">
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button variant="outline" onClick={close} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!selectedFiles.length || uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {uploading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Subiendo...</>
                : <><Upload className="w-4 h-4 mr-2" />Subir {selectedFiles.length > 1 ? `${selectedFiles.length} archivos` : 'archivo'}</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FileUploadDialog;
