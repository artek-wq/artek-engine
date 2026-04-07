import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, ChevronRight, Upload, Search, Grid, List, FolderPlus,
  MoreVertical, Download, Link, Pencil, Trash2, X, Loader2,
  File, FileText, Image as ImageIcon, Film, Music, Archive,
  RefreshCw, Package, Users, BarChart2, Truck,
  AlertCircle, ZoomIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { listFiles, downloadFile, deleteFile, BUCKET_NAME } from "@/lib/fileUtils";
import {
  searchDocuments, listDocuments, deleteDocument, downloadDocument,
  getSignedUrl as docGetSignedUrl, renameDocument, formatFileSize, formatDate, BUCKET,
} from "@/lib/documentService";
import FileUploadDialog from "@/components/FileUploadDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

// Storage folder names match the category keys (plural)
// entidad_tipo in DB is singular (operacion, cliente, proveedor)
// Storage paths use plural (operaciones/, clientes/, proveedores/) — matches legacy data
const ROOT_CATEGORIES = [
  {
    key: "operaciones", label: "Operaciones", color: "bg-blue-500", light: "bg-blue-50", text: "text-blue-600", icon: Package, table: "operaciones", nameField: "referencia",
    extraSelect: "referencia, clientes(nombre), status, tipo_operacion, status_especifico",
    renderSub: op => `${op.clientes?.nombre || "—"} · ${op.status_especifico || op.status || ""}`,
    renderBadge: op => ({ label: op.tipo_operacion || "M", color: "bg-blue-100 text-blue-700" }),
    subfolders: [{ key: "general", label: "General" }, { key: "pagos", label: "Pagos" }, { key: "facturacion", label: "Facturación" }]
  },
  {
    key: "ventas", label: "Ventas CRM", color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", icon: BarChart2, table: null, nameField: null,
    subfolders: [{ key: "general", label: "General" }]
  },
  {
    key: "clientes", label: "Clientes", color: "bg-pink-500", light: "bg-pink-50", text: "text-pink-600", icon: Users, table: "clientes", nameField: "nombre",
    extraSelect: "nombre, rfc, domicilio",
    renderSub: c => `RFC: ${c.rfc || "—"}`,
    renderBadge: null,
    subfolders: [{ key: "general", label: "General" }]
  },
  {
    key: "finanzas", label: "Finanzas", color: "bg-orange-500", light: "bg-orange-50", text: "text-orange-600", icon: BarChart2, table: null, nameField: null,
    subfolders: [{ key: "general", label: "General" }]
  },
  {
    key: "proveedores", label: "Proveedores", color: "bg-teal-500", light: "bg-teal-50", text: "text-teal-600", icon: Truck, table: "proveedores", nameField: "razon_social",
    extraSelect: "razon_social, rfc",
    renderSub: p => `RFC: ${p.rfc || "—"}`,
    renderBadge: null,
    subfolders: [{ key: "general", label: "General" }]
  },
];

// Subfolders now defined per-category in ROOT_CATEGORIES

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getFileExt(name = "") { return (name.split(".").pop() || "").toLowerCase(); }

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

