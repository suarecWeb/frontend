"use client";

import { QRCodeCanvas } from "qrcode.react";
import { QrCode } from "lucide-react";

interface EventoInfo {
  nombre?: string;
  fecha?: string;
  hora?: string;
  lugar?: string;
  descripcion?: string;
  plantillaTicketUrl?: string | null;
  logoPatrocinadoresUrl?: string | null;
}

export interface TicketVisualProps {
  qrValue: string;
  qrId?: string;
  tipoBoleta?: "GENERAL" | "VIP";
  precio: string;
  fechaCompra: string;
  evento?: EventoInfo;
  className?: string;
  esPreview?: boolean;
  printOffset?: boolean;
}

const formatCOP = (value: string | number) => {
  const numeric =
    typeof value === "string" ? Number(value.replace(/\D/g, "")) : value;
  if (Number.isNaN(numeric)) return value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
};

export const TicketVisual = ({
  qrValue,
  qrId,
  tipoBoleta = "GENERAL",
  precio,
  fechaCompra,
  evento,
  className = "",
  esPreview = false,
  printOffset = false,
}: TicketVisualProps) => {
  // Clase compartida entre "Valor pagado" y "Fecha de compra" -- misma
  // altura y tamaño para los dos en vez de repetir el bloque completo.
  const footerBoxClass = `bottom-[calc(5.5%-1px)] text-center w-[30%] h-[60px] px-1.5 py-1 bg-white flex flex-col items-center justify-center ${printOffset ? "translate-x-6" : ""}`;

  return (
    <div
      className={`ticket-print relative w-[400px] h-[926px] shrink-0 overflow-hidden bg-white ${className}`}
    >
      {/* Imagen base del ticket */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={evento?.plantillaTicketUrl || "/tickets/base.png"}
        alt="Ticket boletería física"
        className="absolute p-5 inset-0 w-[400px] h-[900px] object-contain"
      />

      {/* Contenido superpuesto. Solo en impresión se aplica un leve
          desplazamiento a la izquierda para compensar el desfase de la
          impresora térmica POS-80C. */}
      <div
        className={`absolute inset-0 ${printOffset ? "-translate-x-8" : ""}`}
      >
        {/* Tipo de boleta */}
        <div
          className={`absolute top-[35px] right-[8%] bg-white px-2 py-1 ${printOffset ? "translate-x-8" : ""}`}
        >
          <span className="text-[23px] font-black text-black tracking-tight">
            {tipoBoleta}
          </span>
        </div>

        {/* Texto */}
        <div
          className={`absolute left-[30%] top-[11%] right-[30%] text-center bg-white px-1 py-1 rounded h-[18px] ${printOffset ? "translate-x-8 -translate-y-[15px]" : ""}`}
        >
          <p className="text-[13px] uppercase tracking-wide text-gray-600 font-extrabold">
            Patrocinan
          </p>
        </div>

        {/* Logo de patrocinadores -- espacio en blanco medido en la
            plantilla base (14%-30% alto, 10%-90% ancho), debajo del
            texto "Patrocinan" y arriba de la línea punteada. */}
        {evento?.logoPatrocinadoresUrl && (
          <div
            className={`absolute left-[10%] top-[14%] right-[10%] h-[16%] flex items-center justify-center ${printOffset ? "translate-x-8" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evento.logoPatrocinadoresUrl}
              alt="Patrocinadores"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {/* Se presentan */}
        {evento?.descripcion && (
          <>
            <div
              className={`absolute left-[10%] top-[32%] right-[10%] text-center bg-white px-1 py-1 rounded h-[20px] ${printOffset ? "translate-x-8" : ""}`}
            >
              <p className="text-[13px] uppercase tracking-wide text-gray-600 font-extrabold">
                Se presentan
              </p>
            </div>
            <div
              className={`absolute left-[10%] top-[35%] right-[10%] text-center ${printOffset ? "translate-x-8" : ""}`}
            >
              {evento.descripcion
                .split(",")
                .map((linea) => linea.trim())
                .filter(Boolean)
                .map((linea, index) => (
                  <p
                    key={index}
                    className="text-[14px] font-black text-black leading-tight"
                  >
                    {linea}
                  </p>
                ))}
            </div>
          </>
        )}

        {/* Información del evento. Los íconos (calendario/reloj/ubicación)
            están fijos en la imagen base y no se mueven con el
            -translate-x-8 de printOffset -- por eso este bloque lleva un
            translate-x-8 propio cuando se imprime, para cancelar ese
            corrimiento y no quedar montado sobre los íconos. */}
        <div
          className={`absolute left-[16%] top-[52%] right-[30%] ${printOffset ? "translate-x-8" : ""}`}
        >
          <p className="text-[13px] font-semibold text-black leading-snug">
            {evento?.fecha || "Domingo, 19 de julio de 2026"}
          </p>
        </div>

        <div
          className={`absolute left-[16%] top-[54.5%] right-[30%] ${printOffset ? "translate-x-8" : ""}`}
        >
          <p className="text-[13px] font-semibold text-black leading-snug">
            {evento?.hora || "6:00 p.m."}
          </p>
        </div>

        <div
          className={`absolute left-[16%] top-[57%] right-[30%] ${printOffset ? "translate-x-8" : ""}`}
        >
          <p className="text-[13px] font-semibold text-black leading-snug">
            {evento?.lugar || "La Herradura, Cauca"}
          </p>
        </div>

        {/* UUID / Serie arriba del QR. Centrado con left-1/2 + translate-x;
            cuando se imprime, se suma el corrimiento de 2rem (misma
            magnitud que -translate-x-8) al translate en vez de agregar
            otra clase translate-x, porque Tailwind no combina dos
            utilidades de transform-translate-x por separado. */}
        {qrId && (
          <div
            className={`absolute left-1/2 top-[64%] w-[78%] text-center px-2 py-1.5 ${printOffset ? "translate-x-[calc(-50%+2rem)]" : "-translate-x-1/2"}`}
          >
            <p className="text-[9px] uppercase tracking-wide text-gray-700 font-extrabold leading-tight mb-0.5"></p>
            <p className="text-[10px] font-black text-black leading-tight break-all">
              {qrId}
            </p>
          </div>
        )}

        {/* QR dinámico centrado */}
        <div
          className={`absolute left-1/2 top-[67%] w-[38%] aspect-square bg-white flex items-center justify-center ${printOffset ? "translate-x-[calc(-50%+2rem)]" : "-translate-x-1/2"}`}
        >
          {esPreview ? (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <QrCode className="h-14 w-14 text-gray-300 mb-1" />
            </div>
          ) : (
            <QRCodeCanvas
              value={qrValue || "SUAREC"}
              size={160}
              level="M"
              includeMargin={false}
            />
          )}
        </div>

        {/* Leyenda QR */}
        <div className="absolute left-0 right-0 top-[83.5%] text-center px-4"></div>

        {/* Valor pagado */}
        <div className={`absolute left-[10%] ${footerBoxClass}`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-800 font-extrabold leading-tight">
            Valor pagado
          </p>
          <p className="text-[15px] font-black text-black leading-tight tracking-tight">
            {formatCOP(precio)}
          </p>
        </div>

        {/* Fecha de compra */}
        <div className={`absolute right-[10%] ${footerBoxClass}`}>
          <p className="text-[10px] uppercase tracking-wide text-gray-800 font-extrabold leading-tight">
            Fecha de compra
          </p>
          <p className="text-[15px] font-black text-black leading-tight tracking-tight">
            {fechaCompra}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketVisual;
