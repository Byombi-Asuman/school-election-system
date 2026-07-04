import api from './api';
import { DashboardStats } from '../types';

export const dashboardService = {
  getAdminStats: () => api.get<DashboardStats>('/dashboard/admin').then((r) => r.data),
  getStudentDashboard: () => api.get('/dashboard/student').then((r) => r.data),
};
