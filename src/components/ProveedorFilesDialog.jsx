import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen, Upload } from 'lucide-react';
import FileList from '@/components/FileList';
import FileUploadDialog from '@/components/FileUploadDialog';
import FilePreviewModal from '@/components/FilePreviewModal';
import { downloadFile, deleteFile, BUCKET_NAME, getFriendlyErrorMessage } from '@/lib/fileUtils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

function ProveedorFilesDialog({ open, onOpenChange, proveedor }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { toast } = useToast();

  const folderPath = proveedor
    ? `proveedores/${proveedor.id}`
    : '';

  useEffect(() => {
    if (open && proveedor) {
      loadFiles();
    }
  }, [open, proveedor]);

  const loadFiles = async () => {
    if (!proveedor) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('cliente_id', null) // temporal hasta que agreguemos proveedor_id
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error al cargar archivos",
        description: error.message,
        variant: "destructive"
      });
      setFiles([]);
    } else {
      const formatted = (data || [])
        .filter(doc => doc.archivo_path.startsWith(`proveedores/${proveedor.id}`))
        .map(doc => ({
          id: doc.id,
          name: doc.nombre,
          created_at: doc.created_at,
          folder: doc.archivo_path.split('/').slice(0, -1).join('/'),
          metadata: {
            size: 0
          }
        }));

      setFiles(formatted);
    }

    setLoading(false);
  };

  const handleDownload = async (file) => {
    const filePath = `${file.folder}/${file.name}`;

    const { data, error } = await downloadFile(BUCKET_NAME, filePath);

    if (error) {
      toast({
        title: "Error al descargar",
        description: getFriendlyErrorMessage(error),
        variant: "destructive"
      });
      return;
    }

    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Descarga iniciada",
      description: `${file.name} se está descargando.`
    });
  };

  const handleDelete = async (file) => {
    const filePath = `${file.folder}/${file.name}`;

    const { error: storageError } = await deleteFile(BUCKET_NAME, filePath);

    if (storageError) {
      toast({
        title: "Error al eliminar archivo",
        description: getFriendlyErrorMessage(storageError),
        variant: "destructive"
      });
      return;
    }

    await supabase
      .from('documentos')
      .delete()
      .eq('id', file.id);

    toast({
      title: "Archivo eliminado",
      description: `${file.name} ha sido eliminado.`
    });

    loadFiles();
  };

  const handlePreview = (file) => {
    setSelectedFile(file);
    setPreviewModalOpen(true);
  };

  if (!proveedor) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Archivos: {proveedor.razonSocial}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
            <div className="flex justify-between items-center mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="text-sm text-slate-500">
                Proveedor ID: <span className="font-mono text-xs bg-slate-200 px-1 py-0.5 rounded text-slate-700">{proveedor.id}</span>
              </div>
              <Button size="sm" onClick={() => setUploadDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Subir Archivo
              </Button>
            </div>

            <FileList
              files={files}
              loading={loading}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onPreview={handlePreview}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        currentFolder={folderPath}
        onUploadComplete={loadFiles}
      />

      <FilePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        file={selectedFile}
        bucket={BUCKET_NAME}
        onDownload={() => selectedFile && handleDownload(selectedFile)}
      />
    </>
  );
}

export default ProveedorFilesDialog;