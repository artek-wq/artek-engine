import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  ChevronRight,
  Upload,
  Users,
  Truck,
  Ship,
  FolderPlus
} from "lucide-react";

import FileList from "@/components/FileList";
import FileUploadDialog from "@/components/FileUploadDialog";
import FilePreviewModal from "@/components/FilePreviewModal";

import { listFiles, downloadFile, deleteFile, BUCKET_NAME } from "@/lib/fileUtils";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Grid, List } from "lucide-react";
import { useDropzone } from "react-dropzone";
import FileGrid from "@/components/file-manager/FileGrid";

function FileManager() {

  const { toast } = useToast();

  const [level, setLevel] = useState("root");
  const [category, setCategory] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);

  const [subfolder, setSubfolder] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedItem, setSelectedItem] = useState(null);

  // =========================
  // GET USER ROLE
  // =========================

  useEffect(() => {

    const getUser = async () => {

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data) setRole(data.role);

    };

    getUser();

  }, []);

  useEffect(() => {
    if (selectedEntity && subfolder) {
      loadFiles(selectedEntity);
    }
  }, [subfolder]);

  // =========================
  // LOAD ENTITIES
  // =========================

  const loadEntities = async (type) => {

    let table;
    let nameField;

    if (type === "clientes") {
      table = "clientes";
      nameField = "nombre";
    }

    if (type === "proveedores") {
      table = "proveedores";
      nameField = "razon_social";
    }

    if (type === "operaciones") {
      table = "operaciones";
      nameField = "referencia";
    }

    const { data } = await supabase
      .from(table)
      .select(`id, ${nameField}`)
      .order(nameField);

    const formatted = data.map((item) => ({
      id: item.id,
      name: item[nameField],
    }));

    setEntities(formatted);
    setCategory(type);
    setLevel("entities");

  };

  // =========================
  // LOAD FILES
  // =========================

  const loadFiles = async (entity) => {

    const folder = subfolder || activeTab || "general";

    const folderPath = `${category}/${entity.id}/${folder}`;

    // 🔥 CREAR CARPETAS BASE SI NO EXISTEN
    const baseFolders = ["general", "facturacion", "pagos_proveedores"];

    const { data } = await listFiles(BUCKET_NAME, folderPath);

    const clean = (data || []).filter(
      (item) => item.name && item.name !== ".keep"
    );

    const onlyFolders = clean.filter((item) => item.id === null);
    const onlyFiles = clean.filter((item) => item.id !== null);

    setFolders(onlyFolders.map((f) => ({
      ...f,
      folder: folderPath
    })));

    setFiles(onlyFiles.map((f) => ({
      ...f,
      folder: folderPath,
      fullPath: `${folderPath}/${f.name}`
    })));

    setSelectedEntity(entity);
    setLevel("files");
    setActiveTab(subfolder || activeTab || "general");

  };

  // =========================
  // SEARCH
  // =========================

  const handleSearch = async (value) => {

    setSearchQuery(value);

    if (!value || value.length < 2) {
      setSearchMode(false);
      return;
    }

    const { data } = await supabase
      .from("documentos")
      .select("*")
      .ilike("nombre", `%${value}%`)
      .limit(20);

    const formatted = data.map((doc) => ({
      name: doc.nombre,
      folder: doc.archivo_path.replace(`/${doc.nombre}`, ""),
      fullPath: doc.archivo_path, // 🔥 CLAVE
      metadata: { size: doc.size },
      created_at: doc.created_at
    }));

    setFiles(formatted);
    setSearchMode(true);

  };

  // =========================
  // FILE ACTIONS
  // =========================

  const handleDownload = async (file) => {

    const { data } = await downloadFile(
      BUCKET_NAME,
      file.fullPath || `${file.folder}/${file.name}`
    );

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();

  };

  const handleDelete = async (file) => {

    await deleteFile(
      BUCKET_NAME,
      file.fullPath || `${file.folder}/${file.name}`
    );

    loadFiles(selectedEntity);

  };

  const handlePreview = (file) => {

    setSelectedFile(file);
    setPreviewModalOpen(true);

  };

  // =========================
  // CREATE FOLDER
  // =========================

  const createFolder = () => {
    toast({
      title: "Carpetas controladas",
      description: "Usa General, Facturación o Pagos.",
    });
  };

  const handleAction = async (action, item) => {
    switch (action) {
      case "preview":
        openPreview(item);
        break;

      case "download":
        downloadFile(item);
        break;

      case "delete":
        await deleteFile(item);
        break;

      default:
        break;
    }
  };

  const onDrop = async (acceptedFiles) => {

    if (!selectedEntity) return;

    for (const file of acceptedFiles) {

      const folder = subfolder || activeTab;

      if (!folder) {
        console.error("❌ Folder no definido");
        return;
      }

      const path = `${category}/${selectedEntity.id}/${folder}/${file.name}`;

      console.log("UPLOAD PATH:", {
        category,
        entity: selectedEntity?.id,
        subfolder,
        activeTab,
        folder
      });

      await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file);

    }

    loadFiles(selectedEntity);

  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop
  });

  // =========================
  // NAVIGATION
  // =========================

  const goRoot = () => {

    setLevel("root");
    setCategory(null);
    setSelectedEntity(null);
    setFiles([]);

  };

  // =========================
  // UI
  // =========================

  return (

    <div className="grid grid-cols-[260px_1fr] gap-6">

      {/* SIDEBAR */}
      <div className="bg-white border rounded-xl p-4 space-y-4">

        <h3 className="text-sm font-semibold text-slate-500">
          ACCESOS RÁPIDOS
        </h3>

        <div className="space-y-2">

          <button
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100"
            onClick={goRoot}
          >
            Inicio (Root)
          </button>

          <button
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100"
            onClick={() => loadEntities("operaciones")}
          >
            Operaciones
          </button>

          <button
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100"
            onClick={() => loadEntities("clientes")}
          >
            Clientes
          </button>

          <button
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100"
            onClick={() => loadEntities("proveedores")}
          >
            Proveedores
          </button>

        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="space-y-6"></div>

      {/* BREADCRUMB */}

      <div className="bg-white border rounded-xl p-4 flex justify-between">

        <div className="flex items-center gap-2 text-sm">

          <button onClick={goRoot}>
            <Home className="w-4 h-4" />
          </button>

          {category && (
            <>
              <ChevronRight className="w-4 h-4" />
              {category}
            </>
          )}

          {selectedEntity && (
            <>
              <ChevronRight className="w-4 h-4" />
              {selectedEntity.name}
            </>
          )}

          {subfolder && (
            <>
              <ChevronRight className="w-4 h-4" />
              {subfolder}
            </>
          )}

        </div>

        {level === "files" && (

          <div className="flex gap-2">

            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Subir
            </Button>

            <Button variant="outline" onClick={createFolder}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Carpeta
            </Button>

          </div>

        )}

      </div>

      {/* SEARCH */}

      <div className="flex justify-between items-center">

        <input
          placeholder="Buscar documentos..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />

        <div className="flex gap-2 ml-4">

          <Button
            size="icon"
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>

        </div>

      </div>

      {/* ROOT */}

      {level === "root" && (

        <div className="grid grid-cols-3 gap-6">

          <Button onClick={() => loadEntities("clientes")}>
            <Users className="mr-2 w-4 h-4" />
            Clientes
          </Button>

          <Button onClick={() => loadEntities("proveedores")}>
            <Truck className="mr-2 w-4 h-4" />
            Proveedores
          </Button>

          <Button onClick={() => loadEntities("operaciones")}>
            <Ship className="mr-2 w-4 h-4" />
            Operaciones
          </Button>

        </div>
      )}

      {/* ENTITIES */}

      {level === "entities" && (

        <div className="grid grid-cols-2 gap-4">

          {entities.map((entity) => (

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

      {/* FOLDERS */}

      {level === "files" && (
        <div className="flex gap-2 mb-4">

          {[
            { key: "general", label: "General" },
            { key: "facturacion", label: "Facturación" },
            { key: "pagos_proveedores", label: "Pagos a proveedores" }
          ].map(tab => (

            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              onClick={() => {
                setSubfolder(tab.key);
                setActiveTab(tab.key);
              }}
            >
              {tab.label}
            </Button>

          ))}

        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center mb-4 transition
  ${isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300"}`}
      >

        <input {...getInputProps()} />

        {isDragActive ? (
          <p className="text-blue-600 font-medium">
            Suelta los archivos aquí...
          </p>
        ) : (
          <p className="text-slate-500">
            Arrastra archivos aquí o usa "Subir"
          </p>
        )}

      </div>

      {/* FILES */}

      {viewMode === "list" ? (

        <FileList
          files={files}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onPreview={handlePreview}
        />

      ) : (

        <FileGrid
          items={files}
          onSelect={(item) => {
            setSelectedItem(item);
            handlePreview(item); // opcional: abre preview al click
          }}
          onOpen={() => { }}
          selectedItem={selectedItem}
        />

      )}

      {/* UPLOAD */}

      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        currentFolder={
          selectedEntity
            ? subfolder
              ? `${category}/${selectedEntity.id}/${subfolder}`
              : `${category}/${selectedEntity.id}/general`
            : ""
        }
        onUploadComplete={() => loadFiles(selectedEntity)}
      />

      {/* PREVIEW */}

      <FilePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        file={selectedFile}
        bucket={BUCKET_NAME}
        onDownload={() => handleDownload(selectedFile)}
      />

    </div>

  );

}

export default FileManager;