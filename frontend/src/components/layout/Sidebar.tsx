import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icons } from '../ui/Icons';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Icons.Dashboard, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/elections', label: 'Elections', icon: Icons.Election, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/candidates', label: 'Candidates', icon: Icons.Candidate, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/students', label: 'Voters', icon: Icons.Students, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/otp', label: 'Voter OTP', icon: Icons.Lock, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/results', label: 'Results', icon: Icons.Results, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/reports', label: 'Reports', icon: Icons.Download, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/announcements', label: 'Announcements', icon: Icons.Megaphone, roles: ['SUPER_ADMIN', 'ELECTION_ADMIN'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: Icons.Audit, roles: ['SUPER_ADMIN'] },
  { to: '/admin/settings', label: 'Settings', icon: Icons.Settings, roles: ['SUPER_ADMIN'] },
];

const studentNavItems: NavItem[] = [
  { to: '/student/dashboard', label: 'Dashboard', icon: Icons.Dashboard, roles: ['STUDENT'] },
  { to: '/student/vote', label: 'Vote', icon: Icons.Vote, roles: ['STUDENT'] },
  { to: '/student/results', label: 'Results', icon: Icons.Results, roles: ['STUDENT'] },
  { to: '/student/candidacy', label: 'My Candidacy', icon: Icons.Candidate, roles: ['STUDENT'] },
  { to: '/student/profile', label: 'My Profile', icon: Icons.User, roles: ['STUDENT'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'STUDENT';
  const items = (isStudent ? studentNavItems : navItems).filter((i) => user && i.roles.includes(user.role));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50
          transform transition-transform duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-100 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
            <Icons.Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-slate-900 text-sm leading-tight truncate">School Elections</p>
            <p className="text-xs text-slate-400 leading-tight">Management System</p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden p-1.5 text-slate-400 hover:text-slate-600">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
