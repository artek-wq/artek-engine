/**
 * documentService.js — Fuente única de verdad para gestión de archivos
 *
 * Regla de rutas en Storage:
 *   {entidad_tipo}/{entidad_id}/{subfolder}/{nombre_sanitizado}
 *
 * Entidad tipos válidos: operacion, cliente, proveedor, pago, facturacion, ventas, finanzas
 * Subfolders válidos: general, facturacion, pagos_proveedores
 *
 * Tabla documentos (columnas):
 *   id, nombre, archivo_path, entidad_tipo, entidad_id, carpeta,
 *   bucket, mime_type, size, tipo, created_by, created_at, updated_at
 */

import { supabase } from '@/lib/customSupabaseClient';

export const BUCKET = 'team-files';

// ─── TIPOS DE DOCUMENTO (estándar forwarding) ─────────────────────────────────
export const TIPOS_DOCUMENTO = [
    { value: 'general', label: 'General / Otro' },
    { value: 'bl', label: 'BL / AWB' },
    { value: 'mbl', label: 'MBL' },
    { value: 'hbl', label: 'HBL / HAWB' },
    { value: 'factura', label: 'Factura comercial' },
    { value: 'packing_list', label: 'Packing List' },
    { value: 'pod', label: 'POD / Comprobante entrega' },
    { value: 'pedimento', label: 'Pedimento' },
    { value: 'permiso', label: 'Permiso de importación' },
    { value: 'certificado', label: 'Certificado de origen' },
    { value: 'seguro', label: 'Póliza de seguro' },
    { value: 'contrato', label: 'Contrato' },
    { value: 'cotizacion', label: 'Cotización' },
    { value: 'comprobante_pago', label: 'Comprobante de pago' },
];

// ─── SANITIZACIÓN DE NOMBRE ───────────────────────────────────────────────────
export function sanitizeName(fileName) {
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop().toLowerCase() : '';
    const base = parts.join('.')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // quitar acentos
        .replace(/\s+/g, '_')             // espacios → _
        .replace(/[^a-zA-Z0-9._-]/g, '_') // caracteres especiales → _
        .replace(/_+/g, '_')              // múltiples _ → uno
        .replace(/^_|_$/g, '')            // trim _
        .toLowerCase();
    return (base || 'archivo') + ext;
}

