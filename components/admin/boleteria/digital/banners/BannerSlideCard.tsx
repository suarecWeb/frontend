"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Calendar,
  ImageIcon,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  GripVertical,
  Sparkles,
} from "lucide-react";
import {
  BannerSlide,
  motivoEventoNoDisponible,
} from "@/interfaces/banner-slide.interface";

interface BannerSlideCardProps {
  slide: BannerSlide;
  onEdit: (slide: BannerSlide) => void;
  onDelete: (slide: BannerSlide) => void;
  onToggleActive: (slide: BannerSlide) => void;
  /** True mientras se arrastra esta tarjeta (se atenúa para dar feedback). */
  isDragging?: boolean;
}

/**
 * Tarjeta de un slide en el listado del panel.
 *
 * Es puramente presentacional: no llama a la API ni mantiene estado propio.
 * Toda acción se delega al componente padre por callbacks.
 */
const BannerSlideCard = ({
  slide,
  onEdit,
  onDelete,
  onToggleActive,
  isDragging = false,
}: BannerSlideCardProps) => {
  const esLibre = slide.eventId === null;
  const motivoNoDisponible = motivoEventoNoDisponible(slide);

  // Las imágenes vienen de Supabase por red: sin esto aparecen de golpe
  const [imagenCargada, setImagenCargada] = useState(false);

  // Tras actualizar un slide, React reusa esta card porque su key (el id) no
  // cambió y el estado sobrevive. Sin reiniciarlo, la imagen nueva se pintaría
  // opaca desde el primer frame y no habría transición
  useEffect(() => {
    setImagenCargada(false);
  }, [slide.imageUrl]);

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border bg-white p-3 transition ${
        isDragging
          ? "opacity-40 border-dashed border-[#097EEC]"
          : "border-gray-200 hover:border-gray-300"
      } ${!slide.isActive ? "bg-gray-50" : ""}`}
    >
      {/* Asa de arrastre: señal visual de que la tarjeta es reordenable */}
      <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-gray-300" />

      {/* Miniatura */}
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {/* El pulso queda DEBAJO de la imagen y se apaga al terminar de cargar */}
        {!imagenCargada && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <Image
          src={slide.imageUrl}
          alt={slide.title ?? "Slide del banner"}
          fill
          sizes="112px"
          onLoad={() => setImagenCargada(true)}
          onError={() => setImagenCargada(true)}
          className={`object-cover transition-opacity duration-500 ${
            imagenCargada ? "opacity-100" : "opacity-0"
          } ${!slide.isActive ? "grayscale" : ""}`}
        />
      </div>

      {/* Datos */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-gray-800">
            {slide.title || (
              <span className="italic text-gray-400">Sin título</span>
            )}
          </p>

          {/* Tipo de slide */}
          {esLibre ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              <ImageIcon className="h-3 w-3" />
              Libre
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              <Calendar className="h-3 w-3" />
              Evento
            </span>
          )}

          {/* Estado de publicación */}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              slide.isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {slide.isActive ? "Activo" : "Inactivo"}
          </span>

          {/* Slide de bienvenida: el que se abre solo al entrar a la app */}
          {slide.autoOpen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              <Sparkles className="h-3 w-3" />
              Mostrando al iniciar la app
            </span>
          )}
        </div>

        {/* Nombre del evento enlazado */}
        {!esLibre && slide.evento && (
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {slide.evento.nombre}
          </p>
        )}

        {/*
          Aviso clave: el slide figura como activo pero NO se está publicando
          porque su evento dejó de ser válido. Se muestra el motivo concreto:
          sin él, el admin vería el carousel encogerse sin saber por qué.
        */}
        {motivoNoDisponible && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {motivoNoDisponible} — este slide no se está publicando
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => onToggleActive(slide)}
          title={slide.isActive ? "Desactivar" : "Activar"}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        >
          {slide.isActive ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={() => onEdit(slide)}
          title="Editar"
          className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-[#097EEC]"
        >
          <Edit className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDelete(slide)}
          title="Eliminar"
          className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BannerSlideCard;
