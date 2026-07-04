import api from './api';
import { Candidate } from '../types';

export const candidateService = {
  getAll: (params?: { electionId?: string; positionId?: string; status?: string }) =>
    api.get<Candidate[]>('/candidates', { params }).then((r) => r.data),

  getOne: (id: string) => api.get<Candidate>(`/candidates/${id}`).then((r) => r.data),

  register: (formData: FormData) =>
    api.post<Candidate>('/candidates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  update: (id: string, formData: FormData) =>
    api.put<Candidate>(`/candidates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  approve: (id: string) => api.patch<Candidate>(`/candidates/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.patch<Candidate>(`/candidates/${id}/reject`, { reason }).then((r) => r.data),

  withdraw: (id: string) => api.patch<Candidate>(`/candidates/${id}/withdraw`).then((r) => r.data),

  remove: (id: string) => api.delete(`/candidates/${id}`).then((r) => r.data),
};
