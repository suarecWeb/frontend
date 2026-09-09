"use client";

import { useEffect } from "react";
import { X, TrendingUp, Ticket, Receipt, BadgePercent } from "lucide-react";
import { motion } from "framer-motion";
import { Evento } from "@/interfaces/event.interface";
import {
  TransaccionBoleta,
  TransaccionEstado,
} from "@/interfaces/boleta.interface";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

// ── Modal de estadísticas individuales de un evento digital ─────────────────
// Recibe el evento y las transacciones ya cargadas por el padre (la página de
// estadísticas ya las trae todas) — no hace falta llamar al backend de nuevo.
// Solo se tienen en cuenta transacciones APROBADAS, igual que el KPI global
// de "Recaudado", para que la suma de los eventos cuadre con ese total.
// La comisión no se muestra: nunca se implementó en el monto de la venta.

interface EstadisticasEventoModalProps {
  evento: Evento;
  transacciones: TransaccionBoleta[];
  onClose: () => void;
}

const EstadisticasEventoModal = ({
  evento,
  transacciones,
  onClose,
}: EstadisticasEventoModalProps) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  const aprobadas = transacciones.filter(
    (t) =>
      t.eventoId === evento.id && t.estadoPago === TransaccionEstado.APROBADO,
  );

  const recaudado = aprobadas.reduce((sum, t) => sum + (t.monto || 0), 0);
  const boletasVendidas = aprobadas.reduce(
    (sum, t) => sum + (t.cantidad || 0),
    0,
  );
  const valorBoletas = aprobadas.reduce(
    (sum, t) => sum + (t.precioPorBoleta || 0) * (t.cantidad || 0),
    0,
  );
  // Costo de servicio: cargo SUAREC aplicado a cada boleta vendida
  const costoServicio = aprobadas.reduce(
    (sum, t) => sum + (t.cargoPorBoleta || 0) * (t.cantidad || 0),
    0,
  );

  const total = evento.aforoTotal ?? 0;
  const disponibles = evento.aforoDisponible ?? 0;

  // Precios unitarios: los configurados en el evento; si no vienen, se toman
  // de la primera transacción aprobada (guardan el valor del momento de la compra)
  const precioUnitario =
    evento.precioBase ?? aprobadas[0]?.precioPorBoleta ?? 0;
  const cargoUnitario = evento.cargoSuarec ?? aprobadas[0]?.cargoPorBoleta ?? 0;

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
              Estadísticas del evento
            </p>
            <p className="text-base font-semibold text-gray-800">
              {evento.nombre}
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
          {/* Precios unitarios configurados en el evento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Ticket className="h-3.5 w-3.5 text-gray-400" />
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
                  Precio por boleta
                </p>
              </div>
              <p className="text-base font-semibold text-gray-700">
                {formatCOP(precioUnitario)}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BadgePercent className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-[11px] text-blue-600 font-medium uppercase tracking-wider">
                  Costo de servicio por boleta
                </p>
              </div>
              <p className="text-base font-semibold text-blue-700">
                {formatCOP(cargoUnitario)}
              </p>
            </div>
          </div>

          {aprobadas.length === 0 ? (
            <div className="py-10 text-center">
              <TrendingUp className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                Este evento aún no registra ventas aprobadas
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Las estadísticas aparecerán aquí cuando se venda la primera
                boleta
              </p>
            </div>
          ) : (
            <>
              {/* Tarjeta principal: recaudo del evento */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider">
                    Recaudado por este evento
                  </p>
                </div>
                <p className="text-xl font-bold text-emerald-700">
                  {formatCOP(recaudado)}
                </p>
                <p className="text-[11px] text-emerald-500 mt-0.5">
                  {boletasVendidas}{" "}
                  {boletasVendidas === 1
                    ? "boleta vendida"
                    : "boletas vendidas"}{" "}
                  en {aprobadas.length}{" "}
                  {aprobadas.length === 1 ? "venta" : "ventas"}
                </p>
              </div>

              {/* Desglose del recaudo */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5" />
                    Valor de las boletas
                  </span>
                  <span className="font-medium text-gray-700">
                    {formatCOP(valorBoletas)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <BadgePercent className="h-3.5 w-3.5" />
                    Costo de servicio reunido
                    <span className="text-[10px] text-gray-300">
                      ({formatCOP(cargoUnitario)} × {boletasVendidas})
                    </span>
                  </span>
                  <span className="font-medium text-gray-700">
                    {formatCOP(costoServicio)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" />
                    Boletas vendidas
                  </span>
                  <span className="font-medium text-gray-700">
                    {boletasVendidas} / {total}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Boletas disponibles</span>
                  <span
                    className={`font-medium ${disponibles === 0 ? "text-red-500" : "text-gray-700"}`}
                  >
                    {disponibles}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Número de ventas</span>
                  <span className="font-medium text-gray-700">
                    {aprobadas.length}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Valor de las boletas + costo de servicio = recaudado del evento.
                La suma de todos los eventos equivale al recaudo global de esta
                página.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EstadisticasEventoModal;
