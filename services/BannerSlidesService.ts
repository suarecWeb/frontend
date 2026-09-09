import api from "./axios_config";
import {
  BannerSlide,
  CreateBannerSlideDto,
  UpdateBannerSlideDto,
} from "@/interfaces/banner-slide.interface";

const BASE = "/suarec/banner-slides";

/**
 * Serializa el DTO a multipart/form-data.
 *
 * eventId tiene tres estados al editar:
 *   undefined -> no se envía (el backend no lo toca)
 *   null      -> se envía "0" (el backend lo interpreta como "quitar evento")
 *   número    -> se envía tal cual
 */
const toFormData = (
  dto: CreateBannerSlideDto | UpdateBannerSlideDto,
  imageFile?: File,
): FormData => {
  const form = new FormData();

  if (dto.title !== undefined) form.append("title", dto.title);
  if (dto.description !== undefined)
    form.append("description", dto.description);
  if (dto.isActive !== undefined) form.append("isActive", String(dto.isActive));
  if (dto.autoOpen !== undefined) form.append("autoOpen", String(dto.autoOpen));
  if (dto.eventId !== undefined) {
    form.append("eventId", dto.eventId === null ? "0" : String(dto.eventId));
  }
  if (imageFile) form.append("image", imageFile);

  return form;
};

const BannerSlidesService = {
  /** Todos los slides (activos e inactivos), ordenados por position. */
  getAllAdmin: (): Promise<{ data: BannerSlide[] }> =>
    api.get(`${BASE}/admin/all`),

  create: (
    dto: CreateBannerSlideDto,
    imageFile: File,
  ): Promise<{ data: BannerSlide }> =>
    api.post(BASE, toFormData(dto, imageFile), {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (
    id: number,
    dto: UpdateBannerSlideDto,
    imageFile?: File,
  ): Promise<{ data: BannerSlide }> =>
    api.patch(`${BASE}/${id}`, toFormData(dto, imageFile), {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  setActive: (id: number, isActive: boolean): Promise<{ data: BannerSlide }> =>
    api.patch(`${BASE}/${id}/active`, { isActive }),

  /** El backend exige el orden COMPLETO: todos los ids, sin excepción. */
  reorder: (ids: number[]): Promise<{ data: BannerSlide[] }> =>
    api.patch(`${BASE}/reorder`, { ids }),

  remove: (id: number): Promise<void> => api.delete(`${BASE}/${id}`),
};

export default BannerSlidesService;
