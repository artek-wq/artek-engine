import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

export default function ProtectedRoute({ permission, children }) {

  const { can, loading } = usePermissions();

  if (loading) {

    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Cargando permisos...
      </div>
    );

  }

  if (!can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;

}