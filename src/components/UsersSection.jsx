import { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

function UsersSection() {

    const [users, setUsers] = useState([]);
    const { toast } = useToast();

    useEffect(() => {

        loadUsers();

    }, []);

    const loadUsers = async () => {

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {

            toast({
                title: "Error cargando usuarios",
                description: error.message,
                variant: "destructive"
            });

            return;
        }

        setUsers(data || []);

    };

    const changeRole = async (id, role) => {

        const { error } = await supabase
            .from("profiles")
            .update({ role })
            .eq("id", id);

        if (error) {

            toast({
                title: "Error cambiando rol",
                description: error.message,
                variant: "destructive"
            });

            return;
        }

        loadUsers();

    };

    return (

        <div className="space-y-6">

            <h2 className="text-xl font-bold">Usuarios</h2>

            <div className="bg-white border rounded-xl">

                <table className="w-full text-sm">

                    <thead className="border-b bg-slate-50">
                        <tr>
                            <th className="p-3 text-left">ID</th>
                            <th className="p-3 text-left">Rol</th>
                            <th className="p-3 text-left">Creado</th>
                            <th className="p-3 text-left">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>

                        {users.map(user => (

                            <tr key={user.id} className="border-b">

                                <td className="p-3">{user.id}</td>

                                <td className="p-3 capitalize">
                                    {user.role}
                                </td>

                                <td className="p-3">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>

                                <td className="p-3 flex gap-2">

                                    <Button
                                        size="sm"
                                        onClick={() => changeRole(user.id, "admin")}
                                    >
                                        Admin
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => changeRole(user.id, "user")}
                                    >
                                        User
                                    </Button>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

    );

}

export default UsersSection;