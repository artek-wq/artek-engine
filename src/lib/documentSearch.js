import { supabase } from '@/lib/customSupabaseClient';

export const searchDocuments = async (query) => {

    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .ilike('nombre', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
};