// Búsqueda en tabla documentos — rápida, confiable, no hace requests a Storage
async function searchInDocumentos(query) {
  if (!query || query.length < 2) return [];
  const { data, error } = await searchDocuments(query, { limit: 100 });
  if (error || !data) return [];
  // Convertir formato documentos → formato FileManager
  return data.map(doc => ({
    id: doc.id,
    name: doc.nombre,
    folder: doc.archivo_path?.split("/").slice(0, -1).join("/") || "",
    fullPath: doc.archivo_path,
    metadata: { size: doc.size },
    created_at: doc.created_at,
    _category: doc.entidad_tipo,
    _entity: doc.entidad_id,
    _sf: doc.carpeta,
    _tipo: doc.tipo,
    _docId: doc.id,
  }));
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StorageBar({ usedMB = 0, totalMB = 500 }) {
  const pct = Math.min((usedMB / totalMB) * 100, 100).toFixed(1);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500"><span>Espacio usado</span><span>{pct}%</span></div>
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
        <DropdownMenuItem onClick={() => onAction("preview", file)}>
          <ZoomIn className="w-4 h-4 mr-2 text-slate-500" />Vista previa
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("download", file)}>
          <Download className="w-4 h-4 mr-2 text-slate-500" />Descargar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("copyLink", file)}>
          <Link className="w-4 h-4 mr-2 text-slate-500" />Copiar enlace
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
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={e => e.stopPropagation()}>
        <FileActionMenu file={file} onAction={onAction} />
      </div>
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <p className="text-sm font-medium text-slate-800 truncate leading-tight">{file.name}</p>
      <p className="text-xs text-slate-400 mt-1">{formatFileSize(file.metadata?.size)} · {formatDate(file.created_at)}</p>
      {file._category && <p className="text-xs text-blue-500 mt-1 truncate">{file._category} / {file._entity}</p>}
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
          {file._category ? `${file._category} › ${file._entity} › ${file._sf}` : file.folder}
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

