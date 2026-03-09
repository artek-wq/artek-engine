import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";

export function usePermissions() {

    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        loadPermissions();

        const { data: listener } = supabase.auth.onAuthStateChange(() => {
            loadPermissions();
        });

        return () => {
            listener.subscription.unsubscribe();
        };

    }, []);

    const loadPermissions = async () => {

        try {

            const { data, error } = await supabase
                .from("v_role_permissions")
                .select("resource, action, enabled")
                .eq("enabled", true);

            if (error) throw error;

            const map = {};

            data?.forEach(p => {
                const key = `${p.resource}.${p.action}`;
                map[key] = true;
            });

            console.log("PERMISSIONS MAP:", map);

            setPermissions(map);

        } catch (err) {

            console.error("Error cargando permisos:", err);

        } finally {

            setLoading(false);

        }

    };

    const can = (permission) => {

        if (!permission) return false;

        return permissions[permission] === true;

    };

    return {
        can,
        loading,
        permissions
    };

}