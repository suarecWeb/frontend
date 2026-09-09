"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import {
  Printer,
  Inbox,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Ticket,
  X,
  QrCode,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import EventsService from "@/services/EventsService";
import {
  MetodoPagoFisico,
  VentaFisicaGlobal,
} from "@/interfaces/ventaFisica.interface";
import {
  BoletaFisicaConQR,
  VentaFisicaConBoletasResponse,
} from "@/interfaces/boleteria-fisica.interface";
import {
  BoleteriaFisicaTicket,
  type BoleteriaFisicaTicketRef,
} from "@/components/admin/boleteria/fisica/BoleteriaFisicaTicket";
import { formatDisplayDate } from "@/lib/TimeZone";

const ESTADO_BOLETA_COLOR: Record<string, string> = {
  disponible: "bg-gray-100 text-gray-600 border-gray-200",
  vendida: "bg-blue-100 text-blue-700 border-blue-200",
  usada: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const TIPO_BOLETA_COLOR: Record<string, string> = {
  GENERAL: "bg-gray-100 text-gray-600 border-gray-200",
  VIP: "bg-amber-100 text-amber-700 border-amber-200",
  PALCO: "bg-purple-100 text-purple-700 border-purple-200",
  PALCO_INDIVIDUAL: "bg-purple-100 text-purple-700 border-purple-200",
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

// Fecha/hora del evento en el formato que espera el ticket impreso — mismos
// helpers que usa VentaFisicaPanel para que el ticket reimpreso sea identico
const formatEventDate = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatEventTime = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const METODO_PAGO_CONFIG: Record<
  MetodoPagoFisico,
  { label: string; color: string }
> = {
  [MetodoPagoFisico.EFECTIVO]: {
    label: "Efectivo",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  [MetodoPagoFisico.TRANSFERENCIA]: {
    label: "Transferencia",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

// ── Modal de detalle ──────────────────────────────────────────────────────────
// Recibe los datos de la venta por PROP (ya los tenemos de la fila de la tabla,
// no hace falta volver a pedirlos) — solo se llama al backend para traer las
// boletas individuales (id, estado, qrToken), que no vienen en el listado.

interface VentaFisicaDetalleModalProps {
  venta: VentaFisicaGlobal;
  onClose: () => void;
}

const VentaFisicaDetalleModal = ({
  venta,
  onClose,
}: VentaFisicaDetalleModalProps) => {
  const [detalle, setDetalle] = useState<VentaFisicaConBoletasResponse | null>(
    null,
  );
  const [loadingBoletas, setLoadingBoletas] = useState(true);
  // QRs montados en el ticket oculto al momento de reimprimir (1 boleta o todas)
  const [qrsAImprimir, setQrsAImprimir] = useState<{
    values: string[];
    ids: string[];
  }>({ values: [], ids: [] });
  const ticketRef = useRef<BoleteriaFisicaTicketRef | null>(null);

  const boletas = detalle?.boletas ?? null;

  // Tipo real grabado en la primera boleta que se está reimprimiendo (todas
  // las boletas de una misma venta comparten tipo, asignado atómicamente al
  // vender). "PALCO" no es seleccionable en venta física, así que no
  // debería aparecer aquí; se trata igual que sin tipo (boletas anteriores
  // a este cambio, sin dato -- caen a "GENERAL" como antes).
  const primerTipo = boletas?.find((b) =>
    qrsAImprimir.ids.includes(b.id),
  )?.tipo;
  const tipoAImprimir: "GENERAL" | "VIP" | "PALCO_INDIVIDUAL" =
    primerTipo === "VIP" || primerTipo === "PALCO_INDIVIDUAL"
      ? primerTipo
      : "GENERAL";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    EventsService.obtenerVentaFisica(venta.id)
      .then((res) => setDetalle(res.data))
      .catch(() => toast.error("No se pudo cargar el detalle de la venta"))
      .finally(() => setLoadingBoletas(false));
  }, [venta.id]);

  // Reimpresion: monta los QR elegidos en el ticket oculto de forma sincrona
  // (flushSync, mismo patron que VentaFisicaPanel) y dispara el agente termico
  const imprimirBoletas = (seleccion: BoletaFisicaConQR[]) => {
    if (seleccion.length === 0) return;
    flushSync(() => {
      setQrsAImprimir({
        values: seleccion.map((b) => b.qrToken),
        ids: seleccion.map((b) => b.id),
      });
    });
    ticketRef.current?.handleAgentPrint();
    toast.success(
      `${seleccion.length} ticket${seleccion.length > 1 ? "s" : ""} enviado${seleccion.length > 1 ? "s" : ""} a la impresora`,
    );
  };

  const mc = METODO_PAGO_CONFIG[venta.metodoPago];

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
              Venta física
            </p>
            <p className="text-base font-semibold text-gray-800">
              #{venta.id} — {venta.eventoNombre}
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
          {/* Info de la venta — viene directo del prop, sin llamada nueva */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-400">Método de pago</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${mc.color}`}
              >
                {mc.label}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-400">Cantidad</span>
              <span className="font-medium text-gray-700">
                {venta.cantidad}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-400">Monto total</span>
              <span className="font-semibold text-gray-800">
                {formatCOP(venta.montoTotal)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-400">Cambio</span>
              <span className="font-medium text-gray-700">
                {venta.cambio !== null ? formatCOP(venta.cambio) : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Fecha</span>
              <span className="font-medium text-gray-700">
                {formatDisplayDate(venta.createdAt)}
              </span>
            </div>
          </div>

          {/* Boletas de esta venta — esto sí necesita ir al backend */}
          <div>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2">
              Boletas de esta venta
            </p>

            {loadingBoletas ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#097EEC] border-t-transparent mx-auto mb-2" />
                <p className="text-xs text-gray-400">Cargando boletas...</p>
              </div>
            ) : !boletas || boletas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No se encontraron boletas para esta venta
              </p>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                {boletas.map((b, i) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Boleta {i + 1}</p>
                        <p className="text-[10px] text-gray-400">
                          Nro. serial:{" "}
                          <span className="font-mono text-gray-500">
                            {b.id}
                          </span>
                        </p>
                        <p className="font-mono text-[10px] text-gray-400 truncate max-w-[220px]">
                          {b.qrToken}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {b.tipo && (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            TIPO_BOLETA_COLOR[b.tipo] ??
                            "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {b.tipo.replace(/_/g, " ")}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          ESTADO_BOLETA_COLOR[b.estado] ??
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {b.estado}
                      </span>
                      <button
                        onClick={() => imprimirBoletas([b])}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#097EEC] hover:bg-blue-50 transition-colors"
                        title="Reimprimir esta boleta"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {boletas && boletas.length > 0 && (
              <button
                onClick={() => imprimirBoletas(boletas)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-3 text-sm font-medium text-white bg-[#097EEC] rounded-xl hover:bg-[#0866c4] transition-colors"
              >
                <Printer className="h-4 w-4" />
                Reimprimir toda la venta
              </button>
            )}
          </div>
        </div>

        {/* Ticket oculto para reimpresion: montado fuera de pantalla (no
            display:none — html2canvas necesita el DOM renderizado para
            capturar la imagen que se manda al agente termico) */}
        <div className="fixed -left-[10000px] top-0" aria-hidden="true">
          <BoleteriaFisicaTicket
            ref={ticketRef}
            qrValue={qrsAImprimir.values[0] ?? ""}
            qrValues={
              qrsAImprimir.values.length > 0 ? qrsAImprimir.values : undefined
            }
            qrIds={qrsAImprimir.ids.length > 0 ? qrsAImprimir.ids : undefined}
            tipoBoleta={tipoAImprimir}
            precio={String(detalle?.precioBase ?? "")}
            fechaCompra={new Date(venta.createdAt).toLocaleDateString("es-CO")}
            cantidad={qrsAImprimir.values.length || venta.cantidad}
            evento={{
              nombre: detalle?.eventoNombre ?? venta.eventoNombre,
              fecha: formatEventDate(detalle?.eventoFecha),
              hora: formatEventTime(detalle?.eventoFecha),
              lugar: detalle?.eventoUbicacion ?? undefined,
              descripcion: detalle?.eventoDescripcion ?? undefined,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

const VentasFisicasManagement = () => {
  const [ventas, setVentas] = useState<VentaFisicaGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVenta, setSelectedVenta] = useState<VentaFisicaGlobal | null>(
    null,
  );
  const [metodoPagoFilter, setMetodoPagoFilter] = useState<
    "all" | MetodoPagoFisico
  >("all");

  const cargarVentas = useCallback(
    async (paginaActual: number, filtro: "all" | MetodoPagoFisico) => {
      setLoading(true);
      try {
        const res = await EventsService.getVentasFisicasGlobal(
          paginaActual,
          filtro === "all" ? undefined : filtro,
        );
        setVentas(res.data.ventas);
        setTotalPaginas(res.data.totalPaginas);
        setTotal(res.data.total);
      } catch {
        toast.error("No se pudo cargar el historial de ventas físicas");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    cargarVentas(page, metodoPagoFilter);
  }, [page, metodoPagoFilter, cargarVentas]);

  const cambiarFiltro = (filtro: "all" | MetodoPagoFisico) => {
    setMetodoPagoFilter(filtro);
    setPage(1);
  };

  // Mismo generador de botones de paginación (con puntos suspensivos) que
  // usa VentasManagement.tsx (digital) — aqui `page`/`totalPaginas` vienen
  // del servidor en vez de calcularse sobre un arreglo ya cargado.
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
      {/* Modal de detalle */}
      <AnimatePresence>
        {selectedVenta && (
          <VentaFisicaDetalleModal
            venta={selectedVenta}
            onClose={() => setSelectedVenta(null)}
          />
        )}
      </AnimatePresence>

      {/* Barra superior: total + filtro por método de pago + botón actualizar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">
          {total} venta{total === 1 ? "" : "s"} en total
        </p>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {(
              [
                { value: "all", label: "Todos" },
                { value: MetodoPagoFisico.EFECTIVO, label: "Efectivo" },
                {
                  value: MetodoPagoFisico.TRANSFERENCIA,
                  label: "Transferencia",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => cambiarFiltro(opt.value)}
                className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors ${
                  metodoPagoFilter === opt.value
                    ? "bg-[#097EEC] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => cargarVentas(page, metodoPagoFilter)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
            title="Recargar ventas"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-400">Cargando ventas físicas...</p>
        </div>
      ) : ventas.length === 0 ? (
        <div className="py-20 text-center">
          <div className="bg-gray-50 border border-gray-100 inline-flex rounded-full p-5 mb-4">
            <Inbox className="h-9 w-9 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-700">
            No hay ventas físicas
          </h3>
          <p className="mt-1.5 text-sm text-gray-400">
            Aún no se ha registrado ninguna venta presencial.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-[#097EEC] text-xs font-medium">
            <Printer className="h-4 w-4" />
            Integración con impresora térmica POS-80C en desarrollo
          </div>
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
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Cant.
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Método de pago
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Cambio
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {ventas.map((venta, i) => {
                  const mc = METODO_PAGO_CONFIG[venta.metodoPago];
                  return (
                    <motion.tr
                      key={venta.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => setSelectedVenta(venta)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate max-w-[180px]">
                            {venta.eventoNombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                          <Ticket className="h-3.5 w-3.5 text-gray-300" />
                          {venta.cantidad}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${mc.color}`}
                        >
                          {mc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-700">
                          {formatCOP(venta.montoTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm text-gray-500">
                        {venta.cambio !== null ? formatCOP(venta.cambio) : "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm text-gray-500">
                        {formatCOP(venta.comision)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {formatDisplayDate(venta.createdAt)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación — mismo layout que VentasManagement.tsx */}
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                Página <span className="font-medium text-gray-700">{page}</span>{" "}
                de{" "}
                <span className="font-medium text-gray-700">
                  {totalPaginas}
                </span>{" "}
                · <span className="font-medium text-gray-700">{total}</span>{" "}
                resultados
              </span>
            </div>

            <div className="flex items-center gap-1">
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
          </div>
        </>
      )}
    </div>
  );
};

export default VentasFisicasManagement;
