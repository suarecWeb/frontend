"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  pushBroadcastAdminService,
  PushBroadcastItem,
} from "@/services/push-broadcast-admin.service";

const STATUS_CONFIG: Record<
  PushBroadcastItem["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pendiente", className: "bg-gray-100 text-gray-600" },
  processing: { label: "Enviando", className: "bg-blue-100 text-blue-600" },
  done: { label: "Enviado", className: "bg-green-100 text-green-700" },
  failed: { label: "Falló", className: "bg-red-100 text-red-700" },
};

const NotificationsHistory = () => {
  const [items, setItems] = useState<PushBroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    pushBroadcastAdminService
      .getHistory()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-[#097EEC]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-red-600">
        <AlertCircle className="h-6 w-6" />
        <p className="text-sm">
          No se pudo cargar el historial. Intenta de nuevo más tarde.
        </p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-10">
        Todavía no se ha enviado ninguna notificación.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = STATUS_CONFIG[item.status];
        return (
          <div
            key={item.id}
            className="rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-800 truncate">{item.title}</p>
              <p className="text-sm text-gray-500 truncate">{item.body}</p>
              <p className="text-xs text-gray-400 mt-1">
                {pushBroadcastAdminService.formatDate(item.createdAt)}
                {item.deepLink ? ` · redirige a ${item.deepLink}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}
              >
                {status.label}
              </span>
              {item.status === "done" && (
                <span className="text-xs text-gray-400">
                  {item.successCount} de {item.totalTokens ?? 0} exitosos
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationsHistory;
