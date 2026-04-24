import React, { useEffect, useState, useRef } from 'react';
import FilePreviewModal from "@/components/FilePreviewModal";
import SubOperacionDialog from '@/components/SubOperacionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Trash2,
    Edit,
    FileText,
    FolderOpen,
    X,
    Upload,
    Download,
    Grid,
    List,
    FileDown,
    ChevronDown,
    Loader2 as Spin,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { uploadDocument, listDocuments, deleteDocument, downloadDocument, getSignedUrl, formatFileSize as docFmtSize, formatDate as docFmtDate, BUCKET } from '@/lib/documentService';
import DocumentsTab from '@/components/DocumentsTab';
import { STATUS, STATUS_STYLES, STATUS_ESPECIFICO, STATUS_ESPECIFICO_STYLES, getStatusGeneral } from '@/constants/status';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";

// ✅ PDF.js v5
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

// BUCKET imported from documentService

const DetailModal = ({
    open,
    onOpenChange,
    data,
    onDelete,
    onEdit,
    onOpenSubOperacion
}) => {

    const [operacion, setOperacion] = useState(null);
    const [loading, setLoading] = useState(false);
    const [documentos, setDocumentos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewName, setPreviewName] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [viewMode, setViewMode] = useState("grid");
    const [thumbnails, setThumbnails] = useState({});
    const [loadingThumbs, setLoadingThumbs] = useState({});

    const [fileToDelete, setFileToDelete] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const fileInputRef = useRef(null);
    const [subDialogOpen, setSubDialogOpen] = useState(false);
    const [generando, setGenerando] = useState(false);
    const [subOperaciones, setSubOperaciones] = useState([]);
    const [operacionMadre, setOperacionMadre] = useState(null);
    const [proveedores, setProveedores] = useState([]);

    useEffect(() => {
        if (open && data?.id) {

            // 🔥 limpiar estado anterior
            setDocumentos([]);
            setThumbnails({});
            setPreviewUrl(null);
            setPreviewName(null);

            fetchOperacion(data.id);
        }
    }, [open, data]);

    useEffect(() => {
        if (!operacion?.referencia) return;
        if (!documentos || documentos.length === 0) return;

        generateThumbnails();

    }, [documentos, operacion]);

    const fetchOperacion = async (id) => {
        setLoading(true);
        setErrorMsg(null);

        const { data: result, error } = await supabase
            .from('operaciones')
            .select(`*, clientes ( nombre )`)
            .eq('id', id)
            .single();

        if (error) {
            setErrorMsg(error.message);
            setLoading(false);
            return;
        }

        setOperacion(result);
        // 🔥 Cargar documentos correctos
        await fetchDocumentos(result.id);
        // 🔥 Cargar proveedores vinculados
        const { data: relaciones } = await supabase
            .from('operacion_proveedores')
            .select(`
    proveedor_id,
    proveedores ( razon_social )
  `)
            .eq('operacion_id', result.id);

        if (relaciones) {
            setProveedores(
                relaciones.map(r => r.proveedores?.razon_social).filter(Boolean)
            );
        }

        // 🔹 Cargar suboperaciones si es madre
        if (!result.operacion_madre_id) {
            const { data: subs } = await supabase
                .from('operaciones')
                .select('*')
                .eq('operacion_madre_id', result.id);

            setSubOperaciones(subs || []);
        }

        // 🔥 Si es suboperación, traer madre
        if (result.operacion_madre_id) {
            const { data: madre } = await supabase
                .from('operaciones')
                .select('id, referencia')
                .eq('id', result.operacion_madre_id)
                .single();

            setOperacionMadre(madre || null);
        } else {
            setOperacionMadre(null);
        }

        fetchSubOperaciones(result.id);

        setLoading(false);
    };

    const fetchDocumentos = async (operacionId) => {
        const { data } = await listDocuments({ entidadTipo: 'operacion', entidadId: operacionId });
        // Normalize to format expected by thumbnail generator
        setDocumentos((data || []).map(doc => ({
            ...doc,
            name: doc.nombre,
            fullPath: doc.archivo_path,
            folder: doc.archivo_path?.split('/').slice(0, -1).join('/') || '',
            metadata: { size: doc.size },
            _docId: doc.id,
        })));
    };

    const fetchSubOperaciones = async (operacionId) => {
        const { data, error } = await supabase
            .from('operaciones')
            .select('*')
            .eq('operacion_madre_id', operacionId)
            .order('created_at', { ascending: true });

        if (error) {
            return; // error handled silently
        }

        setSubOperaciones(data || []);
    };

    // 🔥 Generar thumbnails con CACHE inteligente + loading elegante
    const generateThumbnails = async () => {
        if (!operacion || documentos.length === 0) return;

        const updatedThumbs = { ...thumbnails };

        for (const file of documentos) {

            // 🛑 Si ya existe thumbnail, NO volver a generarlo
            if (updatedThumbs[file.name]) continue;

            const filePath = file.fullPath || file.archivo_path || `operaciones/${operacion.id}/general/${file.name}`;

            // 🔄 Activar loading por archivo
            setLoadingThumbs(prev => ({ ...prev, [file.name]: true }));

            const { data } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(filePath, 60);

            if (!data?.signedUrl) {
                setLoadingThumbs(prev => ({ ...prev, [file.name]: false }));
                continue;
            }

            // 🖼 Imagen normal
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
                updatedThumbs[file.name] = data.signedUrl;
                setLoadingThumbs(prev => ({ ...prev, [file.name]: false }));
            }

            // 📄 PDF primera página
            if (/\.pdf$/i.test(file.name)) {
                try {
                    const loadingTask = getDocument(data.signedUrl);
                    const pdf = await loadingTask.promise;
                    const page = await pdf.getPage(1);

                    const viewport = page.getViewport({ scale: 0.8 });

                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({
                        canvasContext: context,
                        viewport
                    }).promise;

                    updatedThumbs[file.name] = canvas.toDataURL("image/png");

                } catch (error) {
                    // thumbnail generation failed silently
                } finally {
                    setLoadingThumbs(prev => ({ ...prev, [file.name]: false }));
                }
            }
        }

        setThumbnails(updatedThumbs);
    };

    const sanitizeFileName = (fileName) => {
        return fileName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9.\-_]/g, "")
            .toLowerCase();
    };

    const uploadFileWithProgress = async (file) => {
        const cleanName = sanitizeFileName(file.name);
        const path = `operaciones/${operacion.id}/general/${cleanName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUploadUrl(path);

        if (error) {
            throw new Error(error.message);
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", data.signedUrl, true);
            xhr.setRequestHeader("Content-Type", file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    setProgress(Math.round((event.loaded / event.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) resolve();
                else reject("Error subiendo archivo");
            };

            xhr.onerror = () => reject("Error de red");

            xhr.send(file);
        });
    };

    const handleUpload = async (file) => {
        if (!file || !operacion) return;
        setUploading(true); setProgress(0); setErrorMsg(null);
        try {
            const { error } = await uploadDocument({
                file,
                entidadTipo: 'operacion',
                entidadId: operacion.id,
                subfolder: 'general',
                onProgress: pct => setProgress(pct),
            });
            if (error) throw new Error(error.message);
            fetchDocumentos(operacion.id);
        } catch (err) {
            setErrorMsg(err.message || err.toString());
        }
        setUploading(false); setProgress(0);
    };

    const handleDownload = async (fileOrName) => {
        const path = typeof fileOrName === 'object'
            ? (fileOrName.archivo_path || fileOrName.fullPath)
            : `operaciones/${operacion.id}/general/${fileOrName}`;
        const name = typeof fileOrName === 'object'
            ? (fileOrName.nombre || fileOrName.name)
            : fileOrName;
        const { url } = await getSignedUrl(path, 3600);
        if (url) window.open(url, '_blank');
    };

    const handlePreview = async (fileName) => {

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(
                `operaciones/${operacion.id}/general/${fileName}`,
                60
            );

        if (error) {
            return; // error handled silently
        }

        setPreviewUrl(data.signedUrl);
        setPreviewName(fileName);
        setPreviewOpen(true);

    };

    const handleDeleteFile = async (fileOrName) => {
        const doc = typeof fileOrName === 'object'
            ? fileOrName
            : { archivo_path: `operaciones/${operacion.id}/general/${fileOrName}`, nombre: fileOrName };
        await deleteDocument(doc);
        fetchDocumentos(operacion.id);
        setPreviewUrl(null);
    };

    const formatSize = (bytes) => {
        if (!bytes) return "-";
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    };

    const formatDate = (dateStr) => {
        return dateStr ? new Date(dateStr).toLocaleString() : "-";
    };

    const isImage = (name) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
    const isPDF = (name) => /\.pdf$/i.test(name);
    const Info = ({ label, value }) => (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {label}
            </div>
            <div className="text-sm font-medium text-slate-700 truncate">
                {value || '-'}
            </div>
        </div>
    )


    const handleGenerarAviso = async (tipo) => {
        if (!operacion) return;
        setGenerando(tipo);
        try {
            const { generarAviso } = await import('@/lib/AvisoGenerator');
            await generarAviso(operacion, tipo, proveedores);
        } catch (err) {
            console.error('Error generando aviso:', err);
        } finally {
            setGenerando(false);
        }
    };

    if (!operacion && loading) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[96vw] max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">

                <DialogHeader className="bg-gradient-to-r from-indigo-50 to-white border-b p-6 rounded-t-xl">

                    <div className="flex justify-between items-start">

                        <div>
                            <DialogTitle className="text-3xl font-bold tracking-tight">
                                {operacion?.referencia}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Detalle de operación {operacion?.referencia}
                            </DialogDescription>

                            <div className="text-sm font-medium text-slate-600 mt-2">
                                {operacion?.clientes?.nombre}
                            </div>

                            <div className="text-sm text-slate-500 mt-1">
                                {operacion?.origen} → {operacion?.destino}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {/* Status específico — lo que el usuario elige */}
                            <select
                                value={operacion?.status_especifico || ''}
                                onChange={async (e) => {
                                    const especifico = e.target.value;
                                    const general = getStatusGeneral(especifico);

                                    const { error } = await supabase
                                        .from('operaciones')
                                        .update({ status: general, status_especifico: especifico })
                                        .eq('id', operacion.id)
                                        .select()
                                        .single();

                                    if (!error) {
                                        setOperacion(prev => ({
                                            ...prev,
                                            status: general,
                                            status_especifico: especifico
                                        }));
                                        onEdit?.({ ...operacion, status: general, status_especifico: especifico });
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-none outline-none cursor-pointer ${STATUS_ESPECIFICO_STYLES[operacion?.status_especifico] || 'bg-slate-100 text-slate-700'}`}
                            >
                                <option value="">-- Status específico --</option>
                                {STATUS_ESPECIFICO.map(s => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                            {/* Status general — calculado automáticamente */}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[operacion?.status] || 'bg-slate-100 text-slate-600'}`}>
                                {operacion?.status}
                            </span>
                        </div>

                    </div>

                </DialogHeader>

                <div className="flex-1 overflow-y-auto">

                    <Tabs defaultValue="general">

                        <TabsList>
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="documentos">Documentos</TabsTrigger>
                        </TabsList>

                        {/* GENERAL */}
                        <TabsContent value="general" className="mt-6">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">

                                <Info label="Tipo Operación" value={{
                                    M: "Marítimo",
                                    A: "Aéreo",
                                    T: "Terrestre",
                                    D: "Despacho Aduanal",
                                    P: "Paquetería"
                                }[operacion?.tipo_operacion] || operacion?.tipo_operacion} />
                                <Info label="MBL" value={operacion?.mbl} />
                                <Info label="HBL" value={operacion?.hbl} />
                                <Info label="Buque / Viaje" value={operacion?.buque_viaje} />
                                <Info label="Contenedor" value={operacion?.contenedor} />
                                <Info label="ETD" value={operacion?.etd} />
                                <Info label="ETA" value={operacion?.eta} />
                                <Info label="Bultos" value={operacion?.bultos} />
                                <Info label="CBM" value={operacion?.cbm} />
                                <Info label="Incoterms" value={operacion?.incoterms} />
                                <Info label="Agente" value={operacion?.agente} />
                                <Info label="Aseguradora" value={operacion?.aseguradora} />
                                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                                        Proveedores
                                    </div>

                                    {proveedores.length > 0 ? (
                                        <ul className="mt-1 space-y-1 text-sm font-medium text-slate-700">
                                            {proveedores.map((p, index) => (
                                                <li key={index} className="list-disc ml-4">
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-sm font-medium text-slate-700">
                                            -
                                        </div>
                                    )}
                                </div>
                                <Info label="Equipo" value={operacion?.equipo} />
                                <Info label="Notas" value={operacion?.notas} />

                            </div>

                        </TabsContent>

                        {subOperaciones.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                                    Sub-Operaciones
                                </h3>

                                <div className="space-y-2">
                                    {subOperaciones.map(sub => (
                                        <div
                                            key={sub.id}
                                            onClick={() => onOpenSubOperacion(sub)}
                                            className="flex justify-between items-center bg-slate-50 border rounded-lg p-3 hover:bg-white transition cursor-pointer"
                                        >
                                            <div>
                                                <div className="text-sm font-medium">
                                                    {sub.referencia}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {sub.origen} → {sub.destino}
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-400">
                                                {sub.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DOCUMENTOS */}
                        <TabsContent value="documentos" className="mt-4">
                            <DocumentsTab
                                entidadTipo="operacion"
                                entidadId={operacion?.id}
                                subfolders={[
                                    { key: 'general', label: 'General' },
                                    { key: 'pagos', label: 'Pagos' },
                                    { key: 'facturacion', label: 'Facturación' },
                                ]}
                                defaultSubfolder="general"
                            />
                        </TabsContent>

                    </Tabs>

                </div>

                {operacion?.children?.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                            Sub-Operaciones
                        </h3>

                        <div className="space-y-2">
                            {operacion.children.map(sub => (
                                <div
                                    key={sub.id}
                                    onClick={() => {
                                        setPreviewUrl(null);
                                        onOpenChange(false);
                                        setTimeout(() => {
                                            onOpenChange(true);
                                        }, 50);
                                    }}
                                    className="flex justify-between items-center bg-slate-50 border rounded-lg p-3 hover:bg-white cursor-pointer transition"
                                >
                                    <div>
                                        <div className="text-sm font-medium">
                                            {sub.referencia}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {sub.origen} → {sub.destino}
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-400">
                                        {sub.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FOOTER */}
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                ¿Eliminar archivo?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer.
                                <br />
                                <strong>{fileToDelete}</strong>
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                Cancelar
                            </AlertDialogCancel>

                            <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={async () => {
                                    if (fileToDelete) {
                                        await handleDeleteFile(fileToDelete);
                                        setFileToDelete(null);
                                    }
                                }}
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4">
                    <div className="flex flex-wrap gap-2">
                        <Button variant="destructive" size="sm" onClick={() => { onDelete(operacion); onOpenChange(false); }}>
                            <Trash2 className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Eliminar</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { onEdit(operacion); }}
                        >
                            <Edit className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Editar</span>
                        </Button>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('openOperacionFiles', { detail: operacion }));
                            }}
                        >
                            <FolderOpen className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Archivos</span>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    disabled={!!generando}
                                >
                                    {generando ? (
                                        <Spin className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <FileDown className="w-4 h-4 mr-2" />
                                    )}
                                    Generar Aviso
                                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                                <DropdownMenuItem onClick={() => handleGenerarAviso('general')}>
                                    <FileText className="w-4 h-4 mr-2 text-slate-500" />
                                    General
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerarAviso('arribo')}>
                                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                    Arribo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerarAviso('zarpe')}>
                                    <FileText className="w-4 h-4 mr-2 text-green-500" />
                                    Zarpe
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {!operacion?.operacion_madre_id && (
                            <Button
                                variant="secondary"
                                onClick={() => setSubDialogOpen(true)}
                            >
                                + Sub-Operación
                            </Button>
                        )}

                    </div>

                    <Button variant="ghost" size="sm" className="self-end sm:self-auto" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <SubOperacionDialog
                    open={subDialogOpen}
                    onOpenChange={(value) => {
                        setSubDialogOpen(value);
                        if (!value) {
                            // refrescar documentos o datos si quieres
                            // opcional
                        }
                    }}
                    parentOperacion={operacion}
                />
                <FilePreviewModal
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    file={{
                        name: previewName
                    }}
                    bucket={BUCKET}
                    onDownload={() => handleDownload(previewName)}
                />
            </DialogContent>
        </Dialog >
    );
};

export default DetailModal;