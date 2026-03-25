import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Building2, User, FileText } from 'lucide-react';

const COLOR = {
  green: { border: 'border-green-400', bg: 'bg-green-50', ring: 'text-green-500', badge: 'bg-green-100 text-green-700' },
  orange: { border: 'border-orange-400', bg: 'bg-orange-50', ring: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
  red: { border: 'border-red-400', bg: 'bg-red-50', ring: 'text-red-500', badge: 'bg-red-100 text-red-700' },
  blue: { border: 'border-blue-400', bg: 'bg-blue-50', ring: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
};

const STATUS_BADGE = {
  'Pendiente': 'bg-yellow-100 text-yellow-700',
  'Pagado': 'bg-emerald-100 text-emerald-700',
  'Vencido': 'bg-red-100 text-red-700',
  'Parcial': 'bg-purple-100 text-purple-700',
};

function fmt(num, divisa = 'USD') {
  return `${divisa} ${Number(num || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────────
// MODO CUADRO (grid card)
// ─────────────────────────────────────────────
export function PagoCardGrid({ pago, colorCategory, daysRemaining, onEdit, onDelete }) {
  const cat = pago.status === 'Pagado' ? 'blue' : (colorCategory || 'green');
  const c = COLOR[cat] || COLOR.green;
  const pct = pago.status === 'Pagado' ? 100 : Math.min(100, Math.max(0, (daysRemaining / 15) * 100));
  const circ = 2 * Math.PI * 18;

  return (
    <motion.div
      whileHover={{ scale: 1.015, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
      className={`border-2 ${c.border} ${c.bg} rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-pointer`}
    >
      {/* PROVEEDOR — prioridad visual máxima */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {pago.proveedor ? (
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <p className="text-base font-bold text-slate-900 truncate leading-tight">
                {pago.proveedor}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-400 italic mb-1">Sin proveedor</p>
          )}

          {/* CONCEPTO — claro y visible */}
          {pago.concepto && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
              <p className="text-sm font-medium text-slate-700 truncate">{pago.concepto}</p>
            </div>
          )}

          {/* CLIENTE — secundario, pequeño */}
          {pago.cliente && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-slate-300 shrink-0" />
              <p className="text-xs text-slate-400 truncate">{pago.cliente}</p>
            </div>
          )}
        </div>

        {/* Círculo de tiempo */}
        <div className="flex flex-col items-center shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              className={`${c.ring} transition-all duration-500`}
              strokeLinecap="round"
            />
          </svg>
          <span className={`text-xs font-bold mt-0.5 ${c.ring}`}>
            {pago.status === 'Pagado' ? '✓' : `${daysRemaining}d`}
          </span>
        </div>
      </div>

      {/* MONTO */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-slate-900 tracking-tight">
          {fmt(pago.monto, pago.divisa)}
        </span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[pago.status] || 'bg-slate-100 text-slate-600'}`}>
          {pago.status}
        </span>
      </div>

      {/* FECHA + REFERENCIA */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-200 pt-2">
        <span>Vence {fmtDate(pago.fecha_limite)}</span>
        <span className="font-mono font-medium text-slate-500">{pago.referencia}</span>
      </div>

      {/* ACCIONES */}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm"
          onClick={e => { e.stopPropagation(); onEdit(e); }}
          className="flex-1 h-7 hover:bg-blue-100 hover:text-blue-600 transition-colors">
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm"
          onClick={e => { e.stopPropagation(); onDelete(e); }}
          className="flex-1 h-7 hover:bg-red-100 hover:text-red-600 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MODO FILA (list row)
// ─────────────────────────────────────────────
export function PagoCardRow({ pago, colorCategory, daysRemaining, onEdit, onDelete }) {
  const cat = pago.status === 'Pagado' ? 'blue' : (colorCategory || 'green');
  const c = COLOR[cat] || COLOR.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 border-l-4 ${c.border} bg-white rounded-xl px-5 py-3.5 hover:shadow-md transition-all cursor-pointer`}
    >
      {/* Indicador de urgencia */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${cat === 'blue' ? 'bg-blue-400' : cat === 'green' ? 'bg-green-400' : cat === 'orange' ? 'bg-orange-400' : 'bg-red-400'}`} />

      {/* PROVEEDOR + CONCEPTO */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {pago.proveedor ? (
            <span className="text-sm font-bold text-slate-900 truncate">{pago.proveedor}</span>
          ) : (
            <span className="text-sm text-slate-400 italic">Sin proveedor</span>
          )}
        </div>
        {pago.concepto && (
          <span className="text-sm text-slate-600 truncate block">{pago.concepto}</span>
        )}
        {pago.cliente && (
          <span className="text-xs text-slate-400 truncate block">{pago.cliente}</span>
        )}
      </div>

      {/* REFERENCIA */}
      <div className="hidden md:block shrink-0">
        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{pago.referencia}</span>
      </div>

      {/* FECHA */}
      <div className="hidden lg:block text-xs text-slate-400 shrink-0 w-20 text-right">
        {fmtDate(pago.fecha_limite)}
      </div>

      {/* DÍAS */}
      <div className={`text-xs font-bold shrink-0 w-12 text-right ${c.ring}`}>
        {pago.status === 'Pagado' ? '✓' : `${daysRemaining}d`}
      </div>

      {/* MONTO */}
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold text-slate-900">{fmt(pago.monto, pago.divisa)}</div>
      </div>

      {/* STATUS */}
      <div className="shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[pago.status] || 'bg-slate-100 text-slate-600'}`}>
          {pago.status}
        </span>
      </div>

      {/* ACCIONES */}
      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600" onClick={e => { e.stopPropagation(); onEdit(e); }}>
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600" onClick={e => { e.stopPropagation(); onDelete(e); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// Exportación default para compatibilidad con código existente
export default PagoCardGrid;
