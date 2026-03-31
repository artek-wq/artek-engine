/**
 * DocumentsTab.jsx — Tab de documentos unificado para todos los modales
 *
 * Props:
 *   entidadTipo  — 'operacion' | 'cliente' | 'proveedor' | 'pago' | 'factura'
 *   entidadId    — UUID de la entidad
 *   subfolders   — array de {key, label} para las subcarpetas disponibles
 *                  ej: [{key:'general',label:'General'},{key:'pagos',label:'Pagos'}]
 *   defaultSubfolder — subcarpeta por defecto (default: 'general')
 *   fixedSubfolder   — si se define, el usuario NO puede cambiar de subcarpeta
 *                      (usado en PagoDetailModal → siempre 'pagos')
 *   readOnly     — si true, solo preview y descarga (sin upload ni delete)
 *   compact      — diseño compacto para espacios reducidos
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, Search, X, Download, Trash2, ZoomIn,
    File, FileText, Image as ImageIcon, Film, Music, Archive,
    Loader2, Grid, List, FolderOpen, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
    uploadDocument, listDocuments, deleteDocument, downloadDocument,
    getSignedUrl, formatFileSize, formatDate, isImage, isPDF,
    TIPOS_DOCUMENTO, getTipoLabel, BUCKET, sanitizeName,
    syncEntityFromStorage
} from '@/lib/documentService';
import { supabase } from '@/lib/customSupabaseClient';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getFileExt(name = '') { return (name.split('.').pop() || '').toLowerCase(); }

function getFileTypeIcon(name = '') {
    const ext = getFileExt(name);
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return { Icon: ImageIcon, color: 'text-blue-500', bg: 'bg-blue-50' };
    if (['pdf'].includes(ext)) return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
    if (['doc', 'docx', 'txt'].includes(ext)) return { Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileText, color: 'text-green-600', bg: 'bg-green-50' };
    if (['mp4', 'mov', 'avi'].includes(ext)) return { Icon: Film, color: 'text-purple-500', bg: 'bg-purple-50' };
    if (['mp3', 'wav'].includes(ext)) return { Icon: Music, color: 'text-pink-500', bg: 'bg-pink-50' };
    if (['zip', 'rar', '7z'].includes(ext)) return { Icon: Archive, color: 'text-amber-500', bg: 'bg-amber-50' };
    return { Icon: File, color: 'text-slate-400', bg: 'bg-slate-50' };
}

// ─── FILE CARD (grid) ─────────────────────────────────────────────────────────

function FileCard({ doc, onPreview, onDownload, onDelete, readOnly }) {
    const { Icon, color, bg } = getFileTypeIcon(doc.nombre);
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative rounded-xl border bg-white cursor-pointer transition-all duration-150 overflow-hidden group"
            style={{ borderColor: hovered ? '#94a3b8' : '#e2e8f0', boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}
            onClick={() => onPreview(doc)}
        >
            {/* Preview area */}
            <div className={`h-28 ${bg} flex items-center justify-center relative`}>
                <Icon className={`w-10 h-10 ${color}`} />

                {/* Hover overlay — estilo Google Drive */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/20 flex items-center justify-center gap-2"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => onPreview(doc)}
                                className="p-2 bg-white rounded-full shadow-md hover:bg-blue-50 transition text-slate-600 hover:text-blue-600"
                                title="Vista previa">
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onDownload(doc)}
                                className="p-2 bg-white rounded-full shadow-md hover:bg-emerald-50 transition text-slate-600 hover:text-emerald-600"
                                title="Descargar">
                                <Download className="w-3.5 h-3.5" />
                            </button>
                            {!readOnly && (
                                <button onClick={() => onDelete(doc)}
                                    className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition text-slate-600 hover:text-red-600"
                                    title="Eliminar">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Info */}
            <div className="p-2.5">
                <p className="text-xs font-medium text-slate-800 truncate">{doc.nombre}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(doc.size)}</p>
            </div>
        </motion.div>
    );
}

// ─── FILE ROW (list) ──────────────────────────────────────────────────────────

function FileRow({ doc, onPreview, onDownload, onDelete, readOnly }) {
    const { Icon, color, bg } = getFileTypeIcon(doc.nombre);
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => onPreview(doc)}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
        >
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.nombre}</p>
                <p className="text-xs text-slate-400">{getTipoLabel(doc.tipo)} · {formatFileSize(doc.size)} · {formatDate(doc.created_at)}</p>
            </div>
            {/* Actions - visible on hover */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => onPreview(doc)} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition" title="Preview"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDownload(doc)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition" title="Descargar"><Download className="w-3.5 h-3.5" /></button>
                {!readOnly && <button onClick={() => onDelete(doc)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
        </motion.div>
    );
}

// ─── PREVIEW PANEL ────────────────────────────────────────────────────────────

