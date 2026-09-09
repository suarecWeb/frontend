"use client";

import { useState, useEffect } from "react";
import EventsService from "@/services/EventsService";
import { Evento } from "@/interfaces/event.interface";
import {
  TransaccionBoleta,
  TransaccionEstado,
} from "@/interfaces/boleta.interface";
import {
  CalendarDays,
  Ticket,
  Clock,
  Users,
  MapPin,
  QrCode,
  ArrowRightLeft,
  Timer,
  TrendingUp,
  Search,
  AlertCircle,
  Gift,
  ChevronLeft,
  ChevronRight,
  BadgePercent,
  Banknote,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import EstadisticasEventoModal from "./EstadisticasEventoModal";
import { DatePicker, hoyColombia } from "@/components/ui/DatePicker";
import { ValidadorResumen } from "@/interfaces/ventaFisica.interface";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

// Máximo de eventos por página en la grilla "Eventos y disponibilidad"
const EVENTOS_POR_PAGINA = 10;

// Máximo de registros por página en la tabla "Validaciones QR"
const VALIDADAS_POR_PAGINA = 10;

// Muestra "lunes, 20 de julio de 2026" a partir de un YYYY-MM-DD del filtro
// de fecha — se le fija T00:00:00 local para que no se corra un día por UTC
const formatFechaFiltro = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return { date: "—", time: "—", full: "—" };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { date: "—", time: "—", full: "—" };
  return {
    date: d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    full: d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const formatDateOnly = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTimeOnly = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTimeRemaining = (dateString: string) => {
  const now = new Date().getTime();
  const event = new Date(dateString).getTime();
  const diff = event - now;

  if (diff <= 0) return { text: "Evento finalizado", expired: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return { text: `${days}d ${hours}h restantes`, expired: false };
  if (hours > 0)
    return { text: `${hours}h ${minutes}m restantes`, expired: false };
  return { text: `${minutes}m restantes`, expired: false };
};

interface BoletaValidada {
  boleta: {
    id: number;
    qrToken: string;
    estado: string;
    escaneadaAt: string;
    precioPagado: number;
    evento: {
      id: number;
      nombre: string;
      fechaEvento: string;
    };
  };
  compradorNombre: string;
  compradorEmail: string;
  validadorNombre: string;
  validadorEmail: string;
}

const EstadisticasManagement = () => {
  const [events, setEvents] = useState<Evento[]>([]);
  const [pageEventos, setPageEventos] = useState(1);
  const [totalPaginasEventos, setTotalPaginasEventos] = useState(1);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [transacciones, setTransacciones] = useState<TransaccionBoleta[]>([]);
  const [validadas, setValidadas] = useState<BoletaValidada[]>([]);
  const [pageValidadas, setPageValidadas] = useState(1);
  const [totalPaginasValidadas, setTotalPaginasValidadas] = useState(1);
  const [totalValidadas, setTotalValidadas] = useState(0);
  const [loadingValidadas, setLoadingValidadas] = useState(true);
  // Arranca filtrando por el día actual (hora Colombia) — la tabla abre
  // mostrando lo escaneado hoy; con "Limpiar" se ve todo el historial
  const [fechaValidadas, setFechaValidadas] = useState(hoyColombia);
  const [resumenValidadores, setResumenValidadores] = useState<
    ValidadorResumen[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchValidadas, setSearchValidadas] = useState("");
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(
    null,
  );

  // Las transacciones se cargan una sola vez (alimentan los KPIs)
  useEffect(() => {
    EventsService.getAllTransacciones(true)
      .then((r) => setTransacciones(r.data.transacciones))
      .catch(() => toast.error("Error al cargar estadísticas"))
      .finally(() => setLoading(false));
  }, []);

  // Validaciones QR paginadas desde el backend: máximo 10 por página,
  // no se traen todas de una vez. `fechaValidadas` filtra por día de escaneo
  // en hora Colombia (igual que boletería física)
  useEffect(() => {
    setLoadingValidadas(true);
    EventsService.getBoletasValidadas(
      pageValidadas,
      VALIDADAS_POR_PAGINA,
      fechaValidadas || undefined,
    )
      .then((r) => {
        setValidadas(r.data.validadas);
        setTotalPaginasValidadas(r.data.totalPaginas);
        setTotalValidadas(r.data.total);
        setResumenValidadores(r.data.resumenValidadores ?? []);
      })
      .catch(() => toast.error("Error al cargar las validaciones QR"))
      .finally(() => setLoadingValidadas(false));
  }, [pageValidadas, fechaValidadas]);

  const filtrarValidadasPorFecha = (value: string) => {
    setFechaValidadas(value);
    setPageValidadas(1);
  };

  // Eventos paginados desde el backend: máximo 10 por página,
  // no se traen todos de una vez
  useEffect(() => {
    setLoadingEventos(true);
    EventsService.getAllEventsAdmin()
      .then((r) => {
        setEvents(r.data);
        setTotalPaginasEventos(
          Math.max(1, Math.ceil(r.data.length / EVENTOS_POR_PAGINA)),
        );
      })
      .catch(() => toast.error("Error al cargar los eventos"))
      .finally(() => setLoadingEventos(false));
  }, []);

  const pagedEvents = events.slice(
    (pageEventos - 1) * EVENTOS_POR_PAGINA,
    pageEventos * EVENTOS_POR_PAGINA,
  );

  // KPIs
  const totalTx = transacciones.length;
  const aprobado = transacciones.filter(
    (t) => t.estadoPago === TransaccionEstado.APROBADO,
  ).length;
  const pendiente = transacciones.filter(
    (t) => t.estadoPago === TransaccionEstado.PENDIENTE,
  ).length;
  const rechazado = transacciones.filter(
    (t) => t.estadoPago === TransaccionEstado.RECHAZADO,
  ).length;
  const expirado = transacciones.filter(
    (t) => t.estadoPago === TransaccionEstado.EXPIRADO,
  ).length;
  const recaudado = transacciones
    .filter((t) => t.estadoPago === TransaccionEstado.APROBADO)
    .reduce((sum, t) => sum + (t.monto || 0), 0);
  const totalBoletasVendidas = transacciones
    .filter((t) => t.estadoPago === TransaccionEstado.APROBADO)
    .reduce((sum, t) => sum + (t.cantidad || 0), 0);
  // Total reunido por costo por servicio (cargo de cada boleta aprobada)
  const totalCargoSuarec = transacciones
    .filter((t) => t.estadoPago === TransaccionEstado.APROBADO)
    .reduce((sum, t) => sum + (t.cargoPorBoleta || 0) * (t.cantidad || 0), 0);
  // Recaudo sin el costo por servicio: solo el valor de las boletas
  const totalReunidoBoletas = transacciones
    .filter((t) => t.estadoPago === TransaccionEstado.APROBADO)
    .reduce((sum, t) => sum + (t.precioPorBoleta || 0) * (t.cantidad || 0), 0);

  // Próximo evento: el backend ordena los próximos primero (el más cercano
  // al inicio), así que el primer evento futuro de la lista completa es el
  // global
  const nextEvent = events.find((e) => new Date(e.fechaEvento) > new Date());

  // Botones de paginación (con elipsis), reutilizado por la grilla de
  // eventos y por la tabla de validaciones QR
  const getBotonesPagina = (page: number, totalPaginas: number) => {
    const items: { type: "page" | "ellipsis"; value: number | string }[] = [];
    for (let p = 1; p <= totalPaginas; p++) {
      if (
        totalPaginas <= 5 ||
        p === 1 ||
        p === totalPaginas ||
        Math.abs(p - page) <= 1
      ) {
        if (
          items.length > 0 &&
          items[items.length - 1].type === "page" &&
          p > (items[items.length - 1].value as number) + 1
        ) {
          items.push({ type: "ellipsis", value: "..." });
        }
        items.push({ type: "page", value: p });
      }
    }
    return items;
  };

  // Filtrar validaciones
  const filteredValidadas = validadas.filter((v) => {
    if (!searchValidadas) return true;
    const q = searchValidadas.toLowerCase();
    return (
      v.compradorNombre?.toLowerCase().includes(q) ||
      v.compradorEmail?.toLowerCase().includes(q) ||
      v.validadorNombre?.toLowerCase().includes(q) ||
      v.validadorEmail?.toLowerCase().includes(q) ||
      v.boleta.evento?.nombre?.toLowerCase().includes(q) ||
      String(v.boleta.id).includes(q)
    );
  });

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-gray-400">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Total transacciones
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalTx}</p>
          <div className="flex gap-2 mt-2 text-[11px]">
            <span className="text-emerald-600 font-medium">
              {aprobado} aprob.
            </span>
            <span className="text-amber-600 font-medium">
              {pendiente} pend.
            </span>
            <span className="text-red-500 font-medium">{rechazado} rech.</span>
            <span className="text-orange-500 font-medium">{expirado} exp.</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Recaudo total
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(recaudado)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totalBoletasVendidas} boletas vendidas
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Banknote className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Recaudo en boletas
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(totalReunidoBoletas)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Sin costo por servicio</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <BadgePercent className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Recaudo costo por servicio
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCurrency(totalCargoSuarec)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Costo de servicio reunido
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Ticket className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Tasa de éxito
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {totalTx > 0 ? Math.round((aprobado / totalTx) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {aprobado} de {totalTx} transacciones
          </p>
        </motion.div>
      </div>

      {/* Próximo evento */}
      {nextEvent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-r from-[#097EEC] to-[#082D50] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 opacity-30">
            <img
              src="/images/fecha-limite.png"
              alt=""
              className="h-20 w-20 object-contain brightness-0 invert"
            />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-medium uppercase tracking-wide mb-2">
              <Timer className="h-4 w-4" />
              Próximo evento
            </div>
            <h3 className="text-2xl font-bold mb-1">{nextEvent.nombre}</h3>
            <div className="flex flex-wrap gap-4 text-sm text-blue-100 mt-3">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDateTime(nextEvent.fechaEvento).full}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {nextEvent.ubicacion}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {nextEvent.aforoTotal} aforo
              </span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
              <Clock className="h-4 w-4" />
              {getTimeRemaining(nextEvent.fechaEvento).text}
            </div>
          </div>
        </motion.div>
      )}

      {/* Eventos cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#097EEC]" />
          Eventos y disponibilidad
        </h3>
        {loadingEventos ? (
          <div className="py-14 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-gray-400">Cargando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
            <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay eventos registrados</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pagedEvents.map((event, i) => {
                const dt = formatDateTime(event.fechaEvento);
                const remaining = getTimeRemaining(event.fechaEvento);
                const disponible = event.aforoDisponible ?? 0;
                const total = event.aforoTotal ?? 0;
                const vendidas = total - disponible;
                const porcentaje =
                  total > 0 ? Math.round((vendidas / total) * 100) : 0;
                const aforoRegalo = event.aforoRegalo ?? 0;
                const regalosCanjeados = event.regalosCanjeados ?? 0;
                const porcentajeRegalo =
                  aforoRegalo > 0
                    ? Math.round((regalosCanjeados / aforoRegalo) * 100)
                    : 0;
                const isNext = nextEvent?.id === event.id;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    onClick={() => setEventoSeleccionado(event)}
                    title="Ver estadísticas del evento"
                    className={`bg-white rounded-xl border p-4 shadow-sm transition-all cursor-pointer hover:border-[#097EEC]/40 hover:shadow-md ${
                      isNext
                        ? "border-[#097EEC] ring-1 ring-[#097EEC]/20"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-800 truncate pr-2">
                        {event.nombre}
                      </h4>
                      {isNext && (
                        <span className="text-[10px] font-bold bg-[#097EEC] text-white px-2 py-0.5 rounded-full shrink-0">
                          SIGUIENTE
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-300" />
                        <span className="font-medium text-gray-700">
                          {dt.time}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>{dt.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-300" />
                        <span className="truncate">{event.ubicacion}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">
                          {vendidas} / {total} vendidas
                        </span>
                        <span
                          className={`font-medium ${disponible === 0 ? "text-red-500" : "text-emerald-600"}`}
                        >
                          {disponible} disp.
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            porcentaje >= 100
                              ? "bg-red-400"
                              : porcentaje >= 75
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(porcentaje, 100)}%` }}
                        />
                      </div>
                      <p
                        className={`text-[11px] mt-1 ${remaining.expired ? "text-red-500" : "text-gray-400"}`}
                      >
                        {remaining.text}
                      </p>
                    </div>

                    {aforoRegalo > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Gift className="h-3.5 w-3.5 text-amber-500" />
                            {regalosCanjeados} / {aforoRegalo} regalos canjeados
                          </span>
                          <span className="font-medium text-amber-600">
                            {porcentajeRegalo}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-amber-400 transition-all"
                            style={{
                              width: `${Math.min(porcentajeRegalo, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {totalPaginasEventos > 1 && (
              <div className="flex items-center justify-center gap-1 mt-4">
                <button
                  onClick={() => setPageEventos((p) => Math.max(1, p - 1))}
                  disabled={pageEventos <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getBotonesPagina(pageEventos, totalPaginasEventos).map(
                  (item, i) =>
                    item.type === "ellipsis" ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-2 text-xs text-gray-400"
                      >
                        {item.value}
                      </span>
                    ) : (
                      <button
                        key={item.value}
                        onClick={() => setPageEventos(item.value as number)}
                        className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
                          pageEventos === (item.value as number)
                            ? "bg-[#097EEC] text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {item.value}
                      </button>
                    ),
                )}
                <button
                  onClick={() =>
                    setPageEventos((p) => Math.min(totalPaginasEventos, p + 1))
                  }
                  disabled={pageEventos >= totalPaginasEventos}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabla de validaciones QR */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#097EEC]" />
            Validaciones QR ({totalValidadas})
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por comprador, validador o evento..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none transition-all"
                value={searchValidadas}
                onChange={(e) => setSearchValidadas(e.target.value)}
              />
            </div>
            <DatePicker
              value={fechaValidadas}
              onChange={filtrarValidadasPorFecha}
              allowClear
              placeholder="Día de escaneo"
              className="flex-shrink-0"
            />
          </div>
        </div>

        {/* Resumen del día filtrado: total escaneadas + desglose por validador */}
        {fechaValidadas && !loadingValidadas && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-blue-50/50 border border-[#097EEC]/20 rounded-xl"
          >
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-[#097EEC]">
                {totalValidadas}
              </span>{" "}
              boleta{totalValidadas === 1 ? "" : "s"} escaneada
              {totalValidadas === 1 ? "" : "s"} el{" "}
              <span className="font-medium">
                {formatFechaFiltro(fechaValidadas)}
              </span>
            </p>

            {resumenValidadores.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {resumenValidadores.map((v) => (
                  <div
                    key={v.validadorId ?? "sin-validador"}
                    className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm"
                  >
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#097EEC] to-[#0562C7] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {(v.validadorNombre || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate max-w-[140px]">
                        {v.validadorNombre}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[140px]">
                        {v.validadorEmail}
                      </p>
                    </div>
                    <span className="ml-1 text-xs font-semibold text-[#097EEC] bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 flex-shrink-0">
                      {v.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {loadingValidadas ? (
          <div className="py-14 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-gray-400">Cargando validaciones...</p>
          </div>
        ) : totalValidadas === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
            <QrCode className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {fechaValidadas
                ? `No se escaneó ninguna boleta el ${formatFechaFiltro(fechaValidadas)}`
                : "Aún no se ha validado ninguna boleta"}
            </p>
          </div>
        ) : filteredValidadas.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
            <Inbox className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Ninguna validación coincide con la búsqueda
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Boleta
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Comprador
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Validado por
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha escaneo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredValidadas.map((v, i) => {
                  const escaneoDate = formatDateTime(v.boleta.escaneadaAt);
                  const escaneoRaw = v.boleta.escaneadaAt;
                  const hasValidador =
                    v.validadorNombre && v.validadorNombre !== "—";

                  return (
                    <motion.tr
                      key={v.boleta.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                      className="hover:bg-blue-50/20 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-700">
                          #{v.boleta.id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 truncate max-w-[160px] block">
                          {v.boleta.evento?.nombre || "—"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {formatDateOnly(v.boleta.evento?.fechaEvento)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[10px] font-bold">
                            {(v.compradorNombre || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-gray-700">
                              {v.compradorNombre || "—"}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {v.compradorEmail || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasValidador ? (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#097EEC] to-[#0562C7] flex items-center justify-center text-white text-[10px] font-bold">
                              {(v.validadorNombre || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                {v.validadorNombre}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {v.validadorEmail}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">
                              Sin registro
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {escaneoRaw ? (
                          <div className="text-xs">
                            <p className="text-gray-700 font-medium">
                              {escaneoDate.date}
                            </p>
                            <p className="text-gray-400">{escaneoDate.time}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loadingValidadas &&
          totalValidadas > 0 &&
          filteredValidadas.length > 0 &&
          totalPaginasValidadas > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4">
              <button
                onClick={() => setPageValidadas((p) => Math.max(1, p - 1))}
                disabled={pageValidadas <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getBotonesPagina(pageValidadas, totalPaginasValidadas).map(
                (item, i) =>
                  item.type === "ellipsis" ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-2 text-xs text-gray-400"
                    >
                      {item.value}
                    </span>
                  ) : (
                    <button
                      key={item.value}
                      onClick={() => setPageValidadas(item.value as number)}
                      className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
                        pageValidadas === (item.value as number)
                          ? "bg-[#097EEC] text-white"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {item.value}
                    </button>
                  ),
              )}
              <button
                onClick={() =>
                  setPageValidadas((p) =>
                    Math.min(totalPaginasValidadas, p + 1),
                  )
                }
                disabled={pageValidadas >= totalPaginasValidadas}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
      </div>

      <AnimatePresence>
        {eventoSeleccionado && (
          <EstadisticasEventoModal
            evento={eventoSeleccionado}
            transacciones={transacciones}
            onClose={() => setEventoSeleccionado(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EstadisticasManagement;
