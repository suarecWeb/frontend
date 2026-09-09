"use client";

import { useState } from "react";
import EventsManagement from "@/components/admin/boleteria/shared/EventsManagement";
import { EventoModalidad } from "@/interfaces/event.interface";
import { EVENTOS_FISICOS_MOCK } from "./mocks/eventos-fisicos.mock";
import { Beaker, Database } from "lucide-react";

const EventosFisicosManagement = () => {
  const [usarMock, setUsarMock] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setUsarMock((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            usarMock
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {usarMock ? (
            <Database className="h-3.5 w-3.5" />
          ) : (
            <Beaker className="h-3.5 w-3.5" />
          )}
          {usarMock ? "Usando datos reales" : "Ver datos de prueba"}
        </button>
      </div>

      <EventsManagement
        modoFisico
        filtroModalidad={EventoModalidad.FISICO}
        eventosMock={usarMock ? EVENTOS_FISICOS_MOCK : undefined}
      />
    </div>
  );
};

export default EventosFisicosManagement;