// ─── DETECCIÓN DE TIPO POR NOMBRE ────────────────────────────────────────────
export function detectTipo(fileName) {
    const n = fileName.toUpperCase();
    if (/\bMBL\b/.test(n)) return 'mbl';
    if (/\bHBL\b|\bHAWB\b/.test(n)) return 'hbl';
    if (/\bAWB\b|\bBL\b/.test(n)) return 'bl';
    if (/INVOICE|FACTURA|COMERCIAL/.test(n)) return 'factura';
    if (/PACKING/.test(n)) return 'packing_list';
    if (/\bPOD\b|ENTREGA|DELIVERY/.test(n)) return 'pod';
    if (/PEDIMENTO/.test(n)) return 'pedimento';
    if (/PERMISO/.test(n)) return 'permiso';
    if (/CERTIFICADO|ORIGEN/.test(n)) return 'certificado';
    if (/SEGURO|POLIZA/.test(n)) return 'seguro';
    if (/CONTRATO/.test(n)) return 'contrato';
    if (/COTIZACION|QUOTE/.test(n)) return 'cotizacion';
    if (/PAGO|COMPROBANTE|RECIBO/.test(n)) return 'comprobante_pago';
    return 'general';
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────
/**
 * Sube un archivo a Storage Y registra en tabla documentos.
 * @param {Object} params
 * @param {File}   params.file
 * @param {string} params.entidadTipo  — 'operacion' | 'cliente' | 'proveedor' | etc.
 * @param {string} params.entidadId    — UUID de la entidad
 * @param {string} params.subfolder    — 'general' | 'facturacion' | 'pagos_proveedores'
 * @param {string} [params.tipoManual] — tipo forzado (omite detección automática)
 * @param {function} [params.onProgress] — callback(0-100) para progreso
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function uploadDocument({ file, entidadTipo, entidadId, subfolder = 'general', tipoManual, onProgress }) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sesión inválida. Inicia sesión nuevamente.');

        const cleanName = sanitizeName(file.name);
        const storagePath = `${entidadTipo}/${entidadId}/${subfolder}/${cleanName}`;
        const tipo = tipoManual || detectTipo(file.name);

        // 1. Subir a Storage
        let uploadError;
        if (onProgress) {
            // Upload con progreso via XHR
            const { data: signedData, error: signErr } = await supabase.storage
                .from(BUCKET)
                .createSignedUploadUrl(storagePath);

            if (signErr) throw signErr;

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signedData.signedUrl, true);
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
                xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
                xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error(`Upload falló: ${xhr.status}`));
                xhr.onerror = () => reject(new Error('Error de red al subir archivo'));
                xhr.send(file);
            });
        } else {
            const { error } = await supabase.storage
                .from(BUCKET)
                .upload(storagePath, file, { cacheControl: '3600', upsert: false });
            uploadError = error;
            // Si ya existe, intentar con nombre único
            if (uploadError?.message?.includes('already exists') || uploadError?.statusCode === '23505') {
                const ts = Date.now();
                const parts = cleanName.split('.');
                const ext = parts.length > 1 ? '.' + parts.pop() : '';
                const uniqueName = `${parts.join('.')}_${ts}${ext}`;
                const uniquePath = `${entidadTipo}/${entidadId}/${subfolder}/${uniqueName}`;
                const { error: e2 } = await supabase.storage.from(BUCKET).upload(uniquePath, file, { cacheControl: '3600', upsert: false });
                if (e2) throw e2;
                // Usar el nombre único
                const finalPath = uniquePath;
                return await _registrarDocumento({ user, file, cleanName: uniqueName, storagePath: finalPath, entidadTipo, entidadId, subfolder, tipo });
            }
            if (uploadError) throw uploadError;
        }

        // 2. Registrar en tabla documentos
        return await _registrarDocumento({ user, file, cleanName, storagePath, entidadTipo, entidadId, subfolder, tipo });

    } catch (error) {
        return { data: null, error };
    }
}

async function _registrarDocumento({ user, file, cleanName, storagePath, entidadTipo, entidadId, subfolder, tipo }) {
    const { data, error } = await supabase
        .from('documentos')
        .insert({
            nombre: cleanName,
            archivo_path: storagePath,
            entidad_tipo: entidadTipo,
            entidad_id: entidadId,
            carpeta: subfolder,
            bucket: BUCKET,
            mime_type: file.type || 'application/octet-stream',
            size: file.size,
            tipo,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        // El archivo ya está en Storage, solo falló el registro. No es fatal.
        console.warn('[documentService] Storage OK pero fallo en tabla documentos:', error.message);
        return { data: { nombre: cleanName, archivo_path: storagePath, _storageOnly: true }, error: null };
    }
    return { data, error: null };
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
/**
 * Lista documentos de una entidad desde la tabla documentos (rápido, no Storage).
 */
export async function listDocuments({ entidadTipo, entidadId, subfolder, tipo }) {
    let query = supabase
        .from('documentos')
        .select('*')
        .eq('entidad_tipo', entidadTipo)
        .eq('entidad_id', entidadId)
        .order('created_at', { ascending: false });

    if (subfolder) query = query.eq('carpeta', subfolder);
    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: data || [], error: null };
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
/**
 * Búsqueda global en tabla documentos — rápida y confiable.
 */
export async function searchDocuments(query, { limit = 50 } = {}) {
    if (!query || query.length < 2) return { data: [], error: null };

    const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .or(`nombre.ilike.%${query}%,entidad_tipo.ilike.%${query}%,carpeta.ilike.%${query}%,tipo.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return { data: [], error };

    // Enriquecer con nombre de entidad si está disponible en caché
    return { data: data || [], error: null };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
/**
 * Elimina un archivo de Storage Y de la tabla documentos.
 * Acepta un objeto documento de la tabla o un path directo.
 */
export async function deleteDocument(docOrPath) {
    try {
        const storagePath = typeof docOrPath === 'string'
            ? docOrPath
            : (docOrPath.archivo_path || `${docOrPath.folder}/${docOrPath.nombre || docOrPath.name}`);

        // 1. Eliminar de Storage
        const { error: storErr } = await supabase.storage.from(BUCKET).remove([storagePath]);
        if (storErr) throw storErr;

        // 2. Eliminar de tabla documentos (por path o por id)
        if (typeof docOrPath === 'object' && docOrPath.id) {
            await supabase.from('documentos').delete().eq('id', docOrPath.id);
        } else {
            await supabase.from('documentos').delete().eq('archivo_path', storagePath);
        }

        return { error: null };
    } catch (error) {
        return { error };
    }
}

// ─── RENAME ───────────────────────────────────────────────────────────────────
export async function renameDocument(doc, newName) {
    try {
        const cleanNewName = sanitizeName(newName);
        const folder = doc.archivo_path.substring(0, doc.archivo_path.lastIndexOf('/'));
        const newPath = `${folder}/${cleanNewName}`;

        const { error: moveErr } = await supabase.storage.from(BUCKET).move(doc.archivo_path, newPath);
        if (moveErr) throw moveErr;

        if (doc.id) {
            await supabase.from('documentos').update({
                nombre: cleanNewName,
                archivo_path: newPath,
            }).eq('id', doc.id);
        }

        return { newPath, error: null };
    } catch (error) {
        return { newPath: null, error };
    }
}

// ─── GET SIGNED URL ───────────────────────────────────────────────────────────
export async function getSignedUrl(path, expiresIn = 3600) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
    if (error) return { url: null, error };
    return { url: data.signedUrl, error: null };
}

// ─── DOWNLOAD ─────────────────────────────────────────────────────────────────
export async function downloadDocument(doc) {
    const path = typeof doc === 'string' ? doc : doc.archivo_path;
    const name = typeof doc === 'string' ? path.split('/').pop() : (doc.nombre || doc.name);
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error) return { error };
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { error: null };
}

// ─── FORMATO HELPERS ──────────────────────────────────────────────────────────
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export function getFileExt(name = '') {
    return (name.split('.').pop() || '').toLowerCase();
}

export function isImage(name) {
    return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(getFileExt(name));
}

export function isPDF(name) {
    return getFileExt(name) === 'pdf';
}

// Label legible del tipo
export function getTipoLabel(tipo) {
    return TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label || tipo || 'General';
}
