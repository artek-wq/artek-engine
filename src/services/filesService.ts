import { supabase } from "../lib/customSupabaseClient"

export async function uploadFile({
    file,
    entidadTipo,
    entidadId,
    carpeta,
    userId
}: {
    file: File
    entidadTipo: string
    entidadId: string
    carpeta: string
    userId: string
}) {

    const filePath =
        `${entidadTipo}s/${entidadId}/${carpeta}/${file.name}`

    const { error: uploadError } = await supabase.storage
        .from("team-files")
        .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { error: dbError } = await supabase.rpc(
        "registrar_documento",
        {
            p_nombre: file.name,
            p_path: filePath,
            p_entidad_tipo: entidadTipo,
            p_entidad_id: entidadId,
            p_carpeta: carpeta,
            p_user: userId
        }
    )

    if (dbError) throw dbError

    return filePath
}