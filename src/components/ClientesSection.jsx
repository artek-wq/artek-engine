import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen
} from 'lucide-react';
import ClienteDialog from '@/components/ClienteDialog';
import ClienteFilesDialog from '@/components/ClienteFilesDialog';
import ClienteDetailModal from '@/components/ClienteDetailModal';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile, BUCKET_NAME } from '@/lib/fileUtils';
import { usePermissions } from "@/hooks/usePermissions";

function ClientesSection() {

  const { user } = useAuth();
  const { toast } = useToast();

  const [clientes, setClientes] = useState([]);
  const [stats, setStats] = useState({
    clientes: 0,
    operaciones: 0,
    documentos: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [selectedClienteForFiles, setSelectedClienteForFiles] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [initialTab, setInitialTab] = useState("general")
  const { can } = usePermissions();

  // 🔹 Cargar clientes desde Supabase
  const fetchClientes = async () => {

    const { data, error } = await supabase
      .from('clientes')
      .select(`
      *,
      operaciones(count),
      documentos(count)
    `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive"
      });
      return;
    }

    const formatted = (data || []).map(cliente => ({
      ...cliente,
      operaciones_count: cliente.operaciones?.length || 0,
      documentos_count: cliente.documentos?.length || 0
    }));
    setStats({
      clientes: formatted.length,
      operaciones: formatted.reduce((acc, c) => acc + (c.operaciones_count || 0), 0),
      documentos: formatted.reduce((acc, c) => acc + (c.documentos_count || 0), 0)
    });
    setClientes(formatted);
  };

  useEffect(() => {

    if (!user) return;

    fetchClientes();

  }, [user?.id]);

  useEffect(() => {

    const handleEditCliente = (event) => {

      const cliente = event.detail

      setEditingCliente(cliente)
      setDialogOpen(true)

    }

    window.addEventListener(
      "editCliente",
      handleEditCliente
    )

    return () => {

      window.removeEventListener(
        "editCliente",
        handleEditCliente
      )

    }

  }, [])

  // 🔹 Crear cliente
  const handleAddCliente = async (clienteData) => {

    if (!user) {
      toast({
        title: "Sesión no válida",
        description: "Debes iniciar sesión nuevamente.",
        variant: "destructive"
      });
      {
        can("clientes.create") && (
          <Button
            onClick={() => {
              setEditingCliente(null);
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        )
      }

      return;
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert([
        {
          nombre: clienteData.nombre,
          rfc: clienteData.rfc,
          domicilio: clienteData.domicilio,
          codigo_postal: clienteData.codigoPostal,
          contactos: clienteData.contactos,
          user_id: user.id,          // quién creó el cliente
          assigned_to: user.id       // a quién está asignado (vendedor responsable)
        }
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el cliente.",
        variant: "destructive"
      });
      return;
    }

    // 🔹 Crear carpeta automática basada en ID
    const placeholderFile = new File([""], ".keep", { type: "text/plain" });
    try {

      await uploadFile(
        BUCKET_NAME,
        `clientes/${data.id}`,
        placeholderFile
      );

    } catch (err) {

      console.error("Error creando carpeta cliente", err);

    }

    toast({
      title: "Cliente creado",
      description: "El cliente y su carpeta fueron creados correctamente."
    });

    fetchClientes();
  };

  // 🔹 Editar cliente
  const handleEditCliente = async (clienteData) => {

    const { error } = await supabase
      .from('clientes')
      .update({
        nombre: clienteData.nombre,
        rfc: clienteData.rfc,
        domicilio: clienteData.domicilio,
        codigo_postal: clienteData.codigoPostal,
        contactos: clienteData.contactos,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingCliente.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el cliente.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Cliente actualizado",
      description: "Cambios guardados correctamente."
    });

    fetchClientes();
  };

  // 🔹 Eliminar cliente
  const handleDeleteCliente = async (id) => {

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el cliente.",
        variant: "destructive"
      });

      {
        can("clientes.delete") && (
          <Button
            variant="destructive"
            onClick={() => handleDeleteCliente(cliente.id)}
          >
            Eliminar
          </Button>
        )
      }

      return;
    }

    toast({
      title: "Cliente eliminado",
      description: "El cliente fue eliminado correctamente."
    });

    fetchClientes();
  };

  const filteredClientes = clientes.filter(cliente => {

    const term = searchTerm.toLowerCase()

    const contactoMatch = cliente.contactos?.some(c =>
      c.nombre?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.telefono?.toLowerCase().includes(term)
    )

    return (

      cliente.nombre?.toLowerCase().includes(term) ||
      cliente.rfc?.toLowerCase().includes(term) ||
      cliente.domicilio?.toLowerCase().includes(term) ||
      cliente.codigo_postal?.toLowerCase().includes(term) ||
      contactoMatch

    )

  });

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg"
          />
        </div>

        {can("clientes.create") && (
          <Button
            onClick={() => {
              setEditingCliente(null);
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500">Clientes</div>
          <div className="text-2xl font-bold">{stats.clientes}</div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500">Operaciones</div>
          <div className="text-2xl font-bold">{stats.operaciones}</div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500">Documentos</div>
          <div className="text-2xl font-bold">{stats.documentos}</div>
        </div>

      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClientes.map(cliente => {

          const contactos = cliente.contactos || []
          const firstContact = contactos[0]

          return (
            <div
              key={cliente.id}
              onClick={() => {
                setSelectedCliente(cliente)
                setInitialTab("general")
                setDetailOpen(true)
              }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 space-y-4 cursor-pointer"
            >

              {/* HEADER */}
              <div className="flex items-start justify-between">

                <div className="flex gap-4">

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow">
                    <span className="text-lg font-bold">
                      {cliente.nombre?.charAt(0)}
                    </span>
                  </div>

                  {/* Cliente Info */}
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">
                      {cliente.nombre}
                    </h3>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-600">
                        {cliente.rfc}
                      </span>
                    </div>

                    <div className="text-sm text-slate-500 mt-1">
                      {cliente.domicilio}
                    </div>

                    <div className="text-xs text-slate-400">
                      CP: {cliente.codigo_postal}
                    </div>

                  </div>
                </div>


              </div>

              {/* CONTACTOS */}
              {firstContact && (
                <div className="border rounded-xl p-3 bg-slate-50">

                  <div className="text-xs text-slate-400 uppercase mb-2">
                    Contactos
                  </div>

                  <div className="text-sm font-medium">
                    {firstContact.nombre}
                  </div>

                  {firstContact.email && (
                    <div className="text-xs text-slate-500">
                      {firstContact.email}
                    </div>
                  )}

                  {firstContact.telefono && (
                    <div className="text-xs text-slate-500">
                      {firstContact.telefono}
                    </div>
                  )}

                </div>
              )}

              {/* FOOTER */}
              <div className="flex justify-between items-center pt-2 border-t">

                <div className="flex gap-4 text-sm text-slate-500">

                  <span>👤 {contactos.length}</span>

                  <span>📦 {cliente.operaciones_count || 0}</span>

                  <span>📁 {cliente.documentos_count || 0}</span>

                </div>

                <button
                  onClick={(e) => {

                    e.stopPropagation()

                    setSelectedCliente(cliente)
                    setInitialTab("documentos")
                    setDetailOpen(true)

                  }}
                  className="flex items-center gap-2 text-blue-600 text-sm hover:underline"
                >
                  <FolderOpen size={16} />
                  Archivos
                </button>

              </div>

            </div>
          )
        })}
      </div>

      <ClienteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={editingCliente ? handleEditCliente : handleAddCliente}
        initialData={editingCliente}
      />

      <ClienteFilesDialog
        open={filesDialogOpen}
        onOpenChange={setFilesDialogOpen}
        cliente={selectedClienteForFiles}
      />

      <ClienteDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        cliente={selectedCliente}
        initialTab={initialTab}
      />

    </div>
  );
}

export default ClientesSection;