export enum MetodoPagoFisico {
  EFECTIVO = "efectivo",
  TRANSFERENCIA = "transferencia",
}

export interface GenerarLoteFisicoDto {
  cantidad: number;
}

export interface GenerarLoteFisicoResponse {
  loteId: number;
  generadas: number;
}

export interface VenderBoletasFisicasDto {
  cantidad: number;
  metodoPago: MetodoPagoFisico;
  billeteRecibido?: number;
  tipoBoleta?: "GENERAL" | "VIP" | "PALCO" | "PALCO_INDIVIDUAL";
}

export interface VenderBoletasFisicasResponse {
  ventaId: number;
  boletaIds: string[];
  cambio: number | null;
}

export interface ValidarBoletaFisicaDto {
  qrToken: string;
}

export interface ValidarBoletaFisicaResponse {
  message: string;
  boleta: {
    id: string;
    estado: string;
    eventoId: number;
  };
}

export interface BoletaFisicaConQR {
  id: string;
  estado: string;
  qrToken: string;
  tipo?: "GENERAL" | "VIP" | "PALCO" | "PALCO_INDIVIDUAL" | null;
}

export interface VentaFisicaConBoletasResponse {
  ventaId: number;
  eventoId: number;
  // Datos del evento para armar/reimprimir el ticket (agregados 16/07/2026;
  // opcionales por compatibilidad con backend sin actualizar)
  eventoNombre?: string | null;
  eventoFecha?: string | null;
  eventoUbicacion?: string | null;
  eventoDescripcion?: string | null;
  eventoTipo?: "GENERAL" | "VIP" | "PALCO" | null;
  precioBase?: number | null;
  adminId: number;
  cantidad: number;
  metodoPago: MetodoPagoFisico;
  montoTotal: number;
  cambio: number | null;
  comision: number;
  createdAt: string;
  boletas: BoletaFisicaConQR[];
}

export interface ContarBoletasFisicasDisponiblesResponse {
  eventoId: number;
  disponibles: number;
  vendidas: number;
  total: number;
}

export interface ObtenerUltimoLoteFisicoResponse {
  loteId: number | null;
  cantidadGenerada: number | null;
  createdAt: string | null;
}

export interface LoteFisicoResumen {
  loteId: number;
  eventoId: number;
  eventoNombre: string;
  cantidadGenerada: number;
  impresas: number;
  disponibles: number;
  createdAt: string;
}
