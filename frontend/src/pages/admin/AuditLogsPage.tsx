import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState } from '../../components/ui';
import { Icons } from '../../components/ui/Icons';
import { auditService } from '../../services/auditService';
import { AuditLog } from '../../types';
import { getErrorMessage } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const actionColors: Record<string, string> = {
  LOGIN: 'badge-blue',
  LOGOUT: 'badge-gray',
  CREATE: 'badge-green',
  UPDATE: 'badge-yellow',
  DELETE: 'badge-red',
  APPROVE: 'badge-green',
  REJECT: 'badge-red',
  VOTE: 'badge-purple',
  EXPORT: 'badge-blue',
  IMPORT: 'badge-blue',
  SETTINGS_CHANGE: 'badge-yellow',
  PASSWORD_RESET: 'badge-red',
};

const actions = ['', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VOTE', 'EXPORT', 'IMPORT', 'SETTINGS_CHANGE', 'PASSWORD_RESET'];

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = useCallback(() => {
    setLoading(true);
    auditService.getAll({ action: actionFilter || undefined, page, limit })
      .then((res) => { setLogs(res.logs); setTotal(res.total); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [actionFilter, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout title="Audit Logs">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Complete history of administrative actions and login activity</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => { setActionFilter(a); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              actionFilter === a ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {a || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : logs.length === 0 ? (
        <div className="card"><EmptyState title="No audit logs found" icon={<Icons.Audit className="w-12 h-12" />} /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Entity</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><span className={actionColors[log.action] || 'badge-gray'}>{log.action}</span></td>
                  <td>
                    {log.user ? (
                      <>
                        <p className="font-medium text-slate-900">{log.user.firstName} {log.user.lastName}</p>
                        <p className="text-xs text-slate-400">{log.user.role.replace('_', ' ')}</p>
                      </>
                    ) : (
                      <span className="text-slate-400">System</span>
                    )}
                  </td>
                  <td>{log.entity || '—'}</td>
                  <td className="font-mono text-xs">{log.ipAddress || '—'}</td>
                  <td className="text-xs text-slate-500">{format(new Date(log.createdAt), 'MMM d, yyyy h:mm:ss a')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}</p>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AuditLogsPage;