function PreviewPanel({ doc, onClose, onDownload }) {
    const [url, setUrl] = useState(null);
    const [loading, setLoad] = useState(true);
    const { Icon, color, bg } = getFileTypeIcon(doc?.nombre || '');
    const ext = getFileExt(doc?.nombre || '');

    useEffect(() => {
        if (!doc) return;
        setLoad(true); setUrl(null);
        (async () => {
            if (isImage(doc.nombre) || isPDF(doc.nombre)) {
                const { url: signedUrl } = await getSignedUrl(doc.archivo_path, 3600);
                setUrl(signedUrl);
            }
            setLoad(false);
        })();
    }, [doc]);

    if (!doc) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-56 shrink-0 border-l border-slate-200 pl-4 flex flex-col gap-3 overflow-y-auto"
        >
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vista previa</p>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center min-h-[140px]">
                {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                ) : url && isImage(doc.nombre) ? (
                    <img src={url} alt={doc.nombre} className="max-w-full max-h-36 object-contain" />
                ) : url && isPDF(doc.nombre) ? (
                    <iframe src={url} className="w-full h-36 border-none" title="PDF" />
                ) : (
                    <div className="text-center p-4">
                        <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                            <Icon className={`w-6 h-6 ${color}`} />
                        </div>
                        <p className="text-xs text-slate-400">{ext.toUpperCase() || 'Archivo'}</p>
                    </div>
                )}
            </div>

            <div className="space-y-1.5 text-xs">
                {[['Nombre', doc.nombre], ['Tipo', getTipoLabel(doc.tipo)], ['Tamaño', formatFileSize(doc.size)], ['Carpeta', doc.carpeta], ['Fecha', formatDate(doc.created_at)]].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2">
                        <span className="text-slate-400 shrink-0">{l}</span>
                        <span className="text-slate-700 font-medium text-right truncate">{v || '—'}</span>
                    </div>
                ))}
            </div>

            <Button size="sm" onClick={() => onDownload(doc)} className="w-full gap-1.5">
                <Download className="w-3.5 h-3.5" />Descargar
            </Button>
        </motion.div>
    );
}

// ─── DROP ZONE ────────────────────────────────────────────────────────────────

