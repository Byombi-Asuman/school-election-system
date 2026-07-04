import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, StatusBadge, EmptyState } from '../../components/ui';
import { Icons } from '../../components/ui/Icons';
import { TurnoutBarChart, VoteDoughnutChart } from '../../components/charts/Charts';
import { dashboardService } from '../../services/dashboardService';
import { DashboardStats } from '../../types';
import { getErrorMessage } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }> = ({
  label, value, icon, color, sub,
}) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold font-display text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const actionLabel: Record<string, string> = {
  LOGIN: 'logged in',
  LOGOUT: 'logged out',
  CREATE: 'created a record',
  UPDATE: 'updated a record',
  DELETE: 'deleted a record',
  APPROVE: 'approved a candidate',
  REJECT: 'rejected a candidate',
  VOTE: 'cast a vote',
  EXPORT: 'exported data',
  IMPORT: 'imported data',
  SETTINGS_CHANGE: 'changed settings',
  PASSWORD_RESET: 'reset a password',
};

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getAdminStats()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout title="Dashboard"><PageLoader /></DashboardLayout>;
  if (!data) return <DashboardLayout title="Dashboard"><EmptyState title="Failed to load dashboard" /></DashboardLayout>;

  const { stats, elections, recentActivity, announcements } = data;

  const turnoutLabels = elections.map((e) => e.title.length > 18 ? e.title.slice(0, 18) + '…' : e.title);
  const turnoutData = elections.map((e) => e.turnoutPercent);

  const voteDistLabels = elections.map((e) => e.title.length > 15 ? e.title.slice(0, 15) + '…' : e.title);
  const voteDistData = elections.map((e) => e.voteCount);

  return (
    <DashboardLayout title="Dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back 👋</h1>
          <p className="page-subtitle">Here's what's happening with your elections today.</p>
        </div>
        <Link to="/admin/elections" className="btn-primary">
          <Icons.Plus className="w-4 h-4" /> New Election
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Registered Voters"
          value={stats.totalStudents}
          sub={`${stats.eligibleVoters} eligible`}
          color="bg-primary-100 text-primary-700"
          icon={<Icons.Students className="w-6 h-6" />}
        />
        <StatCard
          label="Total Candidates"
          value={stats.totalCandidates}
          sub="Approved candidates"
          color="bg-purple-100 text-purple-700"
          icon={<Icons.Candidate className="w-6 h-6" />}
        />
        <StatCard
          label="Votes Cast"
          value={stats.totalVotes}
          sub="Across all elections"
          color="bg-emerald-100 text-emerald-700"
          icon={<Icons.Vote className="w-6 h-6" />}
        />
        <StatCard
          label="Open Elections"
          value={stats.openElections}
          sub={`${stats.totalElections} total elections`}
          color="bg-amber-100 text-amber-700"
          icon={<Icons.Election className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Turnout chart */}
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Voter Turnout</h3>
              <p className="text-xs text-slate-500">By election</p>
            </div>
          </div>
          <div className="card-body h-72">
            {elections.length > 0 ? (
              <TurnoutBarChart labels={turnoutLabels} data={turnoutData} />
            ) : (
              <EmptyState title="No elections yet" description="Create your first election to see turnout data." />
            )}
          </div>
        </div>

        {/* Vote distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Vote Distribution</h3>
            <p className="text-xs text-slate-500">Votes per election</p>
          </div>
          <div className="card-body h-72">
            {elections.some(e => e.voteCount > 0) ? (
              <VoteDoughnutChart labels={voteDistLabels} data={voteDistData} />
            ) : (
              <EmptyState title="No votes yet" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Elections overview */}
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Elections Overview</h3>
            <Link to="/admin/elections" className="text-sm font-medium text-primary-600 hover:text-primary-700">View all →</Link>
          </div>
          {elections.length === 0 ? (
            <div className="card-body"><EmptyState title="No elections yet" /></div>
          ) : (
            <div className="table-container border-0 rounded-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>Election</th>
                    <th>Status</th>
                    <th>Turnout</th>
                    <th>Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {elections.map((e) => (
                    <tr key={e.id}>
                      <td className="font-medium text-slate-900">
                        <Link to={`/admin/elections/${e.id}`} className="hover:text-primary-600">{e.title}</Link>
                      </td>
                      <td><StatusBadge status={e.status} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${e.turnoutPercent}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{e.turnoutPercent}%</span>
                        </div>
                      </td>
                      <td>{e.voteCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            <Link to="/admin/audit-logs" className="text-sm font-medium text-primary-600 hover:text-primary-700">View all →</Link>
          </div>
          <div className="card-body space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
            {recentActivity.length === 0 && <EmptyState title="No recent activity" />}
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icons.Audit className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}</span>{' '}
                    {actionLabel[log.action] || log.action.toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Icons.Megaphone className="w-4 h-4 text-primary-600" /> Active Announcements
            </h3>
          </div>
          <div className="card-body grid sm:grid-cols-2 gap-4">
            {announcements.map((a) => (
              <div key={a.id} className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                <p className="font-medium text-primary-900 text-sm">{a.title}</p>
                <p className="text-sm text-primary-700 mt-1 line-clamp-2">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboardPage;
