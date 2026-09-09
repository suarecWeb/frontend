"use client";

import { useState, useEffect } from "react";
import { Evento } from "@/interfaces/event.interface";
import EventsService from "@/services/EventsService";
import { PlusCircle, Loader2, Ticket, Package } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface LotesFisicosPanelProps {
  evento?: Evento;
}

const contentVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export const LotesFisicosPanel = ({ evento }: LotesFisicosPanelProps) => {
  const [cantidadLote, setCantidadLote] = useState<string>("1000");
  const [generandoLote, setGenerandoLote] = useState(false);
  const [disponibles, setDisponibles] = useState<number | null>(null);
  const [ultimoLote, setUltimoLote] = useState<number | null>(null);

  useEffect(() => {
    if (!evento?.id) return;
    const eventoId = evento.id;

    setDisponibles(null);
    setUltimoLote(null);

    const cargarDisponibles = async () => {
      try {
        const res =
          await EventsService.contarBoletasFisicasDisponibles(eventoId);
        setDisponibles(res.data.disponibles);
      } catch {
        setDisponibles(null);
      }
    };

    const cargarUltimoLote = async () => {
      try {
        const res = await EventsService.obtenerUltimoLoteFisico(eventoId);
        const cantidad = res.data.cantidadGenerada;
        setUltimoLote(cantidad);
        if (cantidad) {
          setCantidadLote(String(cantidad));
        }
      } catch {
        setUltimoLote(null);
      }
    };

    cargarDisponibles();
    cargarUltimoLote();
  }, [evento]);

  const handleGenerarLote = async () => {
    if (!evento?.id) {
      toast.error("No hay un evento seleccionado");
      return;
    }

    const cantidad = Number(cantidadLote);
    if (!cantidad || cantidad < 1) {
      toast.error("Ingresa una cantidad válida para el lote");
      return;
    }

    setGenerandoLote(true);
    try {
      const res = await EventsService.generarLoteFisico(evento.id, {
        cantidad,
      });
      toast.success(
        `Lote generado: ${res.data.generadas} boletas (lote #${res.data.loteId})`,
      );
      setUltimoLote(res.data.generadas);
      const conteo = await EventsService.contarBoletasFisicasDisponibles(
        evento.id,
      );
      setDisponibles(conteo.data.disponibles);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Error al generar el lote de boletas físicas",
      );
    } finally {
      setGenerandoLote(false);
    }
  };

  return (
    <motion.div
      variants={contentVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-[#097EEC]/10 rounded-lg">
          <Package className="h-5 w-5 text-[#097EEC]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Lotes de boletas físicas
          </h2>
          <p className="text-sm text-gray-500">
            Generá o ampliá el lote de boletas disponibles para este evento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de control del lote */}
        <div className="lg:col-span-1 p-5 bg-[#097EEC]/5 border border-[#097EEC]/20 rounded-xl h-fit">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="h-4 w-4 text-[#097EEC]" />
            <p className="text-sm font-semibold text-gray-800">
              Generar nuevo lote
            </p>
          </div>

          {ultimoLote !== null && (
            <p className="text-xs text-gray-500 mb-3">
              Último lote generado:{" "}
              <span className="font-medium text-gray-700">
                {ultimoLote} boletas
              </span>
            </p>
          )}

          {disponibles !== null && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Boletas disponibles
              </p>
              <p className="text-2xl font-bold text-[#097EEC]">{disponibles}</p>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad del lote
          </label>
          <input
            type="number"
            min={1}
            max={50000}
            value={cantidadLote}
            onChange={(e) => setCantidadLote(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
            placeholder="Cantidad"
          />

          {disponibles !== null && disponibles > 5 && (
            <p className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
              Quedan {disponibles} boletas disponibles. Solo podés generar un
              nuevo lote cuando queden 5 o menos.
            </p>
          )}
          {disponibles !== null && disponibles <= 5 && (
            <p className="mt-3 text-xs text-green-600 bg-green-50 p-2 rounded-lg">
              Quedan {disponibles} boletas disponibles. Ya podés generar un
              nuevo lote.
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerarLote}
            disabled={generandoLote || disponibles === null || disponibles > 5}
            className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60 transition-colors"
          >
            {generandoLote ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {generandoLote ? "Generando..." : "Generar lote"}
          </motion.button>
        </div>

        {/* Info / ayuda */}
        <div className="lg:col-span-2 p-5 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-start gap-3">
            <Ticket className="h-5 w-5 text-[#097EEC] mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                ¿Cómo funcionan los lotes?
              </p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Los lotes crean boletas físicas con QR únicos que quedan
                disponibles para la venta en taquilla. Cuando el evento tiene 5
                o menos boletas disponibles, se habilita la opción de generar un
                nuevo lote para no quedarse sin stock.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-500 list-disc list-inside">
                <li>Cada lote queda registrado con su cantidad y fecha.</li>
                <li>
                  Las boletas generadas aparecen como disponibles
                  inmediatamente.
                </li>
                <li>El input sugiere la cantidad del último lote generado.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LotesFisicosPanel;
