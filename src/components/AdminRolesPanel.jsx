import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";

export default function AdminRolesPanel() {

    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {

        const { data: r } = await supabase
            .from("roles")
            .select("*");

        const { data: p } = await supabase
            .from("permissions")
            .select("*");

        const { data: rp } = await supabase
            .from("role_permissions")
            .select("*");

        setRoles(r || []);
        setPermissions(p || []);
        setRolePermissions(rp || []);

    };

    const hasPermission = (roleId, permissionId) => {

        return rolePermissions.some(
            rp => rp.role_id === roleId && rp.permission_id === permissionId
        );

    };

    const togglePermission = async (roleId, permissionId) => {

        const exists = hasPermission(roleId, permissionId);

        try {

            if (exists) {

                await supabase
                    .from("role_permissions")
                    .delete()
                    .eq("role_id", roleId)
                    .eq("permission_id", permissionId);

            } else {

                await supabase
                    .from("role_permissions")
                    .insert({
                        role_id: roleId,
                        permission_id: permissionId
                    });

            }

            loadData();

        } catch (err) {

            console.error("Error actualizando permiso", err);

        }

    };

    return (

        <div className="space-y-6">

            {roles.map(role => (

                <div key={role.id} className="border p-4 rounded-lg">

                    <h3 className="font-bold mb-3">{role.name}</h3>

                    <div className="grid grid-cols-4 gap-2">

                        {permissions.map(p => {

                            const active = hasPermission(role.id, p.id);

                            return (

                                <Button
                                    key={p.id}
                                    size="sm"
                                    variant={active ? "default" : "outline"}
                                    className={active ? "bg-blue-600 hover:bg-blue-700" : ""}
                                    onClick={() => togglePermission(role.id, p.id)}
                                >
                                    {p.resource}.{p.action}
                                </Button>

                            );

                        })}

                    </div>

                </div>

            ))}

        </div>

    );

}