// FIX: EntityList rico por módulo
function EntityList({ entities, category, catConfig, onSelectEntity }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    entities.filter(e => (e.name || "").toLowerCase().includes(search.toLowerCase())),
    [entities, search]);
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input placeholder={`Buscar en ${catConfig?.label || category}...`} value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>
      {filtered.length === 0
        ? <div className="text-center py-12 text-slate-400 text-sm">Sin resultados</div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(entity => {
              const badge = catConfig?.renderBadge?.(entity._raw || {});
              return (
                <button key={entity.id} onClick={() => onSelectEntity(entity)}
                  className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition text-left group">
                  <div className={`w-10 h-10 ${catConfig?.light || "bg-slate-100"} rounded-xl flex items-center justify-center shrink-0`}>
                    {catConfig && <catConfig.icon className={`w-5 h-5 ${catConfig.text}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{entity.name}</p>
                      {badge && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                      )}
                    </div>
                    {entity.sub && <p className="text-xs text-slate-400 truncate mt-0.5">{entity.sub}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition shrink-0" />
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}

// RENAME DIALOG con advertencia de extensión
function RenameDialog({ file, onConfirm, onClose }) {
  const [name, setName] = useState(file?.name || "");
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  const origExt = getFileExt(file?.name || "");
  const newExt = getFileExt(name);
  const extChanged = origExt && newExt && origExt !== newExt;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Renombrar archivo</h3>
        <p className="text-xs text-slate-400 mb-4 truncate">Original: <span className="font-mono">{file?.name}</span></p>
        <input ref={ref} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onConfirm(name); if (e.key === "Escape") onClose(); }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {extChanged && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> La extensión cambió de .{origExt} a .{newExt}
          </p>
        )}
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
        <p className="text-sm text-slate-600 mb-1">¿Eliminar permanentemente?</p>
        <p className="text-sm font-mono font-medium text-slate-800 mb-6 truncate">{file?.name}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>Eliminar</Button>
        </div>
      </motion.div>
    </div>
  );
}

// Nueva carpeta
function NewFolderDialog({ onConfirm, onClose }) {
  const [name, setName] = useState("");
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FolderPlus className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Nueva carpeta</h3>
        </div>
        <input ref={ref} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la carpeta"
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onConfirm(name.trim()); if (e.key === "Escape") onClose(); }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-slate-400 mt-2">Se creará dentro de la carpeta actual</p>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!name.trim()} onClick={() => name.trim() && onConfirm(name.trim())}>Crear carpeta</Button>
        </div>
      </motion.div>
    </div>
  );
}

// FIX: Preview como modal centrado grande (no drawer)
function FilePreviewModal({ file, bucket, onClose, onDownload }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const { Icon, color, bg } = getFileTypeIcon(file?.name || "");
  const ext = getFileExt(file?.name || "");
  const isImg = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext);
  const isPdf = ext === "pdf";

  useEffect(() => {
    if (!file) return;
    setLoading(true); setPreviewUrl(null);
    (async () => {
      // Use fullPath directly (already correct from Storage listing)
      // Fall back to folder+name with proper encoding
      const path = file.fullPath
        || `${file.folder}/${file.name}`;
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (!data?.signedUrl && error) {
        // Try with decoded path as fallback
        const decodedPath = decodeURIComponent(path);
        const { data: data2 } = await supabase.storage.from(bucket).createSignedUrl(decodedPath, 3600);
        setPreviewUrl(data2?.signedUrl || null);
      } else {
        setPreviewUrl(data?.signedUrl || null);
      }
      setLoading(false);
    })();
  }, [file, bucket]);

  if (!file) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full"
        style={{ maxWidth: "min(1100px, 92vw)", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onDownload}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition">
              <Download className="w-3.5 h-3.5" /> Descargar
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview — ocupa todo el espacio disponible */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
            </div>
          ) : isImg && previewUrl ? (
            <div className="flex items-center justify-center p-6 h-full min-h-[400px] bg-slate-50">
              <img src={previewUrl} alt={file.name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                style={{ maxHeight: "calc(90vh - 200px)" }} />
            </div>
          ) : isPdf && previewUrl ? (
            <iframe src={previewUrl} title="PDF" className="w-full border-none"
              style={{ height: "calc(90vh - 180px)" }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 text-slate-400 p-8">
              <div className={`w-28 h-28 ${bg} rounded-3xl flex items-center justify-center`}>
                <Icon className={`w-14 h-14 ${color}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 mb-1">Sin vista previa disponible</p>
                <p className="text-xs text-slate-400">Este tipo de archivo no soporta previsualización en el navegador</p>
              </div>
              <Button onClick={onDownload} variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Descargar archivo
              </Button>
            </div>
          )}
        </div>

        {/* Footer con detalles */}
        <div className="border-t border-slate-200 px-6 py-4 shrink-0 bg-slate-50">
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-500">
            <span><span className="font-medium text-slate-700">Tamaño:</span> {formatFileSize(file.metadata?.size)}</span>
            <span><span className="font-medium text-slate-700">Tipo:</span> {ext.toUpperCase() || "Archivo"}</span>
            <span><span className="font-medium text-slate-700">Fecha:</span> {formatDate(file.created_at) || "—"}</span>
            <span className="truncate"><span className="font-medium text-slate-700">Ruta:</span> {file.folder || "—"}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function FileManager() {
  const { toast } = useToast();

  const [level, setLevel] = useState("root");
  const [category, setCategory] = useState(null);
  const [catConfig, setCatConfig] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [activeSubfolder, setActiveSubfolder] = useState("general");

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameFile, setRenameFile] = useState(null);
  const [deleteFile_, setDeleteFile_] = useState(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

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
    setCatConfig(cat);

    if (!cat.table) {
      setCategory(cat.key);
      setSelectedEntity({ id: cat.key, name: cat.label });
      setActiveSubfolder("general");
      setLevel("files"); setFiles([]);
      return;
    }

    setLoading(true);
    const selectStr = cat.extraSelect || `id, ${cat.nameField}`;
    const { data, error } = await supabase
      .from(cat.table)
      .select(selectStr)
      .not(cat.nameField, "is", null)
      .order(cat.nameField);
    setLoading(false);

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    const formatted = (data || [])
      .filter(item => item[cat.nameField]?.toString().trim())
      .map(item => ({
        id: item.id,
        name: item[cat.nameField],
        sub: cat.renderSub?.(item) || null,
        _raw: item,
      }));

    setEntities(formatted);
    setCategory(cat.key);
    setSelectedEntity(null);
    setFiles([]);
    setLevel("entities");
  }, [toast]);

  // Maps plural category key → singular entidad_tipo for DB queries
  const ENTIDAD_TIPO_MAP = {
    operaciones: 'operacion',
    clientes: 'cliente',
    proveedores: 'proveedor',
    pagos: 'pago',
    ventas: 'ventas',
    finanzas: 'finanzas',
  };

  const loadFiles = useCallback(async (entity, subfolder, catKey) => {
    if (!entity) return;
    setLoading(true);
    const folder = subfolder || "general";
    const catKeyRes = catKey || category;
    const entidadTipo = ENTIDAD_TIPO_MAP[catKeyRes] || catKeyRes;

    // Read from documentos table (consistent with DocumentsTab uploads)
    const { data, error } = await listDocuments({
      entidadTipo,
      entidadId: entity.id,
      subfolder: folder,
    });
    setLoading(false);

    if (error) { toast({ title: "Error cargando archivos", description: error.message, variant: "destructive" }); return; }

    // Normalize to file format expected by FileCardGrid/FileRowList
    const storageFolderPath = `${catKeyRes}/${entity.id}/${folder}`;
    setFiles((data || []).map(doc => ({
      id: doc.id,
      name: doc.nombre,
      folder: storageFolderPath,
      fullPath: doc.archivo_path,
      metadata: { size: doc.size },
      created_at: doc.created_at,
      _docId: doc.id,
      _tipo: doc.tipo,
    })));
    setSelectedEntity(entity);
    setLevel("files");
  }, [category, toast]);

  const handleSubfolderChange = useCallback((sf) => {
    setActiveSubfolder(sf);
    if (selectedEntity) loadFiles(selectedEntity, sf, category);
  }, [selectedEntity, category, loadFiles]);

  // FIX: búsqueda paralela, siempre activa independientemente del nivel
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]); setIsSearching(false); return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      const results = await searchInDocumentos(searchQuery);
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
        const { error } = await downloadDocument(file);
        if (error) { toast({ title: "Error al descargar", description: error.message, variant: "destructive" }); }
        break;
      }

      case "copyLink": {
        const path = file.fullPath || `${file.folder}/${file.name}`;
        const { data } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 3600);
        if (data?.signedUrl) { await navigator.clipboard.writeText(data.signedUrl); toast({ title: "Enlace copiado", description: "Válido por 1 hora." }); }
        break;
      }

      case "rename": setRenameFile(file); break;
      case "delete": setDeleteFile_(file); break;
    }
  }, [toast]);

  const handleRenameConfirm = useCallback(async (newName) => {
    if (!renameFile || !newName?.trim() || newName === renameFile.name) { setRenameFile(null); return; }
    const fromPath = `${renameFile.folder}/${renameFile.name}`;
    const toPath = `${renameFile.folder}/${newName.trim()}`;
    const { error } = await supabase.storage.from(BUCKET_NAME).move(fromPath, toPath);
    if (error) toast({ title: "Error al renombrar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Archivo renombrado", description: newName });
      if (level === "files" && selectedEntity) loadFiles(selectedEntity, activeSubfolder, category);
      if (searchQuery.length >= 2) { const r = await searchInDocumentos(searchQuery); setSearchResults(r); }
      loadStats();
    }
    setRenameFile(null);
  }, [renameFile, level, selectedEntity, activeSubfolder, category, searchQuery, loadFiles, loadStats, toast]);

  // FIX: handleDeleteConfirm actualiza también searchResults
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteFile_) return;
    // deleteDocument handles both Storage + tabla documentos
    const docObj = {
      id: deleteFile_._docId || null,
      archivo_path: deleteFile_.fullPath || `${deleteFile_.folder}/${deleteFile_.name}`,
      nombre: deleteFile_.name,
      folder: deleteFile_.folder,
    };
    const { error } = await deleteDocument(docObj);
    if (error) toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Archivo eliminado" });
      if (level === "files" && selectedEntity) loadFiles(selectedEntity, activeSubfolder, category);
      if (searchQuery.length >= 2) {
        const path = deleteFile_.fullPath || `${deleteFile_.folder}/${deleteFile_.name}`;
        setSearchResults(prev => prev.filter(f => f.fullPath !== path));
      }
      loadStats();
    }
    setDeleteFile_(null);
  }, [deleteFile_, level, selectedEntity, activeSubfolder, category, searchQuery, loadFiles, loadStats, toast]);

  // FIX: Crear carpeta — sube archivo .keep al nuevo path
  const handleCreateFolder = useCallback(async (folderName) => {
    if (!selectedEntity || !category) return;
    const cleanName = folderName.replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ ]/g, "_").trim();
    const keepPath = `${category}/${selectedEntity.id}/${activeSubfolder}/${cleanName}/.keep`;
    const keepBlob = new Blob([""], { type: "text/plain" });
    const { error } = await supabase.storage.from(BUCKET).upload(keepPath, keepBlob, { upsert: false });
    if (error && !error.message.includes("already exists")) {
      toast({ title: "Error al crear carpeta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Carpeta creada", description: cleanName });
      loadFiles(selectedEntity, activeSubfolder, category);
    }
    setNewFolderOpen(false);
  }, [selectedEntity, category, activeSubfolder, loadFiles, toast]);

  const goRoot = () => {
    setLevel("root"); setCategory(null); setCatConfig(null); setSelectedEntity(null);
    setFiles([]); setEntities([]); setSearchQuery(""); setSearchResults([]);
  };
  const goEntities = () => {
    if (!category) { goRoot(); return; }
    setLevel("entities"); setSelectedEntity(null); setFiles([]);
  };

  const currentCat = ROOT_CATEGORIES.find(c => c.key === category);
  const isSearchMode = searchQuery.length >= 2;
  const displayFiles = isSearchMode ? searchResults : files;
  // category key IS the Storage folder name (plural matches existing Storage structure)
  // Map plural category key to singular entidad_tipo for documentService
  const ETMAP_UPLOAD = { operaciones: 'operacion', clientes: 'cliente', proveedores: 'proveedor', pagos: 'pago', ventas: 'ventas', finanzas: 'finanzas' };
  const uploadEntidadTipo = ETMAP_UPLOAD[category] || category;
  const currentFolder = selectedEntity ? `${category}/${selectedEntity.id}/${activeSubfolder}` : "";
  // Subfolders del la categoría activa (definidos por categoría)
  const activeCatSubfolders = catConfig?.subfolders || [{ key: "general", label: "General" }];
  const showSubfolderTabs = level === "files" && !isSearchMode && catConfig;

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
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">

        {/* FIX: Buscador SIEMPRE en la primera posición, en todos los niveles */}
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
            {searchQuery && !isSearching && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            )}
            <input
              placeholder="Búsqueda global en todos los archivos del sistema..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
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

        {/* Breadcrumb + acciones */}
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
            {isSearchMode ? (
              <span className="text-slate-600 font-medium">
                {isSearching
                  ? <span className="text-slate-400">Buscando en todo el sistema...</span>
                  : <>{searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} <span className="text-slate-400 font-normal">para "{searchQuery}"</span></>
                }
              </span>
            ) : (
              <>
                <button onClick={goRoot} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition shrink-0">
                  <Home className="w-4 h-4" /><span className="hidden sm:inline ml-1">Root</span>
                </button>
                {category && (
                  <><ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <button onClick={goEntities} className="text-slate-600 hover:text-blue-600 transition font-medium shrink-0">{currentCat?.label || category}</button></>
                )}
                {selectedEntity && level === "files" && (
                  <><ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="text-slate-800 font-semibold truncate">{selectedEntity.name}</span></>
                )}
              </>
            )}
          </div>
          {level === "files" && !isSearchMode && (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => loadFiles(selectedEntity, activeSubfolder, category)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition">
                <RefreshCw className="w-4 h-4" />
              </button>
              <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)} className="gap-1.5">
                <FolderPlus className="w-4 h-4" />Nueva carpeta
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4" />Subir archivos
              </Button>
            </div>
          )}
        </div>

        {/* Subfolder tabs — per-category, dinámicos */}
        {showSubfolderTabs && activeCatSubfolders.length > 1 && (
          <div className="flex gap-2 flex-wrap shrink-0">
            {activeCatSubfolders.map(sf => (
              <button key={sf.key} onClick={() => handleSubfolderChange(sf.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition
                  ${activeSubfolder === sf.key ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"}`}>
                {sf.label}
              </button>
            ))}
          </div>
        )}

        {/* CONTENT — FIX: siempre renderiza, el buscador no oculta el contenido */}
        <div className="flex-1 overflow-auto pr-1 min-h-0">

          {/* ROOT — se oculta solo cuando hay búsqueda activa */}
          {level === "root" && !isSearchMode && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Carpetas principales</p>
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

          {/* ENTITIES — se oculta cuando hay búsqueda activa */}
          {level === "entities" && !isSearchMode && (
            <EntityList entities={entities} category={category} catConfig={catConfig}
              onSelectEntity={async (entity) => {
                setActiveSubfolder("general");
                // Sync legacy Storage files → documentos table on first open
                const { syncEntityFromStorage } = await import('@/lib/documentService');
                const catKeyRes = category;
                const ETMAP = { operaciones: 'operacion', clientes: 'cliente', proveedores: 'proveedor', pagos: 'pago', ventas: 'ventas', finanzas: 'finanzas' };
                const et = ETMAP[catKeyRes] || catKeyRes;
                const sfs = catConfig?.subfolders?.map(s => s.key) || ['general'];
                syncEntityFromStorage(et, entity.id, sfs).then(() => loadFiles(entity, 'general', category));
              }} />
          )}

          {/* FILES — visible en modo files O en modo búsqueda */}
          {(level === "files" && !isSearchMode) && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <File className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">Esta carpeta está vacía</p>
                  <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />Subir primer archivo
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    Archivos de la carpeta
                    <span className="text-xs font-normal text-slate-400 ml-2">{files.length} archivo{files.length !== 1 ? "s" : ""}</span>
                  </p>
                  <AnimatePresence mode="popLayout">
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                        {files.map(file => (
                          <FileCardGrid key={file.fullPath || file.name} file={file}
                            selected={selectedFile?.fullPath === file.fullPath}
                            onClick={() => { setSelectedFile(file); setPreviewOpen(true); }}
                            onAction={handleAction} />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {files.map(file => (
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

          {/* RESULTADOS DE BÚSQUEDA — siempre visible cuando hay query */}
          {isSearchMode && (
            <>
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <p className="text-sm">Buscando en todo el sistema...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">Sin resultados para "{searchQuery}"</p>
                  <p className="text-xs text-slate-400">Intenta con otro término de búsqueda</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
                    <span className="text-xs font-normal text-slate-400 ml-2">para "{searchQuery}"</span>
                  </p>
                  <AnimatePresence mode="popLayout">
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                        {searchResults.map(file => (
                          <FileCardGrid key={file.fullPath || file.name} file={file}
                            selected={selectedFile?.fullPath === file.fullPath}
                            onClick={() => { setSelectedFile(file); setPreviewOpen(true); }}
                            onAction={handleAction} />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.map(file => (
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
          <FilePreviewModal file={selectedFile} bucket={BUCKET_NAME}
            onClose={() => setPreviewOpen(false)}
            onDownload={() => handleAction("download", selectedFile)} />
        )}
      </AnimatePresence>

      {renameFile && <RenameDialog file={renameFile} onConfirm={handleRenameConfirm} onClose={() => setRenameFile(null)} />}
      {deleteFile_ && <DeleteConfirmDialog file={deleteFile_} onConfirm={handleDeleteConfirm} onClose={() => setDeleteFile_(null)} />}
      {newFolderOpen && <NewFolderDialog onConfirm={handleCreateFolder} onClose={() => setNewFolderOpen(false)} />}

      <FileUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        entidadTipo={uploadEntidadTipo}
        entidadId={selectedEntity?.id}
        subfolder={activeSubfolder}
        currentFolder={currentFolder}
        onUploadComplete={() => { loadFiles(selectedEntity, activeSubfolder, category); loadStats(); setUploadOpen(false); }} />
    </div>
  );
}
