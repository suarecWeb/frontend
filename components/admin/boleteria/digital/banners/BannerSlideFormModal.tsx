"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Upload, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  BannerSlide,
  CreateBannerSlideDto,
  UpdateBannerSlideDto,
} from "@/interfaces/banner-slide.interface";
import { Evento } from "@/interfaces/event.interface";
import { compressImage } from "@/lib/compressImage";

interface BannerSlideFormModalProps {
  /** null = crear uno nuevo. Con valor = editar ese slide. */
  slide: BannerSlide | null;
  eventos: Evento[];
  onClose: () => void;
  onSubmit: (
    dto: CreateBannerSlideDto | UpdateBannerSlideDto,
    imageFile?: File,
  ) => Promise<void>;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png"];
const ACCEPT_INPUT = "image/jpeg,image/png";

const BannerSlideFormModal = ({
  slide,
  eventos,
  onClose,
  onSubmit,
}: BannerSlideFormModalProps) => {
  const esEdicion = slide !== null;

  const [title, setTitle] = useState(slide?.title ?? "");
  const [description, setDescription] = useState(slide?.description ?? "");
  const [eventId, setEventId] = useState<string>(
    slide?.eventId ? String(slide.eventId) : "",
  );
  const [isActive, setIsActive] = useState(slide?.isActive ?? true);
  const [autoOpen, setAutoOpen] = useState(slide?.autoOpen ?? false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);

  // Al editar, marca que se quitó la imagen guardada: sin esto el preview
  // volvería a mostrarla y el admin creería que sigue habiendo una elegida
  const [imagenQuitada, setImagenQuitada] = useState(false);

  /**
   * Vista previa de la imagen ANTES de subirla: createObjectURL genera una URL
   * temporal en memoria del navegador. Hay que revocarla al cambiar de archivo
   * o al cerrar, si no queda ocupando memoria.
   */
  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const imagenMostrada =
    previewUrl ?? (imagenQuitada ? null : (slide?.imageUrl ?? null));

  const [previewCargado, setPreviewCargado] = useState(false);

  // Al cambiar de imagen hay que volver a esperar su carga, si no la nueva
  // aparecería de golpe reusando el estado de la anterior
  useEffect(() => {
    setPreviewCargado(false);
  }, [imagenMostrada]);

  // Congela el scroll de la página detrás del modal. Sin esto, al hacer scroll
  // dentro del formulario la página de fondo también se mueve
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Vuelve el campo al estado vacío para que se pueda cargar otra imagen
  const quitarImagen = () => {
    setImageFile(null);
    setImagenQuitada(true);
  };

  // Cerrar a mitad de un guardado dejaría la petición en vuelo y el admin
  // creería que canceló, cuando el slide sí se guardó
  const cerrarSiSePuede = () => {
    if (enviando || comprimiendo) return;
    onClose();
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;

    // Se valida acá además del backend: da respuesta inmediata y evita subir
    // 5 MB para que el servidor los rechace.
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG o PNG");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    // Se comprime antes de subir: la app móvil precarga todos los slides al
    // abrir, así que el peso del archivo se paga en datos del usuario final.
    // Es transparente para el admin, no se le notifica.
    setComprimiendo(true);
    try {
      setImageFile(await compressImage(file));
      setImagenQuitada(false);
    } finally {
      setComprimiendo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // La imagen es obligatoria siempre. Al editar solo se exige una nueva si
    // se quitó la anterior: si no se toca, el backend conserva la que ya tiene
    if (!imageFile && (!esEdicion || imagenQuitada)) {
      toast.error("La imagen es obligatoria");
      return;
    }

    /*
      eventId tiene tres estados y la diferencia importa:
        ""          -> al crear: no se manda (slide libre)
                       al editar: se manda null para QUITAR el evento
        con valor   -> se manda el número
      Si al editar se omitiera el campo, el backend dejaría el evento intacto
      y sería imposible convertir un slide de evento en libre.
    */
    const dto: CreateBannerSlideDto | UpdateBannerSlideDto = {
      title: title.trim(),
      description: description.trim(),
      isActive,
      autoOpen,
      ...(eventId
        ? { eventId: Number(eventId) }
        : esEdicion
          ? { eventId: null }
          : {}),
    };

    setEnviando(true);
    try {
      await onSubmit(dto, imageFile ?? undefined);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop separado del contenido para que el blur no afecte al formulario.
          A diferencia de los modales de solo lectura, este NO cierra al hacer clic:
          es un formulario y un clic accidental borraría todo lo que se llenó */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {esEdicion ? "Editar slide" : "Nuevo slide"}
          </h3>
          <button
            type="button"
            onClick={cerrarSiSePuede}
            disabled={enviando || comprimiendo}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Imagen */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Imagen {!esEdicion && <span className="text-red-500">*</span>}
            </label>

            {/* El marco tiene la proporción del teléfono (9:16, igual que los
                eventos): vacío o con imagen ocupa el MISMO espacio, y la imagen
                lo llena por completo en vez de flotar dentro de un recuadro ancho */}
            {imagenMostrada ? (
              // Va FUERA de un <label>: dentro, cualquier clic —incluido el de
              // borrar— abriría el selector de archivos
              <div className="relative mx-auto aspect-[9/16] w-64 overflow-hidden rounded-xl bg-gray-900 shadow-sm ring-1 ring-gray-200">
                {/* Al editar, la imagen viene de Supabase y tarda: el pulso
                    ocupa el marco hasta que termina de cargar */}
                {!previewCargado && (
                  <div className="absolute inset-0 animate-pulse bg-gray-200" />
                )}
                <Image
                  src={imagenMostrada}
                  alt="Vista previa"
                  fill
                  sizes="256px"
                  onLoad={() => setPreviewCargado(true)}
                  onError={() => setPreviewCargado(true)}
                  className={`object-cover transition-opacity duration-500 ${
                    previewCargado ? "opacity-100" : "opacity-0"
                  }`}
                  unoptimized={Boolean(previewUrl)}
                />

                {/* Rojo permanente, no solo en hover: debe verse a simple vista
                    que la imagen se puede eliminar */}
                <button
                  type="button"
                  onClick={quitarImagen}
                  title="Eliminar imagen"
                  className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white shadow-md transition hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="mx-auto flex aspect-[9/16] w-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-[#097EEC] hover:bg-blue-50/40 hover:text-[#097EEC]">
                {comprimiendo ? (
                  <>
                    <Loader2 className="h-9 w-9 animate-spin text-[#097EEC]" />
                    <span className="text-sm font-medium">Cargando…</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-9 w-9" />
                    <span className="text-sm font-medium">
                      Seleccionar imagen
                    </span>
                    <span className="text-xs text-gray-400">
                      JPG o PNG · Vertical 9:16
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept={ACCEPT_INPUT}
                  className="hidden"
                  // Limpiar el value permite volver a elegir el MISMO archivo:
                  // sin esto, onChange no dispara porque el valor no cambió
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = "";
                  }}
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </label>
            )}

            <p className="mt-2 text-center text-xs text-gray-400">
              JPG o PNG · máx 5MB
            </p>
          </div>

          {/* Título */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Título <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#097EEC]"
              placeholder="Ej. Promoción de fin de año"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Descripción <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={description}
              maxLength={500}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#097EEC]"
            />
          </div>

          {/* Evento */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Evento enlazado <span className="text-gray-400">(opcional)</span>
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#097EEC]"
            >
              <option value="">Sin evento (slide promocional)</option>
              {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nombre}
                  {evento.visible === false ? " (oculto)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Sin evento, al tocar el slide solo se abre la imagen. Con evento,
              lleva a su detalle.
            </p>
          </div>

          {/* Activo */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#097EEC]"
            />
            <span className="text-sm text-gray-700">
              Publicar en el carousel
            </span>
          </label>

          {/* Bienvenida: independiente del orden del carousel */}
          <div className="rounded-lg bg-amber-50 p-3">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={autoOpen}
                onChange={(e) => setAutoOpen(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#097EEC]"
              />
              <span className="text-sm text-gray-700">
                Abrir automáticamente al entrar a la app
                <span className="mt-0.5 block text-xs text-gray-500">
                  Solo un slide puede tenerlo. Al marcarlo, se desmarca el
                  anterior. Es independiente del orden del carousel.
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={cerrarSiSePuede}
              disabled={enviando || comprimiendo}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            {/* Bloqueado mientras comprime: enviar ahí subiría el archivo sin optimizar */}
            <button
              type="submit"
              disabled={enviando || comprimiendo}
              className="inline-flex items-center gap-2 rounded-lg bg-[#097EEC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A6FD8] disabled:opacity-60"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear slide"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default BannerSlideFormModal;
