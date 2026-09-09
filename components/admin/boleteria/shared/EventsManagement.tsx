"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Evento,
  EventoEstado,
  EventoModalidad,
  CreateEventoDto,
} from "@/interfaces/event.interface";
import EventsService from "@/services/EventsService";
import CreateEventModal from "@/app/admin/events/CreateEventModal";
import EditEventModal from "@/app/admin/events/EditEventModal";
import {
  CalendarDays,
  PlusCircle,
  MapPin,
  Ticket,
  DollarSign,
  EyeOff,
  Eye,
  Edit,
  Smartphone,
  Monitor,
  ShoppingCart,
} from "lucide-react";

import toast from "react-hot-toast";
import { formatDisplayDate } from "@/lib/TimeZone";

interface EventsManagementProps {
  modoFisico?: boolean;
  filtroModalidad?: EventoModalidad;
  eventosMock?: Evento[];
}

const ESTADO_CONFIG: Record<EventoEstado, { label: string; color: string }> = {
  [EventoEstado.PREVENTA]: {
    label: "Preventa",
    color: "bg-amber-100 text-amber-700",
  },
  [EventoEstado.VENTA]: {
    label: "Venta",
    color: "bg-green-100 text-green-700",
  },
  [EventoEstado.CERRADO]: {
    label: "Cerrado",
    color: "bg-gray-100 text-gray-600",
  },
  [EventoEstado.CANCELADO]: {
    label: "Cancelado",
    color: "bg-red-100 text-red-600",
  },
};

