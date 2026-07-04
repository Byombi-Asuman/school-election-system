import api from './api';
import { Position } from '../types';

export const positionService = {
  getAll: (electionId?: string) =>
    api.get<Position[]>('/positions', { params: { electionId } }).then((r) => r.data),

  create: (data: { electionId: string; title: string; description?: string; maxWinners: number; maxContestants: number; order?: number }) =>
    api.post<Position>('/positions', data).then((r) => r.data),

  update: (id: string, data: Partial<Position>) =>
    api.put<Position>(`/positions/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/positions/${id}`).then((r) => r.data),
};
