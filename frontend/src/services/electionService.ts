import api from './api';
import { Election, ElectionStatus } from '../types';

export const electionService = {
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/elections', { params }).then((r) => r.data as { elections: Election[]; total: number }),

  getOne: (id: string) => api.get<Election>(`/elections/${id}`).then((r) => r.data),

  create: (data: { title: string; description?: string; startDate: string; endDate: string; adminId?: string }) =>
    api.post<Election>('/elections', data).then((r) => r.data),

  update: (id: string, data: Partial<Election>) =>
    api.put<Election>(`/elections/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, status: ElectionStatus) =>
    api.patch<Election>(`/elections/${id}/status`, { status }).then((r) => r.data),

  remove: (id: string) => api.delete(`/elections/${id}`).then((r) => r.data),
};
