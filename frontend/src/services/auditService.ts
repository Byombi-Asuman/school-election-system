import api from './api';
import { AuditLog } from '../types';

export const auditService = {
  getAll: (params?: { action?: string; entity?: string; page?: number; limit?: number; from?: string; to?: string }) =>
    api.get('/audit', { params }).then((r) => r.data as { logs: AuditLog[]; total: number; page: number; limit: number }),
};
