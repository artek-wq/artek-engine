import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, ChevronRight, Upload, Search, Grid, List,
  MoreVertical, Download, Link, Pencil, Trash2,
  File, FileText, Image as ImageIcon, Film, Music, Archive,
  RefreshCw, X, Loader2,
  Package, DollarSign, Receipt, Users, BarChart2, Truck,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import {
  listFiles, downloadFile, deleteFile,
  BUCKET_NAME, formatFileSize, formatDate,
} from "@/lib/fileUtils";
import FileUploadDialog from "@/components/FileUploadDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const ROOT_CATEGORIES = [
  { key: "operaciones", label: "Operaciones", color: "bg-blue-500", light: "bg-blue-50", text: "text-blue-600", icon: Package, table: "operaciones", nameField: "referencia" },
  { key: "ventas", label: "Ventas CRM", color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", icon: BarChart2, table: null, nameField: null },
  { key: "pagos", label: "Pagos", color: "bg-violet-500", light: "bg-violet-50", text: "text-violet-600", icon: DollarSign, table: "pagos", nameField: "referencia" }, // FIX: referencia en lugar de concepto (concepto puede ser null)
  { key: "facturacion", label: "Facturación", color: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600", icon: Receipt, table: null, nameField: null },
  { key: "clientes", label: "Clientes", color: "bg-pink-500", light: "bg-pink-50", text: "text-pink-600", icon: Users, table: "clientes", nameField: "nombre" },
  { key: "finanzas", label: "Finanzas", color: "bg-orange-500", light: "bg-orange-50", text: "text-orange-600", icon: BarChart2, table: null, nameField: null },
  { key: "proveedores", label: "Proveedores", color: "bg-teal-500", light: "bg-teal-50", text: "text-teal-600", icon: Truck, table: "proveedores", nameField: "razon_social" },
];

const SUBFOLDERS = [
  { key: "general", label: "General" },
  { key: "facturacion", label: "Facturación" },
  { key: "pagos_proveedores", label: "Pagos a proveedores" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getFileExt(name = "") { return name.split(".").pop().toLowerCase(); }

function getFileTypeIcon(name = "") {
  const ext = getFileExt(name);
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext)) return { Icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-50" };
  if (["pdf"].includes(ext)) return { Icon: FileText, color: "text-red-500", bg: "bg-red-50" };
  if (["doc", "docx", "txt"].includes(ext)) return { Icon: FileText, color: "text-blue-600", bg: "bg-blue-50" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { Icon: FileText, color: "text-green-600", bg: "bg-green-50" };
  if (["mp4", "mov", "avi"].includes(ext)) return { Icon: Film, color: "text-purple-500", bg: "bg-purple-50" };
  if (["mp3", "wav"].includes(ext)) return { Icon: Music, color: "text-pink-500", bg: "bg-pink-50" };
  if (["zip", "rar", "7z"].includes(ext)) return { Icon: Archive, color: "text-amber-500", bg: "bg-amber-50" };
  return { Icon: File, color: "text-slate-400", bg: "bg-slate-50" };
}

// Busca en el Storage directamente (no depende de tabla documentos)
async function searchInStorage(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = [];
  for (const cat of ROOT_CATEGORIES) {
    const { data: topLevel } = await supabase.storage.from(BUCKET_NAME).list(cat.key, { limit: 100 });
    for (const entity of (topLevel || [])) {
      if (!entity.name) continue;
      for (const sf of SUBFOLDERS) {
        const path = `${cat.key}/${entity.name}/${sf.key}`;
        const { data: files } = await supabase.storage.from(BUCKET_NAME).list(path, { limit: 50 });
        for (const f of (files || [])) {
          if (f.id && f.name && f.name !== ".keep" && f.name.toLowerCase().includes(q)) {
            results.push({ ...f, folder: path, fullPath: `${path}/${f.name}`, _category: cat.label, _entity: entity.name });
          }
        }
      }
    }
  }
  return results;
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StorageBar({ usedMB = 0, totalMB = 500 }) {
  const pct = Math.min((usedMB / totalMB) * 100, 100).toFixed(1);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Espacio usado</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SidebarBtn({ label, icon: Icon, active, onClick, iconColor = "text-slate-500" }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
        ${active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>
      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : iconColor}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function FileActionMenu({ file, onAction }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onAction("download", file)}>
          <Download className="w-4 h-4 mr-2 text-slate-500" />Descargar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("copyLink", file)}>
          <Link className="w-4 h-4 mr-2 text-slate-500" />Copiar Enlace
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction("rename", file)}>
          <Pencil className="w-4 h-4 mr-2 text-slate-500" />Renombrar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction("delete", file)} className="text-red-600 focus:text-red-600">
          <Trash2 className="w-4 h-4 mr-2" />Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileCardGrid({ file, selected, onClick, onAction }) {
  const { Icon, color, bg } = getFileTypeIcon(file.name);
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className={`group relative rounded-2xl border cursor-pointer transition-all duration-150 p-4
        ${selected ? "border-blue-500 bg-blue-50 shadow-md" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={e => e.stopPropagation()}>
        <FileActionMenu file={file} onAction={onAction} />
      </div>
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <p className="text-sm font-medium text-slate-800 truncate leading-tight">{file.name}</p>
      <p className="text-xs text-slate-400 mt-1">
        {formatFileSize(file.metadata?.size)} · {formatDate(file.created_at)}
      </p>
      {/* Breadcrumb del resultado de búsqueda */}
      {file._category && (
        <p className="text-xs text-blue-500 mt-1 truncate">{file._category} / {file._entity}</p>
      )}
    </motion.div>
  );
}

function FileRowList({ file, selected, onClick, onAction }) {
  const { Icon, color, bg } = getFileTypeIcon(file.name);
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      onClick={onClick}
      className={`group flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all
        ${selected ? "border-blue-500 bg-blue-50" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}>
      <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
        <p className="text-xs text-slate-400 truncate">
          {file._category ? `${file._category} / ${file._entity}` : file.folder}
        </p>
      </div>
      <div className="hidden md:flex items-center gap-6 text-xs text-slate-400 shrink-0">
        <span>{formatFileSize(file.metadata?.size)}</span>
        <span>{formatDate(file.created_at)}</span>
      </div>
      <div onClick={e => e.stopPropagation()}>
        <FileActionMenu file={file} onAction={onAction} />
      </div>
    </motion.div>
  );
}

function RenameDialog({ file, onConfirm, onClose }) {
  const [name, setName] = useState(file?.name || "");
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Renombrar archivo</h3>
        <p className="text-xs text-slate-400 mb-4 truncate">Actual: {file?.name}</p>
        <input ref={ref} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onConfirm(name); if (e.key === "Escape") onClose(); }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-slate-400 mt-2">Mantén la extensión del archivo (ej: .pdf, .jpg)</p>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onConfirm(name)}>Guardar</Button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteConfirmDialog({ file, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Eliminar archivo</h3>
        </div>
        <p className="text-sm text-slate-600 mb-1">¿Estás seguro de que deseas eliminar?</p>
        <p className="text-sm font-medium text-slate-800 mb-6 truncate">{file?.name}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>Eliminar</Button>
        </div>
      </motion.div>
    </div>
  );
}

// FIX 1: Preview 50% más grande — panel de 720px, imagen max-h-[420px], PDF h-[560px]
function FilePreviewPanel({ file, bucket, onClose, onDownload }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const { Icon, color, bg } = getFileTypeIcon(file?.name || "");
  const ext = getFileExt(file?.name || "");
  const isImg = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext);
  const isPdf = ext === "pdf";

  useEffect(() => {
    if (!file) return;
    setLoading(true); setPreviewUrl(null);
    const load = async () => {
      const path = file.fullPath || `${file.folder}/${file.name}`;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      setPreviewUrl(data?.signedUrl || null);
      setLoading(false);
    };
    load();
  }, [file, bucket]);

  if (!file) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* FIX: max-w-[720px] en lugar de 480px = 50% más grande */}
      <motion.div initial={{ x: 40 }} animate={{ x: 0 }} exit={{ x: 40 }}
        className="w-full max-w-[720px] bg-slate-900 text-white flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <p className="text-sm font-medium truncate text-white flex-1 mr-4">{file.name}</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview area — FIX: más alto */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : isImg && previewUrl ? (
            // FIX: max-h-[420px] en lugar de max-h-72
            <div className="p-6">
              <img src={previewUrl} alt={file.name}
                className="w-full rounded-xl object-contain max-h-[420px]" />
            </div>
          ) : isPdf && previewUrl ? (
            // FIX: h-[560px] en lugar de h-80
            <iframe src={previewUrl} className="w-full h-[560px]" title="PDF" />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
              <div className={`w-24 h-24 ${bg} rounded-2xl flex items-center justify-center`}>
                <Icon className={`w-12 h-12 ${color}`} />
              </div>
              <p className="text-sm text-center px-8 text-slate-400">
                Archivo sin vista previa.<br />Este tipo de archivo no soporta previsualización en el navegador.
              </p>
              <Button onClick={onDownload} variant="outline" size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                <Download className="w-4 h-4 mr-2" />Descargar Archivo
              </Button>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="border-t border-slate-700 px-6 py-5 space-y-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detalles del archivo</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            {[
              { label: "Nombre", value: file.name },
              { label: "Tamaño", value: formatFileSize(file.metadata?.size) },
              { label: "Tipo", value: ext.toUpperCase() || "Documento" },
              { label: "Fecha", value: formatDate(file.created_at) || "—" },
              { label: "Ubicación", value: `/${(file.folder || "").split("/").slice(-2).join("/")}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-sm text-slate-200 font-medium truncate">{value}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-700 flex gap-2">
            {[
              { label: "Descargar", icon: Download, action: onDownload },
              { label: "Copiar enlace", icon: Link, action: async () => { if (previewUrl) await navigator.clipboard.writeText(previewUrl); } },
            ].map(({ label, icon: Ic, action }) => (
              <button key={label} onClick={action}
                className="flex items-center gap-2 flex-1 justify-center text-sm text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-2 rounded-lg transition border border-slate-700">
                <Ic className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EntityList({ entities, category, onSelectEntity }) {
  const [search, setSearch] = useState("");
  const filtered = entities.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()));
  const cat = ROOT_CATEGORIES.find(c => c.key === category);
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input placeholder={`Buscar en ${cat?.label || category}...`} value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Sin resultados</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(entity => (
            <button key={entity.id} onClick={() => onSelectEntity(entity)}
              className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition text-left group">
              <div className={`w-10 h-10 ${cat?.light || "bg-slate-100"} rounded-xl flex items-center justify-center shrink-0`}>
                {cat && <cat.icon className={`w-5 h-5 ${cat.text}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{entity.name}</p>
                <p className="text-xs text-slate-400 capitalize">{category}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function FileManager() {
  const { toast } = useToast();

  const [level, setLevel] = useState("root");
  const [category, setCategory] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [activeSubfolder, setActiveSubfolder] = useState("general");

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState("grid");
  // FIX 4: searchQuery siempre visible — estado global
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameFile, setRenameFile] = useState(null);
  const [deleteFile_, setDeleteFile_] = useState(null);

  const [storageUsedMB, setStorageUsedMB] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  const loadStats = useCallback(async () => {
    const { data } = await supabase.from("documentos").select("id, size");
    if (data) {
      setTotalFiles(data.length);
      setStorageUsedMB(data.reduce((a, d) => a + (d.size || 0), 0) / (1024 * 1024));
    }
  }, []);

  useEffect(() => { loadStats(); }, []);

  // ── Category click ─────────────────────────────────────────────
  const handleCategoryClick = useCallback(async (cat) => {
    setSearchQuery(""); setSearchResults([]);
    if (!cat.table) {
      setCategory(cat.key);
      setSelectedEntity({ id: cat.key, name: cat.label });
      setActiveSubfolder("general");
      setLevel("files"); setFiles([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(cat.table)
      .select(`id, ${cat.nameField}`)
      .not(cat.nameField, "is", null)   // FIX 3: excluir registros con nameField null
      .order(cat.nameField);
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // FIX 3: filtrar valores vacíos antes de mostrar
    const formatted = (data || [])
      .filter(item => item[cat.nameField]?.toString().trim())
      .map(item => ({ id: item.id, name: item[cat.nameField] }));
    setEntities(formatted);
    setCategory(cat.key);
    setSelectedEntity(null);
    setFiles([]);
    setLevel("entities");
  }, [toast]);

  // ── Load files ─────────────────────────────────────────────────
  const loadFiles = useCallback(async (entity, subfolder) => {
    if (!entity) return;
    setLoading(true);
    const folder = subfolder || "general";
    const path = `${category}/${entity.id}/${folder}`;
    const { data, error } = await listFiles(BUCKET_NAME, path);
    setLoading(false);
    if (error) { toast({ title: "Error cargando archivos", description: error.message, variant: "destructive" }); return; }
    const clean = (data || []).filter(f => f.name && f.name !== ".keep" && f.id !== null);
    setFiles(clean.map(f => ({ ...f, folder: path, fullPath: `${path}/${f.name}` })));
    setSelectedEntity(entity);
    setLevel("files");
  }, [category, toast]);

  const handleSubfolderChange = useCallback((sf) => {
    setActiveSubfolder(sf);
    if (selectedEntity) loadFiles(selectedEntity, sf);
  }, [selectedEntity, loadFiles]);

  // FIX 4: búsqueda global real en Storage — no depende de tabla documentos
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]); setIsSearching(false); return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      const results = await searchInStorage(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── File actions ───────────────────────────────────────────────
  const handleAction = useCallback(async (action, file) => {
    switch (action) {
      case "preview":
        setSelectedFile(file); setPreviewOpen(true); break;

      case "download": {
        const path = file.fullPath || `${file.folder}/${file.name}`;
        const { data, error } = await downloadFile(BUCKET_NAME, path);
        if (error) { toast({ title: "Error al descargar", description: error.message, variant: "destructive" }); return; }
        const url = URL.createObjectURL(data);
        const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url); break;
      }

      case "copyLink": {
        const path = file.fullPath || `${file.folder}/${file.name}`;
        const { data } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 3600);
        if (data?.signedUrl) {
          await navigator.clipboard.writeText(data.signedUrl);
          toast({ title: "Enlace copiado", description: "Válido por 1 hora." });
        }
        break;
      }

      case "rename": setRenameFile(file); break;
      case "delete": setDeleteFile_(file); break;
    }
  }, [toast]);

  // FIX 2: Rename — construir la ruta exacta desde folder + name para evitar "object not found"
  const handleRenameConfirm = useCallback(async (newName) => {
    if (!renameFile || !newName?.trim() || newName === renameFile.name) {
      setRenameFile(null); return;
    }
    // Siempre reconstruir desde folder + name original — no confiar en fullPath de búsquedas
    const fromPath = renameFile.folder
      ? `${renameFile.folder}/${renameFile.name}`
      : renameFile.fullPath;
    const toPath = renameFile.folder
      ? `${renameFile.folder}/${newName.trim()}`
      : renameFile.fullPath?.replace(renameFile.name, newName.trim());

    if (!fromPath || !toPath) {
      toast({ title: "Error al renombrar", description: "No se pudo determinar la ruta del archivo.", variant: "destructive" });
      setRenameFile(null); return;
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).move(fromPath, toPath);
    if (error) {
      toast({ title: "Error al renombrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Archivo renombrado", description: newName });
      if (level === "files" && selectedEntity) loadFiles(selectedEntity, activeSubfolder);
      if (searchQuery.length >= 2) {
        const results = await searchInStorage(searchQuery);
        setSearchResults(results);
      }
      loadStats();
    }
    setRenameFile(null);
  }, [renameFile, level, selectedEntity, activeSubfolder, searchQuery, loadFiles, loadStats, toast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteFile_) return;
    const path = deleteFile_.fullPath || `${deleteFile_.folder}/${deleteFile_.name}`;
    const { error } = await deleteFile(BUCKET_NAME, path);
    if (error) toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Archivo eliminado" });
      if (level === "files" && selectedEntity) loadFiles(selectedEntity, activeSubfolder);
      loadStats();
    }
    setDeleteFile_(null);
  }, [deleteFile_, level, selectedEntity, activeSubfolder, loadFiles, loadStats, toast]);

  const goRoot = () => {
    setLevel("root"); setCategory(null); setSelectedEntity(null);
    setFiles([]); setEntities([]); setSearchQuery(""); setSearchResults([]);
  };
  const goEntities = () => {
    if (!category) { goRoot(); return; }
    setLevel("entities"); setSelectedEntity(null); setFiles([]);
  };

  const currentCat = ROOT_CATEGORIES.find(c => c.key === category);
  const isSearchMode = searchQuery.length >= 2;
  const displayFiles = isSearchMode ? searchResults : files;
  const currentFolder = selectedEntity ? `${category}/${selectedEntity.id}/${activeSubfolder}` : "";

  // ─── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="flex gap-5 h-[calc(100vh-200px)] min-h-[520px]">

      {/* SIDEBAR */}
      <aside className="w-60 shrink-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Accesos Rápidos</p>
          <div className="space-y-0.5">
            <SidebarBtn label="Inicio (Root)" icon={Home} active={level === "root" && !isSearchMode} onClick={goRoot} />
            {ROOT_CATEGORIES.map(cat => (
              <SidebarBtn key={cat.key} label={cat.label} icon={cat.icon} iconColor={cat.text}
                active={category === cat.key && !isSearchMode} onClick={() => handleCategoryClick(cat)} />
            ))}
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Almacenamiento</p>
          <StorageBar usedMB={storageUsedMB} totalMB={500} />
          <div className="grid grid-cols-2 gap-2 text-center">
            <div><p className="text-lg font-bold text-slate-800">{totalFiles}</p><p className="text-xs text-slate-400">ARCHIVOS</p></div>
            <div><p className="text-lg font-bold text-slate-800">{ROOT_CATEGORIES.length}</p><p className="text-xs text-slate-400">CARPETAS</p></div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">

        {/* FIX 4: Buscador SIEMPRE arriba, primera línea, en todas las vistas */}
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
            {searchQuery && !isSearching && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            )}
            <input
              placeholder="Búsqueda global — buscar archivos en todo el sistema..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          {/* View toggle — siempre visible */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${viewMode === "grid" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-700"}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${viewMode === "list" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-700"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breadcrumb + acciones (debajo del buscador) */}
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
            {isSearchMode ? (
              <span className="text-slate-600 font-medium">
                Resultados de búsqueda
                <span className="text-slate-400 font-normal ml-2">
                  {isSearching ? "buscando..." : `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""} para "${searchQuery}"`}
                </span>
              </span>
            ) : (
              <>
                <button onClick={goRoot} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition shrink-0">
                  <Home className="w-4 h-4" /><span className="hidden sm:inline ml-1">Root</span>
                </button>
                {category && (
                  <><ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <button onClick={goEntities} className="text-slate-600 hover:text-blue-600 transition font-medium shrink-0">
                      {currentCat?.label || category}
                    </button></>
                )}
                {selectedEntity && level === "files" && (
                  <><ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="text-slate-800 font-semibold truncate">{selectedEntity.name}</span></>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {level === "files" && !isSearchMode && (
              <>
                <button onClick={() => loadFiles(selectedEntity, activeSubfolder)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <Button onClick={() => setUploadOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                  <Upload className="w-4 h-4" />Subir Archivos
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Subfolder tabs — solo en modo archivos y sin búsqueda activa */}
        {level === "files" && !isSearchMode && (
          <div className="flex gap-2 flex-wrap">
            {SUBFOLDERS.map(sf => (
              <button key={sf.key} onClick={() => handleSubfolderChange(sf.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition
                  ${activeSubfolder === sf.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"}`}>
                {sf.label}
              </button>
            ))}
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 overflow-auto pr-1">

          {/* ROOT */}
          {level === "root" && !isSearchMode && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Carpetas Principales</p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {ROOT_CATEGORIES.map(cat => (
                  <button key={cat.key} onClick={() => handleCategoryClick(cat)}
                    className="group flex flex-col gap-3 p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-lg transition text-left">
                    <div className={`w-12 h-12 ${cat.color} rounded-2xl flex items-center justify-center`}>
                      <cat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{cat.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Carpeta del sistema</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ENTITIES */}
          {level === "entities" && !isSearchMode && (
            <EntityList entities={entities} category={category}
              onSelectEntity={entity => { setActiveSubfolder("general"); loadFiles(entity, "general"); }} />
          )}

          {/* FILES — modo normal o resultados de búsqueda */}
          {(level === "files" || isSearchMode) && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : displayFiles.length === 0 && !isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <File className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">
                    {isSearchMode ? `Sin resultados para "${searchQuery}"` : "Esta carpeta está vacía"}
                  </p>
                  {!isSearchMode && level === "files" && (
                    <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />Subir primer archivo
                    </Button>
                  )}
                </div>
              ) : !isSearching && (
                <>
                  {!isSearchMode && level === "files" && (
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      Archivos de la carpeta
                      <span className="text-xs font-normal text-slate-400 ml-2">{displayFiles.length} archivo{displayFiles.length !== 1 ? "s" : ""}</span>
                    </p>
                  )}
                  <AnimatePresence mode="popLayout">
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {displayFiles.map(file => (
                          <FileCardGrid key={file.fullPath || file.name} file={file}
                            selected={selectedFile?.fullPath === file.fullPath}
                            onClick={() => { setSelectedFile(file); setPreviewOpen(true); }}
                            onAction={handleAction} />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {displayFiles.map(file => (
                          <FileRowList key={file.fullPath || file.name} file={file}
                            selected={selectedFile?.fullPath === file.fullPath}
                            onClick={() => { setSelectedFile(file); setPreviewOpen(true); }}
                            onAction={handleAction} />
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* OVERLAYS */}
      <AnimatePresence>
        {previewOpen && selectedFile && (
          <FilePreviewPanel file={selectedFile} bucket={BUCKET_NAME}
            onClose={() => setPreviewOpen(false)}
            onDownload={() => handleAction("download", selectedFile)} />
        )}
      </AnimatePresence>

      {renameFile && <RenameDialog file={renameFile} onConfirm={handleRenameConfirm} onClose={() => setRenameFile(null)} />}
      {deleteFile_ && <DeleteConfirmDialog file={deleteFile_} onConfirm={handleDeleteConfirm} onClose={() => setDeleteFile_(null)} />}

      <FileUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} currentFolder={currentFolder}
        onUploadComplete={() => { loadFiles(selectedEntity, activeSubfolder); loadStats(); setUploadOpen(false); }} />
    </div>
  );
}
