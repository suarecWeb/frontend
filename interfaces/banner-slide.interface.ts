import { Evento, EventoEstado, EventoModalidad } from "./event.interface";

/**
 * Slide del carousel del feed de la app móvil, gestionado desde el panel.
 *
 * El TIPO de slide no es un campo: se deduce de `eventId`.
 *   - eventId === null  -> slide LIBRE (imagen promocional, sin navegación)
 *   - eventId con valor -> slide CON EVENTO (muestra su info y lleva al detalle)
 *
 * Máximo 5 slides activos simultáneos (lo valida el backend, responde 400).
 */
export interface BannerSlide {
  id: number;
  /** URL pública en Supabase Storage. Siempre presente: la imagen es obligatoria. */
  imageUrl: string;
  title: string | null;
  description: string | null;
  eventId: number | null;
  /**
   * Evento embebido por el backend cuando eventId no es null.
   * Viene enriquecido con `imagenUrlMobile` (que NO es columna de la BD, la
   * calcula el backend en tiempo de ejecución).
   */
  evento: Evento | null;
  isActive: boolean;
  /**
   * Slide que se abre a pantalla completa al entrar a la app (la "bienvenida").
   * Es INDEPENDIENTE del orden del carousel. Solo uno puede tenerlo en true
   * (lo garantiza un índice único parcial en la BD).
   */
  autoOpen: boolean;
  /** Orden en el carousel, menor = primero. Puede tener huecos: los slides
   *  inactivos conservan su posición. */
  position: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Body de creación. La imagen NO va acá: viaja aparte como File en el FormData
 * y es obligatoria (el backend responde 400 si falta).
 *
 * Se sigue la convención del proyecto (CreateEventoDto en event.interface.ts).
 */
export interface CreateBannerSlideDto {
  title?: string;
  description?: string;
  /** Omitir = slide libre. Con número = vinculado a ese evento. */
  eventId?: number;
  /** Por defecto true en el backend: un slide nuevo nace publicado. */
  isActive?: boolean;
  /** Marca este slide como el de bienvenida. El backend desmarca el anterior. */
  autoOpen?: boolean;
}

/**
 * Body de edición. Todos los campos opcionales: lo que no se envía, no se toca.
 *
 * OJO con `eventId`, que tiene TRES estados y no dos:
 *   undefined -> no se envía, el slide conserva el evento que tuviera
 *   null      -> el servicio lo envía como "0" y el backend lo interpreta como
 *                QUITAR el evento (el slide pasa a ser libre)
 *   número    -> vincula ese evento
 *
 * Sin el estado `null` no habría forma de desvincular un evento una vez puesto.
 */
export interface UpdateBannerSlideDto {
  title?: string;
  description?: string;
  eventId?: number | null;
  isActive?: boolean;
  autoOpen?: boolean;
}

/** Body de PATCH /banner-slides/reorder: el orden COMPLETO deseado. */
export interface ReorderBannerSlidesPayload {
  ids: number[];
}

/** Tope de slides publicados a la vez. Debe coincidir con MAX_ACTIVE_SLIDES
 *  del backend; se duplica acá solo para mostrar el contador "X/5" en el panel.
 *  La validación real siempre la hace el backend. */
export const MAX_ACTIVE_BANNER_SLIDES = 5;

/** Estados en los que un evento se sigue publicando. Refleja ESTADOS_PUBLICABLES
 *  del backend: si cambia allá, hay que cambiarlo acá. */
const ESTADOS_PUBLICABLES: EventoEstado[] = [
  EventoEstado.PREVENTA,
  EventoEstado.VENTA,
];

/**
 * Motivo por el que un slide activo NO se está publicando en la app, o null si
 * sí se publica.
 *
 * El backend (findPublic → esEventoPublicable) descarta el slide cuando su
 * evento deja de ser válido. Un evento puede volverse inválido DESPUÉS de haber
 * sido enlazado, así que no basta con la validación del formulario.
 */
export const motivoEventoNoDisponible = (slide: BannerSlide): string | null => {
  if (slide.eventId === null) return null;
  if (!slide.evento) return "El evento ya no existe";

  const { visible, modalidad, estado } = slide.evento;

  if (visible === false) return "El evento está oculto";
  if (modalidad === EventoModalidad.FISICO)
    return "El evento pasó a boletería física";
  if (estado && !ESTADOS_PUBLICABLES.includes(estado))
    return estado === EventoEstado.CANCELADO
      ? "El evento fue cancelado"
      : "El evento ya cerró";

  return null;
};
