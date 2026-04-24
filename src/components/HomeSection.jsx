import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    TrendingUp, AlertTriangle, Clock, DollarSign,
    Package, Receipt, CheckCircle, RefreshCw,
    ArrowUpRight, Newspaper, Loader2, Ship, Plane,
    Truck, FileText, ChevronRight, Zap
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || '';
const STATUS_COLORS = {
    'Nuevo': '#94a3b8',
    'Recolección': '#f59e0b',
    'Zarpe': '#3b82f6',
    'Tránsito Internacional': '#6366f1',
    'Garantía': '#f97316',
    'Por Liberar': '#8b5cf6',
    'EIR / Demoras': '#ef4444',
    'Despacho': '#0ea5e9',
    'Liberado': '#10b981',
    'Cerrado': '#22c55e',
    'Entregado': '#16a34a',
    'Cancelada': '#6b7280',
    'Detenido': '#dc2626',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getGreeting(name) {
    const h = new Date().getHours();
    const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    return `${saludo}, ${name}`;
}

function fmtMXN(n) {
    return Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora mismo';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
}

function getTipoIcon(tipo) {
    if (tipo === 'A') return <Plane className="w-3.5 h-3.5" />;
    if (tipo === 'T') return <Truck className="w-3.5 h-3.5" />;
    if (tipo === 'M') return <Ship className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
}

function daysUntil(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon, loading }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {sub && <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{sub}</span>}
            </div>
            <div className="mt-4">
                {loading ? (
                    <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
                ) : (
                    <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
                )}
                <div className="text-sm text-slate-500 mt-1">{label}</div>
            </div>
        </motion.div>
    );
}

// ─── ALERT ITEM ───────────────────────────────────────────────────────────────
function AlertItem({ icon: Icon, color, text, tag }) {
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm text-slate-700 flex-1 leading-snug">{text}</p>
            {tag && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">{tag}</span>
            )}
        </div>
    );
}

// ─── ACTIVITY ITEM ────────────────────────────────────────────────────────────
function ActivityItem({ op, ts }) {
    const color = STATUS_COLORS[op.status_especifico] || '#94a3b8';
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
                {getTipoIcon(op.tipo_operacion)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{op.referencia}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-xs text-slate-400 truncate">{op.status_especifico || op.status}</span>
                </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0">{timeAgo(ts)}</span>
        </div>
    );
}

