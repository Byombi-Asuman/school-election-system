import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { HeroImagesSettings } from '../../components/admin/HeroImagesSettings';
import { Input, Textarea } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { settingsService } from '../../services/settingsService';
import { School } from '../../types';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const UPLOADS_URL = process.env.REACT_APP_UPLOADS_URL || 'https://generous-simplicity-production-5b4a.up.railway.app';

export const SettingsPage: React.FC = () => {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    settingsService.get()
      .then(setSchool)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleFile = (file: File | null) => {
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', school.name);
      fd.append('address', school.address || '');
      fd.append('phone', school.phone || '');
      fd.append('email', school.email || '');
      fd.append('website', school.website || '');
      fd.append('motto', school.motto || '');
      fd.append('rules', school.rules || '');
      if (logoFile) fd.append('logo', logoFile);
      const updated = await settingsService.update(fd);
      setSchool(updated);
      setLogoFile(null);
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout title="Settings"><PageLoader /></DashboardLayout>;
  if (!school) return null;

  return (
    <DashboardLayout title="Settings">
      <div className="page-header">
        <div>
          <h1 className="page-title">School Settings</h1>
          <p className="page-subtitle">Manage school profile, branding, and election rules</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">School Logo</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
              ) : school.logo ? (
                <img src={school.logo?.startsWith('http') ? school.logo : `${UPLOADS_URL}${school.logo}`} alt="School logo" className="w-full h-full object-cover" />
              ) : (
                <Icons.Shield className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="input" />
              <p className="text-xs text-slate-400 mt-1">PNG, JPG or WEBP. Max 2MB.</p>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">School Profile</h3>
          <Input label="School Name" required value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} />
          <Input label="Motto" value={school.motto || ''} onChange={(e) => setSchool({ ...school, motto: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={school.email || ''} onChange={(e) => setSchool({ ...school, email: e.target.value })} />
            <Input label="Phone" value={school.phone || ''} onChange={(e) => setSchool({ ...school, phone: e.target.value })} />
          </div>
          <Input label="Website" value={school.website || ''} onChange={(e) => setSchool({ ...school, website: e.target.value })} />
          <Textarea label="Address" value={school.address || ''} onChange={(e) => setSchool({ ...school, address: e.target.value })} />
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Election Rules</h3>
          <Textarea
            label="General Rules & Guidelines"
            value={school.rules || ''}
            onChange={(e) => setSchool({ ...school, rules: e.target.value })}
            placeholder="Describe general voting rules, code of conduct for candidates, etc."
            rows={6}
          />
        </div>

        <Button type="submit" isLoading={saving}>Save Settings</Button>
      </form>
      <HeroImagesSettings />
    </DashboardLayout>
  );
};

export default SettingsPage;
