"use client";

import { useEffect, useState } from "react";
import {
  withdrawalAdminService,
  WithdrawalAdminItem,
} from "@/services/withdrawal-admin.service";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  ArrowRightLeft,
  ArrowDownCircle,
  Inbox,
  AlertCircle,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MovimientoView = "retiros" | "creditos";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  IN_PROGRESS: {
    label: "En proceso",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  COMPLETED: {
    label: "Completado",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  FAILED: {
    label: "Fallido",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const MovimientosManagement = () => {
  // "Créditos" todavía no tiene funcionalidad -- el botón queda visible
  // pero desactivado, mismo patrón que el ítem "Wallet" del sidebar antes
  // de activarlo (components/sidebarroot.tsx).
  const [view] = useState<MovimientoView>("retiros");
  const [withdrawals, setWithdrawals] = useState<WithdrawalAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  >("all");

  const [selected, setSelected] = useState<WithdrawalAdminItem | null>(null);
  const [wompiLoading, setWompiLoading] = useState(false);
  const [wompiData, setWompiData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [wompiError, setWompiError] = useState<string | null>(null);

  // Al abrir el modal, se consulta a Wompi EN VIVO (mismo patrón que
  // boletería con adminGetDetalleTransaccion) -- lo guardado localmente
  // puede no reflejar el estado real si algo falló entre medio.
  useEffect(() => {
    if (!selected) {
      setWompiData(null);
      setWompiError(null);
      return;
    }

    setWompiLoading(true);
    withdrawalAdminService
      .getDetalle(selected.id)
      .then((res) => {
        setSelected(res.withdrawal);
        setWompiData(res.wompiData);
        setWompiError(res.wompiError);
      })
      .catch(() => setWompiError("No se pudo consultar el estado en Wompi"))
      .finally(() => setWompiLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const fetchWithdrawals = async (
    targetPage: number,
    targetSearch: string,
    targetStatus: "all" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await withdrawalAdminService.getWithdrawals(
        targetPage,
        10,
        targetSearch,
        targetStatus === "all" ? undefined : targetStatus,
      );
      setWithdrawals(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (err) {
      setError("Error al cargar los retiros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    fetchWithdrawals(page, search, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  const handleStatusFilterChange = (
    value: "all" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
  ) => {
    setPage(1);
    setStatusFilter(value);
  };

  return (
    <div>
      {/* Selector Retiros / Créditos */}
      <div className="flex gap-2 mb-4">
        <button
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            view === "retiros"
              ? "bg-[#097EEC] text-white shadow-sm"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Retiros
        </button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed select-none">
                <ArrowDownCircle className="h-4 w-4" />
                Créditos
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Próximamente</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Búsqueda + filtro por estado + actualizar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#097EEC] focus:border-transparent"
          />
        </div>

        <div className="flex gap-1.5">
          {[
            { value: "all" as const, label: "Todos" },
            { value: "IN_PROGRESS" as const, label: "En proceso" },
            { value: "COMPLETED" as const, label: "Completados" },
            { value: "FAILED" as const, label: "Fallidos" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusFilterChange(opt.value)}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-[#097EEC] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchWithdrawals(page, search, statusFilter)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors sm:ml-auto"
          title="Actualizar movimientos"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#097EEC]" />
          <span className="ml-2 text-gray-600">Cargando movimientos...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin movimientos
          </h3>
          <p className="text-gray-500">
            {search || statusFilter !== "all"
              ? "Ningún retiro coincide con esos filtros."
              : "Todavía no hay ningún retiro registrado."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Comisión
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Banco
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {withdrawals.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => setSelected(w)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {w.userName}
                      </p>
                      <p className="text-xs text-gray-500">{w.userEmail}</p>
                      {w.environment !== "production" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 w-fit inline-block mt-0.5">
                          SANDBOX
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {withdrawalAdminService.formatCurrency(w.amount)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {withdrawalAdminService.formatCurrency(w.appliedFee)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {w.bankName ?? "—"}
                      {w.accountNumberLast4
                        ? ` ****${w.accountNumberLast4}`
                        : ""}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          STATUS_CONFIG[w.status]?.color ??
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {STATUS_CONFIG[w.status]?.icon}
                        {STATUS_CONFIG[w.status]?.label ?? w.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {withdrawalAdminService.formatDate(w.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Modal de detalle -- sin fetch extra, usa los datos que ya trae la fila */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-[#097EEC]" />
              Retiro - {selected?.userName}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Monto solicitado
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {withdrawalAdminService.formatCurrency(selected.amount)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Comisión
                  </label>
                  <p className="text-sm text-gray-900">
                    {withdrawalAdminService.formatCurrency(selected.appliedFee)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Neto enviado
                  </label>
                  <p className="text-sm text-gray-900">
                    {withdrawalAdminService.formatCurrency(selected.netAmount)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Estado
                  </label>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      STATUS_CONFIG[selected.status]?.color ??
                      "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {STATUS_CONFIG[selected.status]?.label ?? selected.status}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Banco
                  </label>
                  <p className="text-sm text-gray-900">
                    {selected.bankName ?? "—"}
                    {selected.accountNumberLast4
                      ? ` ****${selected.accountNumberLast4}`
                      : ""}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Ambiente
                  </label>
                  {selected.environment === "production" ? (
                    <p className="text-sm text-gray-900">Producción</p>
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 w-fit inline-block">
                      SANDBOX
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Fecha de solicitud
                  </label>
                  <p className="text-sm text-gray-900">
                    {withdrawalAdminService.formatDate(selected.createdAt)}
                  </p>
                </div>
                {selected.resolvedAt && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Fecha de resolución
                    </label>
                    <p className="text-sm text-gray-900">
                      {withdrawalAdminService.formatDate(selected.resolvedAt)}
                    </p>
                  </div>
                )}
                {selected.payoutId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      ID en la pasarela
                    </label>
                    <p className="text-xs text-gray-600 font-mono">
                      {selected.payoutId}
                    </p>
                  </div>
                )}
              </div>

              {/* Estado real en Wompi, consultado en vivo al abrir el modal */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Estado real en Wompi
                </p>
                {wompiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Consultando a Wompi...
                  </div>
                ) : wompiError ? (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <WifiOff className="h-4 w-4 flex-shrink-0" />
                    {wompiError}
                  </div>
                ) : wompiData ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                      <Wifi className="h-4 w-4 flex-shrink-0" />
                      Wompi respondió correctamente
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                          Estado en Wompi
                        </label>
                        <p className="text-sm font-semibold text-gray-900">
                          {String(wompiData.status ?? "—")}
                        </p>
                      </div>
                      {typeof wompiData.amountInCents === "number" && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                            Monto en Wompi
                          </label>
                          <p className="text-sm text-gray-900">
                            {withdrawalAdminService.formatCurrency(
                              (wompiData.amountInCents as number) / 100,
                            )}
                          </p>
                        </div>
                      )}
                      {typeof wompiData.reference === "string" && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                            Referencia
                          </label>
                          <p className="text-xs text-gray-600 font-mono break-all">
                            {wompiData.reference}
                          </p>
                        </div>
                      )}
                      {typeof wompiData.totalTransactions === "number" && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                            Transacciones
                          </label>
                          <p className="text-sm text-gray-900">
                            {wompiData.totalTransactions}
                          </p>
                        </div>
                      )}
                      {typeof wompiData.createdAt === "string" && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                            Fecha en Wompi
                          </label>
                          <p className="text-sm text-gray-900">
                            {withdrawalAdminService.formatDate(
                              wompiData.createdAt,
                            )}
                          </p>
                        </div>
                      )}
                      {typeof wompiData.statusMessage === "string" &&
                        wompiData.statusMessage && (
                          <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                              Mensaje
                            </label>
                            <p className="text-sm text-gray-900">
                              {wompiData.statusMessage}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                ) : null}
              </div>

              {selected.failureReason && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Motivo de fallo
                  </p>
                  <p className="text-sm text-red-600">
                    {selected.failureReason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MovimientosManagement;