function DropZone({ onFiles, isDragging, setIsDragging, subfolder, compact }) {
    const inputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
    };

    return (
        <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl transition-all cursor-pointer flex items-center justify-center gap-3
        ${compact ? 'py-4 px-4' : 'py-6 px-6'}
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
        >
            <Upload className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${isDragging ? 'text-blue-500' : 'text-slate-300'} shrink-0`} />
            <div>
                <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>
                    Arrastra archivos aquí o <span className="text-blue-600">selecciona</span>
                </p>
                {subfolder && !compact && (
                    <p className="text-xs text-slate-400 mt-0.5">→ carpeta <span className="font-medium">{subfolder}</span></p>
                )}
            </div>
            <input ref={inputRef} type="file" multiple className="hidden"
                onChange={e => { const files = Array.from(e.target.files); if (files.length) onFiles(files); e.target.value = ''; }} />
        </div>
    );
}

// ─── UPLOAD QUEUE ────────────────────────────────────────────────────────────

function UploadQueue({ queue }) {
    if (!queue.length) return null;
    return (
        <div className="space-y-1">
            {queue.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                            <span className="text-slate-700 truncate">{item.name}</span>
                            <span className={item.status === 'error' ? 'text-red-500' : item.status === 'done' ? 'text-emerald-600' : 'text-slate-400'}>
                                {item.status === 'error' ? 'Error' : item.status === 'done' ? '✓' : `${item.pct}%`}
                            </span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${item.status === 'error' ? 'bg-red-500' : item.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${item.pct}%` }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DocumentsTab({
    entidadTipo,
    entidadId,
    subfolders = [{ key: 'general', label: 'General' }],
    defaultSubfolder = 'general',
    fixedSubfolder,
    readOnly = false,
    compact = false,
}) {
    const { toast } = useToast();

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeSubf, setActiveSubf] = useState(fixedSubfolder || defaultSubfolder);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [searchQ, setSearchQ] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [previewDoc, setPreviewDoc] = useState(null);
    const [deleteDoc, setDeleteDoc] = useState(null);

    // Track if we've already synced storage for this entity
    const syncedRef = useRef(false);

    // Load docs from documentos table
    const loadDocs = useCallback(async () => {
        if (!entidadId) return;
        setLoading(true);
        const sf = fixedSubfolder || activeSubf;
        const { data, error } = await listDocuments({
            entidadTipo,
            entidadId,
            subfolder: sf !== 'all' ? sf : undefined,
        });
        setLoading(false);
        if (error) { toast({ title: 'Error cargando archivos', description: error.message, variant: 'destructive' }); return; }
        setDocs(data || []);
    }, [entidadId, entidadTipo, activeSubf, fixedSubfolder, toast]);

    // On first mount: sync any legacy files from Storage → documentos table, then load
    useEffect(() => {
        if (!entidadId || syncedRef.current) return;
        syncedRef.current = true;
        const allSubfolders = subfolders.map(s => s.key);
        // Sync silently in background, then reload
        syncEntityFromStorage(entidadTipo, entidadId, allSubfolders).then(() => loadDocs());
    }, [entidadId, entidadTipo]);

    useEffect(() => { loadDocs(); }, [loadDocs]);

    // Filtered docs by search
    const filteredDocs = useMemo(() =>
        searchQ.length < 2 ? docs : docs.filter(d => d.nombre.toLowerCase().includes(searchQ.toLowerCase())),
        [docs, searchQ]
    );

    // Upload multiple files
    const handleFiles = useCallback(async (files) => {
        if (!entidadId || readOnly) return;
        const sf = fixedSubfolder || activeSubf;
        const initial = files.map(f => ({ name: f.name, pct: 0, status: 'uploading' }));
        setUploadQueue(initial);

        await Promise.allSettled(files.map(async (file, i) => {
            const { error } = await uploadDocument({
                file,
                entidadTipo,
                entidadId,
                subfolder: sf,
                onProgress: pct => setUploadQueue(prev => {
                    const next = [...prev];
                    next[i] = { ...next[i], pct };
                    return next;
                }),
            });
            setUploadQueue(prev => {
                const next = [...prev];
                next[i] = { ...next[i], pct: 100, status: error ? 'error' : 'done' };
                return next;
            });
            if (error) toast({ title: `Error: ${file.name}`, description: error.message, variant: 'destructive' });
        }));

        setTimeout(() => { setUploadQueue([]); loadDocs(); }, 1200);
    }, [entidadId, entidadTipo, activeSubf, fixedSubfolder, readOnly, loadDocs, toast]);

    const handleDownload = async (doc) => {
        const { error } = await downloadDocument(doc);
        if (error) toast({ title: 'Error al descargar', description: error.message, variant: 'destructive' });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDoc) return;
        const { error } = await deleteDocument(deleteDoc);
        if (error) toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
        else { toast({ title: 'Archivo eliminado' }); loadDocs(); if (previewDoc?.id === deleteDoc.id) setPreviewDoc(null); }
        setDeleteDoc(null);
    };

    // ── RENDER ────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-3 min-h-0">

            {/* Subfolder selector — solo si hay más de una carpeta y no está fija */}
            {!fixedSubfolder && subfolders.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {subfolders.map(sf => (
                        <button key={sf.key}
                            onClick={() => { setActiveSubf(sf.key); setSearchQ(''); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition
                ${activeSubf === sf.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {sf.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Search + view toggle */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    {searchQ && <button onClick={() => setSearchQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-400" /></button>}
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder={`Buscar archivos${fixedSubfolder ? '' : ' en esta carpeta'}...`}
                        className="w-full pl-8 pr-8 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}`}><Grid className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-700'}`}><List className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* Upload zone + queue */}
            {!readOnly && (
                <div className="space-y-2">
                    <DropZone
                        onFiles={handleFiles}
                        isDragging={isDragging}
                        setIsDragging={setIsDragging}
                        subfolder={subfolders.find(s => s.key === (fixedSubfolder || activeSubf))?.label}
                        compact={compact}
                    />
                    <UploadQueue queue={uploadQueue} />
                </div>
            )}

            {/* File list + preview */}
            <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                            <p className="text-sm">{searchQ ? `Sin resultados para "${searchQ}"` : 'Sin archivos'}</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            <AnimatePresence mode="popLayout">
                                {filteredDocs.map(doc => (
                                    <FileCard key={doc.id} doc={doc}
                                        onPreview={setPreviewDoc}
                                        onDownload={handleDownload}
                                        onDelete={setDeleteDoc}
                                        readOnly={readOnly} />
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <AnimatePresence mode="popLayout">
                                {filteredDocs.map(doc => (
                                    <FileRow key={doc.id} doc={doc}
                                        onPreview={setPreviewDoc}
                                        onDownload={handleDownload}
                                        onDelete={setDeleteDoc}
                                        readOnly={readOnly} />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Preview panel */}
                <AnimatePresence>
                    {previewDoc && (
                        <PreviewPanel
                            doc={previewDoc}
                            onClose={() => setPreviewDoc(null)}
                            onDownload={handleDownload} />
                    )}
                </AnimatePresence>
            </div>

            {/* Delete confirm */}
            <AlertDialog open={!!deleteDoc} onOpenChange={v => !v && setDeleteDoc(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminará permanentemente <strong>{deleteDoc?.nombre}</strong>. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
