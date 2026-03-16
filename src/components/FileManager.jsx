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
  const [viewMode, setViewMode] = useState("grid");

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

    const folderPath = subfolder
      ? `${category}/${entity.id}/${subfolder}`
      : `${category}/${entity.id}`;

    const { data } = await listFiles(BUCKET_NAME, folderPath);

    const clean = (data || []).filter((item) => item.name !== ".keep");

    const onlyFolders = clean.filter((item) => item.id === null);
    const onlyFiles = clean.filter((item) => item.id !== null);

    setFolders(onlyFolders.map((f) => ({
      ...f,
      folder: folderPath
    })));

    setFiles(onlyFiles.map((f) => ({
      ...f,
      folder: folderPath
    })));

    setSelectedEntity(entity);
    setLevel("files");

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
      `${file.folder}/${file.name}`
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
      `${file.folder}/${file.name}`
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

  const createFolder = async () => {

    const name = prompt("Nombre de la carpeta");

    if (!name) return;

    const path = `${category}/${selectedEntity.id}/${name}/.keep`;

    await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, new Blob([""]));

    loadFiles(selectedEntity);

  };

  const onDrop = async (acceptedFiles) => {

    if (!selectedEntity) return;

    for (const file of acceptedFiles) {

      const path = subfolder
        ? `${category}/${selectedEntity.id}/${subfolder}/${file.name}`
        : `${category}/${selectedEntity.id}/general/${file.name}`;

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

    <div className="space-y-6">

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

      <input
        placeholder="Buscar documentos..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
      />

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

      {level === "files" && folders.length > 0 && !subfolder && (

        <div className="grid grid-cols-3 gap-4">

          {folders.map((folder) => (

            <Button
              key={folder.name}
              variant="outline"
              onClick={() => {
                setSubfolder(folder.name);
                setTimeout(() => loadFiles(selectedEntity), 0);
              }}
            >
              📁 {folder.name}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {files.map(file => (

            <div
              key={file.name}
              className="border rounded-xl p-4 hover:shadow cursor-pointer"
              onClick={() => handlePreview(file)}
            >

              <div className="text-3xl mb-2">📄</div>

              <div className="text-sm font-medium truncate">
                {file.name}
              </div>

            </div>

          ))}

        </div>

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