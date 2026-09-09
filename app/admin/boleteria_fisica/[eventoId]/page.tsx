"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import RoleGuard from "@/components/role-guard";
import { VentaFisicaPanel } from "@/components/admin/boleteria/fisica/VentaFisicaPanel";
import { LotesFisicosPanel } from "@/components/admin/boleteria/fisica/LotesFisicosPanel";
import { EVENTOS_FISICOS_MOCK } from "@/components/admin/boleteria/fisica/mocks/eventos-fisicos.mock";
import EventsService from "@/services/EventsService";
import { Evento } from "@/interfaces/event.interface";
import {
  ArrowLeft,
  Printer,
  CalendarDays,
  ShoppingCart,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDisplayDate } from "@/lib/TimeZone";
import toast from "react-hot-toast";

type BoleteriaFisicaTab = "venta" | "lotes";

const TAB_CONFIG: Record<
  BoleteriaFisicaTab,
  { label: string; icon: React.ReactNode }
> = {
  venta: {
    label: "Venta",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  lotes: {
    label: "Lotes",
    icon: <Package className="h-4 w-4" />,
  },
};

const pageVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const BoleteriaFisicaDetalleContent = () => {
  const params = useParams();
  const router = useRouter();

  const eventoId = Number(params.eventoId);
  const [evento, setEvento] = useState<Evento | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BoleteriaFisicaTab>("venta");

  useEffect(() => {
    if (Number.isNaN(eventoId)) {
      toast.error("ID de evento inválido");
      router.replace("/admin/boleteria_fisica");
      return;
    }

    const eventoMock = EVENTOS_FISICOS_MOCK.find((e) => e.id === eventoId);
    if (eventoMock) {
      setEvento(eventoMock);
      setLoading(false);
      return;
    }

    EventsService.getEventById(eventoId)
      .then((res) => setEvento(res.data))
      .catch(() => {
        toast.error("No se pudo cargar el evento");
        router.replace("/admin/boleteria_fisica");
      })
      .finally(() => setLoading(false));
  }, [eventoId, router]);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <Navbar />
      <div className="bg-gray-50 min-h-screen pb-12 pt-16 lg:pt-20">
        <div className="bg-[#097EEC] text-white py-8 shadow-sm">
          <div className="container mx-auto px-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/boleteria_fisica" passHref>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Volver a Boletería Física"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Venta física</h1>
                <p className="mt-2 text-blue-100 flex items-center gap-2">
                  {loading ? (
                    "Cargando evento..."
                  ) : evento ? (
                    <>
                      <CalendarDays className="h-4 w-4" />
                      {evento.nombre}
                      <span className="text-blue-200">·</span>
                      <span className="text-blue-100">
                        {formatDisplayDate(evento.fechaEvento)}
                      </span>
                    </>
                  ) : (
                    "Evento no encontrado"
                  )}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white">
              <Printer className="h-4 w-4" />
              POS-80C
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-4">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 py-20 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#097EEC] border-t-transparent mx-auto mb-3" />
              <p className="text-sm text-gray-400">Cargando evento...</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {(Object.keys(TAB_CONFIG) as BoleteriaFisicaTab[]).map(
                  (tab) => (
                    <motion.button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      whileTap={{ scale: 0.97 }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                        activeTab === tab
                          ? "bg-[#097EEC] text-white shadow-md"
                          : "bg-white text-gray-600 hover:bg-gray-100 shadow"
                      }`}
                    >
                      {TAB_CONFIG[tab].icon}
                      {TAB_CONFIG[tab].label}
                    </motion.button>
                  ),
                )}
              </div>

              {/* Contenido según tab */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {activeTab === "venta" && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                      <VentaFisicaPanel
                        evento={evento}
                        onBack={() => router.push("/admin/boleteria_fisica")}
                      />
                    </div>
                  )}

                  {activeTab === "lotes" && (
                    <LotesFisicosPanel evento={evento} />
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const BoleteriaFisicaDetallePage = () => (
  <RoleGuard allowedRoles={["ADMIN"]}>
    <BoleteriaFisicaDetalleContent />
  </RoleGuard>
);

export default BoleteriaFisicaDetallePage;
