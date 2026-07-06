import api from './api';

export interface ElectionAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  _count?: { managedElections: number };
}

export const adminService = {
  getAll: () => api.get('/admins').then((r) => r.data as { admins: ElectionAdmin[] }),

  getOne: (id: string) => api.get(`/admins/${id}`).then((r) => r.data),

  create: (data: { email: string; firstName: string; lastName: string }) =>
    api.post('/admins', data).then((r) => r.data as { message: string; admin: ElectionAdmin; tempPassword: string }),

  update: (id: string, data: { firstName?: string; lastName?: string; isActive?: boolean }) =>
    api.put(`/admins/${id}`, data).then((r) => r.data as ElectionAdmin),

  resetPassword: (id: string) =>
    api.patch(`/admins/${id}/reset-password`).then((r) => r.data as { message: string; tempPassword: string }),

  remove: (id: string) => api.delete(`/admins/${id}`).then((r) => r.data as { message: string }),
};
