import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Image as ImageIcon, File, AlertTriangle } from 'lucide-react';
import { isImage, isPDF, formatFileSize, formatDate, getPublicUrl } from '@/lib/fileUtils';
import { motion } from 'framer-motion';

function FilePreviewModal({ open, onOpenChange, file, bucket, onDownload }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (file && open) {
      setImageError(false);
      if (isImage(file.name)) {
        const url = getPublicUrl(bucket, `${file.folder}/${file.name}`);
        setPreviewUrl(url);
      }
    }

    return () => setPreviewUrl(null);
  }, [file, open, bucket]);

  if (!file) return null;

  const isImageFile = isImage(file.name);
  const isPDFFile = isPDF(file.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImageFile && <ImageIcon className="w-5 h-5 text-blue-600" />}
            {isPDFFile && <FileText className="w-5 h-5 text-red-600" />}
            {!isImageFile && !isPDFFile && <File className="w-5 h-5 text-slate-600" />}
            {file.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          {isImageFile && previewUrl && !imageError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-4"
              style={{ maxHeight: '500px' }}
            >
              <img
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onError={() => setImageError(true)}
              />
            </motion.div>
          )}

          {/* Image Error State */}
          {isImageFile && imageError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">No se pudo cargar la vista previa</h3>
              <p className="text-sm text-slate-600 mb-4">
                La imagen no está disponible o el enlace ha caducado. Intenta descargarla.
              </p>
              <Button onClick={onDownload} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Descargar Imagen
              </Button>
            </div>
          )}

          {/* PDF Info */}
          {isPDFFile && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <FileText className="w-16 h-16 text-red-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">Documento PDF</h3>
              <p className="text-sm text-slate-600 mb-4">
                Descarga el archivo para visualizarlo en tu visor de PDF preferido.
              </p>
              <Button onClick={onDownload} className="bg-red-600 hover:bg-red-700">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          )}

          {/* Other Files Info */}
          {!isImageFile && !isPDFFile && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <File className="w-16 h-16 text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">Archivo</h3>
              <p className="text-sm text-slate-600 mb-4">
                Descarga el archivo para abrirlo en tu aplicación predeterminada.
              </p>
              <Button onClick={onDownload} className="bg-slate-900 hover:bg-slate-800">
                <Download className="w-4 h-4 mr-2" />
                Descargar Archivo
              </Button>
            </div>
          )}

          {/* File Details */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Detalles del Archivo</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Tamaño:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {formatFileSize(file.metadata?.size)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Fecha de subida:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {formatDate(file.created_at)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Carpeta:</span>
                <span className="ml-2 font-medium text-slate-900 font-mono text-xs bg-white px-2 py-1 rounded">
                  {file.folder || 'root'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
            {isImageFile && !imageError && (
              <Button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Descargar Imagen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilePreviewModal;