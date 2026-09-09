"use client";

import { useState, useRef } from "react";
import {
  Search,
  Mail,
  Ticket,
  CheckCircle,
  XCircle,
  Inbox,
  SendHorizonal,
  FileText,
  AlertCircle,
  RefreshCw,
  QrCode,
  User,
  Phone,
  CreditCard,
  ShieldCheck,
  ShieldX,
  Zap,
} from "lucide-react";
import EventsService from "@/services/EventsService";
import {
  BoletaSoporte,
  BoletaEstado,
  ValidacionUsuario,
} from "@/interfaces/boleta.interface";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const ESTADO_CONFIG: Record<
  BoletaEstado,
  { label: string; color: string; icon: React.ReactNode }
> = {
  [BoletaEstado.ACTIVA]: {
    label: "Activa",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  [BoletaEstado.USADA]: {
    label: "Usada",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: <Ticket className="h-3 w-3" />,
  },
  [BoletaEstado.CANCELADA]: {
    label: "Cancelada",
    color: "bg-red-100 text-red-600 border-red-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(v);

const VALIDACION_ITEMS: {
  key: keyof ValidacionUsuario;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "nombre", label: "Nombre", icon: <User className="h-3 w-3" /> },
  { key: "telefono", label: "Teléfono", icon: <Phone className="h-3 w-3" /> },
  { key: "cedula", label: "Cédula", icon: <CreditCard className="h-3 w-3" /> },
  { key: "email", label: "Correo", icon: <Mail className="h-3 w-3" /> },
];

const VALIDACION_VACIA: ValidacionUsuario = {
  nombre: false,
  telefono: false,
  cedula: false,
  email: false,
};

const ValidacionBar = ({
  validacion,
}: {
  validacion?: ValidacionUsuario | null;
}) => {
  const datos = validacion ?? VALIDACION_VACIA;
  const total = VALIDACION_ITEMS.length;
  const completos = VALIDACION_ITEMS.filter((i) => datos[i.key]).length;
  const todoOk = completos === total;

  return (
    <div className="flex items-center gap-2 pt-1 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-medium ${todoOk ? "text-emerald-600" : "text-amber-600"}`}
      >
        {todoOk ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <ShieldX className="h-3 w-3" />
        )}
        {completos}/{total} verificados
      </span>
      <div className="flex items-center gap-1.5">
        {VALIDACION_ITEMS.map((item) => (
          <span
            key={item.key}
            title={item.label}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
              datos[item.key]
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-gray-50 text-gray-400 border-gray-200 line-through"
            }`}
          >
            {item.icon}
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));

const SoporteQRManagement = () => {
  const [email, setEmail] = useState("");
  const [boletas, setBoletas] = useState<BoletaSoporte[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [newBoletaId, setNewBoletaId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFirstIdRef = useRef<number | null>(null);

  const [txIdInput, setTxIdInput] = useState("");
  const [wompiTxIdInput, setWompiTxIdInput] = useState("");
  const [forzando, setForzando] = useState(false);
  const [forzarResult, setForzarResult] = useState<{
    generado: boolean;
    boletaIds: number[];
  } | null>(null);

  const [reenvioTxIdInput, setReenvioTxIdInput] = useState("");
  const [reenvioEmailInput, setReenvioEmailInput] = useState("");
  const [reenviando, setReenviando] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await EventsService.adminGetBoletasSoporte(
        email.trim() || undefined,
      );
      setBoletas(data.boletas);
      setLastRefreshed(new Date());

      const firstId = data.boletas[0]?.boletaId ?? null;
      if (firstId && firstId !== prevFirstIdRef.current) {
        setNewBoletaId(firstId);
        setTimeout(() => setNewBoletaId(null), 4000);
      }
      prevFirstIdRef.current = firstId;
    } catch {
      toast.error("No se pudo cargar las boletas");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleReenviar = async (boleta: BoletaSoporte) => {
    setSending(boleta.boletaId);
    try {
      await EventsService.adminReenviarEmail(boleta.boletaId);
      toast.success(`Email reenviado a ${boleta.compradorEmail}`);
    } catch {
      toast.error("No se pudo reenviar el email");
    } finally {
      setSending(null);
    }
  };

  const handleForzarGeneracion = async () => {
    const id = parseInt(txIdInput.trim(), 10);
    if (!id || isNaN(id)) {
      toast.error("Ingresa un ID de transacción válido");
      return;
    }
    const wompiTransactionId = wompiTxIdInput.trim();
    if (!wompiTransactionId) {
      toast.error(
        "Ingresa el ID de transacción de Wompi para verificar el pago",
      );
      return;
    }
    setForzando(true);
    setForzarResult(null);
    try {
      const { data } = await EventsService.adminForzarGeneracion(
        id,
        wompiTransactionId,
      );
      setForzarResult(data);
      if (data.generado) {
        toast.success(`Boletas generadas: IDs ${data.boletaIds.join(", ")}`);
      } else {
        toast.success(
          `Transacción ya aprobada. Boletas: ${data.boletaIds.join(", ")}`,
        );
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al forzar generación";
      toast.error(msg);
    } finally {
      setForzando(false);
    }
  };

  const handleReenviarPorTransaccion = async () => {
    const id = parseInt(reenvioTxIdInput.trim(), 10);
    if (!id || isNaN(id)) {
      toast.error("Ingresa un ID de transacción válido");
      return;
    }
    const correo = reenvioEmailInput.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(correo)) {
      toast.error("Ingresa un correo válido");
      return;
    }
    setReenviando(true);
    try {
      const { data } = await EventsService.adminReenviarBoletasPorTransaccion(
        id,
        correo,
      );
      toast.success(
        `${data.enviadas} boleta${data.enviadas !== 1 ? "s" : ""} reenviada${
          data.enviadas !== 1 ? "s" : ""
        } a ${data.email}`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudieron reenviar las boletas";
      toast.error(msg);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-[#097EEC]/10">
          <Ticket className="h-4 w-4 text-[#097EEC]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Soporte QR</h2>
          <p className="text-xs text-gray-400">
            Reenvía el email de confirmación con el QR cuando el usuario no lo
            recibió
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Buscar por email del comprador
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="correo@ejemplo.com"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-[#097EEC]/20 focus:border-[#097EEC] focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#097EEC] rounded-lg hover:bg-[#0562C7] disabled:opacity-60 transition-colors"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
          {email && (
            <button
              onClick={() => {
                setEmail("");
                setBoletas([]);
                setSearched(false);
                inputRef.current?.focus();
              }}
              className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          Deja el campo vacío y presiona Buscar para ver las 50 boletas más
          recientes
        </p>
      </div>

      {/* Forzar generación de boletas */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-amber-600" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Forzar generación de boletas
            </p>
            <p className="text-[11px] text-amber-600">
              Usa esto cuando Wompi cobró pero SUAREC no generó las boletas. Se
              verifica el pago en Wompi antes de generar — necesitas el ID de
              transacción interno y el ID de transacción de Wompi.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            value={txIdInput}
            onChange={(e) => {
              setTxIdInput(e.target.value);
              setForzarResult(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleForzarGeneracion()}
            placeholder="ID de transacción interno (ej: 279)"
            className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
          />
          <input
            type="text"
            value={wompiTxIdInput}
            onChange={(e) => {
              setWompiTxIdInput(e.target.value);
              setForzarResult(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleForzarGeneracion()}
            placeholder="ID de transacción de Wompi"
            className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
          />
          <button
            onClick={handleForzarGeneracion}
            disabled={forzando || !txIdInput.trim() || !wompiTxIdInput.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
          >
            {forzando ? (
              <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {forzando ? "Verificando…" : "Forzar"}
          </button>
        </div>

        {forzarResult && (
          <div
            className={`mt-3 p-3 rounded-lg border text-xs ${forzarResult.generado ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}
          >
            {forzarResult.generado ? (
              <>
                <span className="font-semibold">
                  Boletas generadas correctamente.
                </span>{" "}
                IDs: {forzarResult.boletaIds.join(", ")}
              </>
            ) : (
              <>
                <span className="font-semibold">Ya estaban generadas.</span> IDs
                existentes: {forzarResult.boletaIds.join(", ")}
              </>
            )}
          </div>
        )}
      </div>

      {/* Reenviar boletas a un correo */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <SendHorizonal className="h-4 w-4 text-sky-600" />
          <div>
            <p className="text-xs font-semibold text-sky-800">
              Reenviar boletas a un correo
            </p>
            <p className="text-[11px] text-sky-600">
              Reenvía las boletas ya generadas de una transacción aprobada a un
              correo real. Útil cuando el usuario entró con Apple y ocultó su
              correo. No genera boletas nuevas.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            value={reenvioTxIdInput}
            onChange={(e) => setReenvioTxIdInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && handleReenviarPorTransaccion()
            }
            placeholder="ID de transacción (ej: 279)"
            className="flex-1 px-3 py-2 text-sm border border-sky-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
          />
          <input
            type="email"
            value={reenvioEmailInput}
            onChange={(e) => setReenvioEmailInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && handleReenviarPorTransaccion()
            }
            placeholder="correo@ejemplo.com"
            className="flex-1 px-3 py-2 text-sm border border-sky-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
          />
          <button
            onClick={handleReenviarPorTransaccion}
            disabled={
              reenviando ||
              !reenvioTxIdInput.trim() ||
              !reenvioEmailInput.trim()
            }
            className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-60 transition-colors flex items-center gap-1.5"
          >
            {reenviando ? (
              <div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <SendHorizonal className="h-3.5 w-3.5" />
            )}
            {reenviando ? "Enviando…" : "Reenviar"}
          </button>
        </div>
      </div>

      {/* Resultados */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 flex flex-col items-center gap-2 text-gray-400"
          >
            <div className="h-6 w-6 border-2 border-[#097EEC]/30 border-t-[#097EEC] rounded-full animate-spin" />
            <span className="text-sm">Buscando boletas…</span>
          </motion.div>
        ) : searched && boletas.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="py-16 flex flex-col items-center gap-2 text-gray-400"
          >
            <Inbox className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No se encontraron boletas
            </p>
            {email && (
              <p className="text-xs text-gray-400">
                No hay boletas para <span className="font-medium">{email}</span>
              </p>
            )}
          </motion.div>
        ) : boletas.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {/* Barra de resultados + refresh */}
            <div className="flex items-center justify-between px-0.5">
              <p className="text-xs text-gray-400">
                {boletas.length} boleta{boletas.length !== 1 ? "s" : ""}{" "}
                encontrada{boletas.length !== 1 ? "s" : ""}
                {lastRefreshed && (
                  <span className="ml-1.5 text-gray-300">
                    ·{" "}
                    {lastRefreshed.toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                )}
              </p>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                />
                Actualizar
              </button>
            </div>

            {boletas.map((boleta, index) => {
              const estadoCfg = ESTADO_CONFIG[boleta.estado];
              const isSending = sending === boleta.boletaId;
              const isNewest = index === 0 && newBoletaId === boleta.boletaId;
              const tokenShort = boleta.qrToken.slice(0, 22) + "…";

              return (
                <motion.div
                  key={boleta.boletaId}
                  initial={isNewest ? { scale: 1.01 } : false}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`border rounded-xl p-4 shadow-sm transition-colors duration-700 ${
                    isNewest
                      ? "bg-[#097EEC]/5 border-[#097EEC]/30"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Evento + estado + badge nueva */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {boleta.eventoNombre}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${estadoCfg.color}`}
                        >
                          {estadoCfg.icon}
                          {estadoCfg.label}
                        </span>
                        {isNewest && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#097EEC] text-white text-[11px] font-medium">
                            Nueva
                          </span>
                        )}
                      </div>

                      {/* Comprador */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          <span className="font-medium text-gray-700">
                            {boleta.compradorNombre}
                          </span>{" "}
                          · {boleta.compradorEmail}
                        </span>
                      </div>

                      {/* Validación del perfil del comprador */}
                      <ValidacionBar validacion={boleta.validacion} />

                      {/* Validación de entrega */}
                      <div className="flex items-center gap-3 text-[11px] flex-wrap pt-0.5">
                        {/* QR — siempre existe si la boleta existe */}
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <QrCode className="h-3 w-3" />
                          <span className="font-mono text-[10px] text-gray-400">
                            {tokenShort}
                          </span>
                        </span>
                        {/* PDF */}
                        {boleta.pdfUrl ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <FileText className="h-3 w-3" />
                            PDF listo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            PDF pendiente
                          </span>
                        )}
                      </div>

                      {/* Meta */}
                      <p className="text-[11px] text-gray-400">
                        Boleta #{boleta.boletaId} ·{" "}
                        {formatCurrency(boleta.precioPagado)} ·{" "}
                        {formatDate(boleta.createdAt)}
                      </p>
                    </div>

                    {/* Acción */}
                    <button
                      onClick={() => handleReenviar(boleta)}
                      disabled={isSending}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#097EEC] bg-[#097EEC]/8 border border-[#097EEC]/20 rounded-lg hover:bg-[#097EEC]/15 disabled:opacity-60 transition-colors"
                    >
                      {isSending ? (
                        <div className="h-3 w-3 border border-[#097EEC]/40 border-t-[#097EEC] rounded-full animate-spin" />
                      ) : (
                        <SendHorizonal className="h-3 w-3" />
                      )}
                      {isSending ? "Enviando…" : "Reenviar email"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default SoporteQRManagement;
