import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { EmptyState, PageLoader } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../components/ui/Icons';
import { otpService } from '../../services/otpService';
import { studentService } from '../../services/studentService';
import { ActiveOtp } from '../../types';
import { getErrorMessage } from '../../services/api';
import { useTokenPanelStore } from '../../store/tokenPanelStore';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface StudentHit {
  id: string;
  admissionNumber: string;
  class: string;
  user: { firstName: string; lastName: string };
}

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
  // Student search-picker state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentHit | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [generating, setGenerating] = useState(false);
  const [activeOtps, setActiveOtps] = useState<ActiveOtp[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Persisted panel state — survives switching tabs and page refreshes
  const { current, revealed, setCurrent, setRevealed, clear } = useTokenPanelStore();
  const countdown = useCountdown(current?.expiresAt || null);
  const isExpired = current && countdown.remaining <= 0;

  // Auto-clear the reveal state (but keep the "Expired" badge visible) once time runs out
  useEffect(() => {
    if (isExpired && revealed) setRevealed(false);
  }, [isExpired, revealed, setRevealed]);

  const loadActive = useCallback((isInitial = false) => {
    if (isInitial) setLoadingActive(true);
    otpService.getActive()
      .then(setActiveOtps)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => { if (isInitial) setLoadingActive(false); });
  }, []);

  useEffect(() => { loadActive(true); }, [loadActive]);

  // Refresh the active list periodically, silently — no loading flicker
  useEffect(() => {
    const interval = setInterval(() => loadActive(false), 20000);
    return () => clearInterval(interval);
  }, [loadActive]);

  // Debounced live search as the admin types a student's name or admission number
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      studentService.getAll({ search: query.trim(), limit: 8 })
        .then((r) => setResults(r.students as unknown as StudentHit[]))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Close the results dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pickStudent = (s: StudentHit) => {
    setSelectedStudent(s);
    setQuery(`${s.user.firstName} ${s.user.lastName} (${s.admissionNumber})`);
    setShowResults(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return toast.error('Please search for and select a student first');
    setGenerating(true);
    setCopied(false);
    try {
      const res = await otpService.generate(selectedStudent.id);
      setCurrent({
        code: res.code,
        expiresAt: res.expiresAt,
        studentId: res.student.id,
        studentName: res.student.name,
        class: res.student.class,
      });
      toast.success(`Token generated for ${res.student.name}`);
      setQuery('');
      setSelectedStudent(null);
      loadActive(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!current) return;
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    toast.success('Token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRowReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <DashboardLayout title="Voter Tokens">
      <div className="page-header">
        <div>
          <h1 className="page-title">Voter Login Tokens</h1>
          <p className="page-subtitle">Generate a 15-minute one-time token students use, alone, to log in — no username needed</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Icons.Lock className="w-4 h-4 text-slate-400" /> Generate Token
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Search for the student by name or admission number, then generate their token. Tell them the code verbally or in person.
          </p>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="relative" ref={searchBoxRef}>
              <label className="label">Student</label>
              <input
                type="text"
                className="input"
                placeholder="Search by name or admission number..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedStudent(null);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
              />
              {showResults && query.trim() && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto scrollbar-thin">
                  {searching ? (
                    <p className="p-3 text-xs text-slate-400">Searching…</p>
                  ) : results.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400">No students found</p>
                  ) : (
                    results.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => pickStudent(s)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-sm text-slate-800">{s.user.firstName} {s.user.lastName}</span>
                        <span className="text-xs text-slate-400 shrink-0">{s.admissionNumber} · {s.class}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button type="submit" isLoading={generating} className="w-full" disabled={!selectedStudent}>
              Generate Token
            </Button>
          </form>

          {current && (
            <div className={`mt-6 p-5 rounded-xl border-2 ${isExpired ? 'border-red-200 bg-red-50' : 'border-primary-200 bg-primary-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{current.studentName}</p>
                  <p className="text-xs text-slate-500">{current.class}</p>
                </div>
                {isExpired ? (
                  <span className="badge-red">Expired</span>
                ) : (
                  <span className="badge-green flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  {revealed && !isExpired ? (
                    <p className="text-3xl font-bold font-mono tracking-widest text-slate-900">{current.code}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !isExpired && setRevealed(true)}
                      disabled={!!isExpired}
                      className="text-3xl font-bold font-mono tracking-widest text-slate-400 hover:text-slate-600 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                      title={isExpired ? 'This token has expired' : 'Tap to reveal'}
                    >
                      {isExpired ? '——————' : '••••••'}
                    </button>
                  )}
                  <p className={`text-xs mt-1 font-medium ${isExpired ? 'text-red-600' : 'text-primary-700'}`}>
                    {isExpired ? 'This token has expired' : `Expires in ${countdown.label}`}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!isExpired && (
                    <button
                      onClick={() => setRevealed(!revealed)}
                      className="btn-secondary btn-sm"
                    >
                      {revealed ? 'Hide' : 'Show'}
                    </button>
                  )}
                  <button onClick={handleCopy} className="btn-secondary btn-sm" disabled={!!isExpired || !revealed}>
                    {copied ? <Icons.Check className="w-4 h-4" /> : 'Copy'}
                  </button>
                </div>
              </div>

              {isExpired && (
                <button onClick={clear} className="text-xs text-slate-500 hover:text-slate-700 mt-3 pt-3 border-t border-slate-200 w-full text-left">
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Active Tokens</h3>
              <p className="text-xs text-slate-500">Tap a token to reveal it if a student needs it repeated</p>
            </div>
          </div>
          {loadingActive ? (
            <div className="card-body"><PageLoader /></div>
          ) : activeOtps.length === 0 ? (
            <div className="card-body"><EmptyState title="No active tokens" description="Generated tokens will appear here until they expire or are used." icon={<Icons.Lock className="w-10 h-10" />} /></div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[26rem] overflow-y-auto scrollbar-thin">
              {activeOtps.map((o) => (
                <div key={o.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{o.studentName}</p>
                    <p className="text-xs text-slate-500 truncate">{o.class}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Generated {formatDistanceToNow(new Date(o.createdAt), { addSuffix: true })}</p>
                      <p className="text-xs text-primary-600 font-medium">Expires {formatDistanceToNow(new Date(o.expiresAt), { addSuffix: true })}</p>
                    </div>
                    <button
                      onClick={() => toggleRowReveal(o.id)}
                      className="btn-secondary btn-sm font-mono"
                      title={revealedIds.has(o.id) ? 'Hide token' : 'Show token'}
                    >
                      {revealedIds.has(o.id) ? o.code : '••••••'}
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
            Each token is valid for 15 minutes and can only be used once. Students enter it alone to <strong>log in</strong> —
            there's no username or password required. Once logged in, they can browse the dashboard and vote without
            re-entering the code. This panel stays put and keeps counting down even if you switch tabs.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OtpPage;
