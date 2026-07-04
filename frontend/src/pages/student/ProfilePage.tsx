import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Icons } from '../../components/ui/Icons';
import { useAuthStore } from '../../store/authStore';

export const StudentProfilePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const student = user?.student;

  return (
    <DashboardLayout title="My Profile">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View your account details</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">Login Username</dt>
              <dd className="font-mono font-medium text-primary-700">{student?.username}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">Admission Number</dt>
              <dd className="font-medium text-slate-900">{student?.admissionNumber}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">Class</dt>
              <dd className="font-medium text-slate-900">{student?.class}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">Stream</dt>
              <dd className="font-medium text-slate-900">{student?.stream || '—'}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">House</dt>
              <dd className="font-medium text-slate-900">{student?.house || '—'}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Voting Eligibility</dt>
              <dd>
                <span className={student?.isEligible ? 'badge-green' : 'badge-red'}>
                  {student?.isEligible ? 'Eligible' : 'Not Eligible'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Icons.Lock className="w-4 h-4 text-slate-400" /> How You Log In
          </h3>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Your account doesn't use a password. To log in, enter your <strong>username</strong> above together with a
            <strong> one-time password (OTP)</strong> that your Super Admin or Election Administrator generates for you.
          </p>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Each OTP is valid for <strong>15 minutes</strong> and can only be used once. If you need to log in again later,
            just ask your administrator for a fresh code.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2">
            <Icons.Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              This keeps your account secure without you needing to remember or manage a password.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfilePage;
