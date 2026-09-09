"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Ticket,
  Receipt,
  CalendarDays,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import EventsService from "@/services/EventsService";
import RecaudoEventoModal from "./RecaudoEventoModal";
import {
  RecaudoGlobalFisicoResponse,
  ResumenEventoFisico,
  BoletaFisicaValidada,
  ValidadorResumen,
} from "@/interfaces/ventaFisica.interface";
import { formatDisplayDate } from "@/lib/TimeZone";
import { DatePicker, hoyColombia } from "@/components/ui/DatePicker";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

// ── Tabla de boletas validadas (paginada) ──────────────────────────────────
// Mismo estilo que la tabla "Validaciones QR" de digital, sin columna de
// comprador (las boletas fisicas no tienen comprador con cuenta).

// Muestra "lunes, 20 de julio de 2026" a partir de un YYYY-MM-DD del input
// date — se le fija T00:00:00 local para que no se corra un dia por UTC
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

const BoletasValidadasTable = () => {
  const [boletas, setBoletas] = useState<BoletaFisicaValidada[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [serialSearch, setSerialSearch] = useState("");
  // Arranca filtrando por el dia actual (hora Colombia) — la tabla abre
  // mostrando lo escaneado hoy; con "Limpiar" se ve todo el historial
  const [fechaFilter, setFechaFilter] = useState(hoyColombia);
  const [resumenValidadores, setResumenValidadores] = useState<
    ValidadorResumen[]
  >([]);

  const cargar = useCallback(
    async (paginaActual: number, serial: string, fecha: string) => {
      setLoading(true);
      try {
        const res = await EventsService.getBoletasFisicasValidadas(
          paginaActual,
          serial || undefined,
          fecha || undefined,
        );
        setBoletas(res.data.boletas);
        setTotalPaginas(res.data.totalPaginas);
        setTotal(res.data.total);
        setResumenValidadores(res.data.resumenValidadores ?? []);
      } catch {
        toast.error("No se pudo cargar las boletas validadas");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounce: espera a que el admin deje de escribir antes de consultar
  useEffect(() => {
    const timeout = setTimeout(() => {
      cargar(page, serialSearch, fechaFilter);
    }, 400);
    return () => clearTimeout(timeout);
  }, [page, serialSearch, fechaFilter, cargar]);

  const buscarPorSerial = (value: string) => {
    setSerialSearch(value);
    setPage(1);
  };

  const filtrarPorFecha = (value: string) => {
    setFechaFilter(value);
    setPage(1);
  };

  const getPageButtons = () => {
    const pageItems: { type: "page" | "ellipsis"; value: number | string }[] =
      [];
    for (let p = 1; p <= totalPaginas; p++) {
      if (
        totalPaginas <= 5 ||
        p === 1 ||
        p === totalPaginas ||
        Math.abs(p - page) <= 1
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
          onClick={() => setPage(item.value as number)}
          className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
            page === (item.value as number)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-[#097EEC]" />
          Boletas validadas ({total})
        </h3>
        <div className="flex items-center gap-2 sm:max-w-2xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por número de serial..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none transition-all"
              value={serialSearch}
              onChange={(e) => buscarPorSerial(e.target.value)}
            />
          </div>
          <DatePicker
            value={fechaFilter}
            onChange={filtrarPorFecha}
            allowClear
            placeholder="Día de escaneo"
            className="flex-shrink-0"
          />
          <button
            onClick={() => cargar(page, serialSearch, fechaFilter)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors flex-shrink-0"
            title="Recargar boletas validadas"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Resumen del dia filtrado: total escaneadas + desglose por validador */}
      {fechaFilter && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-blue-50/50 border border-[#097EEC]/20 rounded-xl"
        >
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-[#097EEC]">{total}</span> boleta
            {total === 1 ? "" : "s"} escaneada{total === 1 ? "" : "s"} el{" "}
            <span className="font-medium">
              {formatFechaFiltro(fechaFilter)}
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

      {loading ? (
        <div className="py-14 text-center">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-400">Cargando boletas validadas...</p>
        </div>
      ) : boletas.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
          <QrCode className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {serialSearch
              ? "Ningún serial coincide con la búsqueda"
              : fechaFilter
                ? `No se escaneó ninguna boleta el ${formatFechaFiltro(fechaFilter)}`
                : "Aún no se ha validado ninguna boleta física"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Nro. serial
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
                {boletas.map((b, i) => (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.5) }}
                    className="hover:bg-blue-50/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[200px]">
                      {b.eventoNombre}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-gray-500">
                        {b.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#097EEC] to-[#0562C7] flex items-center justify-center text-white text-[10px] font-bold">
                          {(b.validadorNombre || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-gray-700">
                            {b.validadorNombre}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {b.validadorEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {formatDisplayDate(b.escaneadaAt)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageButtons()}
              <button
                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                disabled={page >= totalPaginas}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const EstadisticasFisicasManagement = () => {
  const [recaudo, setRecaudo] = useState<RecaudoGlobalFisicoResponse | null>(
    null,
  );
  const [eventos, setEventos] = useState<ResumenEventoFisico[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventoRecaudo, setEventoRecaudo] =
    useState<ResumenEventoFisico | null>(null);

  useEffect(() => {
    Promise.all([
      EventsService.getRecaudoGlobalFisico().then((res) =>
        setRecaudo(res.data),
      ),
      EventsService.getResumenEventosFisicos().then((res) =>
        setEventos(res.data),
      ),
    ])
      .catch(() =>
        toast.error("No se pudo cargar las estadísticas de boletería física"),
      )
      .finally(() => setLoading(false));
  }, []);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Recaudado (boletería física)
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatCOP(recaudo?.recaudado ?? 0)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Ticket className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Boletas vendidas
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {recaudo?.boletasVendidas ?? 0}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Receipt className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Ventas registradas
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {recaudo?.totalVentas ?? 0}
          </p>
        </motion.div>
      </div>

      {eventos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#097EEC]" />
            Eventos y disponibilidad
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {eventos.map((ev, i) => {
              const porcentaje =
                ev.total > 0 ? Math.round((ev.vendidas / ev.total) * 100) : 0;
              return (
                <motion.div
                  key={ev.eventoId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  onClick={() => setEventoRecaudo(ev)}
                  title="Ver ganancias del evento"
                  className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-[#097EEC]/40 hover:shadow-md transition-all"
                >
                  <h4 className="text-sm font-semibold text-gray-800 truncate mb-3">
                    {ev.eventoNombre}
                  </h4>

                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">
                      {ev.vendidas} / {ev.total} vendidas
                    </span>
                    <span
                      className={`font-medium ${ev.disponibles === 0 ? "text-red-500" : "text-emerald-600"}`}
                    >
                      {ev.disponibles} disp.
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
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <BoletasValidadasTable />

      <AnimatePresence>
        {eventoRecaudo && (
          <RecaudoEventoModal
            eventoId={eventoRecaudo.eventoId}
            eventoNombre={eventoRecaudo.eventoNombre}
            disponibles={eventoRecaudo.disponibles}
            vendidas={eventoRecaudo.vendidas}
            total={eventoRecaudo.total}
            onClose={() => setEventoRecaudo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EstadisticasFisicasManagement;
