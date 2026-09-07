"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import RoleGuard from "@/components/role-guard";
import EventosFisicosManagement from "@/components/admin/boleteria-fisica/EventosFisicosManagement";
import VentasFisicasManagement from "@/components/admin/boleteria-fisica/VentasFisicasManagement";
import EstadisticasFisicasManagement from "@/components/admin/boleteria-fisica/EstadisticasFisicasManagement";
import LotesFisicosManagement from "@/components/admin/boleteria-fisica/LotesFisicosManagement";
import ConfiguracionFisicaManagement from "@/components/admin/boleteria-fisica/ConfiguracionFisicaManagement";
import {
  CalendarDays,
  Ticket,
  BarChart3,
  Settings,
  ArrowLeft,
  Printer,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BoleteriaFisicaTab =
  | "eventos"
  | "ventas"
  | "lotes"
  | "estadisticas"
  | "config";

const TAB_CONFIG: Record<
  BoleteriaFisicaTab,
  { label: string; icon: React.ReactNode; disabled?: boolean }
> = {
  eventos: {
    label: "Eventos",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  ventas: {
    label: "Ventas",
    icon: <Ticket className="h-4 w-4" />,
  },
  lotes: {
    label: "Lotes",
    icon: <Package className="h-4 w-4" />,
  },
  estadisticas: {
    label: "Estadísticas",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  config: {
    label: "Configuración",
    icon: <Settings className="h-4 w-4" />,
  },
};

const tabContentVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
};

const pageVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const BoleteriaFisicaPageContent = () => {
  const [activeTab, setActiveTab] = useState<BoleteriaFisicaTab>("eventos");

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <Navbar />
      <div className="bg-gray-50 min-h-screen pb-12 pt-16 lg:pt-20">
        <div className="bg-[#097EEC] text-white py-8 shadow-sm">
          <div className="container mx-auto px-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/boleteria" passHref>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Volver a Boletería"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Boletería Física</h1>
                <p className="mt-2 text-blue-100">
                  Venta presencial de boletas con impresión térmica 80mm
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
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(Object.keys(TAB_CONFIG) as BoleteriaFisicaTab[]).map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileTap={
                  TAB_CONFIG[tab].disabled ? undefined : { scale: 0.97 }
                }
                disabled={TAB_CONFIG[tab].disabled}
                title={
                  TAB_CONFIG[tab].disabled
                    ? "Deshabilitado hasta nueva venta en fisico"
                    : undefined
                }
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                  TAB_CONFIG[tab].disabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                    : activeTab === tab
                      ? "bg-[#097EEC] text-white shadow-md"
                      : "bg-white text-gray-600 hover:bg-gray-100 shadow"
                }`}
              >
                {TAB_CONFIG[tab].icon}
                {TAB_CONFIG[tab].label}
              </motion.button>
            ))}
          </div>

          {/* Contenido animado según tab activo */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabContentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {activeTab === "eventos" && <EventosFisicosManagement />}

                {activeTab === "ventas" && <VentasFisicasManagement />}

                {activeTab === "lotes" && <LotesFisicosManagement />}

                {activeTab === "estadisticas" && (
                  <EstadisticasFisicasManagement />
                )}

                {activeTab === "config" && <ConfiguracionFisicaManagement />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BoleteriaFisicaPage = () => (
  <RoleGuard allowedRoles={["ADMIN"]}>
    <BoleteriaFisicaPageContent />
  </RoleGuard>
);

export default BoleteriaFisicaPage;
