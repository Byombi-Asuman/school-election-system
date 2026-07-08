import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, StatusBadge, Modal } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Select, Textarea } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { dashboardService } from '../../services/dashboardService';
import { candidateService } from '../../services/candidateService';
import { electionService } from '../../services/electionService';
import { positionService } from '../../services/positionService';
import { Election, Position } from '../../types';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const StudentCandidacyPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [form, setForm] = useState({ electionId: '', positionId: '', manifesto: '' });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);

  const load = () => {
    setLoading(true);
    dashboardService.getStudentDashboard()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    electionService.getAll({ status: 'DRAFT', limit: 50 }).then((r) => {
      // also allow OPEN elections in case admin allows late registration - fetch both
      electionService.getAll({ limit: 100 }).then((all) => {
        const eligible = all.elections.filter((e) => e.status === 'DRAFT' || e.status === 'OPEN');
        setElections(eligible);
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.electionId) {
      positionService.getAll(form.electionId).then(setPositions).catch(() => {});
    } else {
      setPositions([]);
    }
  }, [form.electionId]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.electionId || !form.positionId || !data?.student) return toast.error('Please select election and position');
  setSubmitting(true);
  try {
    await candidateService.register({
      electionId: form.electionId,
      positionId: form.positionId,
      studentId: data.student.id,
      manifesto: form.manifesto,
      photo: photoUrl,
    });
    toast.success('Your candidacy application has been submitted for review');
    setModalOpen(false);
    setForm({ electionId: '', positionId: '', manifesto: '' });
    setPhotoUrl(null);
    load();
  } catch (err) {
    toast.error(getErrorMessage(err));
  } finally {
    setSubmitting(false);
  }
};

  const handleWithdraw = async (candidateId: string) => {
    if (!window.confirm('Are you sure you want to withdraw your candidacy? This cannot be undone.')) return;
    try {
      await candidateService.withdraw(candidateId);
      toast.success('Candidacy withdrawn');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <DashboardLayout title="My Candidacy"><PageLoader /></DashboardLayout>;

  const candidacies = data?.myCandidacies || [];

  return (
    <DashboardLayout title="My Candidacy">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Candidacy</h1>
          <p className="page-subtitle">Apply to run for a position and track your applications</p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<Icons.Plus className="w-4 h-4" />}>Apply to Run</Button>
      </div>

      {candidacies.length === 0 ? (
        <div className="card"><EmptyState
          title="No candidacy applications yet"
          description="Interested in leading? Apply to run for a position in an upcoming election."
          icon={<Icons.Candidate className="w-12 h-12" />}
          action={<Button onClick={() => setModalOpen(true)}>Apply to Run</Button>}
        /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {candidacies.map((c: any) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{c.position.title}</p>
                  <p className="text-xs text-slate-500">{c.election.title}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              {c.manifesto && <p className="text-sm text-slate-600 mt-3 line-clamp-3">{c.manifesto}</p>}
              {c.rejectionReason && (
                <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs text-red-700"><strong>Reason:</strong> {c.rejectionReason}</p>
                </div>
              )}
              {(c.status === 'PENDING' || c.status === 'APPROVED') && (
                <button onClick={() => handleWithdraw(c.id)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50 mt-3">
                  Withdraw Candidacy
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply to Run for a Position"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <Button onClick={handleSubmit as any} isLoading={submitting}>Submit Application</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Election"
            required
            options={elections.map((e) => ({ value: e.id, label: e.title }))}
            placeholder="Select an election"
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
            placeholder="Select a position"
            value={form.positionId}
            onChange={(e) => setForm({ ...form, positionId: e.target.value })}
            disabled={!form.electionId}
          />
          <Textarea
            label="Manifesto"
            value={form.manifesto}
            onChange={(e) => setForm({ ...form, manifesto: e.target.value })}
            placeholder="Tell voters why they should vote for you..."
            rows={5}
          />
          <div className="form-group">
  <label className="label">Your Photo</label>
  <input
    type="file"
    accept="image/*"
    disabled={photoUploading}
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPhotoUploading(true);
      try {
        const url = await candidateService.uploadPhoto(file);
        setPhotoUrl(url);
        toast.success('Photo uploaded');
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPhotoUploading(false);
      }
    }}
    className="input"
  />
  {photoUploading && <p className="text-xs text-slate-500 mt-1">Uploading photo…</p>}
  {photoUrl && !photoUploading && (
    <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover mt-2" />
  )}
</div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default StudentCandidacyPage;
