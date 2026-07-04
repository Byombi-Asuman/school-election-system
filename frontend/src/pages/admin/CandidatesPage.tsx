import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, StatusBadge, EmptyState, Modal, ConfirmDialog } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { candidateService } from '../../services/candidateService';
import { electionService } from '../../services/electionService';
import { studentService } from '../../services/studentService';
import { positionService } from '../../services/positionService';
import { Candidate, Election, Position, Student } from '../../types';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const UPLOADS_URL = process.env.REACT_APP_UPLOADS_URL || 'http://localhost:5000';

export const CandidatesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const electionIdFilter = searchParams.get('electionId') || '';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ electionId: electionIdFilter, positionId: '', studentId: '', manifesto: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<Candidate | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    candidateService.getAll({ electionId: electionIdFilter || undefined, status: statusFilter || undefined })
      .then(setCandidates)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [electionIdFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    electionService.getAll({ limit: 100 }).then((r) => setElections(r.elections)).catch(() => {});
    studentService.getAll({ limit: 500, isEligible: true }).then((r) => setStudents(r.students)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.electionId) {
      positionService.getAll(form.electionId).then(setPositions).catch(() => {});
    } else {
      setPositions([]);
    }
  }, [form.electionId]);

  const openCreate = () => {
    setForm({ electionId: electionIdFilter, positionId: '', studentId: '', manifesto: '' });
    setPhotoFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.electionId || !form.positionId || !form.studentId) return toast.error('Please fill all required fields');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('electionId', form.electionId);
      fd.append('positionId', form.positionId);
      fd.append('studentId', form.studentId);
      fd.append('manifesto', form.manifesto);
      if (photoFile) fd.append('photo', photoFile);
      await candidateService.register(fd);
      toast.success('Candidate registered successfully');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (c: Candidate) => {
    try {
      await candidateService.approve(c.id);
      toast.success('Candidate approved');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await candidateService.reject(rejectTarget.id, rejectReason);
      toast.success('Candidate rejected');
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await candidateService.remove(deleteTarget.id);
      toast.success('Candidate removed');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout title="Candidates">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">Review, approve, and manage candidate registrations</p>
        </div>
        <Button onClick={openCreate} icon={<Icons.Plus className="w-4 h-4" />}>Register Candidate</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="input max-w-xs"
          value={electionIdFilter}
          onChange={(e) => setSearchParams(e.target.value ? { electionId: e.target.value } : {})}
        >
          <option value="">All Elections</option>
          {elections.map((el) => <option key={el.id} value={el.id}>{el.title}</option>)}
        </select>
        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : candidates.length === 0 ? (
        <div className="card"><EmptyState title="No candidates found" icon={<Icons.Candidate className="w-12 h-12" />} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <div key={c.id} className="card p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {c.photo ? (
                    <img src={`${UPLOADS_URL}${c.photo}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icons.User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">
                    {c.student?.user?.firstName} {c.student?.user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{c.position?.title}</p>
                  <p className="text-xs text-slate-400">{c.election?.title}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {c.manifesto && <p className="text-sm text-slate-600 mt-3 line-clamp-2">{c.manifesto}</p>}

              <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                <span>{c._count?.votes ?? 0} votes</span>
                <button onClick={() => setViewCandidate(c)} className="text-primary-600 hover:underline">View full profile</button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                {c.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleApprove(c)} className="btn-success btn-sm"><Icons.Check className="w-3.5 h-3.5" /> Approve</button>
                    <button onClick={() => setRejectTarget(c)} className="btn-danger btn-sm"><Icons.X className="w-3.5 h-3.5" /> Reject</button>
                  </>
                )}
                <button onClick={() => setDeleteTarget(c)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50 ml-auto">
                  <Icons.Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Candidate"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <Button onClick={handleSubmit as any} isLoading={submitting}>Register</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Election"
            required
            options={elections.map((el) => ({ value: el.id, label: el.title }))}
            placeholder="Select election"
            value={form.electionId}
            onChange={(e) => setForm({ ...form, electionId: e.target.value, positionId: '' })}
          />
          <Select
            label="Position"
            required
            options={positions.map((p) => {
              const filled = p._count?.candidates ?? 0;
              const remaining = p.maxContestants - filled;
              return {
                value: p.id,
                label: `${p.title} (${remaining > 0 ? `${remaining} slot${remaining !== 1 ? 's' : ''} left` : 'FULL'})`,
              };
            })}
            placeholder="Select position"
            value={form.positionId}
            onChange={(e) => setForm({ ...form, positionId: e.target.value })}
            disabled={!form.electionId}
          />
          <Select
            label="Student"
            required
            options={students.map((s) => ({ value: s.id, label: `${s.user?.firstName} ${s.user?.lastName} (${s.admissionNumber})` }))}
            placeholder="Select student"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          />
          <Textarea
            label="Manifesto"
            value={form.manifesto}
            onChange={(e) => setForm({ ...form, manifesto: e.target.value })}
            placeholder="Candidate's manifesto / pledge to voters"
          />
          <div className="form-group">
            <label className="label">Candidate Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="input" />
          </div>
        </form>
      </Modal>

      {/* Reject modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Candidate"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
            <Button variant="danger" onClick={handleReject}>Reject Candidate</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 mb-3">
          Rejecting <strong>{rejectTarget?.student?.user?.firstName} {rejectTarget?.student?.user?.lastName}</strong> for {rejectTarget?.position?.title}.
        </p>
        <Textarea label="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this candidate is being rejected" />
      </Modal>

      {/* View candidate profile */}
      <Modal isOpen={!!viewCandidate} onClose={() => setViewCandidate(null)} title="Candidate Profile" size="sm">
        {viewCandidate && (
          <div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
                {viewCandidate.photo ? (
                  <img src={`${UPLOADS_URL}${viewCandidate.photo}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Icons.User className="w-7 h-7 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{viewCandidate.student?.user?.firstName} {viewCandidate.student?.user?.lastName}</p>
                <p className="text-sm text-slate-500">{viewCandidate.position?.title}</p>
                <StatusBadge status={viewCandidate.status} />
              </div>
            </div>
            {viewCandidate.manifesto && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Manifesto</p>
                <p className="text-sm text-slate-700">{viewCandidate.manifesto}</p>
              </div>
            )}
            {viewCandidate.rejectionReason && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-600">{viewCandidate.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Candidate"
        message="Are you sure you want to remove this candidate? All their votes will also be removed."
        confirmLabel="Remove"
        danger
      />
    </DashboardLayout>
  );
};

export default CandidatesPage;
