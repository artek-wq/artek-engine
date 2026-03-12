import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

function PagoCard({ pago, onEdit, onDelete, colorCategory, daysRemaining }) {
  const getColorClasses = (category) => {
    const colors = {
      green: 'border-green-500 bg-green-50',
      orange: 'border-orange-500 bg-orange-50',
      red: 'border-red-500 bg-red-50',
      blue: 'border-blue-500 bg-blue-50' // Added blue for "Pagado"
    };
    return colors[category] || 'border-slate-300 bg-white';
  };

  const getCircleColor = (category) => {
    const colors = {
      green: 'text-green-600',
      orange: 'text-orange-600',
      red: 'text-red-600',
      blue: 'text-blue-600' // Added blue for "Pagado"
    };
    return colors[category] || 'text-slate-600';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pendiente': 'bg-yellow-100 text-yellow-800',
      'Pagado': 'bg-blue-100 text-blue-800', // Changed to blue
      'Vencido': 'bg-red-100 text-red-800',
      'Parcial': 'bg-purple-100 text-purple-800' // Changed for better distinction
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  // If status is 'Pagado', daysRemaining should be 0 and percentage 100
  const displayDays = pago.status === 'Pagado' ? 0 : daysRemaining;
  const percentage =
    pago.status === "Pagado"
      ? 100
      : daysRemaining <= 0
        ? 0
        : Math.min(100, (daysRemaining / 15) * 100); // Assuming 10 days is full circle for pending

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`border-2 rounded-lg p-4 ${getColorClasses(pago.status === 'Pagado' ? 'blue' : colorCategory)} transition-all`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {pago.cliente}
          </p>

          {pago.proveedor && (
            <p className="text-xs text-slate-500">
              {pago.proveedor}
            </p>
          )}

          {pago.concepto && (
            <p className="text-xs text-slate-400 italic">
              {pago.concepto}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Vence: {pago.fecha_limite}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-200"
            />
            <circle
              cx="24"
              cy="24"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - percentage / 100)}`}
              className={`${getCircleColor(pago.status === 'Pagado' ? 'blue' : colorCategory)} transition-all duration-300`}
            />
          </svg>
          <span className={`text-xs font-semibold mt-1 ${getCircleColor(pago.status === 'Pagado' ? 'blue' : colorCategory)}`}>
            {displayDays} días
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Monto</span>
          <span className="font-semibold text-slate-800">{pago.divisa} {Number(pago.monto || 0).toLocaleString()}</span>
        </div>
        <div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pago.status)}`}>
            {pago.status}
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-slate-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onEdit(e); }}
          className="flex-1 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDelete(e); }}
          className="flex-1 hover:bg-red-100 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default PagoCard;