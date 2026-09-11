"use client";

import { useCallback, useEffect, useState } from "react";
import { PlusCircle, Images } from "lucide-react";
import toast from "react-hot-toast";
import {
  BannerSlide,
  CreateBannerSlideDto,
  UpdateBannerSlideDto,
  MAX_ACTIVE_BANNER_SLIDES,
} from "@/interfaces/banner-slide.interface";
import { Evento } from "@/interfaces/event.interface";
import BannerSlidesService from "@/services/BannerSlidesService";
import BannerSlideCard from "./BannerSlideCard";
import BannerSlidesPreview from "./BannerSlidesPreview";
import BannerSlideFormModal from "./BannerSlideFormModal";

/** Extrae el mensaje que devuelve el backend (ej. "Máximo 5 slides activos").
 *  Sin esto el admin vería un genérico "algo salió mal" y no sabría por qué. */
const mensajeDeError = (error: unknown, fallback: string): string => {
  const apiError = error as { response?: { data?: { message?: string } } };
  return apiError?.response?.data?.message || fallback;
};

const BannerSlidesManagement = () => {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [slideEnEdicion, setSlideEnEdicion] = useState<BannerSlide | null>(
    null,
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const activos = slides.filter((s) => s.isActive).length;

  const cargarSlides = useCallback(async () => {
    try {
      const { data } = await BannerSlidesService.getAllAdmin();
      setSlides(data);
    } catch (error) {
      toast.error(mensajeDeError(error, "Error al cargar los slides"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSlides();
    // Los eventos alimentan el desplegable del formulario. Si fallan, el resto
    // de la pantalla sigue funcionando: solo no se podrán enlazar eventos.
    // El endpoint vive en banner-slides, no en events: la regla de qué evento
    // es enlazable pertenece a este módulo y el backend la aplica, no el panel.
    BannerSlidesService.getEventosEnlazables()
      .then(({ data }) => setEventos(data))
      .catch(() => toast.error("No se pudieron cargar los eventos"));
  }, [cargarSlides]);

  // ── Acciones ───────────────────────────────────────────────────────────────

  const handleSubmit = async (
    dto: CreateBannerSlideDto | UpdateBannerSlideDto,
    imageFile?: File,
  ) => {
    try {
      if (slideEnEdicion) {
        await BannerSlidesService.update(slideEnEdicion.id, dto, imageFile);
        toast.success("Slide actualizado");
      } else {
        await BannerSlidesService.create(
          dto as CreateBannerSlideDto,
          imageFile as File,
        );
        toast.success("Slide creado");
      }
      cerrarModal();
      await cargarSlides();
    } catch (error) {
      // El backend rechaza el 6º activo con 400 y un mensaje claro; se muestra
      // tal cual para que el admin entienda el límite.
      toast.error(mensajeDeError(error, "No se pudo guardar el slide"));
    }
  };

  const handleToggleActive = async (slide: BannerSlide) => {
    try {
      await BannerSlidesService.setActive(slide.id, !slide.isActive);
      await cargarSlides();
    } catch (error) {
      toast.error(mensajeDeError(error, "No se pudo cambiar el estado"));
    }
  };

  const handleDelete = async (slide: BannerSlide) => {
    if (!confirm(`¿Eliminar este slide? También se borrará su imagen.`)) return;
    try {
      await BannerSlidesService.remove(slide.id);
      toast.success("Slide eliminado");
      await cargarSlides();
    } catch (error) {
      toast.error(mensajeDeError(error, "No se pudo eliminar el slide"));
    }
  };

  // ── Drag & drop (HTML5 nativo, sin librerías) ──────────────────────────────

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    const anterior = slides;

    // Se reordena la lista local PRIMERO: el arrastre se siente inmediato en
    // vez de esperar la respuesta del servidor. Si la llamada falla, se revierte.
    const reordenados = [...slides];
    const [movido] = reordenados.splice(dragIndex, 1);
    reordenados.splice(dropIndex, 0, movido);
    setSlides(reordenados);
    setDragIndex(null);

    try {
      // El backend exige el orden COMPLETO: rechaza listas parciales.
      await BannerSlidesService.reorder(reordenados.map((s) => s.id));
    } catch (error) {
      setSlides(anterior);
      toast.error(mensajeDeError(error, "No se pudo guardar el nuevo orden"));
    }
  };

  // ── Modal ──────────────────────────────────────────────────────────────────

  const abrirCreacion = () => {
    setSlideEnEdicion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (slide: BannerSlide) => {
    setSlideEnEdicion(slide);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setSlideEnEdicion(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-[#097EEC]" />
          <h3 className="font-semibold text-gray-800">Banners del feed</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              activos >= MAX_ACTIVE_BANNER_SLIDES
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {activos}/{MAX_ACTIVE_BANNER_SLIDES} activos
          </span>
        </div>

        <button
          onClick={abrirCreacion}
          className="inline-flex items-center gap-2 rounded-lg bg-[#097EEC] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0A6FD8]"
        >
          <PlusCircle className="h-4 w-4" />
          Nuevo slide
        </button>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Slides del carousel del inicio de la app. Arrastra las tarjetas para
        cambiar el orden en que se muestran.
      </p>

      {/* Va ARRIBA de la lista arrastrable a propósito: al reordenar abajo,
          esta franja se reacomoda en vivo y se ve el resultado sin salir */}
      {!cargando && <BannerSlidesPreview slides={slides} />}

      {cargando ? (
        // Placeholders con la MISMA silueta que BannerSlideCard: al llegar los
        // datos el contenido reemplaza al esqueleto sin que salte el layout
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              // gap-4, p-3 y border: las MISMAS medidas que BannerSlideCard,
              // si no las columnas del esqueleto no caen donde caerán las reales
              className="flex animate-pulse items-center gap-4 rounded-xl border border-gray-200 bg-white p-3"
            >
              <div className="h-5 w-5 shrink-0 rounded bg-gray-100" />
              <div className="h-16 w-28 shrink-0 rounded-lg bg-gray-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-100" />
                <div className="flex gap-2">
                  <div className="h-4 w-16 rounded-full bg-gray-100" />
                  <div className="h-4 w-14 rounded-full bg-gray-100" />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="h-9 w-9 rounded-lg bg-gray-100" />
                <div className="h-9 w-9 rounded-lg bg-gray-100" />
                <div className="h-9 w-9 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
          <Images className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            Todavía no hay slides. El carousel no se muestra en la app.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              // preventDefault es OBLIGATORIO: por defecto el navegador NO
              // permite soltar sobre un elemento, y sin esto onDrop nunca corre.
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDragIndex(null)}
            >
              <BannerSlideCard
                slide={slide}
                isDragging={dragIndex === index}
                onEdit={abrirEdicion}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <BannerSlideFormModal
          slide={slideEnEdicion}
          eventos={eventos}
          onClose={cerrarModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default BannerSlidesManagement;
