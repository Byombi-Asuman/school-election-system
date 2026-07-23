import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../ui/Icons';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const UPLOADS_URL = process.env.REACT_APP_UPLOADS_URL || 'http://localhost:5000';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, refreshToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout(refreshToken);
    } catch {
      // ignore network errors on logout
    } finally {
      clearAuth();
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center px-4 lg:px-6 gap-4">
      <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
        <Icons.Menu className="w-5 h-5" />
      </button>

      {title && <h1 className="font-display font-semibold text-slate-900 hidden sm:block">{title}</h1>}

      <div className="flex-1" />

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture.startsWith('http') ? user.profilePicture : `${UPLOADS_URL}${user.profilePicture}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
            )}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.firstName}</span>
          <Icons.ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 slide-up">
            <div className="px-4 py-2.5 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); navigate(user?.role === 'STUDENT' ? '/student/profile' : '/admin/account'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Icons.User className="w-4 h-4 text-slate-400" />
              {user?.role === 'STUDENT' ? 'My Profile' : 'My Account'}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Icons.Logout className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
