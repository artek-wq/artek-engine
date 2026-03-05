import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen
} from 'lucide-react';
import ProveedorDialog from '@/components/ProveedorDialog';
import ProveedorFilesDialog from '@/components/ProveedorFilesDialog';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile, BUCKET_NAME } from '@/lib/fileUtils';

function ProveedoresSection() {

  const { user } = useAuth();
  const { toast } = useToast();

  const [proveedores, setProveedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [selectedProveedorForFiles, setSelectedProveedorForFiles] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // 🔐 Cargar rol del usuario
  const fetchUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchProveedores = async () => {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setProveedores(data || []);
  };

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchProveedores();
    }
  }, [user]);

  const canCreate = ['admin', 'gerente', 'usuario_a'].includes(userRole);
  const canEdit = ['admin', 'gerente', 'usuario_a'].includes(userRole);
  const canDelete = ['admin', 'gerente'].includes(userRole);

  const handleSave = async (data) => {

    if (!user) return;

    if (editingProveedor) {

      const { error } = await supabase
        .from('proveedores')
        .update({
          razon_social: data.razonSocial,
          nombre_comercial: data.nombreComercial,
          rfc: data.rfc,
          domicilio: data.domicilio,
          web: data.web,
          contactos: data.contactos,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProveedor.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Proveedor actualizado correctamente" });

    } else {

      const { data: inserted, error } = await supabase
        .from('proveedores')
        .insert([{
          razon_social: data.razonSocial,
          nombre_comercial: data.nombreComercial,
          rfc: data.rfc,
          domicilio: data.domicilio,
          web: data.web,
          contactos: data.contactos,
          user_id: user.id,
          assigned_to: user.id
        }])
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      const placeholderFile = new File([""], ".keep", { type: "text/plain" });
      await uploadFile(BUCKET_NAME, `proveedores/${inserted.id}`, placeholderFile);

      toast({ title: "Proveedor creado correctamente" });
    }

    fetchProveedores();
    setDialogOpen(false);
  };

  const handleDelete = async (id) => {

    const { error } = await supabase
      .from('proveedores')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Proveedor eliminado correctamente" });
    fetchProveedores();
  };

  const filteredProveedores = proveedores.filter(p =>
    p.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.rfc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">

      <div className="bg-white p-4 rounded-xl border flex justify-between items-center">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg"
          />
        </div>

        {canCreate && (
          <Button onClick={() => { setEditingProveedor(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proveedor
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProveedores.map(proveedor => (
          <div key={proveedor.id} className="bg-white p-5 rounded-xl border shadow-sm">

            <h3 className="font-bold text-lg">{proveedor.razon_social}</h3>
            <p className="text-sm text-slate-500">{proveedor.rfc}</p>

            <div className="flex gap-2 mt-4">

              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => {
                  setEditingProveedor(proveedor);
                  setDialogOpen(true);
                }}>
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
              )}

              {canDelete && (
                <Button size="sm" variant="outline" onClick={() => handleDelete(proveedor.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => {
                setSelectedProveedorForFiles(proveedor);
                setFilesDialogOpen(true);
              }}>
                <FolderOpen className="w-4 h-4 mr-1" /> Archivos
              </Button>

            </div>

          </div>
        ))}
      </div>

      <ProveedorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        initialData={editingProveedor}
      />

      <ProveedorFilesDialog
        open={filesDialogOpen}
        onOpenChange={setFilesDialogOpen}
        proveedor={selectedProveedorForFiles}
      />
    </div>
  );
}

export default ProveedoresSection;