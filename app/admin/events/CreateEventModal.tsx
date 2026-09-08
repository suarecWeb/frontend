"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  CalendarDays,
  MapPin,
  Ticket,
  DollarSign,
  FileText,
  Upload,
  Smartphone,
  Monitor,
  Star,
  User,
  Gift,
  Armchair,
} from "lucide-react";
import {
  CreateEventoDto,
  EventoEstado,
  EventoTipo,
} from "@/interfaces/event.interface";

interface CreateEventModalProps {
  modoFisico?: boolean;
  onClose: () => void;
  onSubmit: (
    dto: CreateEventoDto,
    imageFile?: File,
    codigosACrear?: number,
    cantidadLote?: number,
  ) => Promise<void>;
}

const EMPTY_FORM: CreateEventoDto = {
  nombre: "",
  descripcion: "",
  fechaEvento: "",
  ubicacion: "",
  aforoTotal: undefined,
  precioBase: undefined,
  comision: undefined,
  estado: EventoEstado.PREVENTA,
  formatId: undefined,
  nombreOrganizador: "",
};

const ESTADO_CONFIG: Record<EventoEstado, { label: string; color: string }> = {
  [EventoEstado.PREVENTA]: {
    label: "Preventa",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  [EventoEstado.VENTA]: {
    label: "Venta",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  [EventoEstado.CERRADO]: {
    label: "Cerrado",
    color: "bg-gray-100 text-gray-600 border-gray-200",
  },
  [EventoEstado.CANCELADO]: {
    label: "Cancelado",
    color: "bg-red-100 text-red-600 border-red-200",
  },
};

const FORMAT_OPTIONS: {
  id: number;
  label: string;
  resolution: string;
  ratio: string;
  width: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 1,
    label: "Teléfono",
    resolution: "1080 × 1920 px",
    ratio: "aspect-[9/16]",
    width: "w-72 mx-auto",
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: 2,
    label: "Web",
    resolution: "1280 × 720 px",
    ratio: "aspect-video",
    width: "w-full",
    icon: <Monitor className="h-5 w-5" />,
  },
];

const BOLETA_FISICA_FORMAT = {
  id: 5,
  label: "Boleta física",
  resolution: "403 × 886 px",
  ratio: "aspect-[403/886]",
  width: "w-56 mx-auto",
  icon: <Ticket className="h-5 w-5" />,
};

export default function CreateEventModal({
  modoFisico = false,
  onClose,
  onSubmit,
}: CreateEventModalProps) {
  const [form, setForm] = useState<CreateEventoDto>({
    ...EMPTY_FORM,
    formatId: modoFisico ? BOLETA_FISICA_FORMAT.id : EMPTY_FORM.formatId,
  });
  // Tipo de evento (VIP / GENERAL) y cargo por SUAREC (monto en COP).
  // UI lista, pero el envío al backend está apagado: estos campos aún NO van en el submit.
  const [tipoEvento, setTipoEvento] = useState<EventoTipo | null>(null);
  const [cargoSuarec, setCargoSuarec] = useState<number | undefined>(undefined);
  // Boletería física: cantidad de boletas del lote inicial.
  // Se envía como aforoTotal del evento y luego genera el lote en el backend.
  const [cantidadLote, setCantidadLote] = useState<number | undefined>(
    undefined,
  );
  // Códigos de regalo: si se activa, al crear el evento se generan N códigos
  const [generarCodigos, setGenerarCodigos] = useState(false);
  const [cantidadCodigos, setCantidadCodigos] = useState<number | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateEventoDto, string>>
  >({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serverError = (errors as any)._server as string | undefined;
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!serverError) return;
    setShowError(true);
    const hide = setTimeout(() => setShowError(false), 4700);
    const clear = setTimeout(
      () => setErrors((prev) => ({ ...prev, _server: undefined })),
      5000,
    );
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [serverError]);

  const validate = (): boolean => {
    const next: typeof errors = {};

    if (!form.nombre.trim()) next.nombre = "El nombre es obligatorio";
    else if (form.nombre.trim().length < 3)
      next.nombre = "El nombre debe tener al menos 3 caracteres";
    else if (form.nombre.trim().length > 150)
      next.nombre = "El nombre no puede superar 150 caracteres";

    if (form.descripcion && form.descripcion.length > 2000)
      next.descripcion = "La descripción no puede superar 2000 caracteres";

    if (!form.fechaEvento) {
      next.fechaEvento = "La fecha es obligatoria";
    } else {
      const fecha = new Date(form.fechaEvento);
      const hoy = new Date();
      const max = new Date();
      hoy.setHours(0, 0, 0, 0);
      fecha.setHours(0, 0, 0, 0);
      max.setFullYear(max.getFullYear() + 2);
      if (fecha < hoy)
        next.fechaEvento = "La fecha debe ser hoy o en el futuro";
      else if (fecha > max)
        next.fechaEvento = "La fecha no puede ser mayor a 2 años desde hoy";
    }

    if (!form.ubicacion.trim()) next.ubicacion = "El lugar es obligatorio";
    else if (form.ubicacion.trim().length > 200)
      next.ubicacion = "El lugar no puede superar 200 caracteres";

    if (!modoFisico) {
      if (!form.nombreOrganizador?.trim())
        next.nombreOrganizador = "El nombre del organizador es obligatorio";
      else if (form.nombreOrganizador.trim().length > 150)
        next.nombreOrganizador =
          "El nombre del organizador no puede superar 150 caracteres";

      if (form.aforoTotal !== undefined) {
        if (!Number.isInteger(form.aforoTotal))
          next.aforoTotal = "El aforo debe ser un número entero";
        else if (form.aforoTotal < 1)
          next.aforoTotal = "El aforo debe ser mayor a 0";
        else if (form.aforoTotal > 4000)
          next.aforoTotal = "El aforo no puede superar 4000";
      }

      if (form.precioBase !== undefined && form.precioBase < 2000)
        next.precioBase = "El precio mínimo de la boleta es $2.000 COP";
    }

    if (modoFisico) {
      if (form.precioBase !== undefined && form.precioBase < 2000)
        next.precioBase = "El precio mínimo de la boleta es $2.000 COP";
    }

    if (modoFisico) {
      if (cantidadLote === undefined)
        (next as any)._lote = "Indica cuántas boletas tendrá el lote";
      else if (!Number.isInteger(cantidadLote))
        (next as any)._lote = "La cantidad debe ser un número entero";
      else if (cantidadLote < 1)
        (next as any)._lote = "El lote debe tener al menos 1 boleta";
      else if (cantidadLote > 4000)
        (next as any)._lote = "El lote no puede superar 4000 boletas";
    }

    if (!modoFisico && !form.formatId)
      next.formatId = "Debes seleccionar un formato de imagen";

    if (!imageFile)
      (next as any)._image = modoFisico
        ? "La imagen de la boleta física es obligatoria"
        : "La imagen del evento es obligatoria";

    if (!tipoEvento) next.tipo = "Debes seleccionar el tipo de evento";

    if (
      !modoFisico &&
      generarCodigos &&
      (!cantidadCodigos || cantidadCodigos < 1)
    )
      (next as any)._codigos = "Indica cuántos códigos generar (mínimo 1)";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (
    field: keyof CreateEventoDto,
    value: string | number | undefined,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const formatPriceDisplay = (value: number | undefined): string =>
    value !== undefined ? value.toLocaleString("es-CO") : "";

  const parsePriceInput = (raw: string): number | undefined => {
    const cleaned = raw.replace(/\./g, "");
    const num = Number(cleaned);
    return cleaned === "" ? undefined : isNaN(num) ? undefined : num;
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, _image: undefined }) as any);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const dto = modoFisico
        ? {
            ...form,
            tipo: tipoEvento ?? undefined,
            cargoSuarec: 0,
            aforoTotal: cantidadLote,
            nombreOrganizador: "SUAREC",
          }
        : { ...form, tipo: tipoEvento ?? undefined, cargoSuarec };
      await onSubmit(
        dto,
        imageFile ?? undefined,
        modoFisico ? undefined : generarCodigos ? cantidadCodigos : undefined,
        modoFisico ? cantidadLote : undefined,
      );
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) {
        setErrors((prev) => ({ ...prev, _server: msg.join(", ") }));
      } else if (typeof msg === "string") {
        setErrors((prev) => ({ ...prev, _server: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedFormat = modoFisico
    ? BOLETA_FISICA_FORMAT
    : (FORMAT_OPTIONS.find((f) => f.id === form.formatId) ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#097EEC]" />
            <h2 className="text-base font-semibold text-gray-800">
              Crear evento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Imagen al tope */}
        <div className="px-6 pt-5">
          {/* Selector de formato */}
          <div className={`flex gap-2 ${errors.formatId ? "mb-1" : "mb-3"}`}>
            {modoFisico ? (
              <button
                type="button"
                disabled
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium border-[#097EEC] bg-[#097EEC]/5 text-[#097EEC]"
              >
                {BOLETA_FISICA_FORMAT.icon}
                {BOLETA_FISICA_FORMAT.label}
              </button>
            ) : (
              FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => handleChange("formatId", fmt.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                    form.formatId === fmt.id
                      ? "border-[#097EEC] bg-[#097EEC]/5 text-[#097EEC]"
                      : errors.formatId
                        ? "border-red-300 text-red-400"
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {fmt.icon}
                  {fmt.label}
                </button>
              ))
            )}
          </div>
          {errors.formatId && (
            <p className="mb-2 text-xs text-red-500">{errors.formatId}</p>
          )}

          {/* Resolución recomendada */}
          {selectedFormat && (
            <p className="text-[11px] text-gray-400 text-center mb-2">
              Resolución recomendada:{" "}
              <span className="font-semibold text-gray-600">
                {selectedFormat.resolution}
              </span>
            </p>
          )}

          {/* Zona de imagen */}
          {imagePreview ? (
            <div
              className={`relative rounded-xl overflow-hidden border border-gray-200 ${selectedFormat?.ratio ?? "aspect-video"} ${selectedFormat?.width ?? "w-full"}`}
            >
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="create-event-image-input"
              className={`cursor-pointer border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#097EEC] hover:text-[#097EEC] transition-colors ${selectedFormat?.ratio ?? "h-40"} ${selectedFormat?.width ?? "w-full"}`}
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs">
                {modoFisico
                  ? "Haz clic para subir la imagen de la boleta física"
                  : "Haz clic para subir una imagen"}
              </span>
              {!selectedFormat && (
                <span className="text-[10px] text-gray-300">
                  Selecciona un formato primero
                </span>
              )}
            </label>
          )}
          <input
            id="create-event-image-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />
          {(errors as any)._image && (
            <p className="mt-1.5 text-xs text-red-500">
              {(errors as any)._image}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Error del servidor */}
          {serverError && (
            <div
              className={`flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 transition-all duration-300 ease-in-out ${showError ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
            >
              <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Nombre + Estado */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                placeholder="Nombre del evento"
                className={`flex-1 px-3 py-2 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] ${errors.nombre ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
              />
              <select
                value={form.estado}
                onChange={(e) =>
                  handleChange("estado", e.target.value as EventoEstado)
                }
                className={`px-3 py-2 text-xs font-semibold border rounded-lg outline-none focus:ring-2 focus:ring-[#097EEC]/20 transition-all cursor-pointer ${ESTADO_CONFIG[form.estado!].color}`}
              >
                {Object.values(EventoEstado).map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_CONFIG[e].label}
                  </option>
                ))}
              </select>
            </div>
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <FileText className="h-3 w-3 inline mr-1" />
              Descripción
            </label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => handleChange("descripcion", e.target.value)}
              placeholder="Describe el evento..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none transition-all resize-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white"
            />
          </div>

          {/* Fecha + Lugar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <CalendarDays className="h-3 w-3 inline mr-1" />
                Fecha <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                onChange={(e) => handleChange("fechaEvento", e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] ${errors.fechaEvento ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
              />
              {errors.fechaEvento && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.fechaEvento}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <MapPin className="h-3 w-3 inline mr-1" />
                Lugar <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.ubicacion}
                onChange={(e) => handleChange("ubicacion", e.target.value)}
                placeholder="Ciudad o dirección"
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] ${errors.ubicacion ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
              />
              {errors.ubicacion && (
                <p className="mt-1 text-xs text-red-500">{errors.ubicacion}</p>
              )}
            </div>
          </div>

          {modoFisico && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Ticket className="h-3 w-3 inline mr-1" />
                  Boletas del lote <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={4000}
                  value={cantidadLote ?? ""}
                  onChange={(e) => {
                    setCantidadLote(
                      e.target.value ? Number(e.target.value) : undefined,
                    );
                    setErrors((prev) => ({ ...prev, _lote: undefined }) as any);
                  }}
                  placeholder="Ej. 1000"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white transition-all ${(errors as any)._lote ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Cantidad de boletas físicas que se generarán al crear el
                  evento.
                </p>
                {(errors as any)._lote && (
                  <p className="mt-1 text-xs text-red-500">
                    {(errors as any)._lote}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Precio base</span>
                  <span className="text-gray-400">COP</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatPriceDisplay(form.precioBase)}
                  onChange={(e) =>
                    handleChange("precioBase", parsePriceInput(e.target.value))
                  }
                  placeholder="Ej. 20000"
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white transition-all ${errors.precioBase ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
                {errors.precioBase && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.precioBase}
                  </p>
                )}
              </div>
            </>
          )}

          {!modoFisico && (
            <>
              {/* Nombre del organizador */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <User className="h-3 w-3 inline mr-1" />
                  Nombre del organizador <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombreOrganizador ?? ""}
                  onChange={(e) =>
                    handleChange("nombreOrganizador", e.target.value)
                  }
                  placeholder="Ej. Feria 53 Santander de Quilichao"
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] ${errors.nombreOrganizador ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:bg-white"}`}
                />
                {errors.nombreOrganizador && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.nombreOrganizador}
                  </p>
                )}
              </div>

              {/* Boletas + Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Ticket className="h-3 w-3 inline mr-1" />
                    Boletas
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.aforoTotal ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "aforoTotal",
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    placeholder="Sin límite"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white transition-all ${errors.aforoTotal ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                  />
                  {errors.aforoTotal && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.aforoTotal}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Precio base</span>
                    <span className="text-gray-400">COP</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatPriceDisplay(form.precioBase)}
                    onChange={(e) =>
                      handleChange(
                        "precioBase",
                        parsePriceInput(e.target.value),
                      )
                    }
                    placeholder="Gratis"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white transition-all ${errors.precioBase ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                  />
                  {errors.precioBase && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.precioBase}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tipo de evento (VIP / General) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo de evento <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipoEvento(EventoTipo.GENERAL);
                  setErrors((prev) => ({ ...prev, tipo: undefined }));
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                  tipoEvento === EventoTipo.GENERAL
                    ? "border-[#097EEC] bg-[#097EEC]/5 text-[#097EEC]"
                    : errors.tipo
                      ? "border-red-300 text-red-400"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <User className="h-4 w-4" />
                General
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoEvento(EventoTipo.VIP);
                  setErrors((prev) => ({ ...prev, tipo: undefined }));
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                  tipoEvento === EventoTipo.VIP
                    ? "border-[#097EEC] bg-[#097EEC]/5 text-[#097EEC]"
                    : errors.tipo
                      ? "border-red-300 text-red-400"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <Star className="h-4 w-4" />
                VIP
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoEvento(EventoTipo.PALCO);
                  setErrors((prev) => ({ ...prev, tipo: undefined }));
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                  tipoEvento === EventoTipo.PALCO
                    ? "border-[#097EEC] bg-[#097EEC]/5 text-[#097EEC]"
                    : errors.tipo
                      ? "border-red-300 text-red-400"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <Armchair className="h-4 w-4" />
                Palco
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoEvento(EventoTipo.PALCO_INDIVIDUAL);
                  setErrors((prev) => ({ ...prev, tipo: undefined }));
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                  tipoEvento === EventoTipo.PALCO_INDIVIDUAL
                    ? "border-[#097EEC] bg-[#097EEC]/5 text-[#097EEC]"
                    : errors.tipo
                      ? "border-red-300 text-red-400"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                <Armchair className="h-4 w-4" />
                Palco individual
              </button>
            </div>
            {errors.tipo && (
              <p className="mt-1 text-xs text-red-500">{errors.tipo}</p>
            )}
          </div>

          {!modoFisico && (
            <>
              {/* Cargo por SUAREC (comisión) */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Cargo SUAREC</span>
                  <span className="text-gray-400">COP</span>
                </label>
                <input
                  type="text"
                  name="cargo suarec"
                  inputMode="numeric"
                  value={formatPriceDisplay(cargoSuarec)}
                  onChange={(e) =>
                    setCargoSuarec(parsePriceInput(e.target.value))
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white transition-all"
                />
              </div>

              {/* Códigos de regalo */}
              <div className="rounded-lg border border-gray-200 p-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-[#097EEC]" />
                    <span className="text-sm font-medium text-gray-700">
                      Generar códigos de regalo
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGenerarCodigos((v) => !v);
                      setErrors(
                        (prev) => ({ ...prev, _codigos: undefined }) as any,
                      );
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      generarCodigos ? "bg-[#097EEC]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        generarCodigos ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>

                {generarCodigos && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cantidad de códigos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={cantidadCodigos ?? ""}
                      onChange={(e) => {
                        setCantidadCodigos(
                          e.target.value ? Number(e.target.value) : undefined,
                        );
                        setErrors(
                          (prev) => ({ ...prev, _codigos: undefined }) as any,
                        );
                      }}
                      placeholder="Ej. 1000"
                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white transition-all ${
                        (errors as any)._codigos
                          ? "border-red-400"
                          : "border-gray-200"
                      }`}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Se sumarán al aforo del evento y podrás descargarlos en
                      Excel.
                    </p>
                    {(errors as any)._codigos && (
                      <p className="mt-1 text-xs text-red-500">
                        {(errors as any)._codigos}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#097EEC] rounded-lg hover:bg-[#0562C7] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creando..." : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
