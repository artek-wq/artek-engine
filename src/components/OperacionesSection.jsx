import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Ship, Plane, Truck, FileText } from 'lucide-react';
import OperacionDialog from '@/components/OperacionDialog';
import SubOperacionDialog from '@/components/SubOperacionDialog';
import DetailModal from '@/components/DetailModal';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { STATUS, STATUS_STYLES, STATUS_ESPECIFICO_STYLES } from '@/constants/status';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function OperacionesSection() {

  const [operaciones, setOperaciones] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperacion, setSelectedOperacion] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [parentForSub, setParentForSub] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [operacionToDelete, setOperacionToDelete] = useState(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchOperaciones();
  }, []);

  useEffect(() => {

    const handleOpenOperacion = (event) => {

      const operacionId = event.detail

      setSelectedOperacion({
        id: operacionId
      })

      setDetailModalOpen(true)

    }

    window.addEventListener(
      "openOperacionFromCliente",
      handleOpenOperacion
    )

    return () => {

      window.removeEventListener(
        "openOperacionFromCliente",
        handleOpenOperacion
      )

    }

  }, [])

  const fetchOperaciones = async () => {
    const { data, error } = await supabase
      .from('operaciones')
      .select(`
  *,
  clientes ( nombre ),
  operacion_proveedores (
    proveedores (
      razon_social
    )
  )
`)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error cargando operaciones",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    const allOps = data || [];

    const madres = allOps.filter(op => !op.operacion_madre_id);
    const subs = allOps.filter(op => op.operacion_madre_id);

    const tree = madres.map(madre => {

      const proveedores =
        madre.operacion_proveedores
          ?.map(p => p.proveedores?.razon_social)
          .filter(Boolean) || [];

      return {
        ...madre,
        proveedores,
        children: subs.filter(sub => sub.operacion_madre_id === madre.id)
      };
    });

    setOperaciones([...tree]);
  };

  const handleCardClick = (operacion) => {
    setSelectedOperacion(operacion);
    setDetailModalOpen(true);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDelete = (operacion) => {
    // 🔒 Bloquear eliminación de madre con sub-operaciones activas
    if (!operacion.operacion_madre_id && operacion.children?.length > 0) {
      const activeSubs = operacion.children.filter(
        sub => sub.status !== STATUS.COMPLETADA && sub.status !== STATUS.CANCELADA
      );
      if (activeSubs.length > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Existen sub-operaciones activas.",
          variant: "destructive"
        });
        return;
      }
    }
    setOperacionToDelete(operacion);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!operacionToDelete) return;
    const { error } = await supabase
      .from('operaciones')
      .delete()
      .eq('id', operacionToDelete.id);

    if (error) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Operación eliminada", description: operacionToDelete.referencia });
      fetchOperaciones();
    }
    setOperacionToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'A': return <Plane className="w-6 h-6" />;
      case 'T': return <Truck className="w-6 h-6" />;
      case 'D': return <FileText className="w-6 h-6" />;
      case 'P': return <FileText className="w-6 h-6" />;
      case 'M':
      default: return <Ship className="w-6 h-6" />;
    }
  };

  const normalizeText = (text) => {
    return String(text || '')
      .toLowerCase()
      .normalize("NFD")                // separa acentos
      .replace(/[\u0300-\u036f]/g, "") // elimina acentos
      .replace(/[^\w\s]/gi, "")        // elimina puntuación
      .trim();
  };
  const matchesSearch = (obj) => {

    const search = normalizeText(searchTerm);

    if (!search) return true;

    const valuesToSearch = [];

    // Campos directos
    Object.entries(obj || {}).forEach(([key, value]) => {

      if (key === "children") return;

      if (typeof value === "object" && value !== null) {
        Object.values(value).forEach(v => {
          valuesToSearch.push(v);
        });
      } else {
        valuesToSearch.push(value);
      }
    });

    return valuesToSearch.some(value =>
      normalizeText(value).includes(search)
    );
  };

  /* =========================
     MÉTRICAS DASHBOARD
  ========================= */

  const totalOperaciones = operaciones.length;

  const enProceso = operaciones.filter(
    op => op.status === "En Proceso"
  ).length;

  const pendientes = operaciones.filter(
    op => op.status === "Pendiente"
  ).length;

  const completadas = operaciones.filter(
    op => op.status === "Completada"
  ).length;

  const filteredOperaciones = operaciones
    .map(madre => {

      const madreMatch = matchesSearch(madre);

      const filteredChildren = madre.children?.filter(sub =>
        matchesSearch(sub)
      );

      if (madreMatch) return madre;

      if (filteredChildren?.length > 0) {
        return {
          ...madre,
          children: filteredChildren
        };
      }

      return null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b pb-4">


        {/* KPI DASHBOARD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">


          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Operaciones</div>
            <div className="text-3xl font-bold mt-1">{totalOperaciones}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">En proceso</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{enProceso}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Pendientes</div>
            <div className="text-3xl font-bold text-amber-600 mt-1">{pendientes}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500">Completadas</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{completadas}</div>
          </div>

        </div>

        <div className="flex items-center gap-3"></div>

        <input
          type="text"
          placeholder="Buscar por referencia o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded-lg w-80"
        />

        <Button
          onClick={() => {
            setSelectedOperacion(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Operación
        </Button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">

        <AnimatePresence>

          {filteredOperaciones.map((madre) => (

            <React.Fragment key={madre.id}>

              {/* CARD MADRE */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => handleCardClick(madre)}
                className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md cursor-pointer transition"
              >
                <div className="flex justify-between items-start">

                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700">
                      {getTypeIcon(madre.tipo_operacion)}
                    </div>

                    <div className="flex flex-col gap-2 flex-1">

                      {/* REFERENCIA */}
                      <div className="text-lg font-semibold tracking-tight">
                        {madre.referencia}
                      </div>

                      {/* CLIENTE */}
                      <div className="text-sm text-slate-600 font-medium">
                        {madre.clientes?.nombre || '-'}
                      </div>

                      {/* RUTA */}
                      <div className="text-xs text-slate-400">
                        {madre.origen} → {madre.destino}
                      </div>

                      {/* DATOS LOGÍSTICOS */}
                      {(madre.mbl || madre.contenedor) && (
                        <div className="text-xs text-slate-500 mt-1 flex gap-4">
                          {madre.mbl && (
                            <span>
                              <span className="font-medium">MBL:</span> {madre.mbl}
                            </span>
                          )}

                          {madre.contenedor && (
                            <span>
                              <span className="font-medium">Cont:</span> {madre.contenedor}
                            </span>
                          )}
                        </div>
                      )}

                      {/* PROVEEDORES */}
                      {madre.operacion_proveedores?.length > 0 && (
                        <div className="flex flex-col gap-1 mt-2">
                          {madre.operacion_proveedores.map(rel => (
                            <div
                              key={rel.proveedores.id}
                              className="flex items-center gap-2 text-xs text-slate-600"
                            >
                              <span className="text-slate-400">🏢</span>
                              <span>{rel.proveedores.razon_social}</span>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="flex items-center gap-2">

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[madre.status] || 'bg-slate-100 text-slate-600'}`}>
                        {madre.status}
                      </span>
                      {madre.status_especifico && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_ESPECIFICO_STYLES[madre.status_especifico] || 'bg-slate-50 text-slate-500'}`}>
                          {madre.status_especifico}
                        </span>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOperacion(madre);
                            setDialogOpen(true);
                          }}
                        >
                          Editar
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(madre);
                          }}
                        >
                          Eliminar
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setParentForSub(madre);
                            setSubDialogOpen(true);
                          }}
                        >
                          Crear Sub-Operación
                        </DropdownMenuItem>

                      </DropdownMenuContent>
                    </DropdownMenu>

                  </div>
                </div>

                {madre.children?.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(madre.id);
                    }}
                    className="mt-3 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full"
                  >
                    {expanded[madre.id] ? '▼' : '▶'} {madre.children.length} Sub
                  </button>
                )}

              </motion.div>

              {/* SUBOPERACIONES */}
              <AnimatePresence>
                {expanded[madre.id] && madre.children?.map(sub => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => handleCardClick(sub)}
                    className="ml-10 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-white transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="text-slate-400">└</span>
                          {sub.referencia}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sub.origen} → {sub.destino}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[sub.status] || 'bg-slate-100 text-slate-600'}`}>
                          {sub.status}
                        </span>
                        {sub.status_especifico && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_ESPECIFICO_STYLES[sub.status_especifico] || 'bg-slate-50 text-slate-500'}`}>
                            {sub.status_especifico}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

            </React.Fragment>
          ))}

        </AnimatePresence>

      </div>

      {/* DIALOGS */}

      <OperacionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        operacion={selectedOperacion}
        onSuccess={(newOperacion) => {

          if (!newOperacion) {
            fetchOperaciones();
            return;
          }

          setOperaciones(prev => {

            // Si es sub-operación
            if (newOperacion.operacion_madre_id) {

              return prev.map(madre => {
                if (madre.id === newOperacion.operacion_madre_id) {
                  return {
                    ...madre,
                    children: [...(madre.children || []), newOperacion]
                  };
                }
                return madre;
              });
            }

            // Si es operación madre
            return [
              {
                ...newOperacion,
                children: []
              },
              ...prev
            ];
          });

        }}
      />

      <SubOperacionDialog
        open={subDialogOpen}
        onOpenChange={setSubDialogOpen}
        parentOperacion={parentForSub}
        onSuccess={(newSub) => {

          if (!newSub) {
            fetchOperaciones();
            return;
          }

          setOperaciones(prev =>
            prev.map(madre => {
              if (madre.id === newSub.operacion_madre_id) {
                return {
                  ...madre,
                  children: [...(madre.children || []), newSub]
                };
              }
              return madre;
            })
          );

        }}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar operación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente <strong>{operacionToDelete?.referencia}</strong>.
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        data={selectedOperacion}
        onDelete={handleDelete}
        onEdit={(op) => {
          setDetailModalOpen(false);   // cerrar detalle
          setSelectedOperacion(op);    // setear operación
          setDialogOpen(true);         // abrir dialog edición
        }}
        onOpenSubOperacion={(sub) => {
          setSelectedOperacion(sub);
          setDetailModalOpen(true);
        }}
      />

    </div>
  );
}

export default OperacionesSection;