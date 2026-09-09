"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Inbox, RefreshCw, CalendarDays, Printer } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import EventsService from "@/services/EventsService";
import { LoteFisicoResumen } from "@/interfaces/boleteria-fisica.interface";
import { formatDisplayDate } from "@/lib/TimeZone";

const LotesFisicosManagement = () => {
  const [lotes, setLotes] = useState<LoteFisicoResumen[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarLotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await EventsService.listarLotesFisicos();
      setLotes(res.data);
    } catch {
      toast.error("No se pudo cargar el listado de lotes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarLotes();
  }, [cargarLotes]);

  const totalImpresas = lotes.reduce((acc, l) => acc + l.impresas, 0);

  return (
    <div>
      {/* Barra superior: totales + botón actualizar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">
          {lotes.length} lote{lotes.length === 1 ? "" : "s"} ·{" "}
          <span className="font-medium text-gray-700">{totalImpresas}</span>{" "}
          boleta{totalImpresas === 1 ? "" : "s"} impresa
          {totalImpresas === 1 ? "" : "s"} en total
        </p>

        <button
          onClick={cargarLotes}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
          title="Recargar lotes"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-400">Cargando lotes...</p>
        </div>
      ) : lotes.length === 0 ? (
        <div className="py-20 text-center">
          <div className="bg-gray-50 border border-gray-100 inline-flex rounded-full p-5 mb-4">
            <Inbox className="h-9 w-9 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-700">
            No hay lotes generados
          </h3>
          <p className="mt-1.5 text-sm text-gray-400">
            Los lotes se crean al configurar un evento físico o desde su panel
            de boletería.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Lote
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Evento
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Generadas
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Impresas
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Disponibles
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Avance
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {lotes.map((lote, i) => {
                const porcentaje =
                  lote.cantidadGenerada > 0
                    ? Math.round((lote.impresas / lote.cantidadGenerada) * 100)
                    : 0;
                return (
                  <motion.tr
                    key={lote.loteId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700">
                          #{lote.loteId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate max-w-[180px]">
                          {lote.eventoNombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center text-sm text-gray-600">
                      {lote.cantidadGenerada}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                        <Printer className="h-3 w-3" />
                        {lote.impresas}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center text-sm text-gray-600">
                      {lote.disponibles}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#097EEC] rounded-full transition-all"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {porcentaje}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {formatDisplayDate(lote.createdAt)}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LotesFisicosManagement;