// ─── TIPO DE CAMBIO ───────────────────────────────────────────────────────────
function TipoCambio({ rates, loading }) {
    const pairs = [
        { from: 'USD', label: 'Dólar', symbol: '$', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { from: 'EUR', label: 'Euro', symbol: '€', color: 'text-blue-600', bg: 'bg-blue-50' },
    ];
    return (
        <div className="flex flex-col sm:flex-row gap-3">
            {pairs.map(({ from, label, symbol, color, bg }) => (
                <div key={from} className={`flex-1 rounded-xl p-3 ${bg}`}>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-lg font-bold ${color}`}>{symbol}</span>
                        <span className="text-xs font-medium text-slate-600">{label}</span>
                    </div>
                    {loading ? (
                        <div className="h-6 w-20 bg-white/60 rounded animate-pulse mt-1" />
                    ) : (
                        <div className={`text-xl font-bold mt-1 ${color}`}>
                            {rates[from] ? `$${fmtMXN(rates[from])} MXN` : '—'}
                        </div>
                    )}
                    <div className="text-xs text-slate-400 mt-0.5">1 {from} = MXN</div>
                </div>
            ))}
        </div>
    );
}

// ─── NEWS CARD ────────────────────────────────────────────────────────────────
function NewsCard({ article, index }) {
    return (
        <motion.a
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition group"
        >
            {article.urlToImage && (
                <img
                    src={article.urlToImage}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0 bg-slate-100"
                    onError={e => { e.target.style.display = 'none'; }}
                />
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition">
                    {article.title?.replace(/ - [^-]+$/, '')}
                </p>
                <p className="text-xs text-slate-400 mt-1">{article.source?.name}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 mt-0.5 transition" />
        </motion.a>
    );
}

// ─── CSS BAR CHART (sin dependencias externas) ───────────────────────────────
function CssBarChart({ data }) {
    const max = Math.max(...data.map(d => d.total), 1);
    const [tooltip, setTooltip] = useState(null);
    return (
        <div className="relative h-48 flex flex-col justify-end gap-1">
            {/* Bars */}
            <div className="flex items-end gap-2 h-40 px-2">
                {data.map((d, i) => {
                    const pct = (d.total / max) * 100;
                    const isLast = i === data.length - 1;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 relative"
                            onMouseEnter={() => setTooltip(i)}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            {tooltip === i && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10">
                                    {d.total} ops
                                </div>
                            )}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(pct, d.total > 0 ? 4 : 0)}%` }}
                                transition={{ duration: 0.5, delay: i * 0.06 }}
                                className="w-full rounded-t-lg"
                                style={{ background: isLast ? '#3b82f6' : '#bfdbfe' }}
                            />
                        </div>
                    );
                })}
            </div>
            {/* Labels */}
            <div className="flex gap-2 px-2">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 text-center text-xs text-slate-400">{d.mes}</div>
                ))}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function HomeSection() {
    const { user } = useAuth();
    const nombre = user?.email?.split('@')[0] || 'usuario';

    // State
    const [kpis, setKpis] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [actividad, setActividad] = useState([]);
    const [barData, setBarData] = useState([]);
    const [rates, setRates] = useState({});
    const [noticias, setNoticias] = useState([]);
    const [loading, setLoading] = useState({ kpis: true, rates: true, news: true });

    // ── Load KPIs ──────────────────────────────────────────────────────────────
    const loadKpis = useCallback(async () => {
        setLoading(p => ({ ...p, kpis: true }));

        const [
            { data: ops },
            { data: pagos },
            { data: facturas },
        ] = await Promise.all([
            supabase.from('operaciones').select('id, status, status_especifico, tipo_operacion, eta, created_at, referencia').order('created_at', { ascending: false }),
            supabase.from('pagos').select('id, monto, status, fecha_limite, referencia, divisa'),
            supabase.from('facturas').select('id, total, status, fecha'),
        ]);

        const now = new Date();
        const hoy = now.toISOString().split('T')[0];
        const en7d = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
        const en3d = new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0];
        const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // KPIs
        const enProceso = (ops || []).filter(o => o.status === 'En Proceso').length;
        const incidencias = (ops || []).filter(o => o.status === 'Incidencia' || o.status_especifico === 'Detenido').length;
        const etaSemana = (ops || []).filter(o => o.eta && o.eta >= hoy && o.eta <= en7d).length;
        const facturado = (facturas || []).filter(f => f.fecha >= inicio).reduce((s, f) => s + (f.total || 0), 0);
        const porCobrar = (facturas || []).filter(f => f.status === 'Pendiente').reduce((s, f) => s + (f.total || 0), 0);

        setKpis({ enProceso, incidencias, etaSemana, facturado, porCobrar });

        // Alertas
        const alerts = [];
        (pagos || []).filter(p => p.status !== 'Pagado' && p.fecha_limite <= en3d && p.fecha_limite >= hoy)
            .slice(0, 3)
            .forEach(p => {
                const d = daysUntil(p.fecha_limite);
                alerts.push({ type: 'pago', icon: DollarSign, color: 'bg-red-500', text: `Pago ${p.referencia} vence en ${d === 0 ? 'hoy' : `${d} día${d !== 1 ? 's' : ''}`}`, tag: 'URGENTE' });
            });
        (ops || []).filter(o => o.status_especifico === 'Detenido')
            .slice(0, 2)
            .forEach(o => alerts.push({ type: 'op', icon: AlertTriangle, color: 'bg-amber-500', text: `Operación ${o.referencia} está Detenida`, tag: null }));
        (facturas || []).filter(f => f.status === 'Vencida')
            .slice(0, 2)
            .forEach(f => alerts.push({ type: 'factura', icon: Receipt, color: 'bg-orange-500', text: `Factura vencida por $${fmtMXN(f.total)} MXN`, tag: null }));

        setAlertas(alerts.slice(0, 6));

        // Actividad reciente (últimas 8 operaciones modificadas)
        setActividad((ops || []).slice(0, 8).map(o => ({ op: o, ts: o.created_at })));

        // Gráfica: operaciones por mes (últimos 6 meses)
        const meses = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const fin = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const label = d.toLocaleDateString('es-MX', { month: 'short' });
            const count = (ops || []).filter(o => {
                const c = new Date(o.created_at);
                return c >= d && c < fin;
            }).length;
            meses.push({ mes: label, total: count });
        }
        setBarData(meses);

        setLoading(p => ({ ...p, kpis: false }));
    }, []);

    // ── Load Tipo de Cambio ────────────────────────────────────────────────────
    const loadRates = useCallback(async () => {
        setLoading(p => ({ ...p, rates: true }));
        try {
            const res = await fetch('https://api.exchangerate-api.com/v4/latest/MXN');
            const json = await res.json();
            // Convert: 1 MXN = x USD → 1 USD = 1/x MXN
            const usd = json.rates?.USD ? (1 / json.rates.USD) : null;
            const eur = json.rates?.EUR ? (1 / json.rates.EUR) : null;
            setRates({ USD: usd?.toFixed(2), EUR: eur?.toFixed(2) });
        } catch {
            setRates({});
        }
        setLoading(p => ({ ...p, rates: false }));
    }, []);

    // ── Load Noticias ──────────────────────────────────────────────────────────
    const loadNoticias = useCallback(async () => {
        if (!NEWS_API_KEY) { setLoading(p => ({ ...p, news: false })); return; }
        setLoading(p => ({ ...p, news: true }));
        try {
            const q = encodeURIComponent('comercio exterior mexico OR importacion exportacion OR aranceles');
            const res = await fetch(
                `https://newsapi.org/v2/everything?q=${q}&language=es&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`
            );
            const json = await res.json();
            setNoticias((json.articles || []).filter(a => a.title && !a.title.includes('[Removed]')));
        } catch {
            setNoticias([]);
        }
        setLoading(p => ({ ...p, news: false }));
    }, []);

    // ── Realtime subscription ──────────────────────────────────────────────────
    useEffect(() => {
        loadKpis();
        loadRates();
        loadNoticias();

        // Supabase Realtime: reload activity when operaciones change
        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'operaciones' }, () => {
                loadKpis();
            })
            .subscribe();

        // Refresh rates every 5 minutes
        const ratesInterval = setInterval(loadRates, 5 * 60 * 1000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(ratesInterval);
        };
    }, [loadKpis, loadRates, loadNoticias]);

    // ── Fecha ──────────────────────────────────────────────────────────────────
    const fecha = new Date().toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <div className="space-y-6 pb-8">

            {/* ── SALUDO ──────────────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start justify-between"
            >
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{getGreeting(nombre)}</h1>
                    <p className="text-sm text-slate-500 mt-1 capitalize">{fecha}</p>
                </div>
                <button
                    onClick={() => { loadKpis(); loadRates(); }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition px-3 py-2 rounded-lg hover:bg-slate-100"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualizar
                </button>
            </motion.div>

            {/* ── KPIs ────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <KpiCard label="En proceso" value={kpis?.enProceso ?? '—'} icon={Package} color="bg-blue-500" loading={loading.kpis} />
                <KpiCard label="ETA esta semana" value={kpis?.etaSemana ?? '—'} icon={Clock} color="bg-violet-500" loading={loading.kpis} />
                <KpiCard label="Incidencias" value={kpis?.incidencias ?? '—'} icon={AlertTriangle} color="bg-red-500" loading={loading.kpis} sub={kpis?.incidencias > 0 ? 'Atención' : null} />
                <KpiCard label="Facturado mes" value={kpis ? `$${fmtMXN(kpis.facturado)}` : '—'} icon={TrendingUp} color="bg-emerald-500" loading={loading.kpis} />
                <KpiCard label="Por cobrar" value={kpis ? `$${fmtMXN(kpis.porCobrar)}` : '—'} icon={Receipt} color="bg-amber-500" loading={loading.kpis} />
            </div>

            {/* ── ROW 2: Gráfica + Alertas ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

                {/* Gráfica de barras */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="font-semibold text-slate-800">Operaciones por mes</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p>
                        </div>
                        <Zap className="w-4 h-4 text-slate-300" />
                    </div>
                    {loading.kpis ? (
                        <div className="h-48 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                        </div>
                    ) : (
                        <CssBarChart data={barData} />
                    )}
                </div>

                {/* Alertas */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-slate-800">Alertas</h2>
                        {alertas.length > 0 && (
                            <span className="text-xs font-bold bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                                {alertas.length}
                            </span>
                        )}
                    </div>
                    {loading.kpis ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
                        </div>
                    ) : alertas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                            <CheckCircle className="w-10 h-10 mb-2" />
                            <p className="text-sm text-slate-400">Sin alertas activas</p>
                        </div>
                    ) : (
                        alertas.map((a, i) => (
                            <AlertItem key={i} icon={a.icon} color={a.color} text={a.text} tag={a.tag} />
                        ))
                    )}
                </div>
            </div>

            {/* ── ROW 3: Actividad + Tipo de cambio + Noticias ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

                {/* Actividad reciente */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-slate-800">Actividad reciente</h2>
                        <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            En vivo
                        </span>
                    </div>
                    {loading.kpis ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
                        </div>
                    ) : actividad.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">Sin actividad reciente</p>
                    ) : (
                        <AnimatePresence>
                            {actividad.map((a, i) => (
                                <ActivityItem key={a.op.id} op={a.op} ts={a.ts} />
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                {/* Tipo de cambio + Noticias */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Tipo de cambio */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-slate-800">Tipo de cambio</h2>
                            <span className="text-xs text-slate-400">vs MXN · Tiempo real</span>
                        </div>
                        <TipoCambio rates={rates} loading={loading.rates} />
                    </div>

                    {/* Noticias */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-slate-800">Comercio exterior</h2>
                            <Newspaper className="w-4 h-4 text-slate-300" />
                        </div>
                        {!NEWS_API_KEY ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-slate-500 mb-1">Configura tu API key de NewsAPI</p>
                                <p className="text-xs text-slate-400">Agrega <code className="bg-slate-100 px-1 rounded">VITE_NEWS_API_KEY</code> a tu archivo <code className="bg-slate-100 px-1 rounded">.env</code></p>
                            </div>
                        ) : loading.news ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
                            </div>
                        ) : noticias.length === 0 ? (
                            <p className="text-sm text-slate-400 py-4 text-center">No se encontraron noticias</p>
                        ) : (
                            noticias.map((a, i) => <NewsCard key={i} article={a} index={i} />)
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
