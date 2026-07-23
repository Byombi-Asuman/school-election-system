import api from './api';
import { Student } from '../types';

export const studentService = {
  getAll: (params?: { search?: string; class?: string; house?: string; isEligible?: boolean; page?: number; limit?: number }) =>
    api.get('/students', { params }).then((r) => r.data as { students: Student[]; total: number; page: number; limit: number }),

  getOne: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),

  create: (data: { email: string; firstName: string; lastName: string; admissionNumber: string; class: string; stream?: string; house?: string; year: number }) =>
    api.post<{ message: string; username: string }>('/students', data).then((r) => r.data),

  update: (id: string, data: Partial<Student> & { firstName?: string; lastName?: string; isActive?: boolean }) =>
    api.put(`/students/${id}`, data).then((r) => r.data),

  toggleEligibility: (id: string) =>
    api.patch<{ isEligible: boolean }>(`/students/${id}/eligibility`).then((r) => r.data),

  toggleActive: (id: string) =>
    api.patch<{ isActive: boolean }>(`/students/${id}/active`).then((r) => r.data),
  
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data as { created: number; skipped: number; errors: string[] });
  },

  remove: (id: string) => api.delete(`/students/${id}`).then((r) => r.data),
};
