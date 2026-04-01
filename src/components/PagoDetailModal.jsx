import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import DocumentsTab from "@/components/DocumentsTab";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function Info({ label, value }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
            <div className="text-sm font-medium text-slate-700 truncate">{value || "—"}</div>
        </div>
    );
}

function formatDate(str) {
    if (!str) return "—";
    const d = new Date(str);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function PagoDetailModal({ open, onOpenChange, pago, onDelete, onEdit }) {
    const [monto, setMonto] = useState("");
    const [registrando, setRegistrando] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleRegistrarPago = async () => {
        if (!monto || isNaN(Number(monto))) return;
        setRegistrando(true);
        const nuevoPagado = Number(pago.monto_pagado || 0) + Number(monto);
        const nuevoSaldo = Number(pago.monto_total || pago.monto || 0) - nuevoPagado;

        await supabase.from("pagos_historial").insert({
            pago_id: pago.id,
            monto: Number(monto),
            created_at: new Date().toISOString(),
        });

        await supabase.from("pagos")
            .update({ monto_pagado: nuevoPagado, saldo: nuevoSaldo })
            .eq("id", pago.id);

        setMonto("");
        setRegistrando(false);
        onOpenChange(false);
    };

    if (!pago) return null;

    // Determine where documents go:
    // If pago has operacion_id → files go to operacion/{id}/pagos/
    // Otherwise → files go to pago/{id}/general/ (fallback)
    const docsEntidadTipo = pago.operacion_id ? "operacion" : "pago";
    const docsEntidadId = pago.operacion_id ? pago.operacion_id : pago.id;
    const docsSubfolders = pago.operacion_id
        ? [{ key: "pagos", label: "Pagos" }]
        : [{ key: "general", label: "General" }];
    const docsFixed = pago.operacion_id ? "pagos" : undefined;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            Pago • {pago.referencia}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Detalle del pago {pago.referencia}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="shrink-0">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="documentos">Documentos</TabsTrigger>
                        </TabsList>

                        {/* GENERAL TAB */}
                        <TabsContent value="general" className="mt-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <Info label="Cliente" value={pago.cliente} />
                                <Info label="Proveedor" value={pago.proveedor} />
                                <Info label="Concepto" value={pago.concepto} />
                                <Info label="Referencia" value={pago.referencia} />
                                <Info label="Monto total" value={`${pago.divisa} ${Number(pago.monto_total || pago.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} />
                                <Info label="Monto pagado" value={`${pago.divisa} ${Number(pago.monto_pagado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} />
                                <Info label="Saldo" value={`${pago.divisa} ${Number(pago.saldo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} />
                                <Info label="Status" value={pago.status} />
                                <Info label="Fecha límite" value={formatDate(pago.fecha_limite)} />
                                <Info label="Fecha creación" value={formatDate(pago.created_at)} />
                            </div>

                            {/* Registrar pago parcial */}
                            <div className="mt-6 border-t pt-4">
                                <p className="text-sm font-semibold text-slate-700 mb-3">Registrar pago</p>
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        value={monto}
                                        onChange={e => setMonto(e.target.value)}
                                        placeholder="Monto a registrar..."
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Button
                                        onClick={handleRegistrarPago}
                                        disabled={registrando || !monto}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {registrando ? "Guardando..." : "Registrar pago"}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* DOCUMENTOS TAB */}
                        <TabsContent value="documentos" className="mt-4 overflow-y-auto flex-1">
                            <DocumentsTab
                                entidadTipo={docsEntidadTipo}
                                entidadId={docsEntidadId}
                                subfolders={docsSubfolders}
                                fixedSubfolder={docsFixed}
                                compact={true}
                            />
                        </TabsContent>
                    </Tabs>

                    {/* Footer */}
                    <div className="flex justify-between pt-4 border-t shrink-0">
                        <div className="flex gap-3">
                            <Button
                                variant="destructive"
                                onClick={() => setConfirmDelete(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />Eliminar
                            </Button>
                            {onEdit && (
                                <Button variant="outline" onClick={() => { onEdit(pago); onOpenChange(false); }}>
                                    <Edit className="w-4 h-4 mr-2" />Editar
                                </Button>
                            )}
                        </div>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminará permanentemente el pago <strong>{pago.referencia}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => { onDelete?.(pago.id); setConfirmDelete(false); onOpenChange(false); }}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default PagoDetailModal;
