"use client";

import { useState, useEffect } from "react";
import EventsService from "@/services/EventsService";
import { Evento, EventoEstado } from "@/interfaces/event.interface";
import {
  CalendarDays,
  MapPin,
  Ticket,
  DollarSign,
  Percent,
  Save,
  Loader2,
  Settings,
  AlertCircle,
  Users,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const ESTADO_CONFIG: Record<
  EventoEstado,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  [EventoEstado.PREVENTA]: {
    label: "Preventa",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  [EventoEstado.VENTA]: {
    label: "Venta",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  [EventoEstado.CERRADO]: {
    label: "Cerrado",
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-400",
  },
  [EventoEstado.CANCELADO]: {
    label: "Cancelado",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
};

const formatCurrency = (value?: number) =>
  value !== undefined
    ? new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(value)
    : "—";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Formatea número con puntos como separador de miles (es-CO)
const formatNumberInput = (value: number | undefined): string => {
  if (value === undefined || value === null || isNaN(value)) return "";
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(
    value,
  );
};

// Quita todo excepto dígitos y parsea
const parseNumberInput = (raw: string): number | undefined => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  return Number(digits);
};

const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const SCHEDULE_INFO = [
  {
    dias: "Jueves · Sábado · Domingo",
    regla: "Fijo",
    valor: "$600 COP por boleta",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    dias: "Viernes",
    regla: "Porcentaje",
    valor: "6% del precio de la boleta",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    dias: "Lunes · Martes · Miércoles",
    regla: "Sin comisión",
    valor: "$0",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
];

interface EditableEvent extends Evento {
  comisionEstimada?: number;
  _estado: EventoEstado;
  _comision?: number;
  _precioBase?: number;
  _aforoTotal?: number;
  _aforoDisponible?: number;
  _precioBaseText?: string;
  _aforoTotalText?: string;
  _aforoDisponibleText?: string;
  _comisionText?: string;
  _saving?: boolean;
  _dirty?: boolean;
}

const ConfiguracionManagement = () => {
  const [events, setEvents] = useState<EditableEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EventsService.getAllEventsAdmin()
      .then((res) =>
        setEvents(
          (res.data as any[]).map((e) => ({
            ...e,
            _estado: e.estado,
            _comision: e.comision,
            _precioBase: e.precioBase,
            _aforoTotal: e.aforoTotal,
            _aforoDisponible: e.aforoDisponible,
            _precioBaseText: formatNumberInput(e.precioBase),
            _aforoTotalText: formatNumberInput(e.aforoTotal),
            _aforoDisponibleText: formatNumberInput(e.aforoDisponible),
            _comisionText: formatNumberInput(e.comision),
            comisionEstimada: e.comisionEstimada,
          })),
        ),
      )
      .catch(() => toast.error("Error al cargar eventos"))
      .finally(() => setLoading(false));
  }, []);

  const markDirty = (prev: EditableEvent[], id: number): EditableEvent[] =>
    prev.map((e) => (e.id === id ? { ...e, _dirty: true } : e));

  const handleEstadoChange = (id: number, nuevoEstado: EventoEstado) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, _estado: nuevoEstado, _dirty: true } : e,
      ),
    );
  };

  const handleComisionChange = (id: number, raw: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              _comision: parseNumberInput(raw),
              _comisionText: raw,
              _dirty: true,
            }
          : e,
      ),
    );
  };

  const handleComisionBlur = (id: number) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, _comisionText: formatNumberInput(e._comision) }
          : e,
      ),
    );
  };

  const handlePrecioChange = (id: number, raw: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              _precioBase: parseNumberInput(raw),
              _precioBaseText: raw,
              _dirty: true,
            }
          : e,
      ),
    );
  };

  const handlePrecioBlur = (id: number) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, _precioBaseText: formatNumberInput(e._precioBase) }
          : e,
      ),
    );
  };

  const handleAforoChange = (id: number, raw: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              _aforoTotal: parseNumberInput(raw),
              _aforoTotalText: raw,
              _dirty: true,
            }
          : e,
      ),
    );
  };

  const handleAforoBlur = (id: number) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, _aforoTotalText: formatNumberInput(e._aforoTotal) }
          : e,
      ),
    );
  };

  const handleAforoDisponibleChange = (id: number, raw: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              _aforoDisponible: parseNumberInput(raw),
              _aforoDisponibleText: raw,
              _dirty: true,
            }
          : e,
      ),
    );
  };

  const handleAforoDisponibleBlur = (id: number) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              _aforoDisponibleText: formatNumberInput(e._aforoDisponible),
            }
          : e,
      ),
    );
  };

  const handleSave = async (event: EditableEvent) => {
    if (!event.id) return;

    const dto: Partial<Evento> = {};
    if (event._estado !== event.estado) dto.estado = event._estado;
    if (event._comision !== event.comision) dto.comision = event._comision;
    if (event._precioBase !== event.precioBase)
      dto.precioBase = event._precioBase;
    if (event._aforoTotal !== event.aforoTotal)
      dto.aforoTotal = event._aforoTotal;
    if (event._aforoDisponible !== event.aforoDisponible)
      dto.aforoDisponible = event._aforoDisponible;

    if (Object.keys(dto).length === 0) {
      toast("Sin cambios para guardar");
      return;
    }

    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, _saving: true } : e)),
    );

    try {
      await EventsService.updateEvent(String(event.id), dto);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? {
                ...e,
                estado: e._estado,
                comision: e._comision,
                precioBase: e._precioBase,
                aforoTotal: e._aforoTotal,
                aforoDisponible: e._aforoDisponible,
                _precioBaseText: formatNumberInput(e._precioBase),
                _aforoTotalText: formatNumberInput(e._aforoTotal),
                _aforoDisponibleText: formatNumberInput(e._aforoDisponible),
                _comisionText: formatNumberInput(e._comision),
                _dirty: false,
                _saving: false,
              }
            : e,
        ),
      );
      toast.success(`"${event.nombre}" actualizado`);
    } catch {
      toast.error("Error al guardar cambios");
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, _saving: false } : e)),
      );
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="bg-gray-50 border border-gray-100 inline-flex rounded-full p-5 mb-4">
          <Settings className="h-9 w-9 text-gray-300" />
        </div>
        <h3 className="text-base font-semibold text-gray-700">
          No hay eventos
        </h3>
        <p className="mt-1.5 text-sm text-gray-400">
          Crea un evento primero para gestionar su configuración.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="h-4 w-4 text-[#097EEC]" />
        <h3 className="text-sm font-semibold text-gray-700">
          Configuración de eventos
        </h3>
        <span className="text-xs text-gray-400">({events.length})</span>
      </div>

      {/* Banner comisión SUAREC */}
      <div className="rounded-xl border border-[#097EEC]/20 bg-[#097EEC]/5 p-4 mb-2">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-[#097EEC] shrink-0" />
          <span className="text-sm font-semibold text-[#097EEC]">
            Comisión SUAREC por boleta vendida — varía según el día
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_INFO.map((s) => (
            <div
              key={s.dias}
              className={`flex flex-col px-3 py-2 rounded-lg border text-xs ${s.color}`}
            >
              <span className="font-semibold">{s.dias}</span>
              <span className="mt-0.5 opacity-80">
                {s.regla} · <strong>{s.valor}</strong>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#097EEC]/70">
          El campo <strong>Comisión (%)</strong> en cada evento es un porcentaje
          de ganancia adicional para el organizador, independiente de la
          comisión SUAREC. El valor de <strong>Comisión estimada hoy</strong> es
          lo que SUAREC cobra por cada boleta vendida este día.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {events
          .sort(
            (a, b) =>
              new Date(a.fechaEvento).getTime() -
              new Date(b.fechaEvento).getTime(),
          )
          .map((event, i) => {
            const ec = ESTADO_CONFIG[event._estado];
            const vendidas =
              (event._aforoTotal ?? event.aforoTotal ?? 0) -
              (event.aforoDisponible ?? 0);
            const aforoTotal = event._aforoTotal ?? event.aforoTotal ?? 0;
            const porcentaje =
              aforoTotal > 0 ? Math.round((vendidas / aforoTotal) * 100) : 0;
            const isDirty = event._dirty;
            const precioActual = event._precioBase ?? event.precioBase ?? 0;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all bg-gradient-to-bl from-[#097EEC]/[0.07] via-white to-white ${
                  isDirty
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : "border-gray-100"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-800 truncate">
                      {event.nombre}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(event.fechaEvento)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.ubicacion}
                      </span>
                    </div>
                  </div>
                  {isDirty && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ml-2">
                      <AlertCircle className="h-3 w-3" />
                      Sin guardar
                    </span>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Precio boleta
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">
                      {formatCurrency(event._precioBase ?? event.precioBase)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Aforo
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">
                      {event._aforoTotal ?? event.aforoTotal ?? "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                      Vendidas
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-0.5">
                      {vendidas} ({porcentaje}%)
                    </p>
                  </div>
                  <div className="bg-[#097EEC]/5 border border-[#097EEC]/15 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-[#097EEC]/70 uppercase tracking-wide">
                      Comisión hoy
                    </p>
                    <p className="text-sm font-semibold text-[#097EEC] mt-0.5">
                      {event.comisionEstimada !== undefined
                        ? formatCurrency(event.comisionEstimada)
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                  <div
                    className={`h-1.5 rounded-full ${
                      porcentaje >= 100
                        ? "bg-red-400"
                        : porcentaje >= 75
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(porcentaje, 100)}%` }}
                  />
                </div>

                {/* Estado — pills visuales */}
                <div className="mb-4">
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Estado del evento
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.values(EventoEstado).map((est) => {
                      const cfg = ESTADO_CONFIG[est];
                      const active = event._estado === est;
                      return (
                        <button
                          key={est}
                          onClick={() => handleEstadoChange(event.id!, est)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            active
                              ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm ring-1 ring-offset-1 ring-offset-white`
                              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                          } ${active && est === EventoEstado.VENTA ? "ring-emerald-300" : ""} ${
                            active && est === EventoEstado.PREVENTA
                              ? "ring-amber-300"
                              : ""
                          } ${active && est === EventoEstado.CERRADO ? "ring-gray-300" : ""} ${
                            active && est === EventoEstado.CANCELADO
                              ? "ring-red-300"
                              : ""
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Campos editables grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Precio */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Precio base
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={event._precioBaseText ?? ""}
                        onChange={(e) =>
                          handlePrecioChange(event.id!, e.target.value)
                        }
                        onBlur={() => handlePrecioBlur(event.id!)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white/70 backdrop-blur-sm focus:bg-white focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Aforo */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Aforo total
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={event._aforoTotalText ?? ""}
                        onChange={(e) =>
                          handleAforoChange(event.id!, e.target.value)
                        }
                        onBlur={() => handleAforoBlur(event.id!)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white/70 backdrop-blur-sm focus:bg-white focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Boletas disponibles */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Boletas disponibles
                    </label>
                    <div className="relative">
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={event._aforoDisponibleText ?? ""}
                        onChange={(e) =>
                          handleAforoDisponibleChange(event.id!, e.target.value)
                        }
                        onBlur={() => handleAforoDisponibleBlur(event.id!)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white/70 backdrop-blur-sm focus:bg-white focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Comisión organizador */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      % adicional organizador
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        disabled
                        value={event._comisionText ?? ""}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                        placeholder="0"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400 leading-tight">
                      Informativo · no afecta el cobro SUAREC
                    </p>
                  </div>
                </div>

                {/* Guardar */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleSave(event)}
                    disabled={event._saving || !isDirty}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isDirty
                        ? "bg-[#097EEC] text-white hover:bg-[#0562C7] active:scale-[0.98] shadow-md shadow-blue-100"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {event._saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {event._saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
};

export default ConfiguracionManagement;
