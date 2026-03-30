// ================================================================
// STATUS GENERAL → agrupa los status específicos
// ================================================================

export const STATUS = {
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En Proceso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
    INCIDENCIA: 'Incidencia',
};

// ================================================================
// STATUS ESPECÍFICO → lo elige el usuario
// Cada uno pertenece a un STATUS general (parent)
// ================================================================

export const STATUS_ESPECIFICO = [
    // PENDIENTE
    { value: 'Nuevo', label: 'Nuevo', parent: 'Pendiente' },
    { value: 'Recolección', label: 'Recolección', parent: 'Pendiente' },
    // EN PROCESO
    { value: 'Zarpe', label: 'Zarpe', parent: 'En Proceso' },
    { value: 'Tránsito Internacional', label: 'Tránsito Internacional', parent: 'En Proceso' },
    { value: 'Garantía', label: 'Garantía', parent: 'En Proceso' },
    { value: 'Por Liberar', label: 'Por Liberar', parent: 'En Proceso' },
    { value: 'EIR / Demoras', label: 'EIR / Demoras', parent: 'En Proceso' },
    { value: 'Despacho', label: 'Despacho', parent: 'En Proceso' },
    { value: 'Liberado', label: 'Liberado', parent: 'En Proceso' },
    // COMPLETADA
    { value: 'Cerrado', label: 'Cerrado', parent: 'Completada' },
    { value: 'Entregado', label: 'Entregado', parent: 'Completada' },
    // CANCELADA
    { value: 'Cancelada', label: 'Cancelada', parent: 'Cancelada' },
    // INCIDENCIA
    { value: 'Detenido', label: 'Detenido', parent: 'Incidencia' },
];

// Lookup: status específico → status general
export function getStatusGeneral(statusEspecifico) {
    const found = STATUS_ESPECIFICO.find(s => s.value === statusEspecifico);
    return found?.parent || 'Pendiente';
}

// Lookup: status general → lista de status específicos disponibles
export function getStatusEspecificosByGeneral(statusGeneral) {
    return STATUS_ESPECIFICO.filter(s => s.parent === statusGeneral);
}

// ================================================================
// ESTILOS POR STATUS GENERAL
// ================================================================

export const STATUS_STYLES = {
    [STATUS.PENDIENTE]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    [STATUS.EN_PROCESO]: 'bg-blue-100   text-blue-700   border-blue-200',
    [STATUS.COMPLETADA]: 'bg-green-100  text-green-700  border-green-200',
    [STATUS.CANCELADA]: 'bg-red-100    text-red-700    border-red-200',
    [STATUS.INCIDENCIA]: 'bg-orange-100 text-orange-700 border-orange-200',
};

// Estilos para status específico (badge secundario, más sutil)
export const STATUS_ESPECIFICO_STYLES = {
    // Pendiente (amarillo suave)
    'Nuevo': 'bg-yellow-50  text-yellow-600',
    'Recolección': 'bg-yellow-50  text-yellow-600',
    // En Proceso (azul)
    'Zarpe': 'bg-blue-50    text-blue-600',
    'Tránsito Internacional': 'bg-blue-50    text-blue-700',
    'Garantía': 'bg-indigo-50  text-indigo-600',
    'Por Liberar': 'bg-cyan-50    text-cyan-700',
    'EIR / Demoras': 'bg-purple-50  text-purple-600',
    'Despacho': 'bg-sky-50     text-sky-700',
    'Liberado': 'bg-teal-50    text-teal-700',
    // Completada (verde)
    'Cerrado': 'bg-green-50   text-green-700',
    'Entregado': 'bg-emerald-50 text-emerald-700',
    // Cancelada
    'Cancelada': 'bg-red-50     text-red-600',
    // Incidencia
    'Detenido': 'bg-orange-50  text-orange-700',
};
