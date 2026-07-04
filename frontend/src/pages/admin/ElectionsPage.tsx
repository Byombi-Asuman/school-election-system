import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, StatusBadge, EmptyState, Modal, ConfirmDialog } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { electionService } from '../../services/electionService';
import { Election, ElectionStatus } from '../../types';
import { getErrorMessage } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { datetimeLocalToUgandaISO, isoToUgandaDatetimeLocal, formatUgandaDate } from '../../utils/timezone';

const emptyForm = { title: '', description: '', startDate: '', endDate: '' };

const nextStatusOptions: Record<ElectionStatus, { status: ElectionStatus; label: string; variant: 'success' | 'secondary' | 'danger' }[]> = {
  DRAFT: [{ status: 'OPEN', label: 'Open Election', variant: 'success' }],
  OPEN: [
    { status: 'PAUSED', label: 'Pause', variant: 'secondary' },
    { status: 'CLOSED', label: 'Close', variant: 'danger' },
  ],
  PAUSED: [
    { status: 'OPEN', label: 'Resume', variant: 'success' },
    { status: 'CLOSED', label: 'Close', variant: 'danger' },
  ],
  CLOSED: [{ status: 'ARCHIVED', label: 'Archive', variant: 'secondary' }],
  ARCHIVED: [],
};

export const ElectionsPage: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Election | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Election | null>(null);
  const user = useAuthStore((s) => s.user);

  const load = useCallback(() => {
    setLoading(true);
    electionService.getAll({ status: statusFilter || undefined })
      .then((res) => setElections(res.elections))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (e: Election) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description || '',
    startDate: isoToUgandaDatetimeLocal(e.startDate),
endDate: isoToUgandaDatetimeLocal(e.endDate),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.title || !form.startDate || !form.endDate) return toast.error('Please fill all required fields');
  if (new Date(form.endDate) <= new Date(form.startDate)) return toast.error('End date must be after start date');

  const payload = {
    ...form,
    startDate: datetimeLocalToUgandaISO(form.startDate),
    endDate: datetimeLocalToUgandaISO(form.endDate),
  };

  setSubmitting(true);
  try {
    if (editing) {
      await electionService.update(editing.id, payload);
      toast.success('Election updated');
    } else {
      await electionService.create(payload);
      toast.success('Election created');
    }
    setModalOpen(false);
    load();
  } catch (err) {
    toast.error(getErrorMessage(err));
  } finally {
    setSubmitting(false);
  }
};

  const handleStatusChange = async (election: Election, status: ElectionStatus) => {
    try {
      await electionService.updateStatus(election.id, status);
      toast.success(`Election ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await electionService.remove(deleteTarget.id);
      toast.success('Election deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout title="Elections">
      <div className="page-header">
        <div>
          <h1 className="page-title">Elections</h1>
          <p className="page-subtitle">Create and manage school elections</p>
        </div>
        <Button onClick={openCreate} icon={<Icons.Plus className="w-4 h-4" />}>New Election</Button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED'].map((s) => (
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

      {loading ? (
        <PageLoader />
      ) : elections.length === 0 ? (
        <div className="card"><EmptyState
          title="No elections found"
          description="Get started by creating your first election."
          icon={<Icons.Election className="w-12 h-12" />}
          action={<Button onClick={openCreate}>Create Election</Button>}
        /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {elections.map((election) => (
            <div key={election.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/admin/elections/${election.id}`} className="font-semibold text-slate-900 hover:text-primary-600 truncate block">
                    {election.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{election.description}</p>
                </div>
                <StatusBadge status={election.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-lg font-bold text-slate-900">{election._count?.positions ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Positions</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-lg font-bold text-slate-900">{election._count?.candidates ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Candidates</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-lg font-bold text-slate-900">{election._count?.votes ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Votes</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
                <span>{formatUgandaDate(election.startDate)}</span>
                  <span>→</span>
                <span>{formatUgandaDate(election.endDate)}</span>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                <Link to={`/admin/elections/${election.id}`} className="btn-secondary btn-sm">Manage</Link>
                <button onClick={() => openEdit(election)} className="btn-ghost btn-sm">
                  <Icons.Edit className="w-3.5 h-3.5" /> Edit
                </button>
                {nextStatusOptions[election.status].map((opt) => (
                  <button
                    key={opt.status}
                    onClick={() => handleStatusChange(election, opt.status)}
                    className={`btn-sm ${opt.variant === 'success' ? 'btn-success' : opt.variant === 'danger' ? 'btn-danger' : 'btn-secondary'}`}
                  >
                    {opt.label}
                  </button>
                ))}
                {user?.role === 'SUPER_ADMIN' && (election.status === 'DRAFT' || election.status === 'ARCHIVED') && (
                  <button onClick={() => setDeleteTarget(election)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50 ml-auto">
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Election' : 'Create Election'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <Button onClick={handleSubmit as any} isLoading={submitting}>{editing ? 'Save Changes' : 'Create Election'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Election Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Student Government Elections 2024" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this election" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date & Time" type="datetime-local" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date & Time" type="datetime-local" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Election"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </DashboardLayout>
  );
};

export default ElectionsPage;
