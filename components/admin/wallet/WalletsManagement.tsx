"use client";

import { useEffect, useState } from "react";
import {
  walletAdminService,
  WalletAdminItem,
  WalletTransactionAdminItem,
} from "@/services/wallet-admin.service";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Inbox,
  AlertCircle,
  MoreVertical,
  Lock,
  Unlock,
  Search,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  BLOCKED: "bg-red-100 text-red-700 border-red-200",
};

const WalletsManagement = () => {
  const [wallets, setWallets] = useState<WalletAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedUser, setSelectedUser] = useState<WalletAdminItem | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState<
    WalletTransactionAdminItem[]
  >([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);

  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [updatingStatusUserId, setUpdatingStatusUserId] = useState<
    number | null
  >(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ACTIVE" | "BLOCKED"
  >("all");

  const fetchWallets = async (
    targetPage: number,
    targetSearch: string,
    targetStatus: "all" | "ACTIVE" | "BLOCKED",
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await walletAdminService.getWallets(
        targetPage,
        10,
        targetSearch,
        targetStatus === "all" ? undefined : targetStatus,
      );
      setWallets(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (err) {
      setError("Error al cargar los wallets");
    } finally {
      setLoading(false);
    }
  };

  // Debounce: espera 400ms sin que el usuario escriba antes de buscar,
  // para no mandar una petición por cada letra.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    fetchWallets(page, search, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  const handleStatusFilterChange = (value: "all" | "ACTIVE" | "BLOCKED") => {
    setPage(1);
    setStatusFilter(value);
  };

  const fetchTransactions = async (userId: number, targetPage: number) => {
    setTxLoading(true);
    setTxError(null);
    try {
      const response = await walletAdminService.getUserTransactions(
        userId,
        targetPage,
        10,
      );
      setTransactions(response.data);
      setTxTotalPages(response.meta.totalPages);
    } catch (err) {
      setTxError("Error al cargar las transacciones de este usuario");
    } finally {
      setTxLoading(false);
    }
  };

  const handleRowClick = (wallet: WalletAdminItem) => {
    setSelectedUser(wallet);
    setShowModal(true);
    setTxPage(1);
    fetchTransactions(wallet.userId, 1);
  };

  const handleToggleStatus = async (
    wallet: WalletAdminItem,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    setOpenMenuUserId(null);
    const newStatus = wallet.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    setUpdatingStatusUserId(wallet.userId);

    try {
      await walletAdminService.updateWalletStatus(wallet.userId, newStatus);
      setWallets((prev) =>
        prev.map((w) =>
          w.userId === wallet.userId ? { ...w, status: newStatus } : w,
        ),
      );
      toast.success(
        newStatus === "BLOCKED" ? "Wallet bloqueada" : "Wallet desbloqueada",
      );
    } catch (err) {
      toast.error("Error al cambiar el estado de la wallet");
    } finally {
      setUpdatingStatusUserId(null);
    }
  };

  useEffect(() => {
    if (selectedUser && showModal) {
      fetchTransactions(selectedUser.userId, txPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txPage]);

  return (
    <div>
      {/* Búsqueda + filtro por estado */}
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
            { value: "ACTIVE" as const, label: "Activos" },
            { value: "BLOCKED" as const, label: "Bloqueados" },
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
          onClick={() => fetchWallets(page, search, statusFilter)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors sm:ml-auto"
          title="Actualizar wallets"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#097EEC]" />
          <span className="ml-2 text-gray-600">Cargando wallets...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin wallets
          </h3>
          <p className="text-gray-500">
            {search || statusFilter !== "all"
              ? "Ningún usuario coincide con esos filtros."
              : "Todavía no hay ningún usuario con wallet."}
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
                    Saldo
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Crédito acumulado
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Débito acumulado
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {wallets.map((wallet) => (
                  <tr
                    key={wallet.userId}
                    onClick={() => handleRowClick(wallet)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {wallet.userName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {wallet.userEmail}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {walletAdminService.formatCurrency(wallet.balance)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {walletAdminService.formatCurrency(wallet.creditBalance)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {walletAdminService.formatCurrency(wallet.debitBalance)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          STATUS_COLOR[wallet.status] ??
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {wallet.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuUserId(
                            openMenuUserId === wallet.userId
                              ? null
                              : wallet.userId,
                          );
                        }}
                        disabled={updatingStatusUserId === wallet.userId}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        {updatingStatusUserId === wallet.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        )}
                      </button>

                      {openMenuUserId === wallet.userId && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuUserId(null);
                            }}
                          />
                          <div className="absolute right-5 top-12 z-20 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-left">
                            <button
                              onClick={(e) => handleToggleStatus(wallet, e)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {wallet.status === "BLOCKED" ? (
                                <>
                                  <Unlock className="h-4 w-4 text-emerald-600" />
                                  Desbloquear wallet
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 text-red-600" />
                                  Bloquear wallet
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
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

      {/* Modal de transacciones del usuario */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#097EEC]" />
              Transacciones - {selectedUser?.userName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {txLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#097EEC]" />
                <span className="ml-2 text-gray-600">
                  Cargando transacciones...
                </span>
              </div>
            ) : txError ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-500">{txError}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Este usuario no tiene transacciones todavía.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {tx.type === "CREDIT" ? (
                          <ArrowUpCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {tx.reference}
                          </p>
                          <p className="text-xs text-gray-500">
                            {walletAdminService.formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            tx.type === "CREDIT"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {tx.type === "CREDIT" ? "+" : "-"}
                          {walletAdminService.formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {walletAdminService.formatCurrency(tx.balanceBefore)}{" "}
                          {"->"}{" "}
                          {walletAdminService.formatCurrency(tx.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={txPage}
                  totalPages={txTotalPages}
                  onPageChange={setTxPage}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletsManagement;
