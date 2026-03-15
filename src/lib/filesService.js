import { supabase } from "@/lib/customSupabaseClient";
import { BUCKET_NAME } from "@/lib/fileUtils";

export function detectDocumentType(fileName) {

    const name = fileName.toUpperCase();

    if (name.includes("MBL")) return "mbl";
    if (name.includes("HBL")) return "hbl";
    if (name.includes("BL")) return "bl";

    if (name.includes("INVOICE") || name.includes("FACTURA"))
        return "factura";

    if (name.includes("PACKING"))
        return "packing_list";

    if (name.includes("POD"))
        return "pod";

    return "documento";
}

export async function uploadDocument({
    file,
    entidadTipo,
    entidadId,
    carpeta = "general"
}) {

    const sanitizedName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9.\-_]/g, "")
        .toLowerCase();

    const path = `${entidadTipo}s/${entidadId}/${carpeta}/${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file);

    if (uploadError) throw uploadError;

    const tipoDocumento = detectDocumentType(file.name);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: dbError } = await supabase
        .from("documentos")
        .insert({
            nombre: sanitizedName,
            archivo_path: path,
            entidad_tipo: entidadTipo,
            entidad_id: entidadId,
            carpeta: carpeta,
            bucket: BUCKET_NAME,
            mime_type: file.type,
            size: file.size,
            tipo: tipoDocumento,
            created_by: user?.id
        });

    if (dbError) throw dbError;

    return path;
}

export async function deleteDocument(path) {

    await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

    await supabase
        .from("documentos")
        .delete()
        .eq("archivo_path", path);
}