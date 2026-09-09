"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Evento } from "@/interfaces/event.interface";
import {
  BoleteriaFisicaTicket,
  type BoleteriaFisicaTicketRef,
} from "@/components/admin/boleteria/fisica/BoleteriaFisicaTicket";
import EventsService from "@/services/EventsService";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { MetodoPagoFisico } from "@/interfaces/boleteria-fisica.interface";
import {
  Printer,
  Usb,
  ArrowLeft,
  ShoppingCart,
  Banknote,
  ArrowRightLeft,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Ticket,
  CalendarClock,
  MapPin,
  Settings2,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface VentaFisicaPanelProps {
  evento?: Evento;
  onBack?: () => void;
}

const contentVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

const formatEventDate = (iso?: string): string => {
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

const formatEventTime = (iso?: string): string => {
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const formatPriceInput = (value: number | undefined): string => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const parsePriceInput = (raw: string): number | undefined => {
  const cleaned = raw.replace(/\./g, "").replace(/,/g, "");
  const num = Number(cleaned);
  return cleaned === "" ? undefined : isNaN(num) ? undefined : num;
};

export const VentaFisicaPanel = ({ evento, onBack }: VentaFisicaPanelProps) => {
  const [qrValue, setQrValue] = useState("SUAREC-EVT-001-TKT-0001");
  const [tipoBoleta, setTipoBoleta] = useState<
    "GENERAL" | "VIP" | "PALCO_INDIVIDUAL"
  >("GENERAL");
  const [fechaEvento, setFechaEvento] = useState(
    "Domingo, 19 de julio de 2026",
  );
  const [horaEvento, setHoraEvento] = useState("6:00 p.m.");
  const [ubicacion, setUbicacion] = useState("La Herradura, Cauca");
  const [precio, setPrecio] = useState<number>(20000);
  const [precioStr, setPrecioStr] = useState("20.000");
  const [cantidad, setCantidad] = useState(1);
  const [cantidadStr, setCantidadStr] = useState("1");
  const [fechaCompra, setFechaCompra] = useState(
    new Date().toLocaleDateString("es-CO"),
  );
  const [guardandoEvento, setGuardandoEvento] = useState(false);

  // Método de pago
  const [metodoPago, setMetodoPago] = useState<MetodoPagoFisico>(
    MetodoPagoFisico.EFECTIVO,
  );
  const [billeteRecibido, setBilleteRecibido] = useState<string>("");
  const [billeteRecibidoNum, setBilleteRecibidoNum] = useState<number>(0);

  // Estados de acciones
  const [vendiendo, setVendiendo] = useState(false);
  const [resultadoVenta, setResultadoVenta] = useState<{
    ventaId: number;
    cambio: number | null;
    cantidad: number;
    montoTotal: number;
  } | null>(null);
  const [qrValues, setQrValues] = useState<string[]>([]);
  const [qrIds, setQrIds] = useState<string[]>([]);
  const [disponibles, setDisponibles] = useState<number | null>(null);
  const [mostrarConfigEvento, setMostrarConfigEvento] = useState(false);
  const ticketRef = useRef<BoleteriaFisicaTicketRef | null>(null);
  const cantidadInputRef = useRef<HTMLInputElement>(null);
  const billeteInputRef = useRef<HTMLInputElement>(null);

  // Sidebar redimensionable — mismo patrón que AdminSidePanel en publicaciones,
  // con su propia clave de storage y anchos acordes al formulario de venta
  const { width: panelWidth, onMouseDown: onPanelDrag } = useResizablePanel(
    "suarec_venta_fisica_panel_w",
    { defaultWidth: 360, minWidth: 300, maxWidth: 520 },
  );

  const precioNumerico = useMemo(() => precio || 0, [precio]);

  const montoTotal = useMemo(
    () => precioNumerico * cantidad,
    [precioNumerico, cantidad],
  );

  const cambio = useMemo(() => {
    if (metodoPago !== MetodoPagoFisico.EFECTIVO) return 0;
    return Math.max(0, billeteRecibidoNum - montoTotal);
  }, [metodoPago, billeteRecibidoNum, montoTotal]);

  const handleGuardarConfigEvento = async () => {
    if (!evento?.id) return;

    setGuardandoEvento(true);
    try {
      await EventsService.updateEvent(String(evento.id), {
        precioBase: precio || undefined,
        ubicacion: ubicacion || undefined,
      });
      toast.success("Configuración del evento actualizada");
    } catch (error: any) {
      toast.error("Error al actualizar la configuración del evento");
    } finally {
      setGuardandoEvento(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleGuardarConfigEvento();
    }
  };

  useEffect(() => {
    if (!evento?.id) return;
    const eventoId = evento.id;

    setFechaEvento(formatEventDate(evento.fechaEvento));
    setHoraEvento(formatEventTime(evento.fechaEvento));
    setUbicacion(evento.ubicacion || "");
    const precioNum = evento.precioBase ?? 20000;
    setPrecio(precioNum);
    setPrecioStr(formatPriceInput(precioNum));
    setQrValue(`SUAREC-EVT-${evento.id ?? "001"}-TKT-0001`);
    setQrValues([]);
    setResultadoVenta(null);
    setDisponibles(null);

    // Cargar disponibles
    const cargarDisponibles = async () => {
      try {
        const res =
          await EventsService.contarBoletasFisicasDisponibles(eventoId);
        setDisponibles(res.data.disponibles);
      } catch {
        setDisponibles(null);
      }
    };

    cargarDisponibles();
  }, [evento]);

  // Focus en el input de cantidad cuando se monta el componente
  useEffect(() => {
    if (cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
  }, []);

  const handleVender = async () => {
    if (!evento?.id) {
      toast.error("No hay un evento seleccionado");
      return;
    }

    if (cantidad < 1) {
      toast.error("La cantidad debe ser al menos 1");
      return;
    }

    if (cantidad > 20) {
      toast.error("No puedes vender más de 20 boletas físicas a la vez");
      return;
    }

    if (metodoPago === MetodoPagoFisico.EFECTIVO) {
      if (billeteRecibidoNum < montoTotal) {
        toast.error("El billete recibido no cubre el monto total");
        return;
      }
    }

    if (disponibles === null) {
      toast.error("No se pudo consultar la disponibilidad de boletas físicas");
      return;
    }

    if (disponibles < cantidad) {
      toast.error(
        `Solo hay ${disponibles} boleta(s) física(s) disponible(s). Genera un lote primero.`,
      );
      return;
    }

    setVendiendo(true);
    setResultadoVenta(null);

    try {
      const res = await EventsService.venderBoletasFisicas(evento.id, {
        cantidad,
        metodoPago,
        billeteRecibido:
          metodoPago === MetodoPagoFisico.EFECTIVO
            ? billeteRecibidoNum || undefined
            : undefined,
        tipoBoleta,
      });

      // eslint-disable-next-line no-console
      console.log("[VentaFisicaPanel] venta creada:", res.data);

      const ventaRes = await EventsService.obtenerVentaFisica(res.data.ventaId);

      // eslint-disable-next-line no-console
      console.log("[VentaFisicaPanel] venta con boletas:", ventaRes.data);

      const nuevosQrValues = ventaRes.data.boletas.map((b) => b.qrToken);
      const nuevosQrIds = ventaRes.data.boletas.map((b) => b.id);

      setResultadoVenta({
        ventaId: ventaRes.data.ventaId,
        cambio: ventaRes.data.cambio,
        cantidad: ventaRes.data.cantidad,
        montoTotal: ventaRes.data.montoTotal,
      });

      // Aplicamos los QR reales de forma sincrónica para que el DOM se actualice
      // antes de capturar los tickets e imprimirlos automáticamente.
      flushSync(() => {
        setQrValues(nuevosQrValues);
        setQrIds(nuevosQrIds);
      });

      ticketRef.current?.handleAgentPrint();

      toast.success(`Venta #${res.data.ventaId} confirmada`);

      // Resetear solo los inputs para el siguiente ciclo
      setCantidad(1);
      setCantidadStr("1");
      setBilleteRecibido("");
      setBilleteRecibidoNum(0);

      // Volver a cargar disponibles
      if (evento.id) {
        const cargarDisponibles = async () => {
          try {
            const res = await EventsService.contarBoletasFisicasDisponibles(
              evento.id!,
            );
            setDisponibles(res.data.disponibles);
          } catch {
            setDisponibles(null);
          }
        };
        cargarDisponibles();
      }

      // Focus en el input de cantidad
      setTimeout(() => {
        cantidadInputRef.current?.focus();
      }, 100);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("[VentaFisicaPanel] error venta:", error);
      toast.error(
        error.response?.data?.message || "Error al confirmar la venta",
      );
    } finally {
      setVendiendo(false);
    }
  };

  return (
    <div
      className="flex flex-col md:flex-row items-start"
      style={{ "--panel-w": `${panelWidth}px` } as CSSProperties}
    >
      {/* Sidebar de datos de la venta — mismo lenguaje visual que AdminSidePanel */}
      <motion.aside
        variants={contentVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full md:w-[var(--panel-w)] md:flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-xl pt-6 pb-4 px-4 h-fit"
      >
        <div className="mb-6">
          <p className="text-xs font-jakarta font-semibold text-gray-400 uppercase tracking-wide">
            Boletería física
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-sm font-eras-bold text-gray-800">
            <ShoppingCart className="h-4 w-4 text-[#097EEC]" />
            Datos de la venta
          </h2>
        </div>

        {/* Card: Evento seleccionado */}
        {evento && (
          <div className="mb-4 p-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Evento seleccionado
            </p>
            <p className="text-sm font-semibold text-[#097EEC]">
              {evento.nombre}
            </p>
            {evento.descripcion && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Descripción (quienes se presentarán)
                </p>
                <p className="text-xs text-gray-700 line-clamp-3">
                  {evento.descripcion}
                </p>
              </div>
            )}
            {disponibles !== null && (
              <p className="mt-1.5 text-xs text-gray-600">
                <span className="font-medium">{disponibles}</span> boletas
                físicas disponibles
              </p>
            )}
            <button
              type="button"
              onClick={() => setMostrarConfigEvento((v) => !v)}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-[#097EEC] hover:text-[#0766c2] transition-colors"
            >
              {mostrarConfigEvento ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Ocultar configuración
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Ver configuración
                </>
              )}
            </button>
          </div>
        )}

        {/* Configuración del evento — colapsable porque es fija */}
        {mostrarConfigEvento && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-jakarta font-semibold text-gray-400 uppercase tracking-wide mb-3">
              <Settings2 className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
              Configuración del evento
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha
                </label>
                <input
                  type="text"
                  value={fechaEvento}
                  onChange={(e) => setFechaEvento(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hora
                </label>
                <input
                  type="text"
                  value={horaEvento}
                  onChange={(e) => setHoraEvento(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <MapPin className="h-3 w-3 inline-block mr-1" />
                Ubicación
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
              />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Precio base (COP)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={precioStr}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, "");
                  if (rawValue === "") {
                    setPrecioStr("");
                    setPrecio(0);
                  } else {
                    const numValue = Number(rawValue);
                    setPrecio(numValue);
                    setPrecioStr(formatPriceInput(numValue));
                  }
                }}
                onKeyDown={handleKeyDown}
                disabled={guardandoEvento}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400 italic">
              Presiona Enter para guardar los cambios
            </p>
          </div>
        )}

        {/* Card: Boleta a comprar */}
        {mostrarConfigEvento && (
          <div className="mb-4 p-4 border border-gray-100 rounded-xl">
            <p className="text-xs font-jakarta font-semibold text-gray-400 uppercase tracking-wide mb-3">
              <Ticket className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
              Boleta a comprar
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de boleta
              </label>
              <select
                value={tipoBoleta}
                onChange={(e) =>
                  setTipoBoleta(
                    e.target.value as "GENERAL" | "VIP" | "PALCO_INDIVIDUAL",
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm bg-white"
              >
                <option value="GENERAL">GENERAL</option>
                <option value="VIP">VIP</option>
                <option value="PALCO_INDIVIDUAL">PALCO INDIVIDUAL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarClock className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
                Fecha de compra
              </label>
              <input
                type="text"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
                placeholder="14/07/2026"
              />
            </div>
          </div>
        )}

        {/* Card: Pago */}
        <div className="mb-4 p-4 border border-gray-100 rounded-xl bg-gray-50/60">
          <p className="text-xs font-jakarta font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Pago
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago(MetodoPagoFisico.EFECTIVO)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  metodoPago === MetodoPagoFisico.EFECTIVO
                    ? "bg-[#097EEC] text-white border-[#097EEC]"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Banknote className="h-4 w-4" />
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago(MetodoPagoFisico.TRANSFERENCIA)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  metodoPago === MetodoPagoFisico.TRANSFERENCIA
                    ? "bg-[#097EEC] text-white border-[#097EEC]"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Transferencia
              </button>
            </div>
          </div>

          {metodoPago === MetodoPagoFisico.EFECTIVO && (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  ref={cantidadInputRef}
                  type="number"
                  min={1}
                  max={20}
                  value={cantidadStr}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCantidadStr(value);
                    setCantidad(value ? Number(value) : 1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        metodoPago === MetodoPagoFisico.EFECTIVO &&
                        billeteInputRef.current
                      ) {
                        billeteInputRef.current.focus();
                      } else {
                        handleVender();
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billete recibido
                </label>
                <input
                  ref={billeteInputRef}
                  type="text"
                  inputMode="numeric"
                  value={billeteRecibido}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    if (rawValue === "") {
                      setBilleteRecibido("");
                      setBilleteRecibidoNum(0);
                    } else {
                      const numValue = Number(rawValue);
                      setBilleteRecibidoNum(numValue);
                      setBilleteRecibido(formatPriceInput(numValue));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleVender();
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
                  placeholder="Ej: 100.000"
                />
              </div>
              {cambio > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-green-600 font-medium">
                    Cambio: {formatCurrency(cambio)}
                  </p>
                </div>
              )}
            </div>
          )}

          {metodoPago !== MetodoPagoFisico.EFECTIVO && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={cantidadStr}
                onChange={(e) => {
                  const value = e.target.value;
                  setCantidadStr(value);
                  setCantidad(value ? Number(value) : 1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
              />
            </div>
          )}

          {/* Total */}
          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Total a pagar
            </p>
            <p className="text-2xl font-bold text-[#097EEC]">
              {formatCurrency(montoTotal)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {cantidad} × {formatCurrency(precioNumerico)}
            </p>
          </div>
        </div>

        {/* Botón confirmar venta */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleVender}
          disabled={vendiendo}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-[#097EEC] text-white hover:bg-[#0766c2] disabled:opacity-60 transition-colors shadow"
        >
          {vendiendo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {vendiendo ? "Confirmando..." : "Confirmar venta"}
        </motion.button>
      </motion.aside>

      {/* Handle de redimensionamiento — mismo patrón que admin */}
      <div
        className="hidden md:flex items-center justify-center w-3 flex-shrink-0 cursor-col-resize group select-none self-stretch"
        onMouseDown={onPanelDrag}
      >
        <div className="w-0.5 h-12 rounded-full bg-gray-200 group-hover:bg-[#097EEC] transition-colors duration-150" />
      </div>

      {/* Vista previa del ticket */}
      <motion.div
        variants={contentVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, delay: 0.1, ease: "easeInOut" }}
        className="flex-1 min-w-0 w-full mt-6 md:mt-0 md:ml-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col items-center min-h-[860px]"
      >
        <div className="w-full flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Vista previa del ticket
          </h2>

          {onBack ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </motion.button>
          ) : (
            <Link href="/admin/boleteria_fisica" passHref>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </motion.button>
            </Link>
          )}
        </div>

        {resultadoVenta && (
          <div className="w-full mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Venta #{resultadoVenta.ventaId} confirmada
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  {resultadoVenta.cantidad} boleta(s) vendida(s) por{" "}
                  {formatCurrency(resultadoVenta.montoTotal)}
                </p>
                {resultadoVenta.cambio !== null &&
                  resultadoVenta.cambio > 0 && (
                    <p className="text-xs text-green-700 mt-0.5">
                      Cambio: {formatCurrency(resultadoVenta.cambio)}
                    </p>
                  )}
                <p className="text-xs text-green-600 mt-2">
                  QR listos para imprimir. Escanea el código en la entrada para
                  validar el acceso.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de impresión manual (navegador). El agente local se dispara automáticamente al confirmar venta. */}
        <div className="w-full flex justify-end gap-3 mb-4">
          <button
            type="button"
            onClick={() => ticketRef.current?.handlePrint()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#097EEC] text-white hover:bg-[#0766c2] transition-colors shadow"
          >
            <Printer className="h-4 w-4" />
            Imprimir {qrValues.length || cantidad} ticket
            {(qrValues.length || cantidad) > 1 ? "s" : ""}
          </button>
        </div>

        <BoleteriaFisicaTicket
          ref={ticketRef}
          qrValue={qrValue}
          qrValues={qrValues.length > 0 ? qrValues : undefined}
          qrIds={qrIds.length > 0 ? qrIds : undefined}
          tipoBoleta={tipoBoleta}
          precio={String(precio)}
          fechaCompra={fechaCompra}
          cantidad={cantidad}
          esPreview
          evento={{
            nombre: evento?.nombre,
            fecha: fechaEvento,
            hora: horaEvento,
            lugar: ubicacion,
            descripcion: evento?.descripcion,
            plantillaTicketUrl: evento?.plantillaTicketUrl,
            logoPatrocinadoresUrl: evento?.logoPatrocinadoresUrl,
          }}
        />
      </motion.div>

      {/* Overlay de carga fullscreen al confirmar venta */}
      {vendiendo && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
          <p className="text-white text-lg font-medium">Confirmando venta</p>
          <p className="text-white/70 text-sm mt-1">
            Generando boletas e impresión...
          </p>
        </div>
      )}
    </div>
  );
};

export default VentaFisicaPanel;
