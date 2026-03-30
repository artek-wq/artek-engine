import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FolderOpen, Upload, Download, Trash2, Eye, File, FileText, Image as ImageIcon,
  Loader2, RefreshCw, X
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  listDocuments, deleteDocument, downloadDocument, getSignedUrl,
  formatFileSize, formatDate, getTipoLabel, isImage, isPDF, BUCKET
} from '@/lib/documentService';
import { supabase } from '@/lib/customSupabaseClient';
import FileUploadDialog from '@/components/FileUploadDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

function ProveedorFilesDialog({ open, onOpenChange, proveedor }) {
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);

  const loadDocs = useCallback(async () => {
    if (!proveedor?.id) return;
    setLoading(true);
    const { data, error } = await listDocuments({ entidadTipo: 'proveedor', entidadId: proveedor.id });
    setLoading(false);
    if (error) { toast({ title: 'Error cargando archivos', description: error.message, variant: 'destructive' }); return; }
    setDocs(data);
  }, [proveedor?.id, toast]);

  useEffect(() => { if (open && proveedor) loadDocs(); }, [open, proveedor, loadDocs]);

  const handlePreview = async (doc) => {
    setPreviewDoc(doc); setPreviewUrl(null); setPreviewLoading(true);
    if (isImage(doc.nombre) || isPDF(doc.nombre)) {
      const { url } = await getSignedUrl(doc.archivo_path, 3600);
      setPreviewUrl(url);
    }
    setPreviewLoading(false);
  };

  const handleDownload = async (doc) => {
    const { error } = await downloadDocument(doc);
    if (error) toast({ title: 'Error al descargar', description: error.message, variant: 'destructive' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    const { error } = await deleteDocument(deleteDoc);
    if (error) toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Archivo eliminado' }); loadDocs(); }
    setDeleteDoc(null);
  };

  if (!proveedor) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-600" />
                Archivos — {proveedor.razon_social || proveedor.razonSocial}
              </DialogTitle>
              <div className="flex gap-2">
                <button onClick={loadDocs} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <Button size="sm" onClick={() => setUploadOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                  <Upload className="w-4 h-4" /> Subir archivo
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
            {/* Lista de documentos */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
              ) : docs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium">Sin archivos</p>
                  <p className="text-xs mt-1">Sube el primer documento con el botón de arriba</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id}
                      onClick={() => handlePreview(doc)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group
                        ${previewDoc?.id === doc.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        {isImage(doc.nombre) ? <ImageIcon className="w-4 h-4 text-blue-500" />
                          : isPDF(doc.nombre) ? <FileText className="w-4 h-4 text-red-500" />
                            : <File className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.nombre}</p>
                        <p className="text-xs text-slate-400">{getTipoLabel(doc.tipo)} · {formatFileSize(doc.size)} · {formatDate(doc.created_at)}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDownload(doc)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteDoc(doc)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel de preview */}
            {previewDoc && (
              <div className="w-72 shrink-0 border-l border-slate-200 pl-4 flex flex-col gap-3 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vista previa</p>
                  <button onClick={() => { setPreviewDoc(null); setPreviewUrl(null); }} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center min-h-[180px]">
                  {previewLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    : previewUrl && isImage(previewDoc.nombre) ? <img src={previewUrl} alt={previewDoc.nombre} className="max-w-full max-h-48 object-contain" />
                      : previewUrl && isPDF(previewDoc.nombre) ? <iframe src={previewUrl} className="w-full h-48 border-none" title="PDF" />
                        : <div className="text-center p-4"><File className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400">Sin vista previa</p></div>
                  }
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    ['Nombre', previewDoc.nombre],
                    ['Tipo', getTipoLabel(previewDoc.tipo)],
                    ['Tamaño', formatFileSize(previewDoc.size)],
                    ['Carpeta', previewDoc.carpeta],
                    ['Fecha', formatDate(previewDoc.created_at)],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">{l}</span>
                      <span className="text-slate-700 font-medium text-right truncate">{v || '—'}</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" onClick={() => handleDownload(previewDoc)} className="w-full gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Descargar
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileUploadDialog open={uploadOpen} onOpenChange={setUploadOpen}
        entidadTipo="proveedor" entidadId={proveedor?.id} subfolder="general"
        onUploadComplete={() => { loadDocs(); setUploadOpen(false); }} />

      <AlertDialog open={!!deleteDoc} onOpenChange={v => !v && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <strong>{deleteDoc?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProveedorFilesDialog;
