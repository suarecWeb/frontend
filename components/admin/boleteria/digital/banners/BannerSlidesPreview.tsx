"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { EyeOff, Sparkles, AlertTriangle, ImageOff } from "lucide-react";
import {
  BannerSlide,
  motivoEventoNoDisponible,
} from "@/interfaces/banner-slide.interface";

interface BannerSlidesPreviewProps {
  slides: BannerSlide[];
}

// Se extrae en su propio componente porque cada miniatura necesita su estado de
// carga: con un estado compartido, la primera en llegar apagaría el pulso de todas
const MiniaturaSlide = ({
  slide,
  posicion,
}: {
  slide: BannerSlide;
  posicion: number;
}) => {
  const oculto = !slide.isActive;
  const motivoNoDisponible = motivoEventoNoDisponible(slide);

  const [cargada, setCargada] = useState(false);
  const [fallo, setFallo] = useState(false);

  // Tras reordenar o actualizar, React reusa este componente por su key y el
  // estado sobrevive: sin reiniciarlo la imagen nueva no haría transición
  useEffect(() => {
    setCargada(false);
    setFallo(false);
  }, [slide.imageUrl]);

  return (
    // layout anima el cambio de posición: al reordenar abajo, la miniatura se
    // desliza a su nuevo lugar en vez de saltar. La key estable (el id) es lo
    // que le permite a framer-motion seguir el mismo elemento entre renders
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="w-[165px] shrink-0"
    >
      {/* 9:16, el formato en que se sube la imagen. contain y no cover:
          la idea es revisar la imagen completa, no cómo se recorta */}
      <div
        className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-gray-900 ring-1 transition ${
          oculto ? "opacity-50 ring-gray-200" : "ring-gray-300"
        }`}
      >
        {!cargada && !fallo && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}

        {fallo ? (
          <div
            title="No se pudo cargar la imagen"
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-400"
          >
            <ImageOff className="h-6 w-6" />
            <span className="text-[11px]">Sin imagen</span>
          </div>
        ) : (
          <Image
            src={slide.imageUrl}
            alt={slide.title ?? `Slide ${posicion}`}
            fill
            sizes="165px"
            onLoad={() => setCargada(true)}
            onError={() => setFallo(true)}
            className={`object-contain transition-opacity duration-500 ${
              cargada ? "opacity-100" : "opacity-0"
            } ${oculto ? "grayscale" : ""}`}
          />
        )}

        {/* Posición: tachada cuando el slide no se publica, porque ese
            número no corresponde a lo que el usuario final ve */}
        <span
          className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
            oculto ? "bg-gray-500 line-through" : "bg-black/70"
          }`}
        >
          {posicion}
        </span>

        {slide.autoOpen && (
          <span
            title="Se abre al iniciar la app"
            className="absolute right-2 top-2 rounded-full bg-blue-600 p-2 text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        )}

        {oculto && (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-md bg-gray-900/80 py-1 text-[11px] font-medium text-white">
            <EyeOff className="h-3.5 w-3.5" />
            Oculto
          </span>
        )}
      </div>

      {motivoNoDisponible && (
        <p
          title={`${motivoNoDisponible}: este slide no se está publicando`}
          className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-amber-600"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Sin publicar
        </p>
      )}
    </motion.div>
  );
};

const BannerSlidesPreview = ({ slides }: BannerSlidesPreviewProps) => {
  if (slides.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">
        Vista del banner
      </p>

      {/* Scroll horizontal: con 5 slides no siempre caben en pantallas chicas */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {slides.map((slide, index) => (
          <MiniaturaSlide key={slide.id} slide={slide} posicion={index + 1} />
        ))}
      </div>
    </div>
  );
};

export default BannerSlidesPreview;
