import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Icons } from '../../components/ui/Icons';
import { Input } from '../../components/ui/FormControls';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

type Tab = 'staff' | 'student';

export const LoginPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('student');

  // Staff form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staffErrors, setStaffErrors] = useState<{ email?: string; password?: string }>({});
  const [staffLoading, setStaffLoading] = useState(false);

  // Student form state
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [studentErrors, setStudentErrors] = useState<{ username?: string; otp?: string }>({});
  const [studentLoading, setStudentLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const goAfterLogin = (role: string) => {
    const from = (location.state as any)?.from?.pathname;
    const home = role === 'STUDENT' ? '/student/dashboard' : '/admin/dashboard';
    navigate(from || home, { replace: true });
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof staffErrors = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    setStaffErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStaffLoading(true);
    try {
      const data = await authService.login(email, password);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      goAfterLogin(data.user.role);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStaffLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof studentErrors = {};
    if (!username) errs.username = 'Username is required';
    if (!otp) errs.otp = 'Enter the OTP given to you by your administrator';
    setStudentErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStudentLoading(true);
    try {
      const data = await authService.studentLogin(username.trim(), otp.trim());
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Welcome, ${data.user.firstName}!`);
      goAfterLogin(data.user.role);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStudentLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Icons.Shield className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl">School Elections</span>
          </div>

          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold leading-tight mb-4">
              Democracy starts in the classroom.
            </h1>
            <p className="text-primary-100 text-lg leading-relaxed">
              A secure, transparent platform for running students elections 
              from candidate registration to live results.
            </p>
            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-2xl font-bold font-display">100%</p>
                <p className="text-sm text-primary-200">Secret Ballot</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display">OTP</p>
                <p className="text-sm text-primary-200">Verified Login</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display">Audit</p>
                <p className="text-sm text-primary-200">Trail Logged</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-primary-300">&copy; {new Date().getFullYear()} School Elections Management System</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Icons.Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900">School Elections</span>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button
              onClick={() => setTab('student')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'student' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setTab('staff')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'staff' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Staff
            </button>
          </div>

          {tab === 'student' ? (
            <>
              <h2 className="font-display text-2xl font-bold text-slate-900">Student Login</h2>
              <p className="text-sm text-slate-500 mt-1 mb-8">
                Log in with your username and the one-time password from your election administrator.
              </p>

              <form onSubmit={handleStudentSubmit} noValidate className="space-y-4">
                <Input
                  label="Username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. jameswilson@lvk"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={studentErrors.username}
                  required
                />
                <Input
                  label="One-Time Password"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  error={studentErrors.otp}
                  className="text-center text-xl font-mono tracking-widest"
                  required
                />
                <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={studentLoading}>
                  Sign in
                </Button>
              </form>

              <div className="mt-6 p-3 rounded-lg bg-slate-100 border border-slate-200 flex items-start gap-2">
                <Icons.Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">
                  Don't have an OTP? Ask your Election Administrator to generate one for you —
                  it's valid for 15 minutes and can only be used once.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-slate-900">Staff Login</h2>
              <p className="text-sm text-slate-500 mt-1 mb-8">Sign in to your administrator account to continue</p>

              <form onSubmit={handleStaffSubmit} noValidate className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={staffErrors.email}
                  required
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="label mb-0">Password</label>
                    <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`input pr-10 ${staffErrors.password ? 'border-red-400 focus:ring-red-500' : ''}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {staffErrors.password && <p className="error-text" role="alert">{staffErrors.password}</p>}
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={staffLoading}>
                  Sign in
                </Button>
              </form>

              <div className="mt-8 p-4 rounded-xl bg-slate-100 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-2">Dear Voter,</p>
                <div className="space-y-1 text-xs text-slate-500 font-mono">
                  <p>You should be guaranteed that your vote matters alot,</p>
                  <p>Shall be counted and has a much Weight &#10004; </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
