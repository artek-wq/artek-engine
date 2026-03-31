import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import DocumentsTab from '@/components/DocumentsTab';

function ClienteFilesDialog({ open, onOpenChange, cliente, embedded = false }) {
  if (!cliente) return null;

  const tab = (
    <DocumentsTab
      entidadTipo="cliente"
      entidadId={cliente.id}
      subfolders={[{ key: 'general', label: 'General' }]}
      defaultSubfolder="general"
      compact={embedded}
    />
  );

  if (embedded) return <div className="mt-2">{tab}</div>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-pink-600" />
            Archivos — {cliente.nombre}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gestión de documentos del cliente
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">{tab}</div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ClienteFilesDialog;
