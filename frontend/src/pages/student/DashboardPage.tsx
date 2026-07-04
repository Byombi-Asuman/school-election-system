import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui';
import { Icons } from '../../components/ui/Icons';
import { dashboardService } from '../../services/dashboardService';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const StudentDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    dashboardService.getStudentDashboard()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout title="Dashboard"><PageLoader /></DashboardLayout>;
  if (!data) return <DashboardLayout title="Dashboard"><EmptyState title="Failed to load dashboard" /></DashboardLayout>;

  const { student, openElections, myVotes, announcements } = data;
  const pendingElections = openElections.filter((e: any) => e.positions.some((p: any) => !p.hasVoted));

  return (
    <DashboardLayout title="Dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hi, {user?.firstName}! 👋</h1>
          <p className="page-subtitle">{student?.class} {student?.stream ? `- ${student.stream}` : ''} · Admission No. {student?.admissionNumber}</p>
        </div>
      </div>

      {!student?.isEligible && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Icons.Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Voting eligibility restricted</p>
            <p className="text-sm text-amber-700">You are currently marked as ineligible to vote. Please contact the election administrator if you believe this is an error.</p>
          </div>
        </div>
      )}

      {pendingElections.length > 0 && student?.isEligible && (
        <div className="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
              <Icons.Vote className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-900">You have {pendingElections.length} election{pendingElections.length > 1 ? 's' : ''} awaiting your vote</p>
              <p className="text-xs text-primary-700">Your vote matters — cast it before the election closes.</p>
            </div>
          </div>
          <Link to="/student/vote" className="btn-primary btn-sm">Vote Now</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">Open Elections</h3>
          </div>
          {openElections.length === 0 ? (
            <div className="card-body"><EmptyState title="No open elections" description="Check back later for upcoming elections." icon={<Icons.Election className="w-10 h-10" />} /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {openElections.map((e: any) => {
                const allVoted = e.positions.every((p: any) => p.hasVoted);
                return (
                  <div key={e.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{e.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{e.positions.length} position{e.positions.length !== 1 ? 's' : ''}</p>
                    </div>
                    {allVoted ? (
                      <span className="badge-green flex items-center gap-1"><Icons.Check className="w-3 h-3" /> Voted</span>
                    ) : (
                      <Link to="/student/vote" className="btn-primary btn-sm shrink-0">Vote Now</Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Icons.Megaphone className="w-4 h-4 text-primary-600" /> Announcements
            </h3>
          </div>
          <div className="card-body space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
            {announcements.length === 0 && <EmptyState title="No announcements" />}
            {announcements.map((a: any) => (
              <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-600 mt-1 line-clamp-3">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {myVotes.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900">My Voting History</h3>
            <p className="text-xs text-slate-500">A record that you voted — your specific choices remain private to you.</p>
          </div>
          <div className="table-container border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Election</th>
                  <th>Position</th>
                  <th>Voted At</th>
                </tr>
              </thead>
              <tbody>
                {myVotes.map((v: any) => (
                  <tr key={v.id}>
                    <td>{v.election.title}</td>
                    <td>{v.position.title}</td>
                    <td className="text-xs text-slate-500">{new Date(v.castedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentDashboardPage;
