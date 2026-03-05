import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Eye, FileText, Image, File, Loader2 } from 'lucide-react';
import { formatFileSize, formatDate, getFileIcon, isImage, isPDF } from '@/lib/fileUtils';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function FileList({ files, loading, onDownload, onDelete, onPreview }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  const handleDeleteClick = (file) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      onDelete(fileToDelete);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const getIconComponent = (fileName) => {
    const iconType = getFileIcon(fileName);
    switch (iconType) {
      case 'Image':
        return <Image className="w-5 h-5 text-blue-600" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-red-600" />;
      default:
        return <File className="w-5 h-5 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-slate-600">Cargando archivos...</span>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
        <File className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-700 mb-2">No hay archivos en esta carpeta</h3>
        <p className="text-slate-500 text-sm">Sube archivos usando el botón "Subir Archivos"</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        {files.map((file, index) => (
          <motion.div
            key={file.id || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="shrink-0">
                {getIconComponent(file.name)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {file.name}
                </h4>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span>{formatFileSize(file.metadata?.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => onPreview(file)}
                  title="Vista previa"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                  onClick={() => onDownload(file)}
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteClick(file)}
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo <span className="font-semibold">{fileToDelete?.name}</span> será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default FileList;