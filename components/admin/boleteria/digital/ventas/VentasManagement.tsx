"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import EventsService from "@/services/EventsService";
import { Evento, EventoTipo } from "@/interfaces/event.interface";
import {
  DetalleTransaccion,
  TransaccionBoleta,
  TransaccionEstado,
} from "@/interfaces/boleta.interface";
import {
  Search,
  CalendarDays,
  User,
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  Inbox,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// Antes era un ternario que solo preguntaba por VIP, asi que PALCO y
// PALCO_INDIVIDUAL se mostraban como "General". Con Record<EventoTipo> un tipo
// nuevo no compila hasta que alguien le asigne etiqueta y color
const TIPO_CONFIG: Record<EventoTipo, { label: string; color: string }> = {
  [EventoTipo.VIP]: {
    label: "VIP",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  [EventoTipo.PALCO]: {
    label: "Palco",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  [EventoTipo.PALCO_INDIVIDUAL]: {
    label: "Palco individual",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  [EventoTipo.GENERAL]: {
    label: "General",
    color: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const ESTADO_CONFIG: Record<
  TransaccionEstado,
  { label: string; color: string; icon: React.ReactNode }
> = {
  [TransaccionEstado.APROBADO]: {
    label: "Aprobado",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  [TransaccionEstado.PENDIENTE]: {
    label: "Pendiente",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  [TransaccionEstado.RECHAZADO]: {
    label: "Rechazado",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  [TransaccionEstado.CANCELADO]: {
    label: "Cancelado",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  [TransaccionEstado.EXPIRADO]: {
    label: "Expirado",
    color: "bg-orange-100 text-orange-600 border-orange-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
};

const WOMPI_COLOR: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DECLINED: "bg-red-100 text-red-700 border-red-200",
  VOIDED: "bg-red-100 text-red-700 border-red-200",
  ERROR: "bg-red-100 text-red-700 border-red-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(dateString));
};

// ── Modal de detalle ──────────────────────────────────────────────────────────

interface DetalleModalProps {
  transaccionId: number;
  onClose: () => void;
  onSincronizado: (estadoFinal: string) => void;
}

const DetalleModal = ({
  transaccionId,
  onClose,
  onSincronizado,
}: DetalleModalProps) => {
  const [detalle, setDetalle] = useState<DetalleTransaccion | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    EventsService.adminGetDetalleTransaccion(transaccionId)
      .then((res) => setDetalle(res.data))
      .catch(() => toast.error("No se pudo cargar el detalle"))
      .finally(() => setLoadingDetalle(false));
  }, [transaccionId]);

  const sincronizar = async () => {
    setSincronizando(true);

    try {
      const res =
        await EventsService.adminSincronizarTransaccion(transaccionId);
      toast.success(`Sincronizado — estado final: ${res.data.estadoFinal}`);
      onSincronizado(res.data.estadoFinal);
    } catch {
      toast.error("Error al sincronizar con Wompi");
    } finally {
      setSincronizando(false);
    }
  };

  const tx = detalle?.transaccion;
  const suarecConfig = tx ? (ESTADO_CONFIG[tx.estadoPago] ?? null) : null;
  const wompiStatus = detalle?.wompiData?.status?.toUpperCase() ?? null;
  const wompiColor = wompiStatus
    ? (WOMPI_COLOR[wompiStatus] ?? "bg-gray-100 text-gray-700 border-gray-200")
    : "";
  const discrepancia =
    wompiStatus === "APPROVED" && tx?.estadoPago !== "aprobado";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Detalle de transacción
            </p>
            <p className="text-base font-semibold text-gray-800">
              #{transaccionId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {loadingDetalle ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
              <p className="text-sm text-gray-400">Consultando Wompi...</p>
            </div>
          ) : !detalle ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No se pudo cargar el detalle
            </p>
          ) : (
            <>
              {/* Discrepancia banner */}
              {discrepancia && (
                <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-700">
                      Discrepancia detectada
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      Wompi registra el pago como aprobado pero SUAREC no generó
                      las boletas. El cobro sí se realizó.
                    </p>
                  </div>
                </div>
              )}

              {/* Error de Wompi */}
              {detalle.wompiError && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <WifiOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-500">
                    No se pudo consultar Wompi: {detalle.wompiError}
                  </p>
                </div>
              )}

              {/* Estados lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> SUAREC
                  </p>
                  {suarecConfig ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${suarecConfig.color}`}
                    >
                      {suarecConfig.icon}
                      {suarecConfig.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> Wompi
                  </p>
                  {wompiStatus ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${wompiColor}`}
                    >
                      {wompiStatus}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sin datos</span>
                  )}
                </div>
              </div>

              {/* Info de la transacción */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Comprador
                  </span>
                  <span className="font-medium text-gray-700">
                    {tx?.comprador?.name ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> Evento
                  </span>
                  <span className="font-medium text-gray-700 flex items-center gap-1.5 justify-end">
                    <span className="truncate max-w-[150px]">
                      {tx?.evento?.nombre ?? "—"}
                    </span>
                    {tx?.evento?.tipo && TIPO_CONFIG[tx.evento.tipo] && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TIPO_CONFIG[tx.evento.tipo].color}`}
                      >
                        {TIPO_CONFIG[tx.evento.tipo].label}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5" /> Boletas
                  </span>
                  <span className="font-medium text-gray-700">
                    {tx?.cantidad} × {formatCurrency(tx?.precioPorBoleta ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Cargo SUAREC</span>
                  <span className="font-medium text-gray-700">
                    {tx?.cantidad} × {formatCurrency(tx?.cargoPorBoleta ?? 0)}
                  </span>
                </div>
                {/* Comisión total — oculta temporalmente
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Comisión total</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(
                      (tx?.comisionPorBoleta ?? 0) * (tx?.cantidad ?? 0),
                    )}
                  </span>
                </div>
                */}
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Monto total</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(tx?.monto ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">IDs boletas</span>
                  <span className="font-mono text-xs text-gray-600">
                    {tx?.boletaIds?.length
                      ? tx.boletaIds.join(", ")
                      : "Sin generar"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Referencia</span>
                  <span className="font-mono text-[11px] text-gray-500 truncate max-w-[200px]">
                    {tx?.referencia}
                  </span>
                </div>
              </div>

              {/* Detalle Wompi */}
              {detalle.wompiData &&
                (() => {
                  const w = detalle.wompiData!;
                  const color =
                    WOMPI_COLOR[w.status?.toUpperCase()] ??
                    "bg-gray-100 text-gray-700 border-gray-200";
                  const metodoPago: Record<string, string> = {
                    CARD: "Tarjeta",
                    NEQUI: "Nequi",
                    PSE: "PSE",
                    BANCOLOMBIA_TRANSFER: "Bancolombia",
                  };
                  const formatDate = (d: string | null) =>
                    d
                      ? new Date(d).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—";
                  return (
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2">
                        Datos Wompi
                      </p>
                      <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">
                            ID transacción
                          </span>
                          <span className="font-mono text-[11px] text-gray-600">
                            {w.id}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">
                            Referencia
                          </span>
                          <span className="font-mono text-[11px] text-gray-600 truncate max-w-[200px]">
                            {w.reference}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">
                            Email comprador
                          </span>
                          <span className="text-xs text-gray-700">
                            {w.customer_email || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">
                            Monto pagado
                          </span>
                          <span className="text-xs font-semibold text-gray-800">
                            {formatCurrency(w.amount_in_cents / 100)}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">
                            Método de pago
                          </span>
                          <span className="text-xs text-gray-700">
                            {metodoPago[w.payment_method_type] ??
                              w.payment_method_type ??
                              "—"}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">Estado</span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}
                          >
                            {w.status}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">Creada</span>
                          <span className="text-xs text-gray-600">
                            {formatDate(w.created_at)}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2">
                          <span className="text-xs text-gray-400">
                            Finalizada
                          </span>
                          <span className="text-xs text-gray-600">
                            {formatDate(w.finalized_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </>
          )}
        </div>

        {/* Footer sincronización */}
        {!loadingDetalle && detalle && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            {discrepancia ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-orange-700">
                      Pago confirmado en Wompi pero sin boletas en SUAREC
                    </p>
                    <p className="text-[11px] text-orange-600 mt-0.5">
                      Al sincronizar se generarán las boletas y se enviará el
                      correo al comprador.
                    </p>
                  </div>
                </div>
                <button
                  onClick={sincronizar}
                  disabled={sincronizando}
                  className="w-full flex items-center justify-center gap-2 bg-[#097EEC] hover:bg-[#0562C7] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`}
                  />
                  {sincronizando
                    ? "Sincronizando..."
                    : "Sincronizar y generar boletas"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                No hay discrepancias entre SUAREC y Wompi
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const VentasManagement = () => {
  const [transaccionesAll, setTransaccionesAll] = useState<TransaccionBoleta[]>(
    [],
  );
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TransaccionEstado>(
    "all",
  );
  const [eventoFilter, setEventoFilter] = useState<"all" | number>("all");
  const [ambienteFilter, setAmbienteFilter] = useState<
    "all" | "production" | "test"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  // Lista de eventos para el filtro (se carga una sola vez)
  useEffect(() => {
    EventsService.getAllEventsAdmin()
      .then((res) => setEventos(res.data))
      .catch(() => {});
  }, []);

  // El backend no soporta búsqueda ni filtros por estado/evento/ambiente ni
  // paginación en este listado: trae todas las transacciones una sola vez
  // (al montar o al pulsar "Actualizar") y todo lo demás se aplica en memoria
  const cargarTransacciones = useCallback(() => {
    setLoading(true);
    EventsService.getAllTransacciones()
      .then((res) => setTransaccionesAll(res.data.transacciones))
      .catch(() => toast.error("Error al cargar las transacciones"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarTransacciones();
  }, [cargarTransacciones]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, eventoFilter, ambienteFilter]);

  // Búsqueda + filtros de estado, evento y ambiente aplicados en memoria
  // sobre el listado ya cargado, sin volver a consultar el backend
  const transaccionesFiltradas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return transaccionesAll.filter((tx) => {
      if (statusFilter !== "all" && tx.estadoPago !== statusFilter)
        return false;
      if (eventoFilter !== "all" && tx.eventoId !== eventoFilter) return false;
      if (
        ambienteFilter !== "all" &&
        (tx.wompiEnvironment ?? "production") !== ambienteFilter
      )
        return false;
      if (term) {
        const haystack = [
          tx.referencia,
          tx.comprador?.name,
          tx.comprador?.email,
          tx.evento?.nombre,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [
    transaccionesAll,
    searchTerm,
    statusFilter,
    eventoFilter,
    ambienteFilter,
  ]);

  const total = transaccionesFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(total / itemsPerPage));
  const safePage = Math.min(currentPage, totalPaginas);
  const transacciones = transaccionesFiltradas.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  const handleSincronizado = (estadoFinal: string) => {
    setTransaccionesAll((prev) =>
      prev.map((tx) =>
        tx.id === selectedTxId
          ? { ...tx, estadoPago: estadoFinal as TransaccionEstado }
          : tx,
      ),
    );
  };

  const getPageButtons = () => {
    const pageItems: { type: "page" | "ellipsis"; value: number | string }[] =
      [];
    for (let p = 1; p <= totalPaginas; p++) {
      if (
        totalPaginas <= 5 ||
        p === 1 ||
        p === totalPaginas ||
        Math.abs(p - safePage) <= 1
      ) {
        if (
          pageItems.length > 0 &&
          pageItems[pageItems.length - 1].type === "page" &&
          p > (pageItems[pageItems.length - 1].value as number) + 1
        ) {
          pageItems.push({ type: "ellipsis", value: "..." });
        }
        pageItems.push({ type: "page", value: p });
      }
    }
    return pageItems.map((item, i) =>
      item.type === "ellipsis" ? (
        <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">
          {item.value}
        </span>
      ) : (
        <button
          key={item.value}
          onClick={() => setCurrentPage(item.value as number)}
          className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
            safePage === (item.value as number)
              ? "bg-[#097EEC] text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {item.value}
        </button>
      ),
    );
  };

  return (
    <div>
      {/* Modal */}
      <AnimatePresence>
        {selectedTxId !== null && (
          <DetalleModal
            transaccionId={selectedTxId}
            onClose={() => setSelectedTxId(null)}
            onSincronizado={handleSincronizado}
          />
        )}
      </AnimatePresence>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por referencia, comprador o evento..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={cargarTransacciones}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
            title="Recargar transacciones"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <div className="flex gap-1.5">
            {[
              { value: "all", label: "Todos" },
              { value: TransaccionEstado.APROBADO, label: "Aprobado" },
              { value: TransaccionEstado.PENDIENTE, label: "Pendiente" },
              { value: TransaccionEstado.RECHAZADO, label: "Rechazado" },
              { value: TransaccionEstado.CANCELADO, label: "Cancelado" },
              { value: TransaccionEstado.EXPIRADO, label: "Expirado" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as any)}
                className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-[#097EEC] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por evento */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={eventoFilter}
            onChange={(e) =>
              setEventoFilter(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="flex-1 sm:max-w-xs text-sm border border-gray-200 rounded-xl bg-gray-50 px-3 py-2 focus:bg-white focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none transition-all text-gray-600"
          >
            <option value="all">Todos los eventos</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre}
                {ev.visible === false ? " (oculto)" : ""}
              </option>
            ))}
          </select>
          {eventoFilter !== "all" && (
            <button
              onClick={() => setEventoFilter("all")}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filtro por ambiente Wompi */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Ambiente:</span>
          <div className="flex gap-1.5">
            {[
              { value: "all", label: "Todos" },
              { value: "production", label: "Producción" },
              { value: "test", label: "Sandbox" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setAmbienteFilter(opt.value as "all" | "production" | "test")
                }
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  ambienteFilter === opt.value
                    ? "bg-[#097EEC] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-400">Cargando transacciones...</p>
        </div>
      ) : transacciones.length === 0 ? (
        <div className="py-20 text-center">
          <div className="bg-gray-50 border border-gray-100 inline-flex rounded-full p-5 mb-4">
            <Inbox className="h-9 w-9 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-700">
            No hay transacciones
          </h3>
          <p className="mt-1.5 text-sm text-gray-400">
            {searchTerm ||
            statusFilter !== "all" ||
            eventoFilter !== "all" ||
            ambienteFilter !== "all"
              ? "Ninguna transacción coincide con los filtros."
              : "Aún no hay compras de boletas registradas."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Comprador
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Cant.
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {transacciones.map((tx, i) => {
                  const sc = ESTADO_CONFIG[tx.estadoPago] ?? {
                    label: tx.estadoPago || "Desconocido",
                    color: "bg-gray-100 text-gray-700 border-gray-200",
                    icon: <Clock className="h-3.5 w-3.5" />,
                  };
                  return (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => setSelectedTxId(tx.id)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">
                            #{tx.id}
                          </span>
                          {tx.wompiEnvironment === "test" && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 w-fit">
                              SANDBOX
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate max-w-[180px]">
                            {tx.evento?.nombre || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#097EEC] to-[#0562C7] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {tx.comprador?.name?.charAt(0)?.toUpperCase() ||
                              "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                              {tx.comprador?.name || "—"}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate max-w-[140px]">
                              {tx.comprador?.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                          <Ticket className="h-3.5 w-3.5 text-gray-300" />
                          {tx.cantidad}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-700">
                          {formatCurrency(tx.monto)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${sc.color}`}
                        >
                          {sc.icon}
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[11px] text-gray-400 font-mono truncate max-w-[120px] block">
                          {tx.referencia}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                Mostrando{" "}
                <span className="font-medium text-gray-700">
                  {total > 0 ? (safePage - 1) * itemsPerPage + 1 : 0}
                </span>{" "}
                -{" "}
                <span className="font-medium text-gray-700">
                  {Math.min(safePage * itemsPerPage, total)}
                </span>{" "}
                de <span className="font-medium text-gray-700">{total}</span>{" "}
                resultados
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="ml-2 text-xs border border-gray-200 rounded-lg bg-white px-2 py-1 focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none"
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / pág.
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPageButtons()}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPaginas, p + 1))
                }
                disabled={safePage >= totalPaginas}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VentasManagement;
