"use client";

import { useState, useEffect } from "react";
import {
  Printer,
  Usb,
  Save,
  RotateCcw,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import EventsService from "@/services/EventsService";
import { Evento, EventoModalidad } from "@/interfaces/event.interface";

const STORAGE_KEY = "suarec-boleteria-fisica-config";

interface FisicaConfig {
  printerName: string;
  agentUrl: string;
  paperWidth: number;
  copies: number;
}

const DEFAULT_CONFIG: FisicaConfig = {
  printerName: "POS-80C",
  agentUrl: "http://localhost:3001",
  paperWidth: 80,
  copies: 1,
};

const ConfiguracionFisicaManagement = () => {
  const [config, setConfig] = useState<FisicaConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  // Plantilla de boleta por evento
  const [eventosFisicos, setEventosFisicos] = useState<Evento[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [eventoSeleccionadoId, setEventoSeleccionadoId] = useState<
    number | null
  >(null);
  const [archivoPlantilla, setArchivoPlantilla] = useState<File | null>(null);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);

  // Logo de patrocinadores por evento
  const [archivoLogoPatrocinadores, setArchivoLogoPatrocinadores] =
    useState<File | null>(null);
  const [guardandoLogo, setGuardandoLogo] = useState(false);

  const eventoSeleccionado = eventosFisicos.find(
    (e) => e.id === eventoSeleccionadoId,
  );
  const previewPlantillaUrl = archivoPlantilla
    ? URL.createObjectURL(archivoPlantilla)
    : eventoSeleccionado?.plantillaTicketUrl || "/tickets/base.png";
  const previewLogoUrl = archivoLogoPatrocinadores
    ? URL.createObjectURL(archivoLogoPatrocinadores)
    : eventoSeleccionado?.logoPatrocinadoresUrl || null;

  useEffect(() => {
    EventsService.getAllEventsAdmin()
      .then((res) => {
        const fisicos = res.data.filter(
          (e) => e.modalidad === EventoModalidad.FISICO,
        );
        setEventosFisicos(fisicos);
        if (fisicos.length > 0 && fisicos[0].id) {
          setEventoSeleccionadoId(fisicos[0].id);
        }
      })
      .catch(() => toast.error("Error al cargar los eventos físicos"))
      .finally(() => setCargandoEventos(false));
  }, []);

  const handleGuardarPlantilla = async () => {
    if (!eventoSeleccionadoId || !archivoPlantilla) return;

    setGuardandoPlantilla(true);
    try {
      const res = await EventsService.updateEvent(
        String(eventoSeleccionadoId),
        {},
        undefined,
        archivoPlantilla,
      );
      setEventosFisicos((prev) =>
        prev.map((e) => (e.id === eventoSeleccionadoId ? res.data : e)),
      );
      setArchivoPlantilla(null);
      toast.success("Plantilla de boleta actualizada");
    } catch {
      toast.error("No se pudo guardar la plantilla de boleta");
    } finally {
      setGuardandoPlantilla(false);
    }
  };

  const handleRestaurarPlantilla = async () => {
    if (!eventoSeleccionadoId) return;

    setGuardandoPlantilla(true);
    try {
      const res = await EventsService.updateEvent(
        String(eventoSeleccionadoId),
        { removePlantillaTicket: true },
      );
      setEventosFisicos((prev) =>
        prev.map((e) => (e.id === eventoSeleccionadoId ? res.data : e)),
      );
      setArchivoPlantilla(null);
      toast.success("Plantilla restaurada a la boleta por defecto");
    } catch {
      toast.error("No se pudo restaurar la plantilla por defecto");
    } finally {
      setGuardandoPlantilla(false);
    }
  };

  const handleGuardarLogoPatrocinadores = async () => {
    if (!eventoSeleccionadoId || !archivoLogoPatrocinadores) return;

    setGuardandoLogo(true);
    try {
      const res = await EventsService.updateEvent(
        String(eventoSeleccionadoId),
        {},
        undefined,
        undefined,
        archivoLogoPatrocinadores,
      );
      setEventosFisicos((prev) =>
        prev.map((e) => (e.id === eventoSeleccionadoId ? res.data : e)),
      );
      setArchivoLogoPatrocinadores(null);
      toast.success("Logo de patrocinadores actualizado");
    } catch {
      toast.error("No se pudo guardar el logo de patrocinadores");
    } finally {
      setGuardandoLogo(false);
    }
  };

  const handleQuitarLogoPatrocinadores = async () => {
    if (!eventoSeleccionadoId) return;

    setGuardandoLogo(true);
    try {
      const res = await EventsService.updateEvent(
        String(eventoSeleccionadoId),
        { removeLogoPatrocinadores: true },
      );
      setEventosFisicos((prev) =>
        prev.map((e) => (e.id === eventoSeleccionadoId ? res.data : e)),
      );
      setArchivoLogoPatrocinadores(null);
      toast.success("Logo de patrocinadores eliminado");
    } catch {
      toast.error("No se pudo eliminar el logo de patrocinadores");
    } finally {
      setGuardandoLogo(false);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FisicaConfig>;
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast.success("Configuración guardada localmente");
    } catch {
      toast.error("No se pudo guardar la configuración");
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    toast("Configuración restaurada por defecto");
  };

  if (!loaded) return null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Printer className="h-5 w-5 text-[#097EEC]" />
        <h2 className="text-lg font-semibold text-gray-900">
          Configuración de impresión
        </h2>
      </div>

      <div className="space-y-4 bg-white rounded-xl border border-gray-100 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la impresora térmica
          </label>
          <input
            type="text"
            value={config.printerName}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, printerName: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL del agente de impresión local
          </label>
          <div className="relative">
            <Usb className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={config.agentUrl}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, agentUrl: e.target.value }))
              }
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Debe coincidir con el servidor local que recibe la imagen del ticket
            para imprimir.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ancho del papel (mm)
            </label>
            <input
              type="number"
              min={58}
              max={120}
              value={config.paperWidth}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  paperWidth: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Copias por defecto
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.copies}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  copies: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#097EEC] text-white hover:bg-[#0562C7] transition-colors shadow"
          >
            <Save className="h-4 w-4" />
            Guardar configuración
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </motion.button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 mt-10">
        <ImageIcon className="h-5 w-5 text-[#097EEC]" />
        <h2 className="text-lg font-semibold text-gray-900">
          Plantilla de boleta por evento
        </h2>
      </div>

      <div className="space-y-4 bg-white rounded-xl border border-gray-100 p-6">
        {cargandoEventos ? (
          <p className="text-sm text-gray-400">Cargando eventos físicos...</p>
        ) : eventosFisicos.length === 0 ? (
          <p className="text-sm text-gray-400">
            No hay eventos físicos creados todavía.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Evento
              </label>
              <select
                value={eventoSeleccionadoId ?? ""}
                onChange={(e) => {
                  setEventoSeleccionadoId(Number(e.target.value));
                  setArchivoPlantilla(null);
                  setArchivoLogoPatrocinadores(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#097EEC] text-sm bg-white"
              >
                {eventosFisicos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-[260px] h-[602px] shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewPlantillaUrl}
                  alt="Vista previa de la plantilla de boleta"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-xs text-gray-500">
                  {eventoSeleccionado?.plantillaTicketUrl
                    ? "Este evento usa una plantilla personalizada."
                    : "Este evento usa la plantilla por defecto (base.png)."}
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva imagen de plantilla
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      setArchivoPlantilla(e.target.files?.[0] ?? null)
                    }
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-[#097EEC] file:text-sm file:font-medium hover:file:bg-blue-100"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGuardarPlantilla}
                    disabled={!archivoPlantilla || guardandoPlantilla}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#097EEC] text-white hover:bg-[#0562C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
                  >
                    <Upload className="h-4 w-4" />
                    Guardar plantilla
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRestaurarPlantilla}
                    disabled={
                      !eventoSeleccionado?.plantillaTicketUrl ||
                      guardandoPlantilla
                    }
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar por defecto
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mt-4 mb-3">
                Logo de patrocinadores
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-[260px] h-[121px] shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {previewLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewLogoUrl}
                      alt="Vista previa del logo de patrocinadores"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <p className="text-xs text-gray-400 text-center px-3">
                      Sin logo — el espacio queda en blanco
                    </p>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-xs text-gray-500">
                    Recomendado ~892 × 413 px, se ubica debajo de
                    &quot;PATROCINAN&quot; en la boleta impresa.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nueva imagen de patrocinadores
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        setArchivoLogoPatrocinadores(
                          e.target.files?.[0] ?? null,
                        )
                      }
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-[#097EEC] file:text-sm file:font-medium hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGuardarLogoPatrocinadores}
                      disabled={!archivoLogoPatrocinadores || guardandoLogo}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#097EEC] text-white hover:bg-[#0562C7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
                    >
                      <Upload className="h-4 w-4" />
                      Guardar logo
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleQuitarLogoPatrocinadores}
                      disabled={
                        !eventoSeleccionado?.logoPatrocinadoresUrl ||
                        guardandoLogo
                      }
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Quitar logo
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfiguracionFisicaManagement;
