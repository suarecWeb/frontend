"use client";

import { useState } from "react";
import Navbar from "@/components/navbar";
import AdminSidePanel from "@/components/AdminSidePanel";
import RoleGuard from "@/components/role-guard";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import EventsManagement from "@/components/admin/boleteria/shared/EventsManagement";
import BannerSlidesManagement from "@/components/admin/boleteria/digital/banners/BannerSlidesManagement";
import { EventoModalidad } from "@/interfaces/event.interface";
import VentasManagement from "@/components/admin/boleteria/digital/ventas/VentasManagement";
import EstadisticasManagement from "@/components/admin/boleteria/digital/estadisticas/EstadisticasManagement";
import ConfiguracionManagement from "@/components/admin/boleteria/digital/configuracion/ConfiguracionManagement";
import SoporteQRManagement from "@/components/admin/boleteria/digital/soporte/SoporteQRManagement";
import Link from "next/link";
import {
  CalendarDays,
  Ticket,
  BarChart3,
  Settings,
  QrCode,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BoleteriaTab =
  | "eventos"
  | "ventas"
  | "estadisticas"
  | "config"
  | "soporteqr";

const TAB_CONFIG: Record<
  BoleteriaTab,
  { label: string; icon: React.ReactNode }
> = {
  eventos: {
    label: "Eventos",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  ventas: {
    label: "Ventas",
    icon: <Ticket className="h-4 w-4" />,
  },
  estadisticas: {
    label: "Estadísticas",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  config: {
    label: "Configuración",
    icon: <Settings className="h-4 w-4" />,
  },
  soporteqr: {
    label: "Soporte QR",
    icon: <QrCode className="h-4 w-4" />,
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

const BoleteriaPageContent = () => {
  const { width: panelWidth, onMouseDown: onPanelDrag } = useResizablePanel();
  const [activeTab, setActiveTab] = useState<BoleteriaTab>("eventos");

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <Navbar />
      <div className="bg-gray-50 min-h-screen pb-12 pt-16 lg:pt-20">
        <div className="bg-[#097EEC] text-white py-8 shadow-sm">
          <div className="container mx-auto px-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Boletería</h1>
              <p className="mt-2 text-blue-100">
                Gestión de eventos, ventas y estadísticas de boletería
              </p>
            </div>

            <Link href="/admin/boleteria_fisica" passHref>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm bg-white text-[#097EEC] hover:bg-blue-50 shadow"
              >
                <Printer className="h-4 w-4" />
                Boletería Física
              </motion.button>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-4 flex">
          <div
            className="hidden md:flex flex-col gap-[24px] flex-shrink-0"
            style={{ width: panelWidth }}
          >
            <AdminSidePanel />
          </div>

          <div
            className="hidden md:flex items-center justify-center w-3 flex-shrink-0 cursor-col-resize group select-none"
            onMouseDown={onPanelDrag}
          >
            <div className="w-0.5 h-12 rounded-full bg-gray-200 group-hover:bg-[#097EEC] transition-colors duration-150" />
          </div>

          <div className="flex-1 min-w-0 ml-3">
            {/* Tabs al margen superior */}
            <div className="flex gap-2 mb-4">
              {(Object.keys(TAB_CONFIG) as BoleteriaTab[]).map((tab) => (
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
                  {activeTab === "eventos" && (
                    <>
                      {/* Gestor de banners: hermano ARRIBA de la lista, no
                          anidado dentro de EventsManagement (ese componente
                          lo comparten boletería digital y física). */}
                      <BannerSlidesManagement />
                      <EventsManagement
                        filtroModalidad={EventoModalidad.DIGITAL}
                      />
                    </>
                  )}

                  {activeTab === "ventas" && <VentasManagement />}

                  {activeTab === "estadisticas" && <EstadisticasManagement />}

                  {activeTab === "config" && <ConfiguracionManagement />}

                  {activeTab === "soporteqr" && <SoporteQRManagement />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BoleteriaPage = () => (
  <RoleGuard allowedRoles={["ADMIN"]}>
    <BoleteriaPageContent />
  </RoleGuard>
);

export default BoleteriaPage;
