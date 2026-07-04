import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icons } from '../../components/ui/Icons';
import { Input } from '../../components/ui/FormControls';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address');
    setIsLoading(true);
    try {
      const res: any = await authService.forgotPassword(email);
      setSent(true);
      if (res.resetUrl) setDevResetUrl(res.resetUrl);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Icons.Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-slate-900">School Elections</span>
        </div>

        <div className="card p-8">
          {!sent ? (
            <>
              <h2 className="font-display text-xl font-bold text-slate-900">Forgot your password?</h2>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Send reset link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Icons.Check className="w-6 h-6" />
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-500 mt-1">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
              </p>
              {devResetUrl && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Development mode</p>
                  <Link to={devResetUrl.replace(window.location.origin, '')} className="text-xs text-primary-600 break-all hover:underline">
                    {devResetUrl}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
