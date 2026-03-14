import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, ChevronRight, Upload, Users, Truck, Ship } from 'lucide-react';
import FileList from '@/components/FileList';
import FileUploadDialog from '@/components/FileUploadDialog';
import FilePreviewModal from '@/components/FilePreviewModal';
import { listFiles, downloadFile, deleteFile, BUCKET_NAME } from '@/lib/fileUtils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function FileManager() {

  const { toast } = useToast();

  const [level, setLevel] = useState('root');
  const [category, setCategory] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [files, setFiles] = useState([]);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [subfolder, setSubfolder] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ============================
  // OBTENER USUARIO Y ROL
  // ============================

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setRole(data.role);
      }
    };

    fetchUserRole();
  }, []);

  // ============================
  // ABRIR CARPETA DE OPERACIÓN DESDE MODAL
  // ============================

  useEffect(() => {

    const openOperacion = async (event) => {

      const operacion = event.detail;

      setCategory('operaciones');
      setLevel('files');

      const folderPath = `operaciones/${operacion.id}`;

      const { data } = await listFiles(BUCKET_NAME, folderPath);

      const filtered = (data || [])
        .filter(file => file.name !== '.keep')
        .map(file => ({
          ...file,
          folder: folderPath
        }));

      setFiles(filtered);

      setSelectedEntity({
        id: operacion.id,
        name: operacion.referencia
      });

    };

    window.addEventListener('openFileManagerOperacion', openOperacion);

    return () => {
      window.removeEventListener('openFileManagerOperacion', openOperacion);
    };

  }, []);

  // ============================
  // CARGAR ENTIDADES SEGÚN ROL
  // ============================

  const loadEntities = async (type) => {

    if (!role) return;

    let table;
    let nameField;

    if (type === 'clientes') {
      table = 'clientes';
      nameField = 'nombre';
    }

    if (type === 'proveedores') {
      table = 'proveedores';
      nameField = 'razon_social';
    }

    if (type === 'operaciones') {
      table = 'operaciones';
      nameField = 'referencia';
    }

    let query = supabase
      .from(table)
      .select(`id, ${nameField}`)
      .order(nameField, { ascending: true });

    // 🔒 FILTRO POR ROL
    if (role === 'ventas' && type === 'clientes') {
      query = query.eq('user_id', userId);
    }
    if (role === 'ventas' && type === 'operaciones') {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    const formatted = data.map(item => ({
      id: item.id,
      name: item[nameField]
    }));

    setEntities(formatted);
    setCategory(type);
    setLevel('entities');
  };

  // ============================
  // CARGAR ARCHIVOS
  // ============================

  const loadFiles = async (entity) => {

    const folderPath = subfolder
      ? `${category}/${entity.id}/${subfolder}`
      : `${category}/${entity.id}`;

    const { data, error } = await listFiles(BUCKET_NAME, folderPath);

    if (error) {
      toast({
        title: "Error al cargar archivos",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    const filtered = (data || [])
      .filter(file => file.name !== '.keep')
      .map(file => ({
        ...file,
        folder: folderPath
      }));

    setFiles(filtered);
    setSelectedEntity(entity);
    setLevel('files');
  };

  // ============================
  // NAVEGACIÓN
  // ============================

  const goRoot = () => {
    setLevel('root');
    setCategory(null);
    setSelectedEntity(null);
    setEntities([]);
    setFiles([]);
  };

  const goBackToEntities = () => {
    setLevel('entities');
    setSelectedEntity(null);
    setSubfolder(null);
    setFiles([]);
  };

  // ============================
  // ARCHIVOS
  // ============================

  const handleDownload = async (file) => {
    const { data } = await downloadFile(
      BUCKET_NAME,
      `${file.folder}/${file.name}`
    );

    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
  };

  const handleDelete = async (file) => {
    await deleteFile(
      BUCKET_NAME,
      `${file.folder}/${file.name}`
    );

    loadFiles(selectedEntity);
  };

  const handlePreview = (file) => {
    setSelectedFile(file);
    setPreviewModalOpen(true);
  };

  // ============================
  // RENDER
  // ============================

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">

          <button onClick={goRoot} className="flex items-center gap-1">
            <Home className="w-4 h-4" /> Inicio
          </button>

          {category && (
            <>
              <ChevronRight className="w-4 h-4" />
              <button onClick={goBackToEntities}>
                {category}
              </button>
            </>
          )}

          {selectedEntity && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="font-bold">
                {selectedEntity.name}
              </span>
            </>
          )}
        </div>

        {level === 'files' && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Subir Archivo
          </Button>
        )}
      </div>

      {/* ROOT */}
      {level === 'root' && (
        <div className="grid grid-cols-3 gap-6">
          <Button onClick={() => loadEntities('clientes')}>
            <Users className="w-4 h-4 mr-2" />
            Clientes
          </Button>

          <Button onClick={() => loadEntities('proveedores')}>
            <Truck className="w-4 h-4 mr-2" />
            Proveedores
          </Button>

          <Button onClick={() => loadEntities('operaciones')}>
            <Ship className="w-4 h-4 mr-2" />
            Operaciones
          </Button>

        </div>
      )}

      {/* ENTITIES */}
      {level === 'entities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities.map(entity => (
            <Button
              key={entity.id}
              variant="outline"
              onClick={() => loadFiles(entity)}
            >
              {entity.name}
            </Button>
          ))}
        </div>
      )}

      {/* FILES */}
      {level === 'files' && (
        <div className="space-y-4">

          {category === 'operaciones' && !subfolder && (
            <div className="flex gap-3 mb-4">

              <Button onClick={() => {
                setSubfolder('general');
                loadFiles(selectedEntity);
              }}>
                General
              </Button>

              <Button onClick={() => {
                setSubfolder('facturacion_cobranza');
                loadFiles(selectedEntity);
              }}>
                Facturación
              </Button>

              <Button onClick={() => {
                setSubfolder('pagos_proveedores');
                loadFiles(selectedEntity);
              }}>
                Pagos Proveedores
              </Button>

            </div>
          )}

          <FileList
            files={files}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onPreview={handlePreview}
          />

        </div>
      )}

      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        currentFolder={
          selectedEntity
            ? `${category}/${selectedEntity.id}`
            : ''
        }
        onUploadComplete={() => loadFiles(selectedEntity)}
      />

      <FilePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        file={selectedFile}
      />

    </div>
  );
}

export default FileManager;