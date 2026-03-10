import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

    // Agrupar permisos por módulo
    const groupedPermissions = permissions.reduce((acc, p) => {

        if (!acc[p.resource]) {
            acc[p.resource] = [];
        }

        acc[p.resource].push(p);

        return acc;

    }, {});

    return (

        <Tabs defaultValue={roles[0]?.id} className="space-y-6">

            {/* Tabs de roles */}
            <TabsList>

                {roles.map(role => (

                    <TabsTrigger
                        key={role.id}
                        value={role.id}
                        className="capitalize"
                    >
                        {role.name}
                    </TabsTrigger>

                ))}

            </TabsList>

            {/* Contenido de cada rol */}
            {roles.map(role => (

                <TabsContent key={role.id} value={role.id}>

                    <div className="border p-4 rounded-lg">

                        {/* Encabezado matriz */}
                        <div className="grid grid-cols-5 gap-4 text-xs font-semibold text-slate-500 uppercase mb-3 border-b pb-2">
                            <div>Módulo</div>
                            <div>Read</div>
                            <div>Create</div>
                            <div>Update</div>
                            <div>Delete</div>
                        </div>

                        {Object.entries(groupedPermissions).map(([resource, perms]) => (

                            <div key={resource} className="grid grid-cols-5 gap-4 items-center py-2 border-b last:border-0">

                                <div className="font-medium capitalize text-slate-700">
                                    {resource}
                                </div>

                                {["read", "create", "update", "delete"].map(action => {

                                    const permission = perms.find(p => p.action === action);

                                    if (!permission) return <div key={action}></div>;

                                    const active = hasPermission(role.id, permission.id);

                                    return (

                                        <Switch
                                            key={action}
                                            checked={active}
                                            onCheckedChange={() => togglePermission(role.id, permission.id)}
                                        />

                                    );

                                })}

                            </div>

                        ))}

                    </div>

                </TabsContent>

            ))}

        </Tabs>

    );

}