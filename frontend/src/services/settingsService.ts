import api from './api';
import { School } from '../types';

export const settingsService = {
  get: () => api.get<School>('/settings').then((r) => r.data),

  update: (formData: FormData) =>
    api.put<School>('/settings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
};
