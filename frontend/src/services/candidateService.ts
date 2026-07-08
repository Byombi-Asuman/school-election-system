import api from './api';
import { Candidate } from '../types';

export const candidateService = {
  getAll: (params?: { electionId?: string; positionId?: string; status?: string }) =>
    api.get<Candidate[]>('/candidates', { params }).then((r) => r.data),

  getOne: (id: string) => api.get<Candidate>(`/candidates/${id}`).then((r) => r.data),

  register: (data: { electionId: string; positionId: string; studentId: string; manifesto: string; photo?: string | null }) =>
  api.post<Candidate>('/candidates', data).then((r) => r.data),

  update: (id: string, data: { manifesto?: string; photo?: string }) =>
  api.put<Candidate>(`/candidates/${id}`, data).then((r) => r.data),

  uploadPhoto: (file: File) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.post<{ url: string }>('/candidates/upload-photo', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.url);
},

  approve: (id: string) => api.patch<Candidate>(`/candidates/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.patch<Candidate>(`/candidates/${id}/reject`, { reason }).then((r) => r.data),

  withdraw: (id: string) => api.patch<Candidate>(`/candidates/${id}/withdraw`).then((r) => r.data),

  remove: (id: string) => api.delete(`/candidates/${id}`).then((r) => r.data),
};
