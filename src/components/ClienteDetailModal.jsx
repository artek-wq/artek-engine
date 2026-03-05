import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import ClienteFilesDialog from "@/components/ClienteFilesDialog";

function ClienteDetailModal({ open, onOpenChange, cliente, initialTab = "general" }) {

    const [operaciones, setOperaciones] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [activeTab, setActiveTab] = useState(initialTab)

    useEffect(() => {

        if (!cliente) return;

        loadData();

    }, [cliente]);

    useEffect(() => {

        setActiveTab(initialTab)

    }, [initialTab, open])

    const loadData = async () => {

        const { data: ops } = await supabase
            .from("operaciones")
            .select("*")
            .eq("cliente_id", cliente.id);

        setOperaciones(ops || []);

        const { data: docs } = await supabase
            .from("documentos")
            .select("*")
            .eq("cliente_id", cliente.id);

        setDocumentos(docs || []);

    };

    if (!cliente) return null;

    return (

        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">

                <DialogHeader className="bg-gradient-to-r from-indigo-50 to-white border-b p-6 rounded-t-xl">

                    <div className="flex justify-between items-start">

                        <div>

                            <DialogTitle className="text-3xl font-bold tracking-tight">
                                {cliente?.nombre}
                            </DialogTitle>

                            <div className="text-sm font-medium text-slate-600 mt-2">
                                RFC: {cliente?.rfc}
                            </div>

                            <div className="text-sm text-slate-500 mt-1">
                                {cliente?.domicilio}
                            </div>

                            <div className="text-xs text-slate-400">
                                CP: {cliente?.codigo_postal}
                            </div>

                        </div>

                    </div>

                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab}>

                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="operaciones">Operaciones</TabsTrigger>
                        <TabsTrigger value="documentos">Documentos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general">
                        <div className="mt-6">

                            <h3 className="text-sm font-semibold text-slate-600 mb-3">
                                Contactos
                            </h3>

                            <div className="space-y-2">

                                {cliente.contactos?.map((c, index) => (

                                    <div
                                        key={index}
                                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                                    >

                                        <div className="font-medium text-sm">
                                            {c.nombre}
                                        </div>

                                        {c.puesto && (
                                            <div className="text-xs text-slate-500">
                                                {c.puesto}
                                            </div>
                                        )}

                                        {c.email && (
                                            <div className="text-xs text-slate-500">
                                                {c.email}
                                            </div>
                                        )}

                                        {c.telefono && (
                                            <div className="text-xs text-slate-500">
                                                {c.telefono}
                                            </div>
                                        )}

                                    </div>

                                ))}

                            </div>

                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">

                            <div>
                                <div className="text-xs text-slate-500">RFC</div>
                                <div className="font-medium">{cliente.rfc}</div>
                            </div>

                            <div>
                                <div className="text-xs text-slate-500">CP</div>
                                <div className="font-medium">{cliente.codigo_postal}</div>
                            </div>

                            <div className="col-span-2">
                                <div className="text-xs text-slate-500">Domicilio</div>
                                <div className="font-medium">{cliente.domicilio}</div>
                            </div>

                        </div>

                    </TabsContent>

                    <TabsContent value="operaciones">

                        <div className="space-y-2 mt-4">

                            {operaciones.map(op => (

                                <div
                                    key={op.id}
                                    onClick={() => {

                                        window.dispatchEvent(
                                            new CustomEvent('openOperacionFromCliente', {
                                                detail: op.id
                                            })
                                        )

                                        onOpenChange(false)

                                    }}
                                    className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:bg-slate-50 cursor-pointer transition"
                                >

                                    <div>

                                        <div className="font-semibold text-sm text-slate-800">
                                            {op.referencia}
                                        </div>

                                        <div className="text-xs text-slate-500 mt-1">
                                            {op.origen} → {op.destino}
                                        </div>

                                    </div>

                                    <div className="text-xs font-medium text-slate-500">
                                        {op.status}
                                    </div>

                                </div>

                            ))}

                        </div>

                    </TabsContent>

                    <TabsContent value="documentos">

                        <ClienteFilesDialog
                            open={true}
                            cliente={cliente}
                            embedded={true}
                        />

                    </TabsContent>
                </Tabs>

                {/* FOOTER */}
                <div className="flex justify-between pt-6 border-t mt-6">

                    <div className="flex gap-3">

                        <Button
                            variant="outline"
                            onClick={() => {

                                window.dispatchEvent(
                                    new CustomEvent('editCliente', {
                                        detail: cliente
                                    })
                                )

                            }}
                        >
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

export default ClienteDetailModal;