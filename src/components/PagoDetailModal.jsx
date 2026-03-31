import DocumentsTab from '@/components/DocumentsTab';
import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Upload, Download, FileText, X } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";

const BUCKET = "team-files";

function PagoDetailModal({
    open,
    onOpenChange,
    pago,
    onDelete,
    onEdit
}) {

    const [documentos, setDocumentos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (open && pago?.id) {
            fetchDocumentos();
        }
    }, [open, pago]);

    const fetchDocumentos = async () => {

        const { data } = await supabase.storage
            .from(BUCKET)
            .list(`pagos/${pago.id}`, {
                limit: 100,
                sortBy: { column: "created_at", order: "desc" }
            });

        setDocumentos(data || []);
    };

    const uploadFile = async (file) => {

        if (!file) return;

        setUploading(true);

        const path = `pagos/${pago.id}/${file.name}`;

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { upsert: true });

        if (!error) {
            fetchDocumentos();
        }

        setUploading(false);
    };

    const handleDownload = async (fileName) => {

        const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(`pagos/${pago.id}/${fileName}`, 60);

        if (data?.signedUrl) {
            window.open(data.signedUrl);
        }
    };

    const handlePreview = async (fileName) => {

        const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(`pagos/${pago.id}/${fileName}`, 60);

        if (data?.signedUrl) {
            setPreviewUrl(data.signedUrl);
        }
    };

    const handleDeleteFile = async (fileName) => {

        await supabase.storage
            .from(BUCKET)
            .remove([`pagos/${pago.id}/${fileName}`]);

        fetchDocumentos();
    };

    const registrarPago = async (monto, metodo) => {

        const { data: { user } } = await supabase.auth.getUser();

        await supabase
            .from("pagos_historial")
            .insert({
                pago_id: pago.id,
                monto,
                metodo,
                user_id: user.id
            });

        const nuevoPagado = Number(pago.monto_pagado || 0) + Number(monto);
        const nuevoSaldo = Number(pago.monto_total) - nuevoPagado;

        await supabase
            .from("pagos")
            .update({
                monto_pagado: nuevoPagado,
                saldo: nuevoSaldo,
                status: nuevoSaldo <= 0 ? "Pagado" : "Parcial"
            })
            .eq("id", pago.id);

        // refrescar datos del modal
        onEdit({
            ...pago,
            monto_pagado: nuevoPagado,
            saldo: nuevoSaldo,
            status: nuevoSaldo <= 0 ? "Pagado" : "Parcial"
        });

    };

    const formatDate = (date) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString();
    };

    if (!pago) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>

            <DialogContent className="max-w-4xl">

                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        Pago • {pago.referencia}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="general">

                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="documentos">Documentos</TabsTrigger>
                    </TabsList>

                    {/* GENERAL */}
                    <TabsContent value="general" className="mt-6">

                        <div className="grid grid-cols-2 gap-4">

                            <Info label="Cliente" value={pago.cliente} />
                            <Info label="Proveedor" value={pago.proveedor} />
                            <Info label="Concepto" value={pago.concepto} />

                            <Info
                                label="Monto"
                                value={`${pago.divisa} ${Number(pago.monto_total || pago.monto || 0).toLocaleString()}`}
                            />

                            <Info
                                label="Pagado"
                                value={`${pago.divisa} ${Number(pago.monto_pagado || 0).toLocaleString()}`}
                            />

                            <Info
                                label="Pendiente"
                                value={`${pago.divisa} ${Number(pago.saldo || 0).toLocaleString()}`}
                            />

                            <Info label="Status" value={pago.status} />

                            <Info
                                label="Fecha límite"
                                value={formatDate(pago.fecha_limite)}
                            />

                            <Info
                                label="Creado"
                                value={formatDate(pago.created_at)}
                            />

                        </div>

                    </TabsContent>

                    {/* DOCUMENTOS */}
                    <TabsContent value="documentos" className="mt-6">
                        {pago?.operacion_id ? (
                            <DocumentsTab
                                entidadTipo="operacion"
                                entidadId={pago.operacion_id}
                                subfolders={[{ key: 'pagos', label: 'Pagos' }]}
                                fixedSubfolder="pagos"
                                compact={true}
                            />
                        ) : (
                            <DocumentsTab
                                entidadTipo="pago"
                                entidadId={pago?.id}
                                subfolders={[{ key: 'general', label: 'General' }]}
                                defaultSubfolder="general"
                                compact={true}
                            />
                        )}
                    </TabsContent>

                </Tabs>

                {/* FOOTER */}
                <div className="flex justify-between mt-6">

                    <div className="flex gap-3">

                        <Button
                            variant="destructive"
                            onClick={() => {
                                onDelete(pago.id);
                                onOpenChange(false);
                            }}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => {

                                const monto = prompt("Monto del pago:");
                                const metodo = prompt("Método (Transferencia / Efectivo / etc):");

                                if (!monto) return;

                                registrarPago(Number(monto), metodo);

                            }}
                        >
                            Registrar pago
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => onEdit(pago)}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                        </Button>

                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                    >
                        Cerrar
                    </Button>

                </div>

            </DialogContent>

        </Dialog>
    );
}

const Info = ({ label, value }) => (

    <div className="bg-slate-50 border rounded-lg p-3">

        <div className="text-xs text-slate-400 uppercase">
            {label}
        </div>

        <div className="text-sm font-medium text-slate-700">
            {value || "-"}
        </div>

    </div>

);

export default PagoDetailModal;