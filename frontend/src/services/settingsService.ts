import api from './api';
import { School, PublicSchoolSettings } from '../types';

export const settingsService = {
  get: () => api.get<School>('/settings').then((r) => r.data),

  getPublic: () => api.get<PublicSchoolSettings>('/settings/public').then((r) => r.data),

  update: (formData: FormData) =>
    api.put<School>('/settings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  addHeroImages: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return api.post<School>('/settings/hero-images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  removeHeroImage: (url: string) =>
    api.delete<School>('/settings/hero-images', { data: { url } }).then((r) => r.data),
};
