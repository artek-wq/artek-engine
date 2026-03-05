import React, { useEffect, useState, useRef } from 'react';
import FilePreviewModal from "@/components/FilePreviewModal";
import SubOperacionDialog from '@/components/SubOperacionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    List
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { STATUS, STATUS_STYLES } from '@/constants/status';
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

const BUCKET = 'team-files';

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

        const { data } = await supabase.storage
            .from(BUCKET)
            .list(`operaciones/${operacionId}`, {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        setDocumentos(data || []);
    };

    const fetchSubOperaciones = async (operacionId) => {
        const { data, error } = await supabase
            .from('operaciones')
            .select('*')
            .eq('operacion_madre_id', operacionId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(error);
            return;
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

            const filePath = `operaciones/${operacion.id}/${file.name}`;

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
                    console.error("Error generando thumbnail PDF:", error);
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
        const path = `operaciones/${operacion.id}/${cleanName}`;

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

        setUploading(true);
        setProgress(0);
        setErrorMsg(null);

        try {
            await uploadFileWithProgress(file);
            fetchDocumentos(operacion.id);
        } catch (err) {
            setErrorMsg(err.toString());
        }

        setUploading(false);
        setProgress(0);
    };

    const handleDownload = async (fileName) => {
        const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(
                `operaciones/${operacion.id}/${fileName}`,
                60
            );

        window.open(data.signedUrl, '_blank');
    };

    const handlePreview = async (fileName) => {

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(
                `operaciones/${operacion.referencia}/${fileName}`,
                60
            );

        if (error) {
            console.error(error);
            return;
        }

        setPreviewUrl(data.signedUrl);
        setPreviewName(fileName);
        setPreviewOpen(true);

    };

    const handleDeleteFile = async (fileName) => {
        await supabase.storage
            .from(BUCKET)
            .remove([`operaciones/${operacion.id}/${fileName}`]);

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

    if (!operacion && loading) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">

                <DialogHeader className="bg-gradient-to-r from-indigo-50 to-white border-b p-6 rounded-t-xl">

                    <div className="flex justify-between items-start">

                        <div>
                            <DialogTitle className="text-3xl font-bold tracking-tight">
                                {operacion?.referencia}
                            </DialogTitle>

                            <div className="text-sm font-medium text-slate-600 mt-2">
                                {operacion?.clientes?.nombre}
                            </div>

                            <div className="text-sm text-slate-500 mt-1">
                                {operacion?.origen} → {operacion?.destino}
                            </div>
                        </div>

                        <select
                            value={operacion?.status}
                            onChange={async (e) => {

                                const newStatus = e.target.value;

                                const { error } = await supabase
                                    .from('operaciones')
                                    .update({ status: newStatus })
                                    .eq('id', operacion.id)
                                    .select()
                                    .single();

                                if (!error) {

                                    setOperacion(prev => ({
                                        ...prev,
                                        status: newStatus
                                    }));

                                    // 🔥 Notificar al padre
                                    onEdit?.({
                                        ...operacion,
                                        status: newStatus
                                    });
                                }
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-semibold border-none outline-none cursor-pointer ${STATUS_STYLES[operacion?.status] || 'bg-slate-100 text-slate-700'}`}
                        >
                            {Object.values(STATUS).map(status => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

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

                            {/* Toggle Vista */}
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-2">
                                    <Button size="icon" variant={viewMode === "grid" ? "default" : "outline"} onClick={() => setViewMode("grid")}>
                                        <Grid className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}>
                                        <List className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* DRAG & DROP */}
                            <div
                                onDragEnter={() => setDragActive(true)}
                                onDragLeave={() => setDragActive(false)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragActive(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleUpload(file);
                                }}
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition mb-4 ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300"}`}
                            >
                                <p className="text-sm text-slate-600">
                                    Arrastra archivos aquí o
                                </p>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Seleccionar Archivo
                                </Button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => handleUpload(e.target.files[0])}
                                    className="hidden"
                                />

                                {uploading && (
                                    <div className="mt-4">
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs mt-1 text-slate-500">
                                            {progress}% subido
                                        </p>
                                    </div>
                                )}
                            </div>

                            {errorMsg && (
                                <p className="text-red-500 text-sm mb-3">
                                    {errorMsg}
                                </p>
                            )}

                            {/* GRID VIEW */}
                            {viewMode === "grid" && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {documentos.map(file => (
                                        <div
                                            key={file.name}
                                            onClick={() => handlePreview(file.name)}
                                            className="group relative bg-white border border-slate-200 rounded-2xl p-3 transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-slate-300"
                                        >
                                            <div className="relative h-32 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">

                                                {loadingThumbs[file.name] ? (
                                                    <div className="animate-pulse w-full h-full bg-slate-200" />
                                                ) : thumbnails[file.name] ? (
                                                    <img
                                                        src={thumbnails[file.name]}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : isPDF(file.name) ? (
                                                    <FileText className="w-10 h-10 text-red-600" />
                                                ) : (
                                                    <FileText className="w-10 h-10 text-slate-400" />
                                                )}

                                                {/* Overlay oscuro suave */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

                                                {/* Botones flotantes */}
                                                <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">

                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="h-9 w-9 rounded-full shadow-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePreview(file.name);
                                                        }}
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="h-9 w-9 rounded-full shadow-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownload(file.name);
                                                        }}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        className="h-9 w-9 rounded-full shadow-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFileToDelete(file.name);
                                                            setConfirmOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>

                                                </div>
                                            </div>

                                            <div className="mt-2 text-sm font-medium truncate">
                                                {file.name}
                                            </div>

                                            <div className="text-xs text-slate-500">
                                                {formatSize(file.metadata?.size)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* PREVIEW */}
                            {previewUrl && (
                                <div className="mt-6 border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">

                                    <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b backdrop-blur-sm">
                                        <span className="text-sm font-medium">
                                            Preview: {previewName}
                                        </span>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setPreviewUrl(null)}
                                        >
                                            Cerrar
                                        </Button>
                                    </div>

                                    {/* IMAGE PREVIEW */}
                                    {isImage(previewName) && (
                                        <img
                                            src={previewUrl}
                                            alt="preview"
                                            className="w-full max-h-[600px] object-contain bg-slate-900"
                                        />
                                    )}

                                    {/* PDF PREVIEW */}
                                    {isPDF(previewName) && (
                                        <div className="w-full h-[600px]">
                                            <iframe
                                                src={previewUrl}
                                                className="w-full h-full"
                                                title="PDF Preview"
                                            />
                                        </div>
                                    )}

                                    {/* FALLBACK PARA OTROS TIPOS */}
                                    {!isImage(previewName) && !isPDF(previewName) && (
                                        <div className="p-6 text-center text-slate-500">
                                            No se puede mostrar el archivo en el navegador.
                                            <div className="mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDownload(previewName)}
                                                >
                                                    Descargar archivo
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

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
                <div className="flex justify-between pt-4">
                    <div className="flex gap-3">
                        <Button variant="destructive" onClick={() => { onDelete(operacion); onOpenChange(false); }}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                onEdit(operacion);
                            }}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => {
                                window.dispatchEvent(
                                    new CustomEvent('openOperacionFiles', {
                                        detail: operacion
                                    })
                                );
                            }}
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Archivos
                        </Button>

                        {!operacion?.operacion_madre_id && (
                            <Button
                                variant="secondary"
                                onClick={() => setSubDialogOpen(true)}
                            >
                                + Sub-Operación
                            </Button>
                        )}

                    </div>

                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
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