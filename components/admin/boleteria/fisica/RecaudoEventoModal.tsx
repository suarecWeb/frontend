"use client";

import { useState, useEffect } from "react";
import { X, Banknote, Landmark, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import EventsService from "@/services/EventsService";
import { RecaudoEventoFisicoResponse } from "@/interfaces/ventaFisica.interface";

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

// ── Modal de ganancias por evento ─────────────────────────────────────────────
// Recibe eventoId y eventoNombre por prop (ya los tiene la card de estadísticas,
// no hace falta volver a pedirlos) — solo se llama al backend para traer los
// agregados de dinero, que no vienen en el resumen de eventos.

interface RecaudoEventoModalProps {
  eventoId: number;
  eventoNombre: string;
  disponibles: number;
  vendidas: number;
  total: number;
  onClose: () => void;
}

const RecaudoEventoModal = ({
  eventoId,
  eventoNombre,
  disponibles,
  vendidas,
  total,
  onClose,
}: RecaudoEventoModalProps) => {
  const [recaudo, setRecaudo] = useState<RecaudoEventoFisicoResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    EventsService.getRecaudoEventoFisico(eventoId)
      .then((res) => setRecaudo(res.data))
      .catch(() =>
        toast.error("No se pudieron cargar las ganancias del evento"),
      )
      .finally(() => setLoading(false));
  }, [eventoId]);

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
              Ganancias del evento
            </p>
            <p className="text-base font-semibold text-gray-800">
              {eventoNombre}
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
          {loading ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#097EEC] border-t-transparent mx-auto mb-2" />
              <p className="text-xs text-gray-400">Cargando ganancias...</p>
            </div>
          ) : !recaudo ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No se pudo cargar la información
            </p>
          ) : recaudo.totalVentas === 0 ? (
            <div className="py-10 text-center">
              <TrendingUp className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                Este evento aún no registra ventas
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Las ganancias aparecerán aquí cuando se venda la primera boleta
              </p>
            </div>
          ) : (
            <>
              {/* Totales de dinero */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Recaudado</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCOP(recaudo.recaudado)}
                  </span>
                </div>
                {/* La comisión no se muestra en boletería física (regla acordada,
                    igual que en el modal de detalle de venta):
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Comisión</span>
                  <span className="font-medium text-gray-700">
                    {formatCOP(recaudo.comisionTotal)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Neto</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCOP(recaudo.neto)}
                  </span>
                </div>
                */}
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Valor de la boleta</span>
                  <span className="font-medium text-gray-700">
                    {formatCOP(recaudo.precioBase)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Boletas vendidas</span>
                  <span className="font-medium text-gray-700">
                    {vendidas} / {total}
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
                    {recaudo.totalVentas}
                  </span>
                </div>
              </div>

              {/* Desglose por método de pago */}
              <div>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2">
                  Desglose por método de pago
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider">
                        Efectivo
                      </p>
                    </div>
                    <p className="text-base font-semibold text-emerald-700">
                      {formatCOP(recaudo.efectivo.monto)}
                    </p>
                    <p className="text-[11px] text-emerald-500 mt-0.5">
                      {recaudo.efectivo.ventas}{" "}
                      {recaudo.efectivo.ventas === 1 ? "venta" : "ventas"}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Landmark className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-[11px] text-blue-600 font-medium uppercase tracking-wider">
                        Transferencia
                      </p>
                    </div>
                    <p className="text-base font-semibold text-blue-700">
                      {formatCOP(recaudo.transferencia.monto)}
                    </p>
                    <p className="text-[11px] text-blue-500 mt-0.5">
                      {recaudo.transferencia.ventas}{" "}
                      {recaudo.transferencia.ventas === 1 ? "venta" : "ventas"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RecaudoEventoModal;
