import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, Modal, ConfirmDialog } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { announcementService } from '../../services/announcementService';
import { electionService } from '../../services/electionService';
import { Announcement, Election } from '../../types';
import { getErrorMessage } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const emptyForm = { title: '', content: '', electionId: '' };

export const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    announcementService.getAll()
      .then(setAnnouncements)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { electionService.getAll({ limit: 100 }).then((r) => setElections(r.elections)).catch(() => {}); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, content: a.content, electionId: a.electionId || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error('Please fill in title and content');
    setSubmitting(true);
    try {
      const payload = { ...form, electionId: form.electionId || undefined };
      if (editing) {
        await announcementService.update(editing.id, payload);
        toast.success('Announcement updated');
      } else {
        await announcementService.create(payload);
        toast.success('Announcement posted');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (a: Announcement) => {
    try {
      await announcementService.update(a.id, { isActive: !a.isActive });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await announcementService.remove(deleteTarget.id);
      toast.success('Announcement deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout title="Announcements">
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Post election announcements visible to all students</p>
        </div>
        <Button onClick={openCreate} icon={<Icons.Plus className="w-4 h-4" />}>New Announcement</Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : announcements.length === 0 ? (
        <div className="card"><EmptyState title="No announcements yet" icon={<Icons.Megaphone className="w-12 h-12" />} action={<Button onClick={openCreate}>Post Announcement</Button>} /></div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="card p-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  <span className={a.isActive ? 'badge-green' : 'badge-gray'}>{a.isActive ? 'Active' : 'Inactive'}</span>
                  {a.election && <span className="badge-blue">{a.election.title}</span>}
                </div>
                <p className="text-sm text-slate-600 mt-1">{a.content}</p>
                <p className="text-xs text-slate-400 mt-2">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleActive(a)} className="btn-ghost btn-sm">{a.isActive ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => openEdit(a)} className="btn-ghost btn-sm"><Icons.Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget(a)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50"><Icons.Trash className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <Button onClick={handleSubmit as any} isLoading={submitting}>{editing ? 'Save Changes' : 'Post Announcement'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Content" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} />
          <Select
            label="Related Election (optional)"
            options={elections.map((e) => ({ value: e.id, label: e.title }))}
            placeholder="General announcement (no specific election)"
            value={form.electionId}
            onChange={(e) => setForm({ ...form, electionId: e.target.value })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement?"
        confirmLabel="Delete"
        danger
      />
    </DashboardLayout>
  );
};

export default AnnouncementsPage;
