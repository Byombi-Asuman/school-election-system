import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, Modal } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { studentService } from '../../services/studentService';
import { Student } from '../../types';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const emptyForm = { email: '', firstName: '', lastName: '', admissionNumber: '', class: '', stream: '', house: '', year: new Date().getFullYear() };

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const limit = 20;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    studentService.getAll({ search: search || undefined, page, limit })
      .then((res) => { setStudents(res.students); setTotal(res.total); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.admissionNumber || !form.class) {
      return toast.error('Please fill all required fields');
    }
    setSubmitting(true);
    try {
      const res: any = await studentService.create(form);
      toast.success(`Student registered — username: ${res.username}`, { duration: 6000 });
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEligibility = async (s: Student) => {
    try {
      await studentService.toggleEligibility(s.id);
      toast.success(`${s.user?.firstName} is now ${s.isEligible ? 'ineligible' : 'eligible'} to vote`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleImport = async () => {
    if (!importFile) return toast.error('Please select a file');
    setImporting(true);
    try {
      const result = await studentService.import(importFile);
      setImportResult(result);
      toast.success(`Imported ${result.created} students`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Pull every matching student (not just the current page) for the export
      const res = await studentService.getAll({ search: search || undefined, page: 1, limit: 10000 });
      const rows = res.students;

      const headers = ['Username', 'First Name', 'Last Name', 'Email', 'Admission Number', 'Class', 'Stream', 'House', 'Year', 'Eligible', 'Account Status'];
      const csvRows = rows.map((s) => [
        s.username,
        s.user?.firstName || '',
        s.user?.lastName || '',
        s.user?.email || '',
        s.admissionNumber,
        s.class,
        s.stream || '',
        s.house || '',
        s.year,
        s.isEligible ? 'Yes' : 'No',
        s.user?.isActive ? 'Active' : 'Inactive',
      ]);

      const escapeCell = (val: any) => {
        const str = String(val ?? '');
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const csv = [headers, ...csvRows].map((row) => row.map(escapeCell).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voters_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} voter${rows.length !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout title="Voters">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Voters</h1>
          <p className="page-subtitle">Manage voter registration and eligibility</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={handleExport} isLoading={exporting} icon={<Icons.Download className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => setImportModalOpen(true)} icon={<Icons.Upload className="w-4 h-4" />}>
            Import CSV/Excel
          </Button>
          <Button onClick={() => setModalOpen(true)} icon={<Icons.Plus className="w-4 h-4" />}>Add Student</Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Icons.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, or admission number"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : students.length === 0 ? (
        <div className="card"><EmptyState title="No students found" icon={<Icons.Students className="w-12 h-12" />} /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Username</th>
                <th>Admission No.</th>
                <th>Class</th>
                <th>House</th>
                <th>Status</th>
                <th>Eligible</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-medium text-slate-900">{s.user?.firstName} {s.user?.lastName}</p>
                    <p className="text-xs text-slate-500">{s.user?.email}</p>
                  </td>
                  <td className="font-mono text-xs text-primary-700">{s.username}</td>
                  <td className="font-mono text-xs">{s.admissionNumber}</td>
                  <td>{s.class}{s.stream ? ` - ${s.stream}` : ''}</td>
                  <td>{s.house || '—'}</td>
                  <td>
                    <span className={s.user?.isActive ? 'badge-green' : 'badge-gray'}>
                      {s.user?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleEligibility(s)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.isEligible ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      role="switch"
                      aria-checked={s.isEligible}
                      aria-label="Toggle voting eligibility"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${s.isEligible ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="text-right">
                    <span className="text-xs text-slate-400">{s.year}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}</p>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Add student modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Student"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <Button onClick={handleSubmit as any} isLoading={submitting}>Register Student</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last Name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Admission Number" required value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Class" required value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} placeholder="e.g. Form 4" />
            <Input label="Stream" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })} placeholder="e.g. Science" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="House" value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} placeholder="e.g. Eagle" />
            <Input label="Year" type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
          </div>
        </form>
      </Modal>

      {/* Import modal */}
      <Modal isOpen={importModalOpen} onClose={closeImportModal} title="Import Students">
        {!importResult ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Upload a CSV or Excel file with columns: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">email, firstName, lastName, admissionNumber, class, stream, house, year</code>
              <br />A login username (e.g. <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">firstnameLastname@lvk</code>) is generated automatically for each student — no need to include it.
            </p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="input" />
            <Button onClick={handleImport} isLoading={importing} disabled={!importFile} className="w-full">
              <Icons.Upload className="w-4 h-4" /> Upload & Import
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                <p className="text-xs text-emerald-600">Created</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <p className="text-2xl font-bold text-amber-700">{importResult.skipped}</p>
                <p className="text-xs text-amber-600">Skipped</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto p-3 rounded-lg bg-red-50 border border-red-200">
                {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}
            <Button onClick={closeImportModal} variant="secondary" className="w-full">Done</Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default StudentsPage;
