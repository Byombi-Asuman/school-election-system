import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { EmptyState, PageLoader } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { otpService } from '../../services/otpService';
import { ActiveOtp, OtpGenerateResponse } from '../../types';
import { getErrorMessage } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const useCountdown = (expiresAt: string | null) => {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(Math.floor(diff / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return { remaining, label: `${minutes}:${seconds.toString().padStart(2, '0')}` };
};

export const OtpPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<OtpGenerateResponse | null>(null);
  const [activeOtps, setActiveOtps] = useState<ActiveOtp[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const toggleReveal = (id: string) => {
  setRevealedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};
  
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const countdown = useCountdown(result?.expiresAt || null);

  const loadActive = useCallback((isInitial = false) => {
  if (isInitial) setLoadingActive(true);
  otpService.getActive()
    .then(setActiveOtps)
    .catch((err) => toast.error(getErrorMessage(err)))
    .finally(() => { if (isInitial) setLoadingActive(false); });
}, []);

  useEffect(() => { loadActive(true); }, [loadActive]);

  // Refresh the active list periodically so expired OTPs drop off
 useEffect(() => {
  const interval = setInterval(() => loadActive(false), 20000);
  return () => clearInterval(interval);
}, [loadActive]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return toast.error('Please enter the student\'s username');
    setGenerating(true);
    setCopied(false);
    try {
      const res = await otpService.generate(username.trim());
      setResult(res);
      if (res.emailSent) {
        toast.success(`OTP generated and emailed to ${res.student.name}`);
      } else {
        toast(`OTP generated for ${res.student.name} — email not configured, share the code manually`, { icon: '📋' });
      }
      setUsername('');
      loadActive();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    toast.success('OTP copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = result && countdown.remaining <= 0;

  return (
    <DashboardLayout title="Voter OTP">
      <div className="page-header">
        <div>
          <h1 className="page-title">Voter One-Time Passwords</h1>
          <p className="page-subtitle">Generate a 15-minute one-time password students use, with their username, to log in</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Icons.Lock className="w-4 h-4 text-slate-400" /> Generate OTP
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Enter the student's username. Tell them the code verbally or in person — it is only shown here, once.
          </p>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Input
              ref={usernameInputRef}
              label="Student Username"
              type="text"
              required
              placeholder="e.g. jameswilson@lvk"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button type="submit" isLoading={generating} className="w-full">
              Generate OTP
            </Button>
          </form>

          {result && (
            <div className={`mt-6 p-5 rounded-xl border-2 ${isExpired ? 'border-red-200 bg-red-50' : 'border-primary-200 bg-primary-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{result.student.name}</p>
                  <p className="text-xs text-slate-500">{result.student.email} · {result.student.admissionNumber}</p>
                </div>
                {isExpired ? (
                  <span className="badge-red">Expired</span>
                ) : (
                  <span className="badge-green flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                  </span>
                )}
              </div>

              <div className="mb-3 p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">Login Username</span>
                <span className="text-sm font-mono font-semibold text-slate-900">{result.student.username}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-3xl font-bold font-mono tracking-widest text-slate-900">{result.code}</p>
                  <p className={`text-xs mt-1 font-medium ${isExpired ? 'text-red-600' : 'text-primary-700'}`}>
                    {isExpired ? 'This code has expired' : `Expires in ${countdown.label}`}
                  </p>
                </div>
                <button onClick={handleCopy} className="btn-secondary btn-sm shrink-0" disabled={!!isExpired}>
                  {copied ? <Icons.Check className="w-4 h-4" /> : 'Copy Code'}
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5">
                {result.emailSent ? (
                  <>
                    <Icons.Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Also emailed to <strong>{result.student.email}</strong></span>
                  </>
                ) : (
                  <>
                    <Icons.Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Email not configured — give the student their <strong>username</strong> and this <strong>code</strong> directly.</span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Active OTPs</h3>
              <p className="text-xs text-slate-500">Tap a code to reveal it if a student needs it again</p>
            </div>
          </div>
          {loadingActive ? (
            <div className="card-body"><PageLoader /></div>
          ) : activeOtps.length === 0 ? (
            <div className="card-body"><EmptyState title="No active OTPs" description="Generated codes will appear here until they expire or are used." icon={<Icons.Lock className="w-10 h-10" />} /></div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[26rem] overflow-y-auto scrollbar-thin">
              {activeOtps.map((o) => (
                <div key={o.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{o.studentName}</p>
                    <p className="text-xs text-slate-500 truncate font-mono">{o.username}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
              <div>
                <p className="text-xs text-slate-400">Generated {formatDistanceToNow(new Date(o.createdAt), { addSuffix: true })}</p>
                <p className="text-xs text-primary-600 font-medium">Expires {formatDistanceToNow(new Date(o.expiresAt), { addSuffix: true })}</p>
              </div>
              <button
                onClick={() => toggleReveal(o.id)}
                className="btn-secondary btn-sm font-mono"
                title={revealedIds.has(o.id) ? 'Hide code' : 'Show code'}
              >
                {revealedIds.has(o.id) ? o.code : '••••'}
              </button>
            </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <Icons.Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">How this works</p>
          <p className="mt-1 text-amber-700">
            Each OTP is valid for 15 minutes and can only be used once. Students use it, together with their username,
            to <strong>log in</strong> — there's no separate password. Generating a new OTP for a student automatically invalidates any earlier
            unused code for that student.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OtpPage;
