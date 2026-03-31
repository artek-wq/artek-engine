import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import DocumentsTab from '@/components/DocumentsTab';

function ProveedorFilesDialog({ open, onOpenChange, proveedor }) {
  if (!proveedor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-teal-600" />
            Archivos — {proveedor.razon_social || proveedor.razonSocial}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gestión de documentos del proveedor
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          <DocumentsTab
            entidadTipo="proveedor"
            entidadId={proveedor.id}
            subfolders={[{ key: 'general', label: 'General' }]}
            defaultSubfolder="general"
          />
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProveedorFilesDialog;
