import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/FormControls';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../components/ui/Icons';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const UPLOADS_URL = process.env.REACT_APP_UPLOADS_URL || 'http://localhost:5000';

export const AccountPage: React.FC = () => {
  const { user, accessToken, refreshToken, setAuth } = useAuthStore();

  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  if (!user) return null;

  const currentPictureUrl = picturePreview || (user.profilePicture
    ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${UPLOADS_URL}${user.profilePicture}`)
    : null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authService.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
      });
      setAuth({ ...user, ...updated }, accessToken!, refreshToken!);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  const handlePictureUpload = async () => {
    if (!pictureFile) return;
    setUploadingPicture(true);
    try {
      const updated = await authService.updateProfile({ profilePicture: pictureFile });
      setAuth({ ...user, ...updated }, accessToken!, refreshToken!);
      setPictureFile(null);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingPicture(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwordForm.newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters');
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <DashboardLayout title="My Account">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Account</h1>
          <p className="page-subtitle">Manage your own profile, photo, and password</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile picture */}
        <div className="card p-6 text-center">
          <div className="w-28 h-28 rounded-full bg-slate-100 mx-auto overflow-hidden flex items-center justify-center border-4 border-white shadow">
            {currentPictureUrl ? (
              <img src={currentPictureUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Icons.User className="w-12 h-12 text-slate-300" />
            )}
          </div>
          <p className="font-semibold text-slate-900 mt-4">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-slate-500">{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Election Admin'}</p>

          <label className="btn-secondary btn-sm mt-4 cursor-pointer inline-flex">
            Choose Photo
            <input type="file" accept="image/*" hidden onChange={handlePictureChange} />
          </label>
          {pictureFile && (
            <Button size="sm" className="mt-2 w-full" onClick={handlePictureUpload} isLoading={uploadingPicture}>
              Save Photo
            </Button>
          )}
        </div>

        {/* Profile details + password */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleProfileSubmit} className="card p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Profile Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Button type="submit" isLoading={savingProfile}>Save Changes</Button>
          </form>

          <form onSubmit={handlePasswordSubmit} className="card p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Change Password</h3>
            <div className="relative">
              <Input
                label="Current Password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords((s) => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-[34px] text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                {showPasswords.current ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => ({ ...s, new: !s.new }))}
                  className="absolute right-3 top-[34px] text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.new ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-[34px] text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.confirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <Button type="submit" isLoading={changingPassword} variant="secondary">Change Password</Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AccountPage;
