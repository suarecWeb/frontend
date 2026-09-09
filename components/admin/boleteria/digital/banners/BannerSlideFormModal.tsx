"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  BannerSlide,
  CreateBannerSlideDto,
  UpdateBannerSlideDto,
} from "@/interfaces/banner-slide.interface";
import { Evento } from "@/interfaces/event.interface";

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
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

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

  const imagenMostrada = previewUrl ?? slide?.imageUrl ?? null;

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;

    // Se valida acá además del backend: da respuesta inmediata y evita subir
    // 5 MB para que el servidor los rechace.
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o WebP");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!esEdicion && !imageFile) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {esEdicion ? "Editar slide" : "Nuevo slide"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
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

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 transition hover:border-[#097EEC] hover:bg-blue-50/40">
              {imagenMostrada ? (
                <div className="relative h-36 w-full overflow-hidden rounded-lg">
                  <Image
                    src={imagenMostrada}
                    alt="Vista previa"
                    fill
                    sizes="100%"
                    className="object-cover"
                    unoptimized={Boolean(previewUrl)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-6 text-gray-400">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Seleccionar imagen</span>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </label>

            <p className="mt-1 text-xs text-gray-400">
              JPG, PNG o WebP · máx 5MB · se recomienda formato apaisado (16:9)
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
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center gap-2 rounded-lg bg-[#097EEC] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A6FD8] disabled:opacity-60"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              {esEdicion ? "Guardar cambios" : "Crear slide"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerSlideFormModal;
