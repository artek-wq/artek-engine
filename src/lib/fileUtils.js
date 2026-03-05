import { supabase } from '@/lib/customSupabaseClient';

// Centralized bucket configuration
export const BUCKET_NAME = 'team-files';

/**
 * Helper to get user-friendly error messages for storage operations
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return '';

  const msg = error.message || error.error_description || '';

  if (msg.includes('The resource was not found') || msg.includes('Bucket not found')) {
    return 'Error de configuración: El bucket de almacenamiento no existe. Por favor contacte al administrador.';
  }
  if (msg.includes('new row violates row-level security policy') || msg.includes('permission denied')) {
    return 'No tienes permisos suficientes para realizar esta acción. Verifica que has iniciado sesión.';
  }
  if (msg.includes('Payload too large')) {
    return 'El archivo es demasiado grande. El límite es 50MB.';
  }
  if (msg.includes('duplicate key value')) {
    return 'Ya existe un archivo con este nombre.';
  }

  return msg || 'Ocurrió un error inesperado en el sistema de archivos.';
}

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(bucket, path, file) {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.warn('No active session found during file upload.');
    }

    // Detectar si el path ya incluye nombre de archivo (.algo al final)
    const hasFileNameInPath = /\.[^/]+$/.test(path);

    let filePath;

    if (hasFileNameInPath) {
      // Ejemplo: proveedores/uuid/.keep
      filePath = path;
    } else {
      // Sanitizar nombre del archivo real
      const fileExt = file.name.includes('.')
        ? file.name.split('.').pop()
        : '';

      const fileNameWithoutExt = fileExt
        ? file.name.substring(0, file.name.lastIndexOf('.'))
        : file.name;

      const sanitizedFileName = fileExt
        ? `${fileNameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_')}.${fileExt}`
        : fileNameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_');

      filePath = `${path}/${sanitizedFileName}`;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    return { data, error: null };

  } catch (error) {
    console.error('Upload error:', error);
    return { data: null, error };
  }
}

/**
 * Download a file from Supabase storage
 */
export async function downloadFile(bucket, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Download error:', error);
    return { data: null, error };
  }
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFile(bucket, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Delete error:', error);
    return { data: null, error };
  }
}

/**
 * List files in a folder
 */
export async function listFiles(bucket, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path || '', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('List files error:', error);
    return { data: null, error };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 KB';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date to readable format
 */
export function formatDate(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileName) {
  if (!fileName) return 'File';

  const extension = fileName.split('.').pop().toLowerCase();

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'];

  if (imageExtensions.includes(extension)) return 'Image';
  if (documentExtensions.includes(extension)) return 'FileText';

  return 'File';
}

/**
 * Check if file is an image
 */
export function isImage(fileName) {
  if (!fileName) return false;

  const extension = fileName.split('.').pop().toLowerCase();
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];

  return imageExtensions.includes(extension);
}

/**
 * Check if file is a PDF
 */
export function isPDF(fileName) {
  if (!fileName) return false;

  const extension = fileName.split('.').pop().toLowerCase();
  return extension === 'pdf';
}