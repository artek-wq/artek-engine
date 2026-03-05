import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile, BUCKET_NAME, getFriendlyErrorMessage } from '@/lib/fileUtils';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

function FileUploadDialog({ open, onOpenChange, currentFolder, onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const { toast } = useToast();

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No hay archivos",
        description: "Selecciona al menos un archivo para subir.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    const progress = {};

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      progress[i] = { status: 'uploading', name: file.name };
      setUploadProgress({ ...progress });

      const { data, error } = await uploadFile(BUCKET_NAME, currentFolder, file);

      if (error) {
        progress[i] = { status: 'error', name: file.name };
        toast({
          title: "Error al subir",
          description: `${file.name}: ${getFriendlyErrorMessage(error)}`,
          variant: "destructive"
        });
      } else {

        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();

        const filePath = `${currentFolder}/${file.name}`;

        let clienteId = null;
        let operacionId = null;

        if (currentFolder?.startsWith('clientes/')) {
          clienteId = currentFolder.split('/')[1];
        }

        if (currentFolder?.startsWith('operaciones/')) {
          operacionId = currentFolder.split('/')[1];
        }

        await supabase.from('documentos').insert({
          nombre: file.name,
          tipo: file.type,
          archivo_path: filePath,
          cliente_id: clienteId,
          operacion_id: operacionId,
          created_by: user?.id || null
        });

        progress[i] = { status: 'success', name: file.name };
      }

      setUploadProgress({ ...progress });
    }

    const successCount = Object.values(progress).filter(p => p.status === 'success').length;

    toast({
      title: "Carga completada",
      description: `${successCount} de ${selectedFiles.length} archivos subidos correctamente.`
    });

    setUploading(false);

    setTimeout(() => {
      setSelectedFiles([]);
      setUploadProgress({});
      onUploadComplete?.();
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subir Archivos - {currentFolder || 'Root'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }
            `}
          >
            <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
            <p className="text-slate-700 font-medium mb-1">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-slate-500">Soporta múltiples archivos</p>

            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => document.getElementById('file-upload').click()}
              >
                Seleccionar Archivos
              </Button>
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-700">
                Archivos Seleccionados ({selectedFiles.length})
              </h4>
              <AnimatePresence>
                {selectedFiles.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {uploadProgress[index]?.status === 'uploading' && (
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      )}
                      {uploadProgress[index]?.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      )}
                      {uploadProgress[index]?.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}

                      {!uploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Archivos
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FileUploadDialog;