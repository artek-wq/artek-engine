export const STATUS = {
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En Proceso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
    INCIDENCIA: 'Incidencia'
};

export const STATUS_STYLES = {
    [STATUS.PENDIENTE]: 'bg-yellow-100 text-yellow-700',
    [STATUS.EN_PROCESO]: 'bg-blue-100 text-blue-700',
    [STATUS.COMPLETADA]: 'bg-green-100 text-green-700',
    [STATUS.CANCELADA]: 'bg-red-100 text-red-700',
    [STATUS.INCIDENCIA]: 'bg-orange-100 text-orange-700'
};