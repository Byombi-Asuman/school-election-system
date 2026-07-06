import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, Modal, ConfirmDialog } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { adminService, ElectionAdmin } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const emptyForm = { email: '', firstName: '', lastName: '' };

export const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<ElectionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ElectionAdmin | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminService.getAll()
      .then((res) => setAdmins(res.admins))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName) {
      return toast.error('Please fill all required fields');
    }
    setSubmitting(true);
    try {
      const res = await adminService.create(form);
      toast.success(`Election admin created. Temp password: ${res.tempPassword}`, { duration: 8000 });
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (a: ElectionAdmin) => {
    try {
      await adminService.update(a.id, { isActive: !a.isActive });
      toast.success(`${a.firstName} is now ${a.isActive ? 'deactivated' : 'active'}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleResetPassword = async (a: ElectionAdmin) => {
    try {
      const res = await adminService.resetPassword(a.id);
      toast.success(`New temp password for ${a.firstName}: ${res.tempPassword}`, { duration: 8000 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.remove(deleteTarget.id);
      toast.success('Election admin removed');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout title="Election Admins">
      <div className="page-header">
        <div>
          <h1 className="page-title">Election Admins</h1>
          <p className="page-subtitle">Create accounts and assign them to manage specific elections</p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<Icons.Plus className="w-4 h-4" />}>New Admin</Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : admins.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No election admins yet"
            description="Create an account here, then assign it to an election from the Elections page."
            icon={<Icons.Shield className="w-12 h-12" />}
            action={<Button onClick={() => setModalOpen(true)}>New Admin</Button>}
          />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Managing</th>
                <th>Status</th>
                <th>Last Login</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium text-slate-900">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-slate-500">{a.email}</p>
                  </td>
                  <td>{a._count?.managedElections ?? 0} election{(a._count?.managedElections ?? 0) === 1 ? '' : 's'}</td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(a)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${a.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      role="switch"
                      aria-checked={a.isActive}
                      aria-label="Toggle account active state"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${a.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="text-xs text-slate-500">{a.lastLoginAt ? format(new Date(a.lastLoginAt), 'MMM d, yyyy h:mm a') : 'Never'}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleResetPassword(a)} className="btn-ghost btn-sm" title="Reset password">
                        <Icons.Lock className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(a)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50" title="Remove admin">
                        <Icons.Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Election Admin"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <Button onClick={handleSubmit as any} isLoading={submitting}>Create Admin</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <p className="text-xs text-slate-500">
            A temporary password will be generated automatically and shown once you submit — share it with the admin and
            have them change it after first login.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Election Admin"
        message={`Remove ${deleteTarget?.firstName} ${deleteTarget?.lastName}? Any elections they manage will become unassigned.`}
        confirmLabel="Remove"
        danger
      />
    </DashboardLayout>
  );
};

export default AdminsPage;
