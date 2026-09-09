"use client";

import { useState } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  pushBroadcastAdminService,
  PushBroadcastDeepLink,
} from "@/services/push-broadcast-admin.service";

const DEEP_LINK_OPTIONS: {
  value: PushBroadcastDeepLink | "";
  label: string;
}[] = [
  { value: "", label: "Sin redirección" },
  { value: PushBroadcastDeepLink.EVENTOS, label: "Eventos" },
];

const NotificationsSendForm = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState<PushBroadcastDeepLink | "">("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const isValid = title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setSending(true);
    try {
      await pushBroadcastAdminService.create({
        title: title.trim(),
        body: body.trim(),
        ...(deepLink ? { deepLink } : {}),
      });
      toast.success(
        "Notificación creada. Se enviará en unos segundos a todos los usuarios.",
      );
      setTitle("");
      setBody("");
      setDeepLink("");
      setConfirming(false);
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === "DAILY_LIMIT_REACHED") {
        toast.error("Ya se alcanzó el máximo de 3 notificaciones para hoy.");
      } else if (code === "MIN_INTERVAL_NOT_MET") {
        const remaining = error?.response?.data?.remainingMinutes;
        toast.error(
          remaining
            ? `Debes esperar ${remaining} minuto(s) más antes de enviar otra.`
            : "Debes esperar antes de enviar otra notificación.",
        );
      } else {
        toast.error("No se pudo crear la notificación. Intenta de nuevo.");
      }
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Ej: Nuevo evento disponible"
            disabled={confirming || sending}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#097EEC] disabled:bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Texto que se muestra en la notificación"
            disabled={confirming || sending}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#097EEC] disabled:bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">{body.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Redirección al tocar la notificación
          </label>
          <select
            value={deepLink}
            onChange={(e) =>
              setDeepLink(e.target.value as PushBroadcastDeepLink | "")
            }
            disabled={confirming || sending}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#097EEC] disabled:bg-gray-50"
          >
            {DEEP_LINK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {!confirming ? (
          <button
            type="submit"
            disabled={!isValid}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#097EEC] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Enviar
          </button>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2 text-amber-800 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Esta notificación se enviará a{" "}
                <strong>todos los usuarios</strong> de la app. Esta acción no se
                puede deshacer. ¿Confirmas?
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#097EEC] text-white disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Sí, enviar a todos
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default NotificationsSendForm;