const EventsManagement = ({
  modoFisico = false,
  filtroModalidad,
  eventosMock,
}: EventsManagementProps) => {
  const router = useRouter();
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Evento | null>(null);

  const isAnyModalOpen = showCreateModal || !!eventToEdit;

  useEffect(() => {
    document.body.style.overflow = isAnyModalOpen ? "hidden" : "";
    document.documentElement.style.overflow = isAnyModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (eventosMock) {
      setEvents(eventosMock);
      setLoading(false);
      return;
    }

    EventsService.getAllEventsAdmin()
      .then((res) => setEvents(res.data))
      .catch(() => toast.error("Error al cargar los eventos"))
      .finally(() => setLoading(false));
  }, [eventosMock]);

  const generarCodigos = async (eventoId: number, cantidad?: number) => {
    if (!cantidad || cantidad <= 0) return;
    try {
      const res = await EventsService.generarCodigosRegalo(eventoId, cantidad);
      toast.success(`Se generaron ${res.data.cantidad} códigos de regalo`);
    } catch {
      toast.error(
        "El evento se guardó, pero falló la generación de códigos. Puedes reintentar desde Editar.",
      );
    }
  };

  const generarLote = async (eventoId: number, cantidad?: number) => {
    if (!cantidad || cantidad <= 0) return;
    try {
      const res = await EventsService.generarLoteFisico(eventoId, {
        cantidad,
      });
      toast.success(`Lote generado: ${res.data.generadas} boletas físicas`);
    } catch {
      toast.error(
        "El evento se creó, pero falló la generación del lote. Puedes generarlo desde el panel de boletería física.",
      );
    }
  };

  const handleCreate = async (
    dto: CreateEventoDto,
    imageFile?: File,
    codigosACrear?: number,
    cantidadLote?: number,
  ) => {
    const res = await EventsService.createEvent(
      modoFisico ? { ...dto, modalidad: EventoModalidad.FISICO } : dto,
      imageFile,
    );
    const creado = res.data as unknown as Evento;
    setEvents((prev) => [creado, ...prev]);
    toast.success("Evento creado correctamente");
    if (creado.id) {
      await generarCodigos(creado.id, codigosACrear);
      if (modoFisico) await generarLote(creado.id, cantidadLote);
    }
  };

  const handleEdit = async (
    id: number,
    dto: Partial<CreateEventoDto>,
    imageFile?: File,
    codigosACrear?: number,
  ) => {
    await EventsService.updateEvent(String(id), dto, imageFile);
    await generarCodigos(id, codigosACrear);
    const updated = await EventsService.getEventById(id);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated.data : e)));
    toast.success("Evento actualizado");
  };

  const handleToggleVisibility = async (event: Evento) => {
    if (!event.id) return;
    const newVisible = event.visible === false ? true : false;
    try {
      await EventsService.setVisibility(event.id, newVisible);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, visible: newVisible } : e,
        ),
      );
      toast.success(
        newVisible ? "Evento visible en la app" : "Evento oculto de la app",
      );
    } catch {
      toast.error("Error al cambiar visibilidad del evento");
    }
  };

  const eventosFiltrados = filtroModalidad
    ? events.filter((e) => e.modalidad === filtroModalidad)
    : events;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-gray-700">
          Eventos ({eventosFiltrados.length})
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-[#097EEC] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#0562C7] active:scale-[0.98] transition-all font-medium shadow-sm shadow-blue-100"
        >
          <PlusCircle className="h-4 w-4" />
          {modoFisico ? "Crear evento físico" : "Crear evento"}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="h-36 bg-gray-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="space-y-1.5 mt-3">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-2/5" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="py-20 text-center">
          <div className="bg-gray-50 border border-gray-100 inline-flex rounded-full p-5 mb-4">
            <CalendarDays className="h-9 w-9 text-gray-300" />
          </div>

          <h3 className="text-base font-semibold text-gray-700">
            No hay eventos todavía
          </h3>

          <p className="mt-1.5 text-sm text-gray-400">
            {modoFisico
              ? "No hay eventos disponibles para venta física."
              : "Crea el primer evento para que aparezca en la app."}
          </p>

          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-[#097EEC] hover:underline font-medium"
          >
            <PlusCircle className="h-4 w-4" />
            {modoFisico ? "Crear evento físico" : "Crear evento"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventosFiltrados.map((event, i) => (
            <div
              key={event.id}
              onClick={() =>
                modoFisico &&
                event.id &&
                router.push(`/admin/boleteria_fisica/${event.id}`)
              }
              className={`border rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 group opacity-0 animate-[fadeIn_0.4s_ease-in-out_forwards] ${event.visible === false ? "border-gray-200 opacity-60" : "border-gray-100"} ${modoFisico ? "cursor-pointer" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-36 bg-gradient-to-br from-[#097EEC]/10 to-[#097EEC]/20 flex items-center justify-center relative">
                {event.imagenUrl ? (
                  <img
                    src={event.imagenUrl}
                    alt={event.nombre}
                    className={`w-full h-full object-cover ${event.visible === false ? "grayscale" : ""}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <CalendarDays className="h-10 w-10 text-[#097EEC]/40" />
                )}

                <div className="absolute top-2 right-2 flex gap-1">
                  {event.visible === false && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-800/70 text-white flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> Oculto
                    </span>
                  )}

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_CONFIG[event.estado].color}`}
                  >
                    {ESTADO_CONFIG[event.estado].label}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 truncate flex-1">
                    {event.nombre}
                  </h3>

                  {event.formatId === 1 && (
                    <span title="Formato teléfono">
                      <Smartphone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    </span>
                  )}
                  {event.formatId === 2 && (
                    <span title="Formato web">
                      <Monitor className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                  {event.descripcion}
                </p>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CalendarDays className="h-3 w-3 text-gray-300 flex-shrink-0" />

                    {formatDisplayDate(event.fechaEvento)}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="h-3 w-3 text-gray-300 flex-shrink-0" />

                    {event.ubicacion}
                  </div>

                  {/* Aforo y precio */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {!modoFisico && event.aforoTotal && (
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3 w-3 text-gray-300" />
                        {event.aforoTotal} boletas
                      </span>
                    )}

                    {event.precioBase !== undefined && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-300" />

                        {event.precioBase === 0 ? (
                          "Gratis"
                        ) : (
                          <>
                            {Number(event.precioBase).toLocaleString("es-CO")}{" "}
                            <span className="text-gray-400">COP</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {modoFisico ? (
                    <div className="w-full flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventToEdit(event);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium"
                        title="Editar evento"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.id)
                            router.push(`/admin/boleteria_fisica/${event.id}`);
                        }}
                        className="flex-[1.5] flex items-center justify-center gap-2 bg-[#097EEC] text-white text-sm px-3 py-2 rounded-lg hover:bg-[#0562C7] active:scale-[0.98] transition-all font-medium shadow-sm shadow-blue-100"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Vender física
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setEventToEdit(event)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(event)}
                        className={`p-1.5 rounded-md transition-colors ${
                          event.visible === false
                            ? "text-gray-400 hover:text-green-600 hover:bg-green-50"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        title={
                          event.visible === false
                            ? "Mostrar en app"
                            : "Ocultar de app"
                        }
                      >
                        {event.visible === false ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateEventModal
          modoFisico={modoFisico}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {eventToEdit && (
        <EditEventModal
          event={eventToEdit}
          modoFisico={modoFisico}
          onClose={() => setEventToEdit(null)}
          onSubmit={handleEdit}
        />
      )}
    </>
  );
};

export default EventsManagement;
