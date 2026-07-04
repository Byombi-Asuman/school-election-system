import api from './api';
import { Announcement } from '../types';

export const announcementService = {
  getAll: (params?: { electionId?: string; active?: boolean }) =>
    api.get<Announcement[]>('/announcements', { params }).then((r) => r.data),

  create: (data: { electionId?: string; title: string; content: string }) =>
    api.post<Announcement>('/announcements', data).then((r) => r.data),

  update: (id: string, data: Partial<Announcement>) =>
    api.put<Announcement>(`/announcements/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/announcements/${id}`).then((r) => r.data),
